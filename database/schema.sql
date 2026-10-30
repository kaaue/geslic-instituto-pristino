-- GESLIC - Instituto Prístino
-- Esquema do banco conforme o modelo relacional da ERS versão 2.4 (seção 3.3),
-- com as 28 tabelas. Rode pelo backend com `npm run db:setup`, que cria o
-- banco, roda este arquivo e depois as cargas (seed.sql e seed_dev.sql).
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

-- Garante que os acentos sejam lidos corretamente ao rodar o script
SET NAMES utf8mb4;

-- ===============================================================
-- Parte 1 - cadastros, projetos, licenças, vigências e instâncias
-- ===============================================================

CREATE TABLE setor (
  id_setor      INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(80)  NOT NULL,
  ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
  responsavel   VARCHAR(120),
  CONSTRAINT uq_setor_nome UNIQUE (nome)
);

CREATE TABLE colaborador (
  id_colaborador    INT AUTO_INCREMENT PRIMARY KEY,
  nome              VARCHAR(120) NOT NULL,
  cargo             VARCHAR(80),
  email             VARCHAR(120),
  id_setor          INT          NOT NULL,
  ativo             BOOLEAN      NOT NULL DEFAULT TRUE,
  -- desligamento do colaborador (RF_B4): ativo = FALSE e data preenchida
  data_desligamento DATE,
  -- o e-mail é único, mas o nome pode repetir: o documento permite homônimos (RN19)
  CONSTRAINT uq_colaborador_email UNIQUE (email),
  CONSTRAINT ck_colaborador_desligamento CHECK (data_desligamento IS NULL OR ativo = FALSE),
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
  patrimonio     VARCHAR(30),
  placa          VARCHAR(10),
  valor          DECIMAL(12,2),
  -- no modelo o setor do bem é opcional (um imóvel ou veículo pode não ter setor)
  id_setor       INT,
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
  etiqueta_instituto  VARCHAR(30)  NOT NULL,
  etiqueta_netscanner VARCHAR(30),
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
-- Projeto institucional (RF_B6)
-- ---------------------------------------------------------------

CREATE TABLE projeto (
  id_projeto          INT AUTO_INCREMENT PRIMARY KEY,
  -- código de quatro dígitos informado pelo usuário, não gerado pelo sistema (RN19)
  codigo              CHAR(4)      NOT NULL,
  nome                VARCHAR(120) NOT NULL,
  fonte_financiadora  VARCHAR(120) NOT NULL,
  -- responsável obrigatório: um colaborador ativo no momento do cadastro
  id_responsavel      INT          NOT NULL,
  data_inicio         DATE         NOT NULL,
  -- término previsto: opcional, gera avisos e pode ser prorrogado
  data_fim_prevista   DATE,
  -- preenchida somente no encerramento manual (RN17)
  data_encerramento   DATE,
  situacao            VARCHAR(15)  NOT NULL DEFAULT 'em_andamento',
  CONSTRAINT uq_projeto_codigo UNIQUE (codigo),
  -- a collation utf8mb4_unicode_ci já compara sem diferenciar maiúsculas e
  -- minúsculas; os espaços extras são removidos pela aplicação antes de gravar
  CONSTRAINT uq_projeto_nome UNIQUE (nome),
  CONSTRAINT ck_projeto_codigo CHECK (codigo REGEXP '^[0-9]{4}$'),
  CONSTRAINT ck_projeto_situacao CHECK (situacao IN ('em_andamento', 'encerrado')),
  CONSTRAINT ck_projeto_encerramento CHECK (
    (situacao = 'encerrado' AND data_encerramento IS NOT NULL) OR
    (situacao = 'em_andamento' AND data_encerramento IS NULL)),
  CONSTRAINT ck_projeto_fim_prevista CHECK (
    data_fim_prevista IS NULL OR data_fim_prevista >= data_inicio),
  CONSTRAINT ck_projeto_data_encerramento CHECK (
    data_encerramento IS NULL OR data_encerramento >= data_inicio),
  CONSTRAINT fk_projeto_responsavel FOREIGN KEY (id_responsavel)
    REFERENCES colaborador (id_colaborador)
);

-- Participação dos colaboradores nos projetos (usada nas exceções entre projetos)
CREATE TABLE colaborador_projeto (
  id_colaborador INT NOT NULL,
  id_projeto     INT NOT NULL,
  PRIMARY KEY (id_colaborador, id_projeto),
  CONSTRAINT fk_colabproj_colaborador FOREIGN KEY (id_colaborador)
    REFERENCES colaborador (id_colaborador),
  CONSTRAINT fk_colabproj_projeto FOREIGN KEY (id_projeto)
    REFERENCES projeto (id_projeto)
);

-- ---------------------------------------------------------------
-- Fornecedores, softwares e licenças
-- ---------------------------------------------------------------

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
CREATE TABLE licenca (
  id_licenca             INT AUTO_INCREMENT PRIMARY KEY,
  codigo                 VARCHAR(12)  NOT NULL,
  id_software            INT          NOT NULL,
  nome_software          VARCHAR(80)  NOT NULL,
  transferivel           BOOLEAN      NOT NULL DEFAULT TRUE,
  situacao               VARCHAR(15)  NOT NULL DEFAULT 'vigente',
  id_projeto_adquirente  INT          NOT NULL,
  id_responsavel         INT          NOT NULL,
  tipo_controle          VARCHAR(15)  NOT NULL DEFAULT 'equipamento',
  capacidade_ilimitada   BOOLEAN      NOT NULL DEFAULT FALSE,
  perpetua               BOOLEAN      NOT NULL DEFAULT FALSE,
  -- a chave é gravada cifrada pela aplicação, nunca em texto aberto
  chave_ativacao_cifrada VARBINARY(512),
  data_aquisicao         DATE         NOT NULL,
  data_inativacao        DATE,
  motivo_inativacao      VARCHAR(255),
  CONSTRAINT uq_licenca_codigo UNIQUE (codigo),
  CONSTRAINT ck_licenca_tipo_controle CHECK (tipo_controle IN ('usuario', 'equipamento')),
  CONSTRAINT ck_licenca_situacao CHECK (situacao IN ('vigente', 'vencida', 'inativa')),
  -- data e motivo obrigatórios na inativação (RN16)
  CONSTRAINT ck_licenca_inativacao CHECK (
    (situacao = 'inativa' AND data_inativacao IS NOT NULL AND motivo_inativacao IS NOT NULL) OR
    (situacao <> 'inativa' AND data_inativacao IS NULL)),
  CONSTRAINT fk_licenca_projeto FOREIGN KEY (id_projeto_adquirente)
    REFERENCES projeto (id_projeto),
  CONSTRAINT fk_licenca_software FOREIGN KEY (id_software)
    REFERENCES software (id_software),
  CONSTRAINT fk_licenca_responsavel FOREIGN KEY (id_responsavel)
    REFERENCES colaborador (id_colaborador)
);

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
CREATE TABLE instancia (
  id_instancia        INT AUTO_INCREMENT PRIMARY KEY,
  id_instancia_origem INT,
  id_licenca          INT          NOT NULL,
  id_vigencia         INT          NOT NULL,
  identificacao       VARCHAR(120),
  situacao            VARCHAR(10)  NOT NULL DEFAULT 'ativa',
  -- projeto atual: responsável pelo uso da instância
  id_projeto_atual    INT          NOT NULL,
  data_inativacao     DATE,
  motivo_inativacao   VARCHAR(30),
  criada_em           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- identificação única dentro da vigência, quando informada
  CONSTRAINT uq_instancia_identificacao UNIQUE (id_vigencia, identificacao),
  CONSTRAINT ck_instancia_situacao CHECK (situacao IN ('ativa','inativa')),
  CONSTRAINT ck_instancia_inativacao CHECK (
    (situacao = 'inativa' AND data_inativacao IS NOT NULL AND motivo_inativacao IS NOT NULL) OR
    (situacao = 'ativa' AND data_inativacao IS NULL AND motivo_inativacao IS NULL)),
  CONSTRAINT fk_instancia_licenca FOREIGN KEY (id_licenca)
    REFERENCES licenca (id_licenca),
  CONSTRAINT fk_instancia_projeto FOREIGN KEY (id_projeto_atual)
    REFERENCES projeto (id_projeto),
  CONSTRAINT fk_instancia_origem FOREIGN KEY (id_instancia_origem)
    REFERENCES instancia (id_instancia),
  CONSTRAINT fk_instancia_vigencia FOREIGN KEY (id_vigencia)
    REFERENCES vigencia_licenca (id_vigencia)
);

-- Alocação: instância usada por um equipamento. No máximo uma alocação
-- vigente (data de fim nula) por instância (RN09): a coluna gerada só tem
-- valor enquanto a alocação está vigente, e o UNIQUE ignora os nulos; assim
-- o histórico pode ter várias alocações encerradas.
CREATE TABLE alocacao (
  id_alocacao       INT AUTO_INCREMENT PRIMARY KEY,
  id_instancia      INT  NOT NULL,
  id_equipamento    INT  NOT NULL,
  data_inicio       DATE NOT NULL,
  -- data de fim nula significa alocação vigente
  data_fim          DATE,
  instancia_vigente INT AS (CASE WHEN data_fim IS NULL THEN id_instancia END) STORED,
  CONSTRAINT uq_alocacao_vigente UNIQUE (instancia_vigente),
  CONSTRAINT ck_alocacao_datas CHECK (data_fim IS NULL OR data_fim >= data_inicio),
  CONSTRAINT fk_alocacao_instancia FOREIGN KEY (id_instancia)
    REFERENCES instancia (id_instancia),
  CONSTRAINT fk_alocacao_equipamento FOREIGN KEY (id_equipamento)
    REFERENCES equipamento (id_equipamento)
);

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

-- Permissão por operação. `exclusiva_administrador` marca as que a RN21
-- reserva ao Administrador: elas não podem ser concedidas ao Operador.
CREATE TABLE permissao (
  id_permissao            INT AUTO_INCREMENT PRIMARY KEY,
  codigo                  VARCHAR(40)  NOT NULL,
  descricao               VARCHAR(120) NOT NULL,
  grupo                   VARCHAR(40)  NOT NULL DEFAULT 'Geral',
  exclusiva_administrador BOOLEAN      NOT NULL DEFAULT FALSE,
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
-- Situação: pendente (autocadastro aguardando aprovação), ativo ou inativo.
-- troca_senha_obrigatoria: a conta entrou com senha provisória e precisa
-- trocá-la antes de usar o sistema.
CREATE TABLE usuario (
  id_usuario              INT AUTO_INCREMENT PRIMARY KEY,
  id_perfil               INT          NOT NULL,
  id_colaborador          INT,
  nome                    VARCHAR(120) NOT NULL,
  login                   VARCHAR(40)  NOT NULL,
  email                   VARCHAR(120) NOT NULL,
  senha_hash              VARCHAR(255) NOT NULL,
  situacao                VARCHAR(10)  NOT NULL DEFAULT 'ativo',
  troca_senha_obrigatoria BOOLEAN      NOT NULL DEFAULT FALSE,
  criada_em               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  senha_alterada_em       DATETIME,
  ultimo_acesso_em        DATETIME,
  CONSTRAINT uq_usuario_login UNIQUE (login),
  CONSTRAINT uq_usuario_email UNIQUE (email),
  CONSTRAINT uq_usuario_colaborador UNIQUE (id_colaborador),
  CONSTRAINT ck_usuario_situacao CHECK (situacao IN ('pendente', 'ativo', 'inativo')),
  CONSTRAINT fk_usuario_perfil FOREIGN KEY (id_perfil) REFERENCES perfil (id_perfil),
  CONSTRAINT fk_usuario_colaborador FOREIGN KEY (id_colaborador) REFERENCES colaborador (id_colaborador)
);

-- Sessões no servidor. O navegador guarda só o token, num cookie HttpOnly;
-- aqui fica o hash SHA-256 dele, nunca o token em si. Logout, desativação,
-- troca de perfil e redefinição de senha preenchem encerrada_em.
CREATE TABLE sessao (
  id_sessao           INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario          INT      NOT NULL,
  token_hash          CHAR(64) NOT NULL,
  criada_em           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_uso_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- validade máxima; a inatividade é conferida por ultimo_uso_em
  expira_em           DATETIME NOT NULL,
  encerrada_em        DATETIME,
  motivo_encerramento VARCHAR(30),
  CONSTRAINT uq_sessao_token UNIQUE (token_hash),
  CONSTRAINT fk_sessao_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario) ON DELETE CASCADE
);

-- Pedidos de redefinição de senha: só o hash do token, validade curta e uso único
CREATE TABLE recuperacao_senha (
  id_recuperacao INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario     INT      NOT NULL,
  token_hash     CHAR(64) NOT NULL,
  criada_em      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_em      DATETIME NOT NULL,
  usada_em       DATETIME,
  CONSTRAINT uq_recuperacao_token UNIQUE (token_hash),
  CONSTRAINT fk_recuperacao_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario) ON DELETE CASCADE
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
-- O corpo fica em BEGIN ... END para o backup do mysqldump poder ser
-- restaurado (ver migrations/002_gatilhos_restauraveis.sql).
CREATE TRIGGER tg_movimentacao_sem_alteracao BEFORE UPDATE ON movimentacao
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Eventos do histórico não podem ser alterados (RN22).';
END;

CREATE TRIGGER tg_movimentacao_sem_exclusao BEFORE DELETE ON movimentacao
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Eventos do histórico não podem ser excluídos (RN22).';
END;
