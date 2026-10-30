// Painel lateral das ações sobre uma conta:
//   nova      criar conta (senha provisória gerada pelo sistema)
//   editar    nome, e-mail, login e colaborador vinculado
//   aprovar   aprovar a solicitação, escolhendo perfil e colaborador
//   recusar   recusar a solicitação (é removida)
//   perfil    conceder ou revogar perfil, com motivo e data efetiva (RN27)
//   situacao  desativar ou reativar

import { useState } from 'react';
import Campo from '../../components/common/Campo.jsx';

const TITULOS = {
  nova: 'Nova conta',
  editar: 'Editar conta',
  aprovar: 'Aprovar solicitação de acesso',
  recusar: 'Recusar solicitação de acesso',
  perfil: 'Alterar perfil',
  situacao: 'Situação da conta'
};

const hoje = () => new Date().toISOString().slice(0, 10);

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
    situacao: conta?.situacao === 'ativo' ? 'inativo' : 'ativo'
  };
}

export default function PainelConta({ tipo, conta, perfis, colaboradores, erros, salvando, idContaAtual, aoConfirmar, aoCancelar }) {
  const [form, setForm] = useState(() => formInicial(tipo, conta, perfis));
  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const perfilEscolhido = perfis.find((p) => String(p.id_perfil) === String(form.id_perfil));
  const concedeAdmin = perfilEscolhido?.nome === 'Administrador';
  const revogaAdmin = tipo === 'perfil' && conta?.perfil === 'Administrador';
  const propria = conta?.id_usuario === idContaAtual;

  // Colaboradores ativos, mais o já vinculado (que pode ter sido desligado)
  const opcoesColaborador = [...colaboradores];
  if (conta?.id_colaborador && !colaboradores.some((c) => c.id_colaborador === conta.id_colaborador)) {
    opcoesColaborador.unshift({ id_colaborador: conta.id_colaborador, nome: `${conta.nome_colaborador} (desligado)` });
  }

  function enviar(evento) {
    evento.preventDefault();
    const colaborador = form.id_colaborador ? Number(form.id_colaborador) : null;
    const dados = {
      nova: { nome: form.nome, email: form.email, login: form.login, id_perfil: Number(form.id_perfil), id_colaborador: colaborador, motivo: form.motivo },
      editar: { nome: form.nome, email: form.email, login: form.login, id_colaborador: colaborador },
      aprovar: { id_perfil: Number(form.id_perfil), id_colaborador: colaborador, motivo: form.motivo },
      recusar: { motivo: form.motivo },
      perfil: { id_perfil: Number(form.id_perfil), motivo: form.motivo, data_efetiva: form.data_efetiva },
      situacao: { situacao: form.situacao, motivo: form.motivo }
    }[tipo];
    aoConfirmar(dados);
  }

  const campoColaborador = (
    <Campo rotulo="Colaborador vinculado (opcional)" erro={erros.id_colaborador}
      dica="A conta de acesso e o cadastro de colaborador são separados; o vínculo é opcional e único.">
      <select value={form.id_colaborador} onChange={mudar('id_colaborador')} className={erros.id_colaborador ? 'com-erro' : ''}>
        <option value="">Nenhum</option>
        {opcoesColaborador.map((c) => (
          <option key={c.id_colaborador} value={c.id_colaborador}>{c.nome}{c.nome_setor ? ` · ${c.nome_setor}` : ''}</option>
        ))}
      </select>
    </Campo>
  );

  const campoPerfil = (
    <Campo rotulo="Perfil" erro={erros.id_perfil}>
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

  const motivoObrigatorio = tipo === 'perfil' || concedeAdmin;
  const campoMotivo = (
    <Campo rotulo={`Motivo${motivoObrigatorio ? '' : ' (opcional)'}`} erro={erros.motivo}
      dica={concedeAdmin ? 'Conceder o perfil Administrador exige motivo (RN27).' : 'Fica registrado no histórico.'}>
      <input type="text" value={form.motivo} onChange={mudar('motivo')} maxLength={255} className={erros.motivo ? 'com-erro' : ''} />
    </Campo>
  );

  return (
    <form className="painel" onSubmit={enviar} noValidate>
      <header className="painel-cabecalho">
        <h2>{TITULOS[tipo]}</h2>
        {conta && <span className="id-interno">{conta.login}</span>}
      </header>

      <div className="painel-corpo">
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
            {campoColaborador}
            {tipo === 'nova' && campoMotivo}
            {tipo === 'nova' && (
              <p className="nota">
                O sistema gera uma senha provisória, mostrada uma única vez. No primeiro acesso, a troca é obrigatória.
              </p>
            )}
            {tipo === 'editar' && <p className="nota">Perfil e situação têm ações próprias, com motivo e registro no histórico.</p>}
          </>
        )}

        {tipo === 'aprovar' && (
          <>
            <div className="resumo-projeto">
              <div><span>Nome</span><strong>{conta.nome}</strong></div>
              <div><span>E-mail</span><strong>{conta.email}</strong></div>
            </div>
            {campoPerfil}
            {campoColaborador}
            {campoMotivo}
          </>
        )}

        {tipo === 'recusar' && (
          <>
            <p className="aviso">
              <strong>A solicitação de {conta.nome} será removida.</strong>
              O login e o e-mail ficam livres para uma nova solicitação. A recusa fica no histórico.
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
        <button type="button" className="botao-secundario" onClick={aoCancelar}>Cancelar</button>
        <button type="submit" className={`botao-principal ${['recusar'].includes(tipo) || form.situacao === 'inativo' && tipo === 'situacao' ? 'botao-principal-perigo' : ''}`} disabled={salvando}>
          {salvando ? 'Salvando...' : {
            nova: 'Criar conta', editar: 'Salvar', aprovar: 'Aprovar', recusar: 'Recusar solicitação',
            perfil: 'Alterar perfil', situacao: form.situacao === 'inativo' ? 'Desativar' : 'Reativar'
          }[tipo]}
        </button>
      </footer>
    </form>
  );
}
