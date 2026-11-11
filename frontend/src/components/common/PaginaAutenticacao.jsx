// Moldura das telas públicas de autenticação (login, solicitação de acesso,
// esqueci e redefinir senha), no padrão do Protótipo 1 da ERS, com o visual
// escolhido para o login (opção 09): fundo azul da marca com a faixa das
// quatro cores da logo, a marca à esquerda e o formulário num cartão gelo
// dividido em blocos (faixa "Acesso ao sistema", conteúdo e links no rodapé).

import simboloPristino from '../../assets/simbolo-pristino.png';

export default function PaginaAutenticacao({ titulo, subtitulo, children, larga = false }) {
  return (
    <main className={`pagina-autenticacao ${larga ? 'pagina-autenticacao-larga' : ''}`}>
      <section className="autenticacao-marca">
        <img src={simboloPristino} alt="Instituto Prístino" width="150" height="150" />
        <strong>GESLIC</strong>
        <h2>Gestão de licenças de software e apólices</h2>
        <p>
          Licenças, apólices e documentos do Instituto num só lugar, com avisos
          de vencimento.
        </p>
      </section>

      <div className="autenticacao-divisor" aria-hidden="true" />

      <section className="autenticacao-formulario">
        <div className="cartao-autenticacao">
          <div className="cartao-autenticacao-faixa">Acesso ao sistema</div>
          <h1>{titulo}</h1>
          {subtitulo && <p className="subtitulo">{subtitulo}</p>}
          {children}
        </div>
      </section>

      <p className="autenticacao-rodape">Instituto Prístino · Acesso restrito a colaboradores</p>
    </main>
  );
}
