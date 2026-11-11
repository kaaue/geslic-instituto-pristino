// Model da RF_B9 - Configurar preferências de notificação (RN24).
//
// Cada conta ativa ou desativa cada tipo de aviso e define um ou mais prazos
// quando o tipo os utiliza: antecedência (vencimentos e término de projeto)
// ou lembrete após o evento (autorização ainda pendente). Os avisos
// imediatos não têm prazo. O aviso de conta aguardando aprovação é exclusivo
// do Administrador. Enquanto a conta não salva as próprias preferências,
// valem os padrões de cada tipo (tabela tipo_notificacao).
//
// As preferências valem para os próximos avisos: não alteram avisos já
// emitidos, não removem demandas do painel nem alteram permissões. A emissão
// dos avisos é da RF_F13 e a central de notificações, da RF_S8.

const { pool, comTransacao } = require('../config/database');
const AppError = require('../utils/AppError');

const UNIDADES = { dia: 365, semana: 52, mes: 24 }; // unidade -> quantidade máxima
const MAXIMO_DE_PRAZOS = 5;

const usaPrazos = (tipo) => tipo.modo === 'antecedencia' || tipo.modo === 'lembrete';
const ehAdministrador = (usuario) => usuario.perfil === 'Administrador';

function lerPrazosPadrao(valor) {
  if (!valor) return [];
  const lista = typeof valor === 'string' ? JSON.parse(valor) : valor;
  return Array.isArray(lista) ? lista : [];
}

// Ordem de exibição: do mais longo para o mais curto
const EM_DIAS = { dia: 1, semana: 7, mes: 30 };
const ordenar = (prazos) => [...prazos].sort((a, b) => b.quantidade * EM_DIAS[b.unidade] - a.quantidade * EM_DIAS[a.unidade]);

async function tiposDaConta(conexao, usuario) {
  const [tipos] = await conexao.query(
    `SELECT id_tipo_notificacao, codigo, nome, descricao, modo, momento, exclusivo_administrador, prazos_padrao
       FROM tipo_notificacao ORDER BY ordem`);
  return tipos
    .map((t) => ({ ...t, exclusivo_administrador: Boolean(t.exclusivo_administrador), prazos_padrao: lerPrazosPadrao(t.prazos_padrao) }))
    .filter((t) => !t.exclusivo_administrador || ehAdministrador(usuario));
}

async function consultar(usuario, conexao = pool) {
  const tipos = await tiposDaConta(conexao, usuario);
  const [preferencias] = await conexao.query(
    'SELECT id_preferencia, id_tipo_notificacao, ativo FROM preferencia_notificacao WHERE id_usuario = ?',
    [usuario.id_usuario]);
  const [prazos] = await conexao.query(
    `SELECT z.id_preferencia, z.quantidade, z.unidade
       FROM prazo_notificacao z JOIN preferencia_notificacao p ON p.id_preferencia = z.id_preferencia
      WHERE p.id_usuario = ?`, [usuario.id_usuario]);

  return {
    tipos: tipos.map((t) => {
      const salva = preferencias.find((p) => p.id_tipo_notificacao === t.id_tipo_notificacao);
      const prazosSalvos = salva
        ? prazos.filter((z) => z.id_preferencia === salva.id_preferencia).map(({ quantidade, unidade }) => ({ quantidade, unidade }))
        : null;
      return {
        codigo: t.codigo,
        nome: t.nome,
        descricao: t.descricao,
        modo: t.modo,
        momento: t.momento,
        exclusivo_administrador: t.exclusivo_administrador,
        ativo: salva ? Boolean(salva.ativo) : true,
        prazos: usaPrazos(t) ? ordenar(prazosSalvos ?? t.prazos_padrao) : [],
        prazos_padrao: ordenar(t.prazos_padrao),
        personalizado: Boolean(salva)
      };
    })
  };
}

// Valida a lista enviada pela tela: { preferencias: [{ codigo, ativo, prazos }] }
function validar(tipos, corpo) {
  const erros = {};
  const lista = Array.isArray(corpo?.preferencias) ? corpo.preferencias : null;
  if (!lista) throw AppError.campos({ preferencias: 'Informe as preferências.' });

  const porCodigo = new Map(tipos.map((t) => [t.codigo, t]));
  const resultado = [];
  for (const item of lista) {
    const tipo = porCodigo.get(item?.codigo);
    if (!tipo) {
      erros[`preferencias.${item?.codigo}`] = 'Tipo de aviso inexistente ou não disponível para o seu perfil.';
      continue;
    }
    const ativo = item.ativo === true;
    let prazos = [];
    if (usaPrazos(tipo)) {
      prazos = Array.isArray(item.prazos) ? item.prazos : [];
      const vistos = new Set();
      for (const prazo of prazos) {
        const quantidade = Number(prazo?.quantidade);
        const maximo = UNIDADES[prazo?.unidade];
        if (!maximo || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > maximo) {
          erros[`prazos.${tipo.codigo}`] = 'Use de 1 a 365 dias, 1 a 52 semanas ou 1 a 24 meses.';
        }
        const chave = `${quantidade}-${prazo?.unidade}`;
        if (vistos.has(chave)) erros[`prazos.${tipo.codigo}`] = 'Há prazos repetidos.';
        vistos.add(chave);
      }
      if (prazos.length > MAXIMO_DE_PRAZOS) erros[`prazos.${tipo.codigo}`] = `Use no máximo ${MAXIMO_DE_PRAZOS} prazos.`;
      if (ativo && prazos.length === 0) erros[`prazos.${tipo.codigo}`] = 'Informe ao menos um prazo ou desative o aviso.';
      prazos = prazos.map((p) => ({ quantidade: Number(p.quantidade), unidade: p.unidade }));
    }
    resultado.push({ tipo, ativo, prazos });
  }
  if (Object.keys(erros).length) throw AppError.campos(erros);
  return resultado;
}

async function salvar(usuario, corpo) {
  return comTransacao(async (conexao) => {
    const tipos = await tiposDaConta(conexao, usuario);
    const preferencias = validar(tipos, corpo);
    for (const { tipo, ativo, prazos } of preferencias) {
      await conexao.query(
        `INSERT INTO preferencia_notificacao (id_usuario, id_tipo_notificacao, ativo) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE ativo = VALUES(ativo)`,
        [usuario.id_usuario, tipo.id_tipo_notificacao, ativo]);
      const [[{ id_preferencia: idPreferencia }]] = await conexao.query(
        'SELECT id_preferencia FROM preferencia_notificacao WHERE id_usuario = ? AND id_tipo_notificacao = ?',
        [usuario.id_usuario, tipo.id_tipo_notificacao]);
      await conexao.query('DELETE FROM prazo_notificacao WHERE id_preferencia = ?', [idPreferencia]);
      if (prazos.length) {
        await conexao.query('INSERT INTO prazo_notificacao (id_preferencia, quantidade, unidade) VALUES ?',
          [prazos.map((p) => [idPreferencia, p.quantidade, p.unidade])]);
      }
    }
    return consultar(usuario, conexao);
  });
}

module.exports = { consultar, salvar, UNIDADES };
