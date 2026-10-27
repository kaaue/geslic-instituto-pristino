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
backend/            API em Node.js com Express
  sql/              scripts do banco
  src/
    servidor.js     sobe a API
    banco.js        conexão com o MySQL
    validacao.js    regras de validação da RF_B3
    rotas/          endpoints
frontend/           interface em React com Vite
  src/
    App.jsx         tela de equipamentos
    api.js          chamadas à API
    mascaras.js     máscaras dos campos
    componentes/    filtros, tabela e formulário
```

## Como rodar

### 1. Criar o banco

Com o MySQL já instalado e rodando, abra o terminal na pasta `backend` e execute:

```
mysql -u root -p --default-character-set=utf8mb4 < sql/01_schema.sql
mysql -u root -p --default-character-set=utf8mb4 < sql/02_carga.sql
mysql -u root -p --default-character-set=utf8mb4 < sql/03_projetos.sql
```

No Windows, se o comando `mysql` não for reconhecido, use o caminho completo:

```
& "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -p --default-character-set=utf8mb4 -e "source sql/01_schema.sql"
```

O primeiro script cria o banco `geslic` e as tabelas. O segundo carrega os dados
de demonstração: 5 setores, 8 colaboradores, 15 equipamentos e 3 licenças
alocadas.

### 2. Configurar e subir a API

Na pasta `backend`:

```
copy .env.exemplo .env
```

Abra o `.env` e preencha `DB_SENHA` com a senha do root do seu MySQL. Depois:

```
npm install
npm start
```

A API sobe em `http://localhost:3001`. Para conferir se ela enxerga o banco,
abra `http://localhost:3001/api/saude` no navegador: deve responder
`{"api":"ok","banco":"ok"}`.

### 3. Subir a interface

Em outro terminal, na pasta `frontend`:

```
npm install
npm run dev
```

A tela abre em `http://localhost:5173`. As abas no topo alternam entre
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
backend/sql/03_projetos.sql          tabela projeto, colaborador_projeto e carga
backend/src/rotas/projetos.js        endpoints
backend/src/validacaoProjeto.js      regras de validação
backend/src/permissoes.js            perfis Administrador e Operador (RN21)
frontend/src/telas/TelaProjetos.jsx  tela de projetos
frontend/src/componentes/projetos/   filtros, tabela, formulário e janela de ações
```

A tela de equipamentos do Rafael passou de `App.jsx` para
`telas/TelaEquipamentos.jsx` sem mudar o comportamento; `App.jsx` agora tem a
barra superior, as abas e o seletor de perfil.

## Endpoints

| Método | Caminho | Perfil |
|---|---|---|
| GET | `/api/projetos` (filtros: busca, situacao, id_responsavel, fonte, prazo) | ambos |
| GET | `/api/projetos/fontes` | ambos |
| GET | `/api/projetos/:id` | ambos |
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
| Responsável, quando informado, deve ser colaborador ativo | RF_B6 |
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
(termina nos próximos 6 meses, vencido, sem término), responsável e fonte
financiadora. A listagem mostra o aviso de prazo no término previsto (antecedência
padrão de 6 meses, RN24) e os recursos vinculados de cada projeto.

## Dados de demonstração

- 1023 CAOMA 2025–2026: termina em poucos meses (aviso amarelo)
- 1301 Monitoramento do Rio Paraná: em andamento com término vencido (aviso vermelho)
- 1022 CAOMA 2024–2025: encerrado, com licença ainda vinculada (RN18)
- 1450 Educação Ambiental nas Escolas: sem vínculos, pode ser excluído
- 0007 Programa Prístino: sem término previsto
- códigos livres para cadastrar na hora: 1500 em diante