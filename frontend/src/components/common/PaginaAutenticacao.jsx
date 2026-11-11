// Moldura das telas públicas de autenticação (login, solicitação de acesso,
// esqueci e redefinir senha), no padrão do Protótipo 1 da ERS, com o visual
// escolhido para o login: fotografia de paisagem no fundo e um único cartão
// gelo, sem divisórias, em duas partes. À esquerda, a logo completa do
// Instituto (legível sobre o gelo), "GESLIC" e o título; à direita, o
// rótulo "Acesso ao sistema", o formulário e os links.

import logoPristino from '../../assets/logo-pristino.png';

export default function PaginaAutenticacao({ titulo, subtitulo, children, larga = false }) {
  return (
    <main className={`pagina-autenticacao ${larga ? 'pagina-autenticacao-larga' : ''}`}>
      <div className="cartao-autenticacao-duplo">
        <section className="autenticacao-marca">
          <img src={logoPristino} alt="Instituto Prístino" width="170" height="139" />
          <strong>GESLIC</strong>
          <h2>Gestão de licenças de software e apólices</h2>
          <p>
            Licenças, apólices e documentos do Instituto num só lugar, com avisos
            de vencimento.
          </p>
        </section>

        <section className="cartao-autenticacao">
          <div className="cartao-autenticacao-faixa">Acesso ao sistema</div>
          <h1>{titulo}</h1>
          {subtitulo && <p className="subtitulo">{subtitulo}</p>}
          {children}
        </section>
      </div>

      <p className="autenticacao-rodape">Instituto Prístino · Acesso restrito a colaboradores</p>
    </main>
  );
}
