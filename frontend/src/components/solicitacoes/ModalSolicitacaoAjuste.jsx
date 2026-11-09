// Emitir solicitação de ajuste cadastral (Protótipo 2.7; RF_B10, RN36).
// O Operador, que não altera dados cadastrais, escolhe o cadastro afetado e
// descreve a correção. Solicitante, data e hora são gerados pelo sistema.
// Aberta pelo botão do painel ou pelo atalho "Solicitar ajuste" dos
// cadastros, que já chega com o registro escolhido.

import { useEffect, useState } from 'react';
import { Janela } from '../common/PainelLateral.jsx';
import Campo from '../common/Campo.jsx';
import useAuth from '../../hooks/useAuth';
import { tiposDeCadastro, opcoesDoCadastro, emitir } from '../../services/solicitacaoService';
import { mensagemDeErro } from '../../services/api';

function agora() {
  return new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).replace(',', '');
}

export default function ModalSolicitacaoAjuste({ inicial = null, aoFechar, aoEmitida }) {
  const { usuario } = useAuth();
  const [tipos, setTipos] = useState([]);
  const [opcoes, setOpcoes] = useState([]);
  const [form, setForm] = useState({
    entidade: inicial?.entidade || '',
    id_registro: inicial?.id_registro ? String(inicial.id_registro) : '',
    descricao: ''
  });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [momento] = useState(agora);

  useEffect(() => {
    tiposDeCadastro().then(setTipos).catch(() => setTipos([]));
  }, []);

  useEffect(() => {
    if (!form.entidade) {
      setOpcoes([]);
      return;
    }
    opcoesDoCadastro(form.entidade).then(setOpcoes).catch(() => setOpcoes([]));
  }, [form.entidade]);

  async function enviar() {
    setEnviando(true);
    setErros({});
    setErroGeral('');
    try {
      const solicitacao = await emitir({ ...form, id_registro: Number(form.id_registro) || null });
      aoEmitida(solicitacao);
    } catch (e) {
      if (e.corpo?.erros) setErros(e.corpo.erros);
      else setErroGeral(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  // O registro do atalho aparece mesmo antes de a lista carregar
  const opcoesComInicial = inicial && !opcoes.some((o) => o.id === inicial.id_registro)
    ? [{ id: inicial.id_registro, rotulo: inicial.rotulo }, ...opcoes]
    : opcoes;

  return (
    <Janela
      titulo="Emitir solicitação de ajuste"
      subtitulo={`Solicitante: ${usuario.nome} · ${momento} (gerado pelo sistema)`}
      aoFechar={aoFechar}
      aoEnviar={enviar}
      largo
      rodape={(
        <>
          <button type="button" className="botao-secundario" onClick={aoFechar}>Cancelar</button>
          <button type="submit" className="botao-principal" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar solicitação'}
          </button>
        </>
      )}
    >
      {erroGeral && <div className="mensagem mensagem-erro">{erroGeral}</div>}
      <div className="dupla">
        <Campo rotulo="Tipo de cadastro *" erro={erros.entidade}>
          <select
            value={form.entidade}
            onChange={(e) => setForm({ ...form, entidade: e.target.value, id_registro: '' })}
            className={erros.entidade ? 'com-erro' : ''}
          >
            <option value="">Selecione</option>
            {tipos.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Cadastro afetado *" erro={erros.id_registro}>
          <select
            value={form.id_registro}
            onChange={(e) => setForm({ ...form, id_registro: e.target.value })}
            disabled={!form.entidade}
            className={erros.id_registro ? 'com-erro' : ''}
          >
            <option value="">{form.entidade ? 'Selecione' : 'Escolha o tipo primeiro'}</option>
            {opcoesComInicial.map((o) => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
          </select>
        </Campo>
      </div>
      <Campo rotulo="Descrição do ajuste *" erro={erros.descricao}>
        <textarea
          value={form.descricao}
          maxLength={1000}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          placeholder="O que está errado e qual é o dado correto."
          className={erros.descricao ? 'com-erro' : ''}
          autoFocus={Boolean(inicial)}
        />
      </Campo>
      <p className="aviso-info">
        Somente um Administrador corrige o cadastro e conclui a solicitação. Situações: <strong>Pendente</strong> e{' '}
        <strong>Concluída</strong>. Todos os operadores acompanham as solicitações no painel.
      </p>
    </Janela>
  );
}
