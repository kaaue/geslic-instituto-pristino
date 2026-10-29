# GESLIC — funções básicas (sprint do módulo 4)

Implementação das funções básicas do GESLIC, Sistema de Gestão de Licenças de
Software e Apólices do Instituto Prístino.

| Função | Autor |
|---|---|
| RF_B3 Gerenciar equipamentos | Rafael Celestino Tomiazi |
| RF_B6 Gerenciar projetos institucionais | Diogo Noboru Kamino |
Disciplina: Prática em Engenharia de Software I — 7PPA, Unoeste, 2/2026

## Tecnologias

Conforme a seção 2.3.3 da ERS: React na interface, Node.js com Express nos
serviços e MySQL na persistência.

## Estrutura

```
geslic/
├── backend/                     API em Node + Express
│   ├── .env.example             modelo das variáveis de ambiente
│   ├── scripts/setup-db.js      cria o banco, as tabelas e as contas (npm run db:*)
│   └── src/
│       ├── server.js            inicia o servidor e testa o banco
│       ├── app.js               configura o Express (middlewares e rotas)
│       ├── config/              env.js (variáveis) e database.js (pool MySQL e transações)
│       ├── routes/              mapeia URL + verbo HTTP para um controller
│       ├── controllers/         (C) recebe a requisição e devolve a resposta
│       ├── models/              (M) acesso ao banco e regras dos dados (*Model.js e *Validacao.js)
│       ├── middlewares/         autenticação (perfil), erros e rota não encontrada
│       └── utils/               AppError, NotImplementedError, asyncHandler, normalização e senha
│
├── frontend/                    interface em React
│   └── src/
│       ├── main.jsx / App.jsx   ponto de entrada
│       ├── routes/              rotas das telas e proteção por login
│       ├── pages/               (V) uma pasta por tela, com os componentes só dela
│       ├── components/          layout/ (menu, estrutura) e common/ (reutilizáveis)
│       ├── services/            chamadas HTTP à API (um arquivo por recurso)
│       ├── context/             estado global (autenticação)
│       ├── hooks/               hooks customizados
│       ├── config/              configuração de navegação (menu)
│       ├── utils/               máscaras dos campos
│       └── styles/              CSS global
├── docs/                        documentos da fase de planejamento, diagramas, ERS
│
├── database/                    schema.sql, seed.sql e seed_dev.sql
└── package.json                 atalhos db:setup, db:setup:exemplos e db:reset
```

### Como uma requisição percorre o backend

`routes/` escolhe o controller e aplica o middleware de perfil quando a rota é
exclusiva do Administrador → o `controller` valida a entrada e chama o
`model` → o `model` consulta o banco e aplica as regras (RN08, RN22...),
lançando um `AppError` quando uma regra é violada → o middleware
`errorHandler` transforma o `AppError` na resposta (400 com `erros` por campo,
ou 403/404/409 com `mensagem`).

## Como rodar

### 1. Configurar o backend

Com o MySQL já instalado e rodando, na pasta `backend`:

```
copy .env.example .env
```

Abra o `.env` e preencha `DB_SENHA` com a senha do root do seu MySQL. Depois:

```
npm install
```

### 2. Criar o banco

Com o `backend/.env` configurado, na raiz do projeto:

```bash
npm run db:setup            # banco + tabelas + dados de referência + usuário "admin"
npm run db:setup:exemplos   # o mesmo + dados de exemplo e usuários de teste
npm run db:reset            # APAGA o banco e recria tudo (use quando o schema mudar)
```

`db:setup` e `db:setup:exemplos` não apagam nada: se o banco configurado em
`DB_NOME` (padrão `geslic`) já tiver tabelas, eles param e indicam o
`db:reset`. O `db:reset` recria sem os dados de exemplo; para recriar com
eles, use `npm run db:reset -- --exemplos`.

Os comandos rodam os arquivos da pasta `database/` e criam as contas:

| Arquivo / etapa | Conteúdo |
|---|---|
| `schema.sql` | as 28 tabelas do modelo relacional da ERS 2.4, com restrições e gatilhos |
| `seed.sql` | dados de referência: perfis Administrador e Operador e suas permissões |
| usuário `admin` | perfil Administrador; senha de `ADMIN_SENHA` no `.env` ou, se vazia, gerada e mostrada uma única vez |
| `seed_dev.sql` | só com exemplos: 5 setores, 8 colaboradores, 15 equipamentos, 7 projetos e 3 licenças alocadas |
| usuários de teste | só com exemplos: `ana.ribeiro` (Administrador) e `carlos.alves` (Operador), com a senha de `SENHA_USUARIOS_TESTE` |

As senhas são gravadas só como hash (scrypt, em `backend/src/utils/senha.js`).
As telas atuais (RF_B3 e RF_B6) usam os dados de exemplo; sem eles, as
listagens começam vazias.

### 3. Subir a API

```
npm start
```

A API sobe em `http://localhost:3001`. Para conferir se ela enxerga o banco,
abra `http://localhost:3001/api/saude` no navegador: deve responder
`{"api":"ok","banco":"ok"}`.

### 4. Subir a interface

Em outro terminal, na pasta `frontend`:

```
npm install
npm run dev
```

A tela abre em `http://localhost:5173`. Se a API estiver em outra porta que
não a 3001, suba o front com a variável `API_URL` (no PowerShell:
`$env:API_URL="http://localhost:3002"; npm run dev`). As abas no topo alternam entre
Equipamentos (RF_B3) e Projetos (RF_B6); `http://localhost:5173/#projetos` abre
direto na tela de projetos.

## O que está implementado

### CRUD

Inclusão, consulta, alteração e exclusão de equipamentos. Como o equipamento é
uma especialização de bem no modelo relacional, toda escrita grava nas duas
tabelas dentro de uma transação: ou as duas gravam, ou nenhuma grava.

### Validações

| Regra | Origem na ERS |
|---|---|
| Etiqueta do Instituto obrigatória e única | RN20 |
| Etiqueta NetScanner opcional, única quando preenchida | RN20 |
| Comparação sem diferenciar maiúsculas, minúsculas e espaços extras | Quadro 9 |
| Identificação, tipo e setor obrigatórios | RF_B3 |
| Equipamento de uso geral não tem responsável nominal | RF_B3 |
| Patrimônio somente numérico | — |
| Valor não negativo | — |
| Exclusão bloqueada quando o equipamento já recebeu licença | RN22 |
| Ao inativar, instâncias não transferíveis alocadas ficam inativas | RN08 |

### Máscaras

- Etiqueta do Instituto: `PRI-0000`
- Etiqueta NetScanner: `NS-000000`
- Patrimônio: somente dígitos
- Valor: moeda no padrão brasileiro, com separador de milhar e centavos

### Filtros da consulta

Busca livre por etiqueta, identificação ou tipo, combinada com filtros de setor,
situação e uso geral. A contagem de resultados é exibida abaixo dos filtros.

## Dados de demonstração

A carga inicial foi montada para a apresentação:

- equipamentos ativos e inativos, para o filtro de situação ter efeito
- dois equipamentos de uso geral, sem responsável nominal
- equipamentos com e sem etiqueta NetScanner
- PRI-0101 e PRI-0109 com licença transferível alocada
- PRI-0106 com licença não transferível alocada, para demonstrar a RN08
- etiquetas livres a partir de PRI-0114, para cadastrar na hora sem conflito

---

# RF_B6 — Gerenciar projetos institucionais

Autor: Diogo Noboru Kamino. Especificação: ERS versão 2.4 (RF_B6, RN17, RN18,
RN19, RN21, RN22 e protótipo 10).

## Arquivos

```
backend/src/routes/projetoRoutes.js            endpoints e perfil exigido em cada um
backend/src/controllers/projetoController.js   entrada e resposta
backend/src/models/projetoModel.js             consultas e regras (RN17, RN18, RN19, RN22)
backend/src/models/projetoValidacao.js         regras de validação dos campos
backend/src/middlewares/auth.js                perfis Administrador e Operador (RN21)
frontend/src/pages/Projetos/                   tela, filtros, tabela, formulário e janela de ações
frontend/src/services/projetoService.js        chamadas à API
```

A barra superior, as abas e o seletor de perfil ficam em
`components/layout/`; o perfil escolhido vive no `AuthContext`.

## Endpoints

| Método | Caminho | Perfil |
|---|---|---|
| GET | `/api/projetos` (filtros: busca, situacao, id_responsavel, fonte, prazo, ano, semestre) | ambos |
| GET | `/api/projetos/fontes` | ambos |
| GET | `/api/projetos/:id` (com a lista de participantes) | ambos |
| POST | `/api/projetos` | ambos |
| PUT | `/api/projetos/:id` | Administrador |
| POST | `/api/projetos/:id/prorrogacao` | ambos |
| POST | `/api/projetos/:id/encerramento` | ambos |
| DELETE | `/api/projetos/:id` | Administrador |

## Perfis

O login com conta individual chega com a RF_B9. Até lá, o seletor **Perfil** da
barra superior simula a conta: a interface envia o perfil no cabeçalho
`X-Perfil` e a **API** aplica a regra (responde 403 ao Operador em alteração e
exclusão). Assim a regra já está no servidor; com o login, só muda a origem do
perfil.

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

## Máscaras

- Código: só dígitos, até 4
- Datas: `dd/mm/aaaa`, com as barras inseridas enquanto se digita
- Fonte financiadora: sugere as fontes já cadastradas

## Filtros

Busca por código, nome ou fonte, combinada com situação, prazo do término
(termina nos próximos 6 meses, vencido, sem término), responsável, fonte
financiadora e período de vigência: **Vigente em** um ano, inteiro ou por
semestre, traz os projetos que estiveram em andamento em ao menos um dia do
período (o encerrado conta até o encerramento; o em andamento, até o término
previsto ou, se vencido, até hoje). A listagem mostra o aviso de prazo no término previsto (antecedência
padrão de 6 meses, RN24) e os recursos vinculados de cada projeto.

## Dados de demonstração

- 1023 CAOMA 2025–2026: termina em poucos meses (aviso amarelo)
- 1301 Monitoramento do Rio Paraná: em andamento com término vencido (aviso vermelho)
- 1022 CAOMA 2024–2025: encerrado, com licença ainda vinculada (RN18)
- 1450 Educação Ambiental nas Escolas: sem vínculos, pode ser excluído
- 0007 Programa Prístino: sem término previsto
- códigos livres para cadastrar na hora: 1500 em diante