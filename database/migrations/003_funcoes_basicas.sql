-- GESLIC - migração 003: funções básicas da ERS 2.6 (RF_B1 a RF_B10).
--
-- Aplicada por `npm run db:migrate` em bancos criados antes desta versão.
-- Instalações novas (`npm run db:setup`) já nascem neste formato pelo
-- schema.sql e o seed.sql. Não apaga cadastros:
--   - setor ganha coordenador (colaborador) e data efetiva da inativação; o
--     antigo texto "responsavel" vira o coordenador quando o nome confere com
--     um colaborador ativo;
--   - bem ganha os campos por categoria (série, endereço, Renavam, ano/modelo,
--     matrícula, área) e a data efetiva da inativação; equipamentos já
--     inativados recebem a data do evento de inativação do histórico, quando
--     ele existe (sem o evento, a data fica em branco: não é inventada);
--   - software ganha observações;
--   - usuario perde o "último acesso" (RN41) e ganha quem aprovou a conta;
--   - permissões fixas por perfil (RN21, RN41): a matriz deixa de ser
--     editável e é refeita a partir das marcas de cada permissão; entram as
--     permissões de painel, solicitações de ajuste e autorizações;
--   - preferências de aviso por tipo e prazo (RN24): as antecedências em meses
--     já salvas viram prazos dos avisos de vencimento e de término de projeto;
--   - solicitações de ajuste (RN36) com presença informativa (RN42).

SET NAMES utf8mb4;

-- ---------------------------------------------------------------
-- Setor (RF_B5)
-- ---------------------------------------------------------------

ALTER TABLE setor
  ADD COLUMN id_coordenador  INT  NULL AFTER ativo,
  ADD COLUMN data_inativacao DATE NULL AFTER id_coordenador;

UPDATE setor s
  JOIN colaborador c ON c.nome = s.responsavel AND c.ativo = TRUE
   SET s.id_coordenador = c.id_colaborador
 WHERE s.responsavel IS NOT NULL;

ALTER TABLE setor
  DROP COLUMN responsavel,
  ADD CONSTRAINT fk_setor_coordenador FOREIGN KEY (id_coordenador) REFERENCES colaborador (id_colaborador),
  ADD CONSTRAINT ck_setor_inativacao CHECK (data_inativacao IS NULL OR ativo = FALSE);

-- ---------------------------------------------------------------
-- Bem segurável (RF_B6) e equipamento (RF_B3)
-- ---------------------------------------------------------------

ALTER TABLE bem
  ADD COLUMN numero_serie       VARCHAR(60)   NULL AFTER placa,
  ADD COLUMN endereco           VARCHAR(200)  NULL AFTER numero_serie,
  ADD COLUMN renavam            VARCHAR(11)   NULL AFTER endereco,
  ADD COLUMN ano_modelo         VARCHAR(9)    NULL AFTER renavam,
  ADD COLUMN matricula          VARCHAR(60)   NULL AFTER ano_modelo,
  ADD COLUMN area_construida_m2 DECIMAL(10,2) NULL AFTER matricula,
  ADD COLUMN data_inativacao    DATE          NULL AFTER situacao;

UPDATE bem b
  JOIN (SELECT id_registro, MAX(data_evento) AS data_evento
          FROM movimentacao
         WHERE entidade = 'equipamento' AND tipo = 'inativacao'
         GROUP BY id_registro) m ON m.id_registro = b.id_bem
   SET b.data_inativacao = m.data_evento
 WHERE b.situacao = 'inativo' AND b.data_inativacao IS NULL;

ALTER TABLE bem
  ADD CONSTRAINT uq_bem_placa UNIQUE (placa),
  ADD CONSTRAINT ck_bem_inativacao CHECK (data_inativacao IS NULL OR situacao = 'inativo'),
  ADD CONSTRAINT ck_bem_valor CHECK (valor IS NULL OR valor >= 0),
  ADD CONSTRAINT ck_bem_area CHECK (area_construida_m2 IS NULL OR area_construida_m2 > 0);

-- ---------------------------------------------------------------
-- Software (RF_B2)
-- ---------------------------------------------------------------

ALTER TABLE software ADD COLUMN observacoes VARCHAR(500) NULL AFTER categoria;

-- ---------------------------------------------------------------
-- Contas (RF_B8): sem último acesso (RN41); quem aprovou a conta
-- ---------------------------------------------------------------

ALTER TABLE usuario
  DROP COLUMN ultimo_acesso_em,
  ADD COLUMN id_aprovador INT      NULL AFTER senha_alterada_em,
  ADD COLUMN aprovada_em  DATETIME NULL AFTER id_aprovador,
  ADD CONSTRAINT fk_usuario_aprovador FOREIGN KEY (id_aprovador) REFERENCES usuario (id_usuario);

-- ---------------------------------------------------------------
-- Permissões fixas por perfil (RN21, RN41, Protótipo 13.2)
-- ---------------------------------------------------------------

ALTER TABLE permissao
  ADD COLUMN exclusiva_operador BOOLEAN NOT NULL DEFAULT FALSE AFTER exclusiva_administrador;

INSERT INTO permissao (codigo, descricao, grupo, exclusiva_administrador, exclusiva_operador) VALUES
  ('cadastro.consultar',    'Consultar cadastros',                                             'Cadastros',     FALSE, FALSE),
  ('cadastro.incluir',      'Incluir cadastros',                                               'Cadastros',     FALSE, FALSE),
  ('cadastro.inativar',     'Inativar cadastros (com data efetiva)',                           'Cadastros',     FALSE, FALSE),
  ('cadastro.alterar',      'Corrigir dados cadastrais, desligar colaboradores e alterar participantes', 'Cadastros', TRUE, FALSE),
  ('cadastro.excluir',      'Excluir cadastros sem vínculos',                                  'Cadastros',     TRUE,  FALSE),
  ('ajuste.solicitar',      'Emitir solicitações de ajuste cadastral',                         'Cadastros',     FALSE, TRUE),
  ('ajuste.concluir',       'Concluir solicitações de ajuste cadastral',                       'Cadastros',     TRUE,  FALSE),
  ('projeto.prorrogar',     'Prorrogar o término previsto de projetos',                        'Projetos',      FALSE, FALSE),
  ('projeto.encerrar',      'Encerrar projetos',                                               'Projetos',      FALSE, FALSE),
  ('licenca.consultar',     'Consultar licenças e instâncias',                                 'Licenças',      FALSE, FALSE),
  ('licenca.registrar',     'Registrar licenças de software',                                  'Licenças',      FALSE, FALSE),
  ('licenca.movimentar',    'Alocar, transferir e liberar instâncias',                         'Licenças',      FALSE, FALSE),
  ('licenca.renovar',       'Renovar licenças',                                                'Licenças',      FALSE, FALSE),
  ('licenca.inativar',      'Inativar licenças e instâncias',                                  'Licenças',      FALSE, FALSE),
  ('excecao.confirmar',     'Confirmar exceções administrativas autorizadas',                  'Licenças',      FALSE, FALSE),
  ('apolice.consultar',     'Consultar apólices',                                              'Apólices',      FALSE, FALSE),
  ('apolice.registrar',     'Registrar apólices e vincular bens e pessoas',                    'Apólices',      FALSE, FALSE),
  ('apolice.renovar',       'Renovar apólices',                                                'Apólices',      FALSE, FALSE),
  ('apolice.cancelar',      'Cancelar apólices',                                               'Apólices',      FALSE, FALSE),
  ('documento.gerenciar',   'Anexar e consultar documentos PDF',                               'Documentos',    FALSE, FALSE),
  ('autorizacao.emitir',    'Emitir autorizações operacionais',                                'Autorizações',  TRUE,  FALSE),
  ('autorizacao.registrar', 'Registrar o resultado das autorizações',                          'Autorizações',  FALSE, FALSE),
  ('painel.consultar',      'Consultar o painel de acompanhamento',                            'Consultas',     FALSE, FALSE),
  ('relatorio.consultar',   'Consultar os relatórios',                                         'Consultas',     TRUE,  FALSE),
  ('auditoria.consultar',   'Consultar o histórico de movimentações e auditoria',              'Consultas',     TRUE,  FALSE),
  ('usuario.gerenciar',     'Gerenciar contas e perfis e aprovar solicitações de acesso',      'Administração', TRUE,  FALSE)
ON DUPLICATE KEY UPDATE
  descricao = VALUES(descricao),
  grupo = VALUES(grupo),
  exclusiva_administrador = VALUES(exclusiva_administrador),
  exclusiva_operador = VALUES(exclusiva_operador);

ALTER TABLE permissao
  ADD CONSTRAINT ck_permissao_exclusiva CHECK (NOT (exclusiva_administrador AND exclusiva_operador));

-- A matriz deixa de ser personalizável: refeita pelas marcas de cada permissão
DELETE FROM perfil_permissao;

INSERT INTO perfil_permissao (id_perfil, id_permissao)
SELECT p.id_perfil, pe.id_permissao
  FROM perfil p CROSS JOIN permissao pe
 WHERE p.nome = 'Administrador' AND pe.exclusiva_operador = FALSE;

INSERT INTO perfil_permissao (id_perfil, id_permissao)
SELECT p.id_perfil, pe.id_permissao
  FROM perfil p CROSS JOIN permissao pe
 WHERE p.nome = 'Operador' AND pe.exclusiva_administrador = FALSE;

-- ---------------------------------------------------------------
-- Preferências de aviso por tipo e prazo (RF_B9, RN24)
-- ---------------------------------------------------------------

CREATE TABLE tipo_notificacao (
  id_tipo_notificacao     INT AUTO_INCREMENT PRIMARY KEY,
  codigo                  VARCHAR(30)  NOT NULL,
  nome                    VARCHAR(80)  NOT NULL,
  descricao               VARCHAR(80)  NOT NULL,
  modo                    VARCHAR(12)  NOT NULL,
  momento                 VARCHAR(30),
  exclusivo_administrador BOOLEAN      NOT NULL DEFAULT FALSE,
  prazos_padrao           JSON,
  ordem                   TINYINT      NOT NULL,
  CONSTRAINT uq_tipo_notificacao_codigo UNIQUE (codigo),
  CONSTRAINT ck_tipo_notificacao_modo CHECK (modo IN ('antecedencia', 'imediato', 'lembrete'))
);

INSERT INTO tipo_notificacao
  (codigo, nome, descricao, modo, momento, exclusivo_administrador, prazos_padrao, ordem) VALUES
  ('licenca_vencimento',   'Vencimento de licença',                  'antecedência',              'antecedencia', NULL,              FALSE,
     '[{"quantidade": 6, "unidade": "mes"}, {"quantidade": 1, "unidade": "mes"}]', 1),
  ('apolice_vencimento',   'Vencimento de apólice',                  'antecedência',              'antecedencia', NULL,              FALSE,
     '[{"quantidade": 6, "unidade": "mes"}, {"quantidade": 1, "unidade": "mes"}]', 2),
  ('projeto_termino',      'Término de projeto',                     'antecedência',              'antecedencia', NULL,              FALSE,
     '[{"quantidade": 6, "unidade": "mes"}, {"quantidade": 1, "unidade": "mes"}]', 3),
  ('autorizacao_nova',     'Nova autorização',                       'aviso imediato',            'imediato',     'na emissão',      FALSE, NULL, 4),
  ('autorizacao_pendente', 'Autorização ainda pendente',             'lembrete após a emissão',   'lembrete',     NULL,              FALSE,
     '[{"quantidade": 1, "unidade": "semana"}]', 5),
  ('ajuste_novo',          'Nova solicitação de ajuste',             'aviso imediato',            'imediato',     'na solicitação',  FALSE, NULL, 6),
  ('conclusao',            'Conclusão de autorização ou solicitação', 'aviso imediato',           'imediato',     'na conclusão',    FALSE, NULL, 7),
  ('conta_aguardando',     'Conta aguardando aprovação',             'exclusivo do Administrador', 'imediato',    'na solicitação',  TRUE,  NULL, 8);

-- As antecedências da versão anterior (meses, valendo para licenças,
-- apólices e projetos) são guardadas antes de a tabela ser substituída
CREATE TEMPORARY TABLE antecedencias_anteriores AS
  SELECT id_usuario, antecedencia_meses FROM preferencia_notificacao;

DROP TABLE preferencia_notificacao;

CREATE TABLE preferencia_notificacao (
  id_preferencia      INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario          INT      NOT NULL,
  id_tipo_notificacao INT      NOT NULL,
  ativo               BOOLEAN  NOT NULL DEFAULT TRUE,
  atualizada_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_preferencia_tipo UNIQUE (id_usuario, id_tipo_notificacao),
  CONSTRAINT fk_preferencia_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_preferencia_tipo FOREIGN KEY (id_tipo_notificacao)
    REFERENCES tipo_notificacao (id_tipo_notificacao)
);

CREATE TABLE prazo_notificacao (
  id_prazo       INT AUTO_INCREMENT PRIMARY KEY,
  id_preferencia INT        NOT NULL,
  quantidade     SMALLINT   NOT NULL,
  unidade        VARCHAR(6) NOT NULL,
  CONSTRAINT uq_prazo_notificacao UNIQUE (id_preferencia, quantidade, unidade),
  CONSTRAINT ck_prazo_quantidade CHECK (quantidade > 0),
  CONSTRAINT ck_prazo_unidade CHECK (unidade IN ('dia', 'semana', 'mes')),
  CONSTRAINT fk_prazo_preferencia FOREIGN KEY (id_preferencia)
    REFERENCES preferencia_notificacao (id_preferencia) ON DELETE CASCADE
);

INSERT INTO preferencia_notificacao (id_usuario, id_tipo_notificacao, ativo)
SELECT u.id_usuario, t.id_tipo_notificacao, TRUE
  FROM (SELECT DISTINCT id_usuario FROM antecedencias_anteriores) u
  CROSS JOIN tipo_notificacao t
 WHERE t.modo = 'antecedencia';

INSERT INTO prazo_notificacao (id_preferencia, quantidade, unidade)
SELECT p.id_preferencia, a.antecedencia_meses, 'mes'
  FROM antecedencias_anteriores a
  JOIN preferencia_notificacao p ON p.id_usuario = a.id_usuario
  JOIN tipo_notificacao t        ON t.id_tipo_notificacao = p.id_tipo_notificacao AND t.modo = 'antecedencia';

DROP TEMPORARY TABLE antecedencias_anteriores;

-- ---------------------------------------------------------------
-- Solicitações de ajuste cadastral (RF_B10, RN36) e presença (RN42)
-- ---------------------------------------------------------------

CREATE TABLE solicitacao_ajuste (
  id_solicitacao       INT AUTO_INCREMENT PRIMARY KEY,
  id_solicitante       INT           NOT NULL,
  criada_em            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  entidade             VARCHAR(20)   NOT NULL,
  id_registro          INT           NOT NULL,
  rotulo_registro      VARCHAR(160)  NOT NULL,
  descricao            VARCHAR(1000) NOT NULL,
  situacao             VARCHAR(10)   NOT NULL DEFAULT 'pendente',
  id_concluinte        INT,
  concluida_em         DATETIME,
  observacao_conclusao VARCHAR(500),
  CONSTRAINT ck_solicitacao_entidade CHECK (entidade IN
    ('fornecedor', 'software', 'equipamento', 'colaborador', 'setor', 'projeto', 'bem', 'tipo_seguro')),
  CONSTRAINT ck_solicitacao_situacao CHECK (situacao IN ('pendente', 'concluida')),
  CONSTRAINT ck_solicitacao_conclusao CHECK (
    (situacao = 'pendente' AND id_concluinte IS NULL AND concluida_em IS NULL AND observacao_conclusao IS NULL) OR
    (situacao = 'concluida' AND id_concluinte IS NOT NULL AND concluida_em IS NOT NULL)),
  CONSTRAINT fk_solicitacao_solicitante FOREIGN KEY (id_solicitante) REFERENCES usuario (id_usuario),
  CONSTRAINT fk_solicitacao_concluinte FOREIGN KEY (id_concluinte) REFERENCES usuario (id_usuario)
);

CREATE INDEX ix_solicitacao_situacao ON solicitacao_ajuste (situacao, criada_em);
CREATE INDEX ix_solicitacao_registro ON solicitacao_ajuste (entidade, id_registro);

CREATE TABLE presenca_solicitacao (
  id_solicitacao INT         NOT NULL,
  id_usuario     INT         NOT NULL,
  acao           VARCHAR(12) NOT NULL,
  atualizada_em  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_solicitacao, id_usuario),
  CONSTRAINT ck_presenca_acao CHECK (acao IN ('visualizando', 'atualizando')),
  CONSTRAINT fk_presenca_solicitacao FOREIGN KEY (id_solicitacao)
    REFERENCES solicitacao_ajuste (id_solicitacao) ON DELETE CASCADE,
  CONSTRAINT fk_presenca_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario) ON DELETE CASCADE
);

ALTER TABLE movimentacao
  ADD COLUMN id_solicitacao INT NULL AFTER id_apolice,
  ADD CONSTRAINT fk_mov_solicitacao FOREIGN KEY (id_solicitacao) REFERENCES solicitacao_ajuste (id_solicitacao);

CREATE INDEX ix_mov_registro ON movimentacao (entidade, id_registro, registrado_em);

CREATE TRIGGER tg_solicitacao_conclusao_unica BEFORE UPDATE ON solicitacao_ajuste
FOR EACH ROW
BEGIN
  IF OLD.situacao = 'concluida' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solicitação já concluída: autoria e data da conclusão não mudam (RN36).';
  END IF;
END;

CREATE TRIGGER tg_solicitacao_sem_exclusao BEFORE DELETE ON solicitacao_ajuste
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solicitações de ajuste não podem ser excluídas (RN36).';
END;
