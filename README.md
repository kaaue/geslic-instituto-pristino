# GESLIC — RF_B3 Gerenciar equipamentos

Implementação da função básica RF_B3 do GESLIC, Sistema de Gestão de Licenças de
Software e Apólices do Instituto Prístino.

Autor: Rafael Celestino Tomiazi
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

A tela abre em `http://localhost:5173`.

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
