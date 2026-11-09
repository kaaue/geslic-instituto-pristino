// Painel lateral de gerenciamento de uma conta. Abre em "gerenciar", com os
// dados da conta e as operações autorizadas; cada operação troca o conteúdo
// do mesmo painel e tem "Voltar":
//   gerenciar  visão geral e operações
//   nova       criar conta já ligada a um colaborador (existente ou novo)
//   editar     nome, e-mail, login e colaborador vinculado
//   aprovar    aprovar a solicitação: perfil e colaborador (existente ou novo,
//              com os dados informados no pedido)
//   recusar    recusar a solicitação (o pedido é removido; a recusa fica no histórico)
//   perfil     conceder ou revogar perfil, com motivo e data efetiva (RN27)
//   situacao   desativar ou reativar (a conta nunca é excluída)
// A senha provisória e a transferência de privilégios abrem janelas próprias.
//
// Motivo: na criação e na aprovação, só é pedido quando a conta recebe o
// perfil Administrador (RN27); a alteração de perfil sempre pede o motivo
// dela. Cada motivo fica no evento correspondente do histórico.

import { useState } from 'react';
import Campo from '../../components/common/Campo.jsx';
import { BuscaColaborador } from '../../components/common/SeletorColaboradores.jsx';

const TITULOS = {
  gerenciar: 'Gerenciar usuário',
  nova: 'Nova conta',
  editar: 'Editar dados da conta',
  aprovar: 'Aprovar solicitação de acesso',
  recusar: 'Recusar solicitação de acesso',
  perfil: 'Alterar perfil de acesso',
  situacao: 'Situação da conta'
};

const hoje = () => new Date().toISOString().slice(0, 10);
const dataHora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

function formInicial(tipo, conta, perfis) {
  const operador = perfis.find((p) => p.nome === 'Operador')?.id_perfil ?? '';
  return {
    nome: conta?.nome ?? '',
    email: conta?.email ?? '',
    login: conta?.login ?? '',
    id_colaborador: conta?.id_colaborador ?? '',
    id_perfil: tipo === 'perfil' ? '' : (conta?.id_perfil ?? operador),
    motivo: '',
    data_efetiva: hoje(),
    situacao: conta?.situacao === 'ativo' ? 'inativo' : 'ativo',
    // colaborador cadastrado junto com a conta
    modo_colaborador: tipo === 'nova' ? 'existente' : 'novo',
    colaborador_nome: conta?.nome ?? '',
    colaborador_id_setor: conta?.cadastro_id_setor ?? '',
    colaborador_cargo: conta?.cadastro_cargo ?? '',
    confirmar_homonimo: false
  };
}

export default function PainelConta({
  tipo, conta, perfis, colaboradores, setores, erros, erroGeral, homonimos, salvando, idContaAtual,
  aoConfirmar, aoCancelar, aoTrocarAcao, aoSenhaProvisoria, aoTransferir
}) {
  const [form, setForm] = useState(() => formInicial(tipo, conta, perfis));
  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const perfilEscolhido = perfis.find((p) => String(p.id_perfil) === String(form.id_perfil));
  const concedeAdmin = perfilEscolhido?.nome === 'Administrador';
  const revogaAdmin = tipo === 'perfil' && conta?.perfil === 'Administrador';
  const propria = conta?.id_usuario === idContaAtual;
  const voltar = conta && tipo !== 'gerenciar' && tipo !== 'aprovar' ? () => aoTrocarAcao('gerenciar') : aoCancelar;

  // Colaboradores ativos, mais o já vinculado (que pode ter sido desligado)
  const opcoesColaborador = [...colaboradores];
  if (conta?.id_colaborador && !colaboradores.some((c) => c.id_colaborador === conta.id_colaborador)) {
    opcoesColaborador.unshift({ id_colaborador: conta.id_colaborador, nome: `${conta.nome_colaborador} (desligado)` });
  }
  const escolhido = opcoesColaborador.find((c) => String(c.id_colaborador) === String(form.id_colaborador));

  function dadosDoColaborador() {
    if (form.modo_colaborador === 'existente') {
      return { id_colaborador: form.id_colaborador ? Number(form.id_colaborador) : null };
    }
    return {
      id_colaborador: null,
      colaborador_novo: {
        nome: form.colaborador_nome || form.nome || conta?.nome,
        id_setor: Number(form.colaborador_id_setor) || null,
        cargo: form.colaborador_cargo
      },
      confirmar_homonimo: form.confirmar_homonimo
    };
  }

  function enviar() {
    const colaborador = form.id_colaborador ? Number(form.id_colaborador) : null;
    const motivo = concedeAdmin ? form.motivo : undefined;
    const dados = {
      nova: { nome: form.nome, email: form.email, login: form.login, id_perfil: Number(form.id_perfil), motivo, ...dadosDoColaborador() },
      editar: { nome: form.nome, email: form.email, login: form.login, id_colaborador: colaborador },
      aprovar: { id_perfil: Number(form.id_perfil), motivo, ...dadosDoColaborador() },
      recusar: { motivo: form.motivo },
      perfil: { id_perfil: Number(form.id_perfil), motivo: form.motivo, data_efetiva: form.data_efetiva },
      situacao: { situacao: form.situacao, motivo: form.motivo }
    }[tipo];
    aoConfirmar(dados);
  }

  // Colaborador da conta: escolher um existente ou cadastrar junto
  const blocoColaborador = (
    <div className="campo">
      <span>Colaborador da conta *</span>
      <div className="alternador" role="group" aria-label="Colaborador">
        <button type="button" className={form.modo_colaborador === 'existente' ? 'ativo' : ''}
          onClick={() => setForm({ ...form, modo_colaborador: 'existente' })}>Já cadastrado</button>
        <button type="button" className={form.modo_colaborador === 'novo' ? 'ativo' : ''}
          onClick={() => setForm({ ...form, modo_colaborador: 'novo', id_colaborador: '' })}>Cadastrar agora</button>
      </div>
      {form.modo_colaborador === 'existente' ? (
        <>
          {escolhido ? (
            <ul className="lista-participantes">
              <li>
                <span>{escolhido.nome}<small>{[escolhido.cargo, escolhido.nome_setor].filter(Boolean).join(' · ')}</small></span>
                <button type="button" className="botao-texto" onClick={() => setForm({ ...form, id_colaborador: '' })}>Trocar</button>
              </li>
            </ul>
          ) : (
            <BuscaColaborador colaboradores={colaboradores} erro={erros.id_colaborador}
              placeholder="Pesquise o colaborador pelo nome..."
              aoEscolher={(c) => setForm({ ...form, id_colaborador: c.id_colaborador })} />
          )}
          <small className="dica">A conta reaproveita o cadastro existente; nenhum colaborador novo é criado.</small>
        </>
      ) : (
        <>
          <Campo rotulo="Nome do colaborador" erro={erros.colaborador_nome}>
            <input type="text" value={form.colaborador_nome} placeholder={form.nome || conta?.nome}
              onChange={mudar('colaborador_nome')} className={erros.colaborador_nome ? 'com-erro' : ''} />
          </Campo>
          <div className="dupla">
            <Campo rotulo="Setor *" erro={erros.colaborador_id_setor}>
              <select value={form.colaborador_id_setor} onChange={mudar('colaborador_id_setor')}
                className={erros.colaborador_id_setor ? 'com-erro' : ''}>
                <option value="">Selecione</option>
                {setores.map((s) => <option key={s.id_setor} value={s.id_setor}>{s.nome}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Cargo" erro={erros.colaborador_cargo}>
              <input type="text" value={form.colaborador_cargo} maxLength={80} onChange={mudar('colaborador_cargo')} />
            </Campo>
          </div>
          <small className="dica">O colaborador é criado com o e-mail da conta, na mesma operação que a conta.</small>
        </>
      )}
      {erros.id_colaborador && form.modo_colaborador === 'novo' && <small className="erro">{erros.id_colaborador}</small>}
      {homonimos?.length > 0 && form.modo_colaborador === 'novo' && (
        <div className="aviso">
          <strong>Já existe colaborador com este nome</strong>
          <ul>
            {homonimos.map((h) => (
              <li key={h.id_colaborador}>
                {h.nome} · {h.nome_setor}{h.cargo ? ` · ${h.cargo}` : ''}{h.ativo ? '' : ' · desligado'}
                {h.tem_conta ? ' · já tem conta' : (
                  <>
                    {' '}
                    <button type="button" className="botao-texto"
                      onClick={() => setForm({ ...form, modo_colaborador: 'existente', id_colaborador: h.id_colaborador })}>
                      Usar este cadastro
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          <label className="campo-check" style={{ marginTop: 8 }}>
            <input type="checkbox" checked={form.confirmar_homonimo}
              onChange={(e) => setForm({ ...form, confirmar_homonimo: e.target.checked })} />
            <span>É outra pessoa: cadastrar um novo colaborador com o mesmo nome.</span>
          </label>
        </div>
      )}
    </div>
  );

  const campoColaboradorEdicao = (
    <Campo rotulo="Colaborador vinculado" erro={erros.id_colaborador}
      dica="Conta e colaborador são cadastros separados; o vínculo é único.">
      <select value={form.id_colaborador} onChange={mudar('id_colaborador')} className={erros.id_colaborador ? 'com-erro' : ''}>
        <option value="">Nenhum</option>
        {opcoesColaborador.map((c) => (
          <option key={c.id_colaborador} value={c.id_colaborador}>{c.nome}{c.nome_setor ? ` · ${c.nome_setor}` : ''}</option>
        ))}
      </select>
    </Campo>
  );

  const campoPerfil = (
    <Campo rotulo="Perfil *" erro={erros.id_perfil} dica="Administrador ou Operador; as permissões de cada perfil são fixas.">
      <select value={form.id_perfil} onChange={mudar('id_perfil')} className={erros.id_perfil ? 'com-erro' : ''}>
        <option value="">Selecione</option>
        {perfis.map((p) => (
          <option key={p.id_perfil} value={p.id_perfil} disabled={tipo === 'perfil' && p.id_perfil === conta.id_perfil}>
            {p.nome}{tipo === 'perfil' && p.id_perfil === conta.id_perfil ? ' (atual)' : ''}
          </option>
        ))}
      </select>
    </Campo>
  );

  const rotuloMotivo = {
    perfil: 'Motivo da alteração de perfil *',
    recusar: 'Motivo da recusa (opcional)',
    situacao: form.situacao === 'inativo' ? 'Motivo da desativação (opcional)' : 'Motivo da reativação (opcional)'
  }[tipo] || 'Motivo da concessão do perfil Administrador *';
  const campoMotivo = (
    <Campo rotulo={rotuloMotivo} erro={erros.motivo}
      dica={concedeAdmin && tipo !== 'perfil' ? 'Conceder o perfil Administrador exige motivo (RN27).' : 'Fica registrado no histórico, neste evento.'}>
      <input type="text" value={form.motivo} onChange={mudar('motivo')} maxLength={255} className={erros.motivo ? 'com-erro' : ''} />
    </Campo>
  );

  const rotuloEnvio = {
    nova: 'Criar conta', editar: 'Salvar dados', aprovar: 'Aprovar conta', recusar: 'Recusar solicitação',
    perfil: 'Alterar perfil', situacao: form.situacao === 'inativo' ? 'Desativar conta' : 'Reativar conta'
  }[tipo];
  const perigo = tipo === 'recusar' || (tipo === 'situacao' && form.situacao === 'inativo');

  return (
    <form className="painel" noValidate onSubmit={(e) => { e.preventDefault(); if (tipo !== 'gerenciar') enviar(); }}>
      <header className="painel-cabecalho">
        <h2>{TITULOS[tipo]}</h2>
        {conta && (
          <span className="id-interno">
            {tipo === 'aprovar' || tipo === 'recusar'
              ? `${conta.nome} · solicitada em ${dataHora(conta.criada_em)}`
              : `${conta.nome} · ${conta.login}`}
          </span>
        )}
      </header>

      <div className="painel-corpo">
        {erroGeral && <div className="mensagem mensagem-erro">{erroGeral}</div>}

        {tipo === 'gerenciar' && (
          <>
            <dl className="lista-pares">
              <dt>E-mail</dt><dd>{conta.email}</dd>
              <dt>Perfil</dt><dd>{conta.perfil}{conta.troca_senha_obrigatoria ? ' · senha provisória pendente' : ''}</dd>
              <dt>Situação</dt><dd>{conta.situacao === 'ativo' ? 'Ativa' : 'Desativada'}</dd>
              <dt>Colaborador</dt><dd>{conta.nome_colaborador || 'sem colaborador vinculado'}</dd>
              <dt>Setor</dt><dd>{conta.nome_setor || '—'}</dd>
              <dt>Criada em</dt><dd>{dataHora(conta.criada_em)}</dd>
              {conta.nome_aprovador && (<><dt>Aprovada por</dt><dd>{conta.nome_aprovador} em {dataHora(conta.aprovada_em)}</dd></>)}
              {conta.troca_senha_obrigatoria && conta.senha_provisoria_expira_em && (
                <><dt>Senha provisória</dt><dd>válida até {dataHora(conta.senha_provisoria_expira_em)}</dd></>
              )}
            </dl>

            <h3 className="secao-painel">Operações</h3>
            <div className="acoes-painel">
              <button type="button" className="botao-secundario" onClick={() => aoTrocarAcao('editar')}>Editar dados</button>
              <button type="button" className="botao-secundario" onClick={() => aoTrocarAcao('perfil')}>Alterar perfil</button>
              {conta.situacao === 'ativo' && (
                <button type="button" className="botao-secundario" onClick={() => aoSenhaProvisoria(conta)}>Gerar senha provisória</button>
              )}
              {conta.situacao === 'ativo' && (
                <button type="button" className="botao-secundario" onClick={() => aoTransferir(conta)}>
                  {conta.perfil === 'Administrador' ? 'Transferir privilégios desta conta' : 'Transferir privilégios para esta conta'}
                </button>
              )}
            </div>
            <div className="zona-sensivel">
              <div>
                <strong>{conta.situacao === 'ativo' ? 'Desativar conta' : 'Reativar conta'}</strong>
                <p>
                  {conta.situacao === 'ativo'
                    ? 'A pessoa perde o acesso na hora. A conta não é excluída e o histórico é preservado.'
                    : `A conta volta a ter acesso com o perfil ${conta.perfil}.`}
                </p>
              </div>
              <button type="button" className={conta.situacao === 'ativo' ? 'botao-perigo-contorno' : 'botao-secundario'}
                disabled={propria && conta.situacao === 'ativo'}
                title={propria ? 'Você não pode desativar a sua própria conta' : undefined}
                onClick={() => aoTrocarAcao('situacao')}>
                {conta.situacao === 'ativo' ? 'Desativar' : 'Reativar'}
              </button>
            </div>
          </>
        )}

        {(tipo === 'nova' || tipo === 'editar') && (
          <>
            <Campo rotulo="Nome" erro={erros.nome}>
              <input type="text" value={form.nome} onChange={mudar('nome')} className={erros.nome ? 'com-erro' : ''} />
            </Campo>
            <div className="dupla">
              <Campo rotulo="Login" erro={erros.login}>
                <input type="text" value={form.login} onChange={mudar('login')} className={erros.login ? 'com-erro' : ''} />
              </Campo>
              <Campo rotulo="E-mail" erro={erros.email}>
                <input type="email" value={form.email} onChange={mudar('email')} className={erros.email ? 'com-erro' : ''} />
              </Campo>
            </div>
            {tipo === 'nova' && campoPerfil}
            {tipo === 'nova' ? blocoColaborador : campoColaboradorEdicao}
            {tipo === 'nova' && concedeAdmin && campoMotivo}
            {tipo === 'nova' && (
              <p className="nota">
                Conta e colaborador são gravados juntos, numa única operação. O sistema gera uma senha provisória,
                mostrada uma única vez; no primeiro acesso, a troca é obrigatória.
              </p>
            )}
          </>
        )}

        {tipo === 'aprovar' && (
          <>
            <dl className="lista-pares">
              <dt>Login</dt><dd>{conta.login}</dd>
              <dt>E-mail</dt>
              <dd>
                {conta.email}{' '}
                {conta.email.endsWith('@pristino.org.br')
                  ? <span className="pilula pilula-prazo">domínio válido</span>
                  : <span className="pilula">fora do domínio</span>}
              </dd>
              <dt>Setor informado</dt><dd>{conta.nome_setor_solicitado || '—'}</dd>
              <dt>Cargo informado</dt><dd>{conta.cadastro_cargo || '—'}</dd>
            </dl>
            {campoPerfil}
            {blocoColaborador}
            {concedeAdmin && campoMotivo}
            <p className="aviso-info">
              Ao aprovar, conta e colaborador são ligados numa única operação; se escolher “Cadastrar agora”,
              o colaborador é criado nesse momento, com os dados acima. A aprovação e quem aprovou ficam na auditoria.
            </p>
          </>
        )}

        {tipo === 'recusar' && (
          <>
            <p className="aviso">
              <strong>A solicitação de {conta.nome} será recusada.</strong>
              O pedido nunca teve acesso e é retirado da lista; o login e o e-mail ficam livres. A recusa fica no histórico.
            </p>
            {campoMotivo}
          </>
        )}

        {tipo === 'perfil' && (
          <>
            <div className="resumo-projeto">
              <div><span>Conta</span><strong>{conta.nome}</strong></div>
              <div><span>Perfil atual</span><strong>{conta.perfil}</strong></div>
            </div>
            {campoPerfil}
            <Campo rotulo="Data efetiva" erro={erros.data_efetiva}>
              <input type="date" value={form.data_efetiva} max={hoje()} onChange={mudar('data_efetiva')} className={erros.data_efetiva ? 'com-erro' : ''} />
            </Campo>
            {campoMotivo}
            <p className="aviso">
              <strong>As sessões abertas desta conta serão encerradas.</strong>
              {revogaAdmin
                ? ' Revogar o perfil Administrador só é possível se houver outro Administrador ativo (RN27).'
                : ' A alteração fica registrada no histórico.'}
              {propria && ' Você está alterando a sua própria conta e precisará entrar de novo.'}
            </p>
          </>
        )}

        {tipo === 'situacao' && (
          <>
            {form.situacao === 'inativo' ? (
              <p className="aviso">
                <strong>Desativar a conta de {conta.nome}?</strong>
                A pessoa perde o acesso na hora e as sessões abertas são encerradas. A conta não é excluída,
                para preservar o histórico.
                {conta.perfil === 'Administrador' && ' O último Administrador ativo não pode ser desativado (RN27).'}
              </p>
            ) : (
              <p className="aviso-info">A conta de {conta.nome} volta a ter acesso com o perfil {conta.perfil}.</p>
            )}
            {campoMotivo}
          </>
        )}
      </div>

      <footer className="painel-rodape">
        {tipo === 'aprovar' ? (
          <button type="button" className="botao-secundario botao-perigo" onClick={() => aoTrocarAcao('recusar')}>Recusar</button>
        ) : (
          <button type="button" className="botao-secundario" onClick={voltar}>
            {tipo === 'gerenciar' ? 'Fechar' : conta ? 'Voltar' : 'Cancelar'}
          </button>
        )}
        {tipo !== 'gerenciar' && (
          <button type="submit" className={`botao-principal ${perigo ? 'botao-principal-perigo' : ''}`}
            disabled={salvando}>
            {salvando ? 'Salvando...' : rotuloEnvio}
          </button>
        )}
      </footer>
    </form>
  );
}
