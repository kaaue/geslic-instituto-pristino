-- GESLIC - Instituto Prístino
-- Completa o banco conforme o modelo relacional da ERS versão 2.4 (seção 3.3).
-- Rode depois de 01_schema.sql, 02_carga.sql e 03_projetos.sql.
--
-- Os scripts 01 e 03 criaram só as tabelas das funções já implementadas
-- (RF_B3 e RF_B6). Este script:
--   1. cria as 19 tabelas que faltavam (o modelo tem 28);
--   2. acrescenta às tabelas existentes as colunas e restrições do modelo;
--   3. completa os registros de demonstração que já existiam (licenças e
--      instâncias da carga da RF_B3) e só então torna obrigatórias as
--      colunas novas, como numa migração.
--
-- Nomes mantidos de propósito, porque o código da RF_B3 já os usa:
--   equipamento.id_equipamento (no modelo: id_bem), equipamento.tipo
--   (no modelo: tipo_equipamento), colaborador.ativo (no modelo: situacao
--   ativo/desligado) e licenca.nome_software (redundante com software.nome;
--   sai quando a RF_F1 passar a usar a tabela software).
--
-- Regras que dependem de mais de uma tabela ficam na camada de serviços
-- (quadro 3.3.1 da ERS): quantidade de instâncias por vigência (RN02),
-- vigência sem fim só para licença perpétua e quantidade nula só para
-- capacidade ilimitada (RN03, RN13), mesma licença não alocada duas vezes ao
-- mesmo equipamento ou colaborador (RN10) e cobertura do item contratada na
-- vigência (RF_F8).

SET NAMES utf8mb4;

USE geslic;

-- ===============================================================
-- Parte 1 - cadastros, licenças, vigências e instâncias
-- ===============================================================

ALTER TABLE setor
  ADD COLUMN responsavel VARCHAR(120) NULL;

-- Desligamento do colaborador (RF_B4): ativo = FALSE e data preenchida
ALTER TABLE colaborador
  ADD COLUMN data_desligamento DATE NULL,
  ADD CONSTRAINT ck_colaborador_desligamento CHECK (data_desligamento IS NULL OR ativo = FALSE);

-- No modelo o setor do bem é opcional (um imóvel ou veículo pode não ter setor)
ALTER TABLE bem
  MODIFY patrimonio VARCHAR(30) NULL,
  MODIFY id_setor   INT NULL;

ALTER TABLE equipamento
  MODIFY etiqueta_instituto  VARCHAR(30) NOT NULL,
  MODIFY etiqueta_netscanner VARCHAR(30) NULL;

CREATE TABLE fornecedor (
  id_fornecedor  INT AUTO_INCREMENT PRIMARY KEY,
  razao_social   VARCHAR(120) NOT NULL,
  nome_fantasia  VARCHAR(120),
  cnpj           CHAR(14)     NOT NULL,
  tipo           VARCHAR(15)  NOT NULL,
  contato        VARCHAR(80),
  telefone       VARCHAR(20),
  email          VARCHAR(120),
  ativo          BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT uq_fornecedor_cnpj UNIQUE (cnpj),
  CONSTRAINT ck_fornecedor_cnpj CHECK (cnpj REGEXP '^[0-9]{14}$'),
  CONSTRAINT ck_fornecedor_tipo CHECK (tipo IN ('software', 'seguradora'))
);

CREATE TABLE software (
  id_software  INT AUTO_INCREMENT PRIMARY KEY,
  nome         VARCHAR(80)  NOT NULL,
  versao       VARCHAR(30),
  fabricante   VARCHAR(80)  NOT NULL,
  categoria    VARCHAR(40),
  ativo        BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Licença: aquisição do direito de uso, com a modalidade de licenciamento (RN03)
ALTER TABLE licenca
  ADD COLUMN id_software            INT NULL AFTER codigo,
  ADD COLUMN id_responsavel         INT NULL AFTER id_projeto_adquirente,
  ADD COLUMN tipo_controle          VARCHAR(15) NOT NULL DEFAULT 'equipamento',
  ADD COLUMN capacidade_ilimitada   BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN perpetua               BOOLEAN     NOT NULL DEFAULT FALSE,
  -- a chave é gravada cifrada pela aplicação, nunca em texto aberto
  ADD COLUMN chave_ativacao_cifrada VARBINARY(512) NULL,
  ADD COLUMN data_aquisicao         DATE NULL,
  ADD COLUMN data_inativacao        DATE NULL,
  ADD COLUMN motivo_inativacao      VARCHAR(255) NULL,
  MODIFY situacao VARCHAR(15) NOT NULL DEFAULT 'vigente',
  ADD CONSTRAINT fk_licenca_software FOREIGN KEY (id_software)
    REFERENCES software (id_software),
  ADD CONSTRAINT fk_licenca_responsavel FOREIGN KEY (id_responsavel)
    REFERENCES colaborador (id_colaborador),
  ADD CONSTRAINT ck_licenca_tipo_controle CHECK (tipo_controle IN ('usuario', 'equipamento')),
  ADD CONSTRAINT ck_licenca_situacao CHECK (situacao IN ('vigente', 'vencida', 'inativa')),
  -- data e motivo obrigatórios na inativação (RN16)
  ADD CONSTRAINT ck_licenca_inativacao CHECK (
    (situacao = 'inativa' AND data_inativacao IS NOT NULL AND motivo_inativacao IS NOT NULL) OR
    (situacao <> 'inativa' AND data_inativacao IS NULL));

-- Cada contratação ou renovação é uma vigência (RN13)
CREATE TABLE vigencia_licenca (
  id_vigencia           INT AUTO_INCREMENT PRIMARY KEY,
  id_licenca            INT           NOT NULL,
  numero                SMALLINT      NOT NULL,
  id_fornecedor         INT           NOT NULL,
  id_projeto_pagador    INT           NOT NULL,
  data_contratacao      DATE          NOT NULL,
  data_inicio           DATE          NOT NULL,
  -- nula somente para licença perpétua (regra na camada de serviços)
  data_fim              DATE,
  -- nula somente para capacidade ilimitada (regra na camada de serviços)
  quantidade_contratada INT,
  valor_pago            DECIMAL(12,2) NOT NULL,
  conta_pagamento       VARCHAR(40),
  registrada_em         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_vigencia_licenca_numero UNIQUE (id_licenca, numero),
  CONSTRAINT ck_vigencia_licenca_datas CHECK (data_fim IS NULL OR data_fim > data_inicio),
  CONSTRAINT ck_vigencia_licenca_qtd CHECK (quantidade_contratada IS NULL OR quantidade_contratada > 0),
  CONSTRAINT ck_vigencia_licenca_valor CHECK (valor_pago >= 0),
  CONSTRAINT fk_viglic_licenca FOREIGN KEY (id_licenca) REFERENCES licenca (id_licenca),
  CONSTRAINT fk_viglic_fornecedor FOREIGN KEY (id_fornecedor) REFERENCES fornecedor (id_fornecedor),
  CONSTRAINT fk_viglic_projeto FOREIGN KEY (id_projeto_pagador) REFERENCES projeto (id_projeto)
);

-- Instância: unidade de uso, ligada a uma única vigência. A renovação cria
-- novas instâncias e inativa as anteriores; id_instancia_origem guarda,
-- opcionalmente, de qual instância anterior a nova se originou (RN13).
ALTER TABLE instancia
  ADD COLUMN id_instancia_origem INT NULL AFTER id_instancia,
  ADD COLUMN id_vigencia         INT NULL AFTER id_licenca,
  ADD COLUMN data_inativacao     DATE NULL,
  ADD COLUMN motivo_inativacao   VARCHAR(30) NULL,
  ADD COLUMN criada_em           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD CONSTRAINT fk_instancia_origem FOREIGN KEY (id_instancia_origem)
    REFERENCES instancia (id_instancia),
  ADD CONSTRAINT fk_instancia_vigencia FOREIGN KEY (id_vigencia)
    REFERENCES vigencia_licenca (id_vigencia),
  -- identificação única dentro da vigência, quando informada
  ADD CONSTRAINT uq_instancia_identificacao UNIQUE (id_vigencia, identificacao),
  ADD CONSTRAINT ck_instancia_inativacao CHECK (
    (situacao = 'inativa' AND data_inativacao IS NOT NULL AND motivo_inativacao IS NOT NULL) OR
    (situacao = 'ativa' AND data_inativacao IS NULL AND motivo_inativacao IS NULL));

-- No máximo uma alocação vigente (data de fim nula) por instância (RN09).
-- A coluna gerada só tem valor enquanto a alocação está vigente, e o UNIQUE
-- ignora os nulos: assim o histórico pode ter várias alocações encerradas.
ALTER TABLE alocacao
  ADD COLUMN instancia_vigente INT AS (CASE WHEN data_fim IS NULL THEN id_instancia END) STORED,
  ADD CONSTRAINT uq_alocacao_vigente UNIQUE (instancia_vigente),
  ADD CONSTRAINT ck_alocacao_datas CHECK (data_fim IS NULL OR data_fim >= data_inicio);

-- Utilização: instância usada por um colaborador (RN05). Mesma regra de
-- vigência única da alocação. excecao_projeto marca o uso por colaborador de
-- outro projeto confirmado como exceção administrativa (RN10).
CREATE TABLE utilizacao (
  id_utilizacao      INT AUTO_INCREMENT PRIMARY KEY,
  id_instancia       INT     NOT NULL,
  id_colaborador     INT     NOT NULL,
  data_inicio        DATE    NOT NULL,
  data_fim           DATE,
  excecao_projeto    BOOLEAN NOT NULL DEFAULT FALSE,
  instancia_vigente  INT AS (CASE WHEN data_fim IS NULL THEN id_instancia END) STORED,
  CONSTRAINT uq_utilizacao_vigente UNIQUE (instancia_vigente),
  CONSTRAINT ck_utilizacao_datas CHECK (data_fim IS NULL OR data_fim >= data_inicio),
  CONSTRAINT fk_utilizacao_instancia FOREIGN KEY (id_instancia) REFERENCES instancia (id_instancia),
  CONSTRAINT fk_utilizacao_colaborador FOREIGN KEY (id_colaborador) REFERENCES colaborador (id_colaborador)
);

-- ===============================================================
-- Parte 2 - apólices, vigências, coberturas e itens segurados
-- ===============================================================

CREATE TABLE tipo_seguro (
  id_tipo_seguro INT AUTO_INCREMENT PRIMARY KEY,
  descricao      VARCHAR(80) NOT NULL,
  ativo          BOOLEAN     NOT NULL DEFAULT TRUE,
  CONSTRAINT uq_tipo_seguro_descricao UNIQUE (descricao)
);

CREATE TABLE cobertura (
  id_cobertura   INT AUTO_INCREMENT PRIMARY KEY,
  id_tipo_seguro INT          NOT NULL,
  descricao      VARCHAR(120) NOT NULL,
  ativo          BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT uq_cobertura_descricao UNIQUE (id_tipo_seguro, descricao),
  CONSTRAINT fk_cobertura_tipo FOREIGN KEY (id_tipo_seguro) REFERENCES tipo_seguro (id_tipo_seguro)
);

CREATE TABLE apolice (
  id_apolice             INT AUTO_INCREMENT PRIMARY KEY,
  id_seguradora          INT          NOT NULL,
  numero                 VARCHAR(40)  NOT NULL,
  id_tipo_seguro         INT          NOT NULL,
  id_responsavel         INT          NOT NULL,
  id_setor               INT          NOT NULL,
  id_projeto_responsavel INT          NOT NULL,
  situacao               VARCHAR(15)  NOT NULL DEFAULT 'vigente',
  data_cancelamento      DATE,
  motivo_cancelamento    VARCHAR(255),
  CONSTRAINT uq_apolice_numero UNIQUE (id_seguradora, numero),
  CONSTRAINT ck_apolice_situacao CHECK (situacao IN ('vigente', 'vencida', 'cancelada')),
  CONSTRAINT ck_apolice_cancelamento CHECK (
    (situacao = 'cancelada' AND data_cancelamento IS NOT NULL AND motivo_cancelamento IS NOT NULL) OR
    (situacao <> 'cancelada' AND data_cancelamento IS NULL)),
  CONSTRAINT fk_apolice_seguradora FOREIGN KEY (id_seguradora) REFERENCES fornecedor (id_fornecedor),
  CONSTRAINT fk_apolice_tipo FOREIGN KEY (id_tipo_seguro) REFERENCES tipo_seguro (id_tipo_seguro),
  CONSTRAINT fk_apolice_responsavel FOREIGN KEY (id_responsavel) REFERENCES colaborador (id_colaborador),
  CONSTRAINT fk_apolice_setor FOREIGN KEY (id_setor) REFERENCES setor (id_setor),
  CONSTRAINT fk_apolice_projeto FOREIGN KEY (id_projeto_responsavel) REFERENCES projeto (id_projeto)
);

CREATE TABLE vigencia_apolice (
  id_vigencia_apolice INT AUTO_INCREMENT PRIMARY KEY,
  id_apolice          INT           NOT NULL,
  numero              SMALLINT      NOT NULL,
  data_inicio         DATE          NOT NULL,
  data_fim            DATE          NOT NULL,
  valor_premio        DECIMAL(12,2) NOT NULL,
  id_projeto_pagador  INT           NOT NULL,
  registrada_em       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_vigencia_apolice_numero UNIQUE (id_apolice, numero),
  CONSTRAINT ck_vigencia_apolice_datas CHECK (data_fim > data_inicio),
  CONSTRAINT ck_vigencia_apolice_premio CHECK (valor_premio >= 0),
  CONSTRAINT fk_vigapo_apolice FOREIGN KEY (id_apolice) REFERENCES apolice (id_apolice),
  CONSTRAINT fk_vigapo_projeto FOREIGN KEY (id_projeto_pagador) REFERENCES projeto (id_projeto)
);

-- Coberturas contratadas em cada vigência
CREATE TABLE vigencia_cobertura (
  id_vigencia_apolice  INT NOT NULL,
  id_cobertura         INT NOT NULL,
  descricao_contratada VARCHAR(255),
  PRIMARY KEY (id_vigencia_apolice, id_cobertura),
  CONSTRAINT fk_vigcob_vigencia FOREIGN KEY (id_vigencia_apolice)
    REFERENCES vigencia_apolice (id_vigencia_apolice),
  CONSTRAINT fk_vigcob_cobertura FOREIGN KEY (id_cobertura) REFERENCES cobertura (id_cobertura)
);

-- Item segurado: um bem ou uma pessoa, nunca os dois (RN14)
CREATE TABLE item_segurado (
  id_item             INT AUTO_INCREMENT PRIMARY KEY,
  id_vigencia_apolice INT           NOT NULL,
  id_bem              INT,
  id_colaborador      INT,
  valor_segurado      DECIMAL(12,2) NOT NULL,
  CONSTRAINT ck_item_um_alvo CHECK ((id_bem IS NULL) <> (id_colaborador IS NULL)),
  CONSTRAINT ck_item_valor CHECK (valor_segurado >= 0),
  -- o mesmo bem ou pessoa não se repete na mesma vigência
  CONSTRAINT uq_item_bem UNIQUE (id_vigencia_apolice, id_bem),
  CONSTRAINT uq_item_colaborador UNIQUE (id_vigencia_apolice, id_colaborador),
  CONSTRAINT fk_item_vigencia FOREIGN KEY (id_vigencia_apolice)
    REFERENCES vigencia_apolice (id_vigencia_apolice),
  CONSTRAINT fk_item_bem FOREIGN KEY (id_bem) REFERENCES bem (id_bem),
  CONSTRAINT fk_item_colaborador FOREIGN KEY (id_colaborador) REFERENCES colaborador (id_colaborador)
);

CREATE TABLE item_cobertura (
  id_item      INT NOT NULL,
  id_cobertura INT NOT NULL,
  PRIMARY KEY (id_item, id_cobertura),
  CONSTRAINT fk_itemcob_item FOREIGN KEY (id_item) REFERENCES item_segurado (id_item),
  CONSTRAINT fk_itemcob_cobertura FOREIGN KEY (id_cobertura) REFERENCES cobertura (id_cobertura)
);

-- ===============================================================
-- Parte 3 - contas de acesso, documentos, notificações e auditoria
-- ===============================================================

CREATE TABLE perfil (
  id_perfil                 INT AUTO_INCREMENT PRIMARY KEY,
  nome                      VARCHAR(40) NOT NULL,
  visualiza_dados_sensiveis BOOLEAN     NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_perfil_nome UNIQUE (nome)
);

CREATE TABLE permissao (
  id_permissao INT AUTO_INCREMENT PRIMARY KEY,
  codigo       VARCHAR(40)  NOT NULL,
  descricao    VARCHAR(120) NOT NULL,
  CONSTRAINT uq_permissao_codigo UNIQUE (codigo)
);

CREATE TABLE perfil_permissao (
  id_perfil    INT NOT NULL,
  id_permissao INT NOT NULL,
  PRIMARY KEY (id_perfil, id_permissao),
  CONSTRAINT fk_perfperm_perfil FOREIGN KEY (id_perfil) REFERENCES perfil (id_perfil),
  CONSTRAINT fk_perfperm_permissao FOREIGN KEY (id_permissao) REFERENCES permissao (id_permissao)
);

-- Conta de acesso (RF_B9). Senha somente como hash. A conta pode estar ligada
-- a no máximo um colaborador, e o colaborador a no máximo uma conta.
CREATE TABLE usuario (
  id_usuario     INT AUTO_INCREMENT PRIMARY KEY,
  id_perfil      INT          NOT NULL,
  id_colaborador INT,
  nome           VARCHAR(120) NOT NULL,
  login          VARCHAR(40)  NOT NULL,
  email          VARCHAR(120) NOT NULL,
  senha_hash     VARCHAR(255) NOT NULL,
  ativo          BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT uq_usuario_login UNIQUE (login),
  CONSTRAINT uq_usuario_email UNIQUE (email),
  CONSTRAINT uq_usuario_colaborador UNIQUE (id_colaborador),
  CONSTRAINT fk_usuario_perfil FOREIGN KEY (id_perfil) REFERENCES perfil (id_perfil),
  CONSTRAINT fk_usuario_colaborador FOREIGN KEY (id_colaborador) REFERENCES colaborador (id_colaborador)
);

-- Antecedências escolhidas por conta, em meses (RF_B10)
CREATE TABLE preferencia_notificacao (
  id_preferencia     INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario         INT     NOT NULL,
  antecedencia_meses TINYINT NOT NULL,
  CONSTRAINT uq_preferencia UNIQUE (id_usuario, antecedencia_meses),
  CONSTRAINT ck_preferencia_meses CHECK (antecedencia_meses BETWEEN 1 AND 24),
  CONSTRAINT fk_preferencia_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
);

-- Documento: só os metadados e o caminho do PDF na pasta central (RN23).
-- Pertence a exatamente uma vigência, de licença ou de apólice.
CREATE TABLE documento (
  id_documento        INT AUTO_INCREMENT PRIMARY KEY,
  id_vigencia_licenca INT,
  id_vigencia_apolice INT,
  tipo_documento      VARCHAR(40),
  nome_original       VARCHAR(255) NOT NULL,
  caminho_arquivo     VARCHAR(500) NOT NULL,
  tamanho_bytes       BIGINT       NOT NULL,
  enviado_por         INT          NOT NULL,
  enviado_em          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_documento_caminho UNIQUE (caminho_arquivo),
  CONSTRAINT ck_documento_uma_vigencia CHECK (
    (id_vigencia_licenca IS NULL) <> (id_vigencia_apolice IS NULL)),
  CONSTRAINT ck_documento_pdf CHECK (LOWER(nome_original) LIKE '%.pdf'),
  CONSTRAINT ck_documento_tamanho CHECK (tamanho_bytes > 0),
  CONSTRAINT fk_documento_viglic FOREIGN KEY (id_vigencia_licenca)
    REFERENCES vigencia_licenca (id_vigencia),
  CONSTRAINT fk_documento_vigapo FOREIGN KEY (id_vigencia_apolice)
    REFERENCES vigencia_apolice (id_vigencia_apolice),
  CONSTRAINT fk_documento_usuario FOREIGN KEY (enviado_por) REFERENCES usuario (id_usuario)
);

-- Aviso de vencimento (RN24). O recurso é uma vigência de licença, uma
-- vigência de apólice ou um projeto, conforme tipo_recurso. A coluna gerada
-- id_recurso permite o UNIQUE que evita aviso duplicado.
CREATE TABLE notificacao (
  id_notificacao      INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario          INT          NOT NULL,
  tipo_recurso        VARCHAR(15)  NOT NULL,
  id_vigencia_licenca INT,
  id_vigencia_apolice INT,
  id_projeto          INT,
  data_vencimento     DATE         NOT NULL,
  antecedencia_meses  TINYINT      NOT NULL,
  mensagem            VARCHAR(255) NOT NULL,
  emitida_em          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lida_em             DATETIME,
  id_recurso INT AS (COALESCE(id_vigencia_licenca, id_vigencia_apolice, id_projeto)) STORED,
  CONSTRAINT ck_notificacao_recurso CHECK (
    (tipo_recurso = 'licenca' AND id_vigencia_licenca IS NOT NULL
       AND id_vigencia_apolice IS NULL AND id_projeto IS NULL) OR
    (tipo_recurso = 'apolice' AND id_vigencia_apolice IS NOT NULL
       AND id_vigencia_licenca IS NULL AND id_projeto IS NULL) OR
    (tipo_recurso = 'projeto' AND id_projeto IS NOT NULL
       AND id_vigencia_licenca IS NULL AND id_vigencia_apolice IS NULL)),
  CONSTRAINT uq_notificacao_aviso UNIQUE
    (id_usuario, tipo_recurso, id_recurso, data_vencimento, antecedencia_meses),
  CONSTRAINT fk_notificacao_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_notificacao_viglic FOREIGN KEY (id_vigencia_licenca)
    REFERENCES vigencia_licenca (id_vigencia),
  CONSTRAINT fk_notificacao_vigapo FOREIGN KEY (id_vigencia_apolice)
    REFERENCES vigencia_apolice (id_vigencia_apolice),
  CONSTRAINT fk_notificacao_projeto FOREIGN KEY (id_projeto) REFERENCES projeto (id_projeto)
);

-- Trilha de auditoria (RF_F13, RN22): data efetiva do evento, momento do
-- registro e dados anteriores e posteriores em JSON.
CREATE TABLE movimentacao (
  id_movimentacao   INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario        INT          NOT NULL,
  tipo              VARCHAR(30)  NOT NULL,
  entidade          VARCHAR(40)  NOT NULL,
  id_registro       INT          NOT NULL,
  id_licenca        INT,
  id_instancia      INT,
  id_apolice        INT,
  data_evento       DATE         NOT NULL,
  registrado_em     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  descricao         VARCHAR(255) NOT NULL,
  motivo            VARCHAR(255),
  dados_anteriores  JSON,
  dados_posteriores JSON,
  CONSTRAINT fk_mov_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_mov_licenca FOREIGN KEY (id_licenca) REFERENCES licenca (id_licenca),
  CONSTRAINT fk_mov_instancia FOREIGN KEY (id_instancia) REFERENCES instancia (id_instancia),
  CONSTRAINT fk_mov_apolice FOREIGN KEY (id_apolice) REFERENCES apolice (id_apolice)
);

-- Eventos do histórico não podem ser alterados nem excluídos (RN22). Em
-- produção a conta da aplicação recebe só INSERT e SELECT nesta tabela; os
-- gatilhos garantem a regra também para quem tiver mais permissões.
CREATE TRIGGER tg_movimentacao_sem_alteracao BEFORE UPDATE ON movimentacao
  FOR EACH ROW SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Eventos do histórico não podem ser alterados (RN22).';

CREATE TRIGGER tg_movimentacao_sem_exclusao BEFORE DELETE ON movimentacao
  FOR EACH ROW SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Eventos do histórico não podem ser excluídos (RN22).';

-- ===============================================================
-- Dados de referência: perfis e permissões (RN21, RN27)
-- O Administrador faz tudo o que o Operador faz e, além disso, altera e
-- exclui dados cadastrais, gerencia as contas e consulta o histórico.
-- ===============================================================

INSERT INTO perfil (nome, visualiza_dados_sensiveis) VALUES
  ('Administrador', TRUE),
  ('Operador',      FALSE);

INSERT INTO permissao (codigo, descricao) VALUES
  ('cadastro.alterar',    'Alterar dados cadastrais'),
  ('cadastro.excluir',    'Excluir cadastros sem vínculos'),
  ('usuario.gerenciar',   'Criar, alterar, desativar e conceder perfil às contas de acesso'),
  ('auditoria.consultar', 'Consultar o histórico de movimentações');

INSERT INTO perfil_permissao (id_perfil, id_permissao)
SELECT p.id_perfil, pe.id_permissao
  FROM perfil p CROSS JOIN permissao pe
 WHERE p.nome = 'Administrador';

-- ===============================================================
-- Completa os registros de demonstração das cargas anteriores
-- (licenças e instâncias da RF_B3, ligadas a projetos pela RF_B6)
-- ===============================================================

INSERT INTO fornecedor (razao_social, nome_fantasia, cnpj, tipo, contato, email) VALUES
  ('Brasoftware Informática Ltda.',  'Brasoftware', '00111222000101', 'software',   'Comercial', 'comercial@brasoftware.example'),
  ('Imagem Geosistemas Ltda.',       'Imagem',      '00333444000102', 'software',   'Comercial', 'vendas@imagem.example'),
  ('Seguradora Exemplo S.A.',        'Exemplo Seguros', '00555666000103', 'seguradora', 'Corretor', 'corretor@seguros.example');

INSERT INTO software (nome, versao, fabricante, categoria)
SELECT DISTINCT l.nome_software, NULL,
       CASE l.nome_software
         WHEN 'Microsoft 365 Business' THEN 'Microsoft'
         WHEN 'ArcGIS Desktop'         THEN 'Esri'
         WHEN 'Adobe Creative Cloud'   THEN 'Adobe'
         ELSE 'Não informado' END,
       CASE l.nome_software
         WHEN 'ArcGIS Desktop' THEN 'Geoprocessamento'
         WHEN 'Adobe Creative Cloud' THEN 'Design'
         ELSE 'Escritório' END
  FROM licenca l;

UPDATE licenca l JOIN software s ON s.nome = l.nome_software
   SET l.id_software    = s.id_software,
       l.id_responsavel = 3,              -- Carlos Eduardo Alves, Analista de TI
       l.data_aquisicao = '2026-01-10';

-- Uma vigência (a primeira) por licença, paga pelo projeto adquirente
INSERT INTO vigencia_licenca
  (id_licenca, numero, id_fornecedor, id_projeto_pagador, data_contratacao,
   data_inicio, data_fim, quantidade_contratada, valor_pago)
SELECT l.id_licenca, 1,
       CASE WHEN l.nome_software = 'ArcGIS Desktop' THEN 2 ELSE 1 END,
       l.id_projeto_adquirente, '2026-01-10', '2026-01-10', '2027-01-09', 1,
       CASE l.nome_software
         WHEN 'Microsoft 365 Business' THEN 1200.00
         WHEN 'ArcGIS Desktop'         THEN 9800.00
         ELSE 2700.00 END
  FROM licenca l;

UPDATE instancia i JOIN vigencia_licenca v ON v.id_licenca = i.id_licenca AND v.numero = 1
   SET i.id_vigencia = v.id_vigencia;

-- Agora que todos os registros têm valor, as colunas passam a obrigatórias.
-- O MySQL só permite mudar a nulidade de coluna com chave estrangeira com a
-- verificação de chaves desligada; se ainda houvesse valor nulo, o modo
-- estrito recusaria a alteração do mesmo jeito.
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE licenca
  MODIFY id_software           INT  NOT NULL,
  MODIFY id_projeto_adquirente INT  NOT NULL,
  MODIFY id_responsavel        INT  NOT NULL,
  MODIFY data_aquisicao        DATE NOT NULL;

ALTER TABLE instancia
  MODIFY id_vigencia      INT NOT NULL,
  MODIFY id_projeto_atual INT NOT NULL;

SET FOREIGN_KEY_CHECKS = 1;
