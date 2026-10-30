# GESLIC — Sistema de Gestão de Licenças de Software e Apólices

Sistema do Instituto Prístino especificado na ERS versão 2.4 (`docs/ERS_GESLIC_v2.4.pdf`).

| Função | Autor |
|---|---|
| RF_B3 Gerenciar equipamentos | Rafael Celestino Tomiazi |
| RF_B6 Gerenciar projetos institucionais | Diogo Noboru Kamino |

Disciplina: Prática em Engenharia de Software I — 7PPA, Unoeste, 2/2026

## Tecnologias

Conforme a seção 2.3.3 da ERS: React (com Vite e React Router) na interface,
Node.js com Express nos serviços e MySQL 8 na persistência. Envio de e-mail
pelo nodemailer, só na recuperação de senha.

## Estrutura

```
geslic/
├── backend/                     API em Node + Express
│   ├── .env.example             modelo das variáveis de ambiente
│   ├── scripts/                 setup-db.js, migrate-db.js e redefinir-admin.js
│   ├── tests/                   testes automatizados (npm test)
│   └── src/
│       ├── server.js            inicia o servidor e testa o banco
│       ├── app.js               configura o Express (middlewares e rotas)
│       ├── config/              env.js (variáveis) e database.js (pool MySQL e transações)
│       ├── routes/              URL + verbo HTTP -> controller, com a permissão exigida
│       ├── controllers/         (C) recebe a requisição e devolve a resposta
│       ├── models/              (M) acesso ao banco e regras dos dados (*Model.js e *Validacao.js)
│       ├── middlewares/         autenticação e permissões, origem, limite de tentativas, erros, 404
│       └── utils/               AppError, NotImplementedError, senha, cookies, e-mail, pendente...
│
├── frontend/                    interface em React
│   └── src/
│       ├── main.jsx / App.jsx   ponto de entrada
│       ├── routes/              rotas públicas e protegidas, bloqueio por permissão
│       ├── pages/               (V) uma pasta por tela
│       ├── components/          layout/ (menu, barra) e common/ (reutilizáveis)
│       ├── services/            chamadas HTTP à API (um arquivo por recurso)
│       ├── context/             estado global (autenticação)
│       ├── hooks/               hooks customizados
│       ├── config/              menu e permissões de cada tela
│       ├── utils/               máscaras e regras de senha
│       └── styles/              CSS global
│
├── database/                    schema.sql, seed.sql, seed_dev.sql, migrations/ e README do banco
├── docs/                        ERS e documentos da fase de planejamento
└── package.json                 atalhos install:all, dev, db:*, admin:redefinir, test e build
```

Uma requisição percorre: `routes/` (exige sessão e a permissão da operação) →
`controller` (valida a entrada) → `model` (consulta o banco, aplica as regras e
grava o histórico) → resposta. Regras violadas lançam `AppError`, que o
`errorHandler` transforma em 400 (`erros` por campo), 401, 403, 404, 409, 429
ou 501 (`mensagem` e `codigo`).

## Como rodar

### 1. Configurar

Com o MySQL 8 instalado e rodando, na raiz do projeto:

```bash
npm run install:all
```

O comando instala as dependências da raiz, do backend e do frontend. Depois,
na pasta `backend`, copie o modelo do ambiente:

```
copy .env.example .env
```

Abra o `.env` e preencha ao menos `DB_SENHA`. As demais variáveis estão
explicadas no próprio arquivo.

### 2. Criar o banco (instalação nova)

Na raiz do projeto:

```bash
npm run db:setup            # banco + tabelas + dados de referência + usuário "admin"
npm run db:setup:exemplos   # o mesmo + dados de exemplo e usuários de teste
npm run db:reset            # APAGA o banco e recria tudo (aceita -- --exemplos)
```

`db:setup` e `db:setup:exemplos` não apagam nada: se o banco configurado em
`DB_NOME` já tiver tabelas, param e indicam o `db:migrate` ou o `db:reset`. O
`db:reset` é bloqueado com `NODE_ENV=production`.

| Arquivo / etapa | Conteúdo |
|---|---|
| `schema.sql` | as 28 tabelas do modelo relacional da ERS 2.4, mais sessões e recuperação de senha |
| `seed.sql` | perfis Administrador e Operador, catálogo de permissões e a matriz da RN21 |
| usuário `admin` | Administrador, com a senha de `ADMIN_SENHA` (`geslic123` em desenvolvimento). Com `ADMIN_SENHA` vazia, recebe senha provisória, mostrada uma vez, com troca obrigatória no primeiro acesso |
| `seed_dev.sql` | só com exemplos: 5 setores, 8 colaboradores, 15 equipamentos, 7 projetos e 3 licenças alocadas |
| usuários de teste | só com exemplos: `ana.ribeiro` (Administrador) e `carlos.alves` (Operador), senha `SENHA_USUARIOS_TESTE` (padrão `Geslic2026`) |

O modelo de dados, as decisões de modelagem, as migrações e o procedimento
de cópia de segurança estão em [`database/README.md`](database/README.md).

### 3. Atualizar um banco existente

Quem já tem o banco criado por uma versão anterior **não deve recriá-lo**:

```bash
npm run db:migrate
```

O comando aplica, em ordem, os scripts de `database/migrations/` que ainda
não foram aplicados (registrados na tabela `schema_migracao`), sem apagar
dados. Se não houver nenhum Administrador ativo, cria a conta `admin` (RN27).
Rodar de novo não faz nada.

| Migração | O que faz |
|---|---|
| `001_autenticacao.sql` | situação da conta (pendente, ativo, inativo), senha provisória, último acesso; tabelas `sessao` e `recuperacao_senha`; catálogo de permissões e matriz por perfil |
| `002_gatilhos_restauraveis.sql` | recria os gatilhos do histórico (RN22) com `BEGIN ... END`. Os antigos gravavam um `;` dentro do corpo, e o arquivo do `mysqldump` não podia ser restaurado |

Para mudar o banco daqui em diante: crie `database/migrations/NNN_descricao.sql`
e aplique a mesma mudança no `schema.sql`, para instalações novas.

### Senha do admin

Em desenvolvimento, a equipe usa a senha fixa **`admin` / `geslic123`**,
definida em `ADMIN_SENHA` no `backend/.env`. Para aplicar essa senha a uma conta
`admin` que já existe (ou recuperar o acesso quando ninguém consegue entrar
como Administrador, RN27 e Apêndice 3 da ERS):

```bash
npm run admin:redefinir
```

O comando aplica a senha de `ADMIN_SENHA` à conta `admin`, garante que ela
está ativa e com perfil Administrador, encerra as sessões abertas dela e
registra a redefinição no histórico. Outras contas e dados não são alterados.
Com `NODE_ENV=production`, os scripts recusam uma `ADMIN_SENHA` fraca como a de
desenvolvimento.

### 4. Subir a API e a interface

Na raiz do projeto, um comando sobe as duas partes juntas:

```bash
npm run dev            # API em http://localhost:3001 e interface em http://localhost:5173
```

Também dá para subir cada uma num terminal: `npm run dev:backend` e
`npm run dev:frontend`. Os dois recarregam ao salvar arquivos (a API usa
`node --watch`).

O sistema abre na tela de login. Se a porta 3001 estiver ocupada por outro
projeto, troque `PORTA` no `backend/.env` e suba a interface com `API_URL`
(PowerShell: `$env:API_URL="http://localhost:3002"; npm run dev:frontend`).
Ajuste `FRONTEND_URL` no `.env` da API se a interface mudar de endereço.

### Resumo dos comandos (na raiz)

| Comando | O que faz |
|---|---|
| `npm run install:all` | instala as dependências da raiz, do backend e do frontend |
| `npm run dev` | sobe a API e a interface juntas (`dev:backend` e `dev:frontend` sobem cada uma) |
| `npm run db:setup` / `db:setup:exemplos` | cria o banco do zero, sem apagar um banco existente |
| `npm run db:migrate` | atualiza um banco existente, sem apagar dados |
| `npm run db:reset` | apaga e recria o banco (bloqueado em produção) |
| `npm run admin:redefinir` | aplica a senha de `ADMIN_SENHA` à conta `admin` |
| `npm test` | testes da API, num banco descartável |
| `npm run build` | build da interface |

### 5. Testes

```bash
npm test          # testes da API (backend/tests), num banco descartável
npm run build     # build da interface
```

Os testes recriam, a cada arquivo, o banco `geslic_teste_automatico`
(outro nome com `DB_NOME_TESTE`, que precisa conter "teste"). O banco de
trabalho nunca é tocado. Cobrem: login válido e inválido, conta pendente e
desativada, aprovação, tentativa de autoconcessão de privilégio, 401 e 403,
Operador alterando ou excluindo cadastros, Operador no histórico e nas contas,
token de recuperação expirado e reutilizado, invalidação de sessões, último
Administrador, permissões configuráveis, limites de tentativas, imutabilidade
do histórico e os fluxos de equipamentos e projetos.

## Autenticação e sessões

**Estratégia: sessão no servidor com cookie HttpOnly.** No login, a API gera
um token aleatório de 256 bits, guarda **só o SHA-256** dele na tabela
`sessao` e envia o token num cookie `geslic_sessao` com as flags `HttpOnly`
(o JavaScript da página não lê, o que protege o token contra XSS),
`SameSite=Strict` (o cookie não acompanha requisições de outros sites, o que
protege contra CSRF), `Path=/api` e `Secure` em produção. Como reforço,
requisições de escrita com cabeçalho `Origin` diferente de `FRONTEND_URL` são
recusadas.

Toda requisição confere a sessão no banco e recarrega a conta com o perfil e as
permissões atuais. Por isso:

- **expiração:** validade máxima (`SESSAO_DURACAO_HORAS`) e inatividade
  (`SESSAO_INATIVIDADE_MINUTOS`);
- **logout** encerra a sessão no servidor: o mesmo cookie deixa de valer;
- **desativar a conta, alterar o perfil, redefinir a senha** (por e-mail ou
  senha provisória) encerram todas as sessões da conta. **Trocar a própria
  senha** encerra as outras e mantém a atual;
- **mudar as permissões de um perfil** vale já na requisição seguinte, sem
  novo login. A interface relê a conta a cada troca de tela e ao voltar para
  a aba.

Perfil e permissões vêm sempre do servidor. Não existe mais o seletor de perfil
nem o cabeçalho `X-Perfil`: um cliente que envie privilégios é ignorado
(coberto por teste).

Respostas: **401** sem sessão válida (a interface volta ao login e explica o
motivo); **403** com sessão válida, mas sem permissão (a interface mostra a
mensagem ou "Acesso negado"). Login com senha errada e login inexistente
recebem a mesma resposta. A situação da conta (pendente ou desativada) só é
informada a quem acertou a senha.

Senhas: **scrypt** com sal aleatório (`backend/src/utils/senha.js`), o mesmo
de antes. Regras para senhas novas: 8 ou mais caracteres, com minúscula,
maiúscula e número. Nenhuma resposta da API contém hash, senha ou token
(coberto por teste).

**Limite de tentativas** (em memória, zerado ao reiniciar a API): por padrão,
5 falhas de login por conta e 20 por endereço a cada 15 minutos; 5 pedidos de
recuperação por endereço e 3 por e-mail. Acima disso, 429.

## Contas de acesso (RF_B9)

- **Solicitar acesso** (tela pública): nome, e-mail, login, senha e
  confirmação, validados na interface e na API. A conta nasce **pendente**,
  como Operador e sem colaborador, e não entra até a aprovação. O que o cliente
  enviar sobre perfil, situação ou colaborador é ignorado.
- **Contas e perfis** (exclusiva do Administrador): busca e filtros por perfil
  e situação; aprovar a solicitação escolhendo o perfil e o colaborador
  vinculado (opcional, validado: existe, está ativo e não tem outra conta) ou
  recusá-la (é removida e fica no histórico); criar conta (o sistema gera
  senha provisória, mostrada uma vez, com troca obrigatória); editar nome,
  e-mail, login e colaborador; alterar perfil, com motivo e data efetiva
  (RN27); ativar e desativar; gerar senha provisória.
- **Proteções (RN27):** sempre resta um Administrador ativo. Rebaixar ou
  desativar o último é bloqueado, e ninguém desativa a própria conta. Conceder
  o perfil Administrador exige motivo. Ninguém concede perfil a si mesmo, já
  que só o Administrador gerencia perfis.
- **Matriz de permissões:** o Administrador tem sempre todas. As do Operador
  podem ser ajustadas, menos as exclusivas do Administrador (alterar e excluir
  cadastros, contas e histórico).
- **Minha conta:** cada pessoa atualiza nome e e-mail e troca a senha após
  confirmar a atual.
- Conta de acesso e colaborador continuam conceitos separados: nenhum cria o
  outro, e o vínculo é opcional e único.
- Todas as ações administrativas e as trocas de senha vão para o histórico,
  sem senha, hash ou token.

## Recuperação de senha

1. **Esqueci minha senha:** a pessoa informa o e-mail. A resposta é sempre a
   mesma, exista a conta ou não. Só contas ativas recebem o link.
2. A API gera um token aleatório, guarda só o hash, com validade de
   `RECUPERACAO_VALIDADE_MINUTOS` (padrão 30) e uso único. Um pedido novo
   invalida o anterior.
3. O link vai por e-mail: `FRONTEND_URL/redefinir-senha#token=...`. O token
   fica depois do `#`: não vai para registros do servidor web nem para o
   Referer, e a tela o retira do endereço assim que lê.
4. **Redefinir senha:** nova senha e confirmação. O token é consumido numa
   única instrução, e todas as sessões da conta são encerradas.

### Configurar o envio de e-mails

No `backend/.env`:

| Modo | Quando usar | Variáveis |
|---|---|---|
| `EMAIL_MODO=smtp` | homologação e produção | `SMTP_HOST`, `SMTP_PORTA` (587 com STARTTLS ou 465 com `SMTP_SEGURO=true`), `SMTP_USUARIO`, `SMTP_SENHA`, `EMAIL_REMETENTE` |
| `EMAIL_MODO=console` | **só desenvolvimento** | nenhuma: a mensagem, com o link, aparece no terminal da API e **não é enviada** |

O modo `console` é recusado com `NODE_ENV=production`. Sem SMTP configurado
em produção, a recuperação responde 503 ("não está configurada; peça a um
Administrador uma senha provisória"), sem fingir um envio. Se o SMTP falhar ao
enviar, o erro fica só no log do servidor, para a resposta não revelar se o
e-mail existe. Ao subir, a API avisa no terminal se a recuperação por e-mail
está indisponível e por quê.

## Matriz de permissões

Definida pela RN21, pelo Quadro 7 e pela RF_S7 da ERS, gravada nas tabelas
`permissao` e `perfil_permissao` e aplicada na API (`exigirPermissao` nas
rotas). A interface usa a mesma matriz para o menu, os botões e o bloqueio de
acesso pela URL.

| Função / tela | Acesso à página | Consultar | Incluir | Alterar | Excluir | Ações do domínio |
|---|---|---|---|---|---|---|
| Cadastros RF_B1 a RF_B8 | ambos (`cadastro.consultar`) | ambos | ambos (`cadastro.incluir`) | **Admin** (`cadastro.alterar`) | **Admin** (`cadastro.excluir`) | inativar / desligar: ambos (`cadastro.inativar`) |
| RF_B3 Equipamentos | ambos | ambos | ambos | **Admin** | **Admin** | inativar (descarte, RN08): ambos |
| RF_B6 Projetos | ambos | ambos | ambos | **Admin** | **Admin** | prorrogar (`projeto.prorrogar`) e encerrar (`projeto.encerrar`): ambos |
| Licenças RF_F1 a RF_F6, RF_S2 | ambos (`licenca.consultar`) | ambos | registrar: ambos (`licenca.registrar`) | correção: **Admin** | **Admin** | movimentar, renovar e inativar: ambos; confirmar exceção (`excecao.confirmar`): ambos |
| Apólices RF_F7 a RF_F10, RF_S4 | ambos (`apolice.consultar`) | ambos | registrar e vincular itens: ambos | correção: **Admin** | **Admin** | renovar e cancelar: ambos |
| Documentos PDF RF_F11 | — | ambos (`documento.gerenciar`) | anexar: ambos | — | — | — |
| Painel e relatórios RF_S1 a RF_S6 | ambos (`relatorio.consultar`) | ambos | — | — | — | — |
| Notificações RF_S8, preferências RF_B10, Minha conta | toda conta | só a própria | — | só a própria | — | — |
| Histórico RF_S7 / RF_F13 | **Admin** (`auditoria.consultar`) | **Admin** | automático para todas as contas | imutável | imutável | — |
| Contas e perfis RF_B9 | **Admin** (`usuario.gerenciar`) | **Admin** | **Admin** | **Admin** | só solicitação recusada | aprovar, perfil, situação, senha provisória: **Admin** |
| Dados sensíveis (chave de ativação) | — | só perfil com `visualiza_dados_sensiveis` (Administrador) | — | — | — | — |

"Ambos" = Operador e Administrador. As permissões do Operador podem ser
ajustadas em Contas e perfis, sem incluir as exclusivas do Administrador.
Prorrogar, encerrar e inativar são ações operacionais com permissão própria:
não são bloqueadas por "alterar cadastro" só porque gravam um UPDATE.
Dados sensíveis são filtrados na API (`exigirDadosSensiveis` na rota da chave
de ativação), não só escondidos na tela. O histórico grava sem campos de
senha, hash, token ou chave.

## O que está pronto e o que está só estruturado

**Completo:**

- Autenticação: login, sessão, logout, expiração, restauração ao recarregar,
  troca obrigatória de senha provisória.
- RF_B9 Contas e perfis: solicitação de acesso, aprovação, gerenciamento,
  matriz de permissões e Minha conta.
- Recuperação de senha por e-mail.
- RF_B3 Equipamentos: CRUD, validações, RN08, RN22, inativação pelo Operador e
  histórico.
- RF_B6 Projetos: CRUD, participantes, prorrogação, encerramento, RN17, RN18,
  RN22 e histórico.
- RF_S7 Histórico: consulta real com filtros e paginação, só para o
  Administrador.
- RF_F13: gravação automática, por enquanto nas operações que existem (contas,
  perfis, equipamentos e projetos).

**Estruturado (tela, serviço, rotas da API com autenticação e permissões,
controller e model), com a API respondendo `501 Não implementado`:**

- RF_B1 Fornecedores e seguradoras, RF_B2 Softwares, RF_B7 Bens seguráveis e
  RF_B8 Tipos de seguro e coberturas.
- RF_B4 Colaboradores e RF_B5 Setores: a lista dos ativos já funciona e
  alimenta as telas de equipamentos e projetos; o cadastro completo responde
  501.
- RF_B10 Preferências de notificação (na tela Minha conta).
- RF_F1 a RF_F6 Licenças, RF_F7 a RF_F10 Apólices e RF_F11 Documentos PDF.
- RF_S1 Painel (a tela inicial mostra conta e atalhos, sem números simulados),
  RF_S2 a RF_S6 Relatórios e RF_S8 Notificações.

**Ainda não estruturado:** RF_F12, a rotina diária de situações e avisos. É
uma função oculta, sem tela; fica para quando licenças e apólices existirem.

As telas em desenvolvimento aparecem no menu com a marca "em breve" e mostram o
que a função vai fazer e quais operações a conta poderá executar. Nenhuma
devolve sucesso, lista vazia ou dado de demonstração no lugar do resultado.

## Interface

O visual segue os protótipos do Apêndice 2 da ERS, com os ajustes do
feedback do Instituto (Apêndice 4). As cores e medidas ficam como variáveis no
início de `frontend/src/styles/global.css`.

- **Acesso ao sistema (Protótipo 1):** tela dividida, com o painel verde da
  marca à esquerda e o cartão "Entrar no sistema" à direita. As outras telas
  públicas usam a mesma moldura.
- **Menu lateral (Protótipo 2):** fundo verde-escuro, grupos Painel, Licenças,
  Apólices, Cadastros, Consultas e Conta, filtrados pelas permissões, com a
  conta e o botão Sair no rodapé. Um ponto marca as telas em desenvolvimento.
- **Barra superior:** caminho de navegação ("Instituto Prístino / Cadastros /
  Equipamentos"), sino de notificações e a conta, com avatar e perfil.
- **Módulos:** Licenças em verde e Apólices em azul, com o rótulo do módulo
  acima do título e a cor do módulo no botão principal e no item ativo do menu.
- **Conteúdo:** fundo cinza-claro, cartões brancos arredondados, filtros num
  cartão, tabelas com cabeçalho cinza e etiquetas em pílula para situação,
  prazo e perfil. As operações abrem em painéis laterais e janelas flutuantes.

As telas foram conferidas em 1280×800: o menu completo cabe na altura, e
nenhuma tabela tem rolagem horizontal.

## Divergências em relação à ERS

- **Solicitação de acesso:** o Protótipo 1 diz que não há autocadastro. Por
  decisão da equipe, existe a solicitação pública, mas a conta só ganha acesso
  quando um Administrador aprova, define o perfil e o vínculo. Assim continua
  valendo que as contas passam pelo Administrador (RF_B9).
- **E-mail:** a seção 2.3.1 deixa o envio de notificações por e-mail fora
  desta versão. O e-mail é usado **só** na recuperação de senha. A senha
  provisória gerada pelo Administrador, prevista no Protótipo 13, também
  existe, inclusive para quando o SMTP não estiver configurado.

---

# RF_B3 — Gerenciar equipamentos

Autor: Rafael Celestino Tomiazi. Especificação: ERS 2.4 (RF_B3, RN08, RN20,
RN22 e protótipo 7).

## Endpoints

| Método | Caminho | Permissão |
|---|---|---|
| GET | `/api/equipamentos` (filtros: busca, id_setor, situacao, uso_geral) | `cadastro.consultar` |
| GET | `/api/equipamentos/:id` e `/:id/previa-inativacao` | `cadastro.consultar` |
| POST | `/api/equipamentos` | `cadastro.incluir` |
| POST | `/api/equipamentos/:id/inativacao` | `cadastro.inativar` (Operador e Administrador) |
| PUT | `/api/equipamentos/:id` | `cadastro.alterar` (Administrador) |
| DELETE | `/api/equipamentos/:id` | `cadastro.excluir` (Administrador) |

Como o equipamento é especialização de bem no modelo relacional, toda escrita
grava nas duas tabelas dentro de uma transação, junto com o evento do
histórico.

## Validações

| Regra | Origem na ERS |
|---|---|
| Etiqueta do Instituto obrigatória, no formato `IP0000`, e única | RN20 |
| Etiqueta NetScanner opcional (`NS-000000`), única quando preenchida | RN20 |
| Comparação sem diferenciar maiúsculas, minúsculas e espaços extras | RN19 |
| Identificação, tipo e setor obrigatórios | RF_B3 |
| Equipamento de uso geral não tem responsável nominal | RF_B3 |
| Exclusão bloqueada quando o equipamento já recebeu licença | RN22 |
| Ao inativar, instâncias não transferíveis alocadas ficam inativas | RN08 |

## Dados de demonstração

- equipamentos ativos e inativos, para o filtro de situação ter efeito
- dois equipamentos de uso geral, sem responsável nominal
- IP0101 e IP0109 com licença transferível alocada
- IP0106 com licença não transferível alocada, para demonstrar a RN08
- etiquetas livres a partir de IP0114

---

# RF_B6 — Gerenciar projetos institucionais

Autor: Diogo Noboru Kamino. Especificação: ERS 2.4 (RF_B6, RN17, RN18, RN19,
RN21, RN22 e protótipo 10).

## Endpoints

| Método | Caminho | Permissão |
|---|---|---|
| GET | `/api/projetos` (filtros: busca, situacao, id_responsavel, fonte, prazo, ano, semestre) | `cadastro.consultar` |
| GET | `/api/projetos/fontes` e `/api/projetos/:id` (com participantes) | `cadastro.consultar` |
| POST | `/api/projetos` | `cadastro.incluir` |
| POST | `/api/projetos/:id/prorrogacao` | `projeto.prorrogar` (Operador e Administrador) |
| POST | `/api/projetos/:id/encerramento` | `projeto.encerrar` (Operador e Administrador) |
| PUT | `/api/projetos/:id` | `cadastro.alterar` (Administrador) |
| DELETE | `/api/projetos/:id` | `cadastro.excluir` (Administrador) |

## Validações

| Regra | Origem na ERS |
|---|---|
| Código obrigatório, exatamente 4 dígitos, informado pelo usuário | RN19 |
| Código único | Quadro de restrições (3.3.1) |
| Nome obrigatório e único, sem diferenciar maiúsculas, minúsculas e espaços extras | RN19 |
| Fonte financiadora e início obrigatórios | RF_B6 |
| Datas válidas (31/02 é recusado) | — |
| Término previsto não anterior ao início | 3.3.1 |
| Responsável obrigatório, colaborador ativo | RF_B6 |
| Participantes: colaboradores já cadastrados; desligado não entra como novo participante | RF_B4, RF_B6 |
| Prorrogação só para projeto em andamento e para data posterior ao término atual | RF_B6 |
| Encerramento manual, com data não anterior ao início e não futura | RN17 |
| Encerrar não transfere, renova nem cancela licenças e instâncias | RN18 |
| Alterar e excluir somente pelo Administrador | RN21 |
| Exclusão bloqueada com licenças, instâncias ou participantes vinculados | RN22 |

No histórico, a data efetiva do encerramento é a data informada, e não a do
registro.

## Filtros

Busca por código, nome ou fonte, combinada com situação, prazo do término
(termina nos próximos 6 meses, vencido, sem término), responsável, fonte
financiadora e período de vigência: **Vigente em** um ano, inteiro ou por
semestre, traz os projetos que estiveram em andamento em ao menos um dia do
período. A listagem mostra o aviso de prazo no término previsto (antecedência
padrão de 6 meses, RN24) e os recursos vinculados de cada projeto.

## Dados de demonstração

- 1023 CAOMA 2025–2026: termina em poucos meses (aviso amarelo)
- 1301 Monitoramento do Rio Paraná: em andamento com término vencido (aviso vermelho)
- 1022 CAOMA 2024–2025: encerrado, com licença ainda vinculada (RN18)
- 1450 Educação Ambiental nas Escolas: sem vínculos, pode ser excluído
- 0007 Programa Prístino: sem término previsto
- códigos livres para cadastrar na hora: 1500 em diante
