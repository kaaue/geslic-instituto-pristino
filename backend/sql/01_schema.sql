-- GESLIC - Instituto Prístino
-- Esquema parcial do banco, recortado para a função básica RF_B3 (Gerenciar equipamentos).
-- As tabelas seguem o modelo relacional da ERS versão 2.2.
--
-- Por que só algumas tabelas: a RF_B3 precisa de setor e colaborador para os campos
-- de seleção, e de instancia/alocacao para provar as regras RN08 (inativação) e a
-- de exclusão bloqueada. As demais tabelas do modelo entram com as outras funções.

-- Garante que os acentos sejam lidos corretamente ao rodar o script
SET NAMES utf8mb4;

DROP DATABASE IF EXISTS geslic;
CREATE DATABASE geslic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE geslic;

-- ---------------------------------------------------------------
-- Cadastros de apoio
-- ---------------------------------------------------------------

CREATE TABLE setor (
  id_setor      INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(80)  NOT NULL,
  ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT uq_setor_nome UNIQUE (nome)
);

CREATE TABLE colaborador (
  id_colaborador INT AUTO_INCREMENT PRIMARY KEY,
  nome           VARCHAR(120) NOT NULL,
  cargo          VARCHAR(80),
  email          VARCHAR(120),
  id_setor       INT          NOT NULL,
  ativo          BOOLEAN      NOT NULL DEFAULT TRUE,
  -- o e-mail é único, mas o nome pode repetir: o documento permite homônimos (RN19)
  CONSTRAINT uq_colaborador_email UNIQUE (email),
  CONSTRAINT fk_colaborador_setor FOREIGN KEY (id_setor) REFERENCES setor (id_setor)
);

-- ---------------------------------------------------------------
-- Bem e equipamento
-- O equipamento é uma especialização de bem: a chave primária dele
-- também é chave estrangeira para bem, como define o modelo relacional.
-- Assim um computador que recebe licença e é coberto por apólice
-- não precisa ser cadastrado duas vezes.
-- ---------------------------------------------------------------

CREATE TABLE bem (
  id_bem         INT AUTO_INCREMENT PRIMARY KEY,
  categoria      VARCHAR(20)  NOT NULL,
  identificacao  VARCHAR(120) NOT NULL,
  patrimonio     VARCHAR(20),
  placa          VARCHAR(10),
  valor          DECIMAL(12,2),
  id_setor       INT          NOT NULL,
  situacao       VARCHAR(10)  NOT NULL DEFAULT 'ativo',
  CONSTRAINT ck_bem_categoria
    CHECK (categoria IN ('veiculo','imovel','drone','equipamento','outro')),
  CONSTRAINT ck_bem_situacao
    CHECK (situacao IN ('ativo','inativo')),
  CONSTRAINT fk_bem_setor FOREIGN KEY (id_setor) REFERENCES setor (id_setor)
);

CREATE TABLE equipamento (
  -- mesma chave do bem: é o que caracteriza a especialização
  id_equipamento      INT PRIMARY KEY,
  etiqueta_instituto  VARCHAR(20)  NOT NULL,
  etiqueta_netscanner VARCHAR(20),
  tipo                VARCHAR(40)  NOT NULL,
  id_responsavel      INT,
  uso_geral           BOOLEAN      NOT NULL DEFAULT FALSE,
  -- as etiquetas são comparadas já normalizadas pela aplicação (maiúsculas, sem
  -- espaços extras), por isso a unicidade simples aqui basta
  CONSTRAINT uq_equip_etiqueta_inst UNIQUE (etiqueta_instituto),
  CONSTRAINT uq_equip_etiqueta_net  UNIQUE (etiqueta_netscanner),
  CONSTRAINT fk_equip_bem FOREIGN KEY (id_equipamento)
    REFERENCES bem (id_bem) ON DELETE CASCADE,
  CONSTRAINT fk_equip_responsavel FOREIGN KEY (id_responsavel)
    REFERENCES colaborador (id_colaborador)
);

-- ---------------------------------------------------------------
-- Recorte mínimo de licenças, só o necessário para as regras da RF_B3:
-- instância alocada impede a exclusão do equipamento, e a inativação
-- do equipamento inativa as instâncias não transferíveis (RN08).
-- ---------------------------------------------------------------

CREATE TABLE licenca (
  id_licenca    INT AUTO_INCREMENT PRIMARY KEY,
  codigo        VARCHAR(12)  NOT NULL,
  nome_software VARCHAR(80)  NOT NULL,
  transferivel  BOOLEAN      NOT NULL DEFAULT TRUE,
  situacao      VARCHAR(10)  NOT NULL DEFAULT 'vigente',
  CONSTRAINT uq_licenca_codigo UNIQUE (codigo)
);

CREATE TABLE instancia (
  id_instancia   INT AUTO_INCREMENT PRIMARY KEY,
  id_licenca     INT         NOT NULL,
  identificacao  VARCHAR(120),
  situacao       VARCHAR(10) NOT NULL DEFAULT 'ativa',
  CONSTRAINT ck_instancia_situacao CHECK (situacao IN ('ativa','inativa')),
  CONSTRAINT fk_instancia_licenca FOREIGN KEY (id_licenca)
    REFERENCES licenca (id_licenca)
);

CREATE TABLE alocacao (
  id_alocacao   INT AUTO_INCREMENT PRIMARY KEY,
  id_instancia  INT  NOT NULL,
  id_equipamento INT NOT NULL,
  data_inicio   DATE NOT NULL,
  -- data de fim nula significa alocação vigente
  data_fim      DATE,
  CONSTRAINT fk_alocacao_instancia FOREIGN KEY (id_instancia)
    REFERENCES instancia (id_instancia),
  CONSTRAINT fk_alocacao_equipamento FOREIGN KEY (id_equipamento)
    REFERENCES equipamento (id_equipamento)
);
