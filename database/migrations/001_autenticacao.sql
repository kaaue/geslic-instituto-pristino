-- GESLIC - migração 001: autenticação real, sessões, recuperação de senha e
-- permissões por operação (RF_B9, RN21, RN27, seção 2.3.2 da ERS).
--
-- Aplicada por `npm run db:migrate` em bancos criados antes desta versão. Não
-- apaga dados: as contas existentes mantêm perfil e senha, e a coluna `ativo`
-- é convertida em `situacao`. Instalações novas (`npm run db:setup`) já
-- nascem com este formato pelo schema.sql e o seed.sql.

SET NAMES utf8mb4;

-- ---------------------------------------------------------------
-- Conta de acesso: situação (pendente, ativo, inativo), troca de senha
-- obrigatória após senha provisória e datas de acompanhamento.
-- ---------------------------------------------------------------

ALTER TABLE usuario
  ADD COLUMN situacao                VARCHAR(10) NOT NULL DEFAULT 'ativo' AFTER senha_hash,
  ADD COLUMN troca_senha_obrigatoria BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN criada_em               DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN senha_alterada_em       DATETIME    NULL,
  ADD COLUMN ultimo_acesso_em        DATETIME    NULL;

UPDATE usuario SET situacao = IF(ativo, 'ativo', 'inativo');

ALTER TABLE usuario
  DROP COLUMN ativo,
  ADD CONSTRAINT ck_usuario_situacao CHECK (situacao IN ('pendente', 'ativo', 'inativo'));

-- ---------------------------------------------------------------
-- Sessões no servidor. O navegador guarda só o token, num cookie HttpOnly;
-- aqui fica o hash SHA-256 dele, nunca o token em si.
-- ---------------------------------------------------------------

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

-- ---------------------------------------------------------------
-- Permissões por operação. `exclusiva_administrador` marca as que a RN21
-- reserva ao Administrador: elas não podem ser concedidas ao Operador.
-- ---------------------------------------------------------------

ALTER TABLE permissao
  ADD COLUMN grupo                   VARCHAR(40) NOT NULL DEFAULT 'Geral',
  ADD COLUMN exclusiva_administrador BOOLEAN     NOT NULL DEFAULT FALSE;

-- Os perfis existem desde o modelo completo; garante para bancos antigos
INSERT IGNORE INTO perfil (nome, visualiza_dados_sensiveis) VALUES
  ('Administrador', TRUE),
  ('Operador',      FALSE);

INSERT INTO permissao (codigo, descricao, grupo, exclusiva_administrador) VALUES
  ('cadastro.consultar',  'Consultar cadastros',                                         'Cadastros', FALSE),
  ('cadastro.incluir',    'Incluir cadastros',                                           'Cadastros', FALSE),
  ('cadastro.inativar',   'Inativar cadastros e desligar colaboradores',                 'Cadastros', FALSE),
  ('cadastro.alterar',    'Alterar dados cadastrais',                                    'Cadastros', TRUE),
  ('cadastro.excluir',    'Excluir cadastros sem vínculos',                              'Cadastros', TRUE),
  ('projeto.prorrogar',   'Prorrogar o término previsto de projetos',                    'Projetos',  FALSE),
  ('projeto.encerrar',    'Encerrar projetos',                                           'Projetos',  FALSE),
  ('licenca.consultar',   'Consultar licenças e instâncias',                             'Licenças',  FALSE),
  ('licenca.registrar',   'Registrar licenças de software',                              'Licenças',  FALSE),
  ('licenca.movimentar',  'Alocar, transferir e liberar instâncias',                     'Licenças',  FALSE),
  ('licenca.renovar',     'Renovar licenças',                                            'Licenças',  FALSE),
  ('licenca.inativar',    'Inativar licenças e instâncias',                              'Licenças',  FALSE),
  ('apolice.consultar',   'Consultar apólices',                                          'Apólices',  FALSE),
  ('apolice.registrar',   'Registrar apólices e vincular bens e pessoas',                'Apólices',  FALSE),
  ('apolice.renovar',     'Renovar apólices',                                            'Apólices',  FALSE),
  ('apolice.cancelar',    'Cancelar apólices',                                           'Apólices',  FALSE),
  ('documento.gerenciar', 'Anexar e consultar documentos PDF',                           'Documentos', FALSE),
  ('excecao.confirmar',   'Confirmar exceções administrativas autorizadas',              'Licenças',  FALSE),
  ('relatorio.consultar', 'Consultar o painel e os relatórios',                          'Relatórios', FALSE),
  ('usuario.gerenciar',   'Criar, alterar, desativar e conceder perfil às contas de acesso', 'Administração', TRUE),
  ('auditoria.consultar', 'Consultar o histórico de movimentações',                      'Administração', TRUE)
ON DUPLICATE KEY UPDATE
  descricao = VALUES(descricao),
  grupo = VALUES(grupo),
  exclusiva_administrador = VALUES(exclusiva_administrador);

-- Administrador: todas as permissões (RN21)
INSERT IGNORE INTO perfil_permissao (id_perfil, id_permissao)
SELECT p.id_perfil, pe.id_permissao
  FROM perfil p CROSS JOIN permissao pe
 WHERE p.nome = 'Administrador';

-- Operador: todas, menos as exclusivas do Administrador
INSERT IGNORE INTO perfil_permissao (id_perfil, id_permissao)
SELECT p.id_perfil, pe.id_permissao
  FROM perfil p CROSS JOIN permissao pe
 WHERE p.nome = 'Operador' AND pe.exclusiva_administrador = FALSE;
