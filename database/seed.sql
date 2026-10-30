-- GESLIC - Instituto Prístino
-- Dados de referência que o sistema precisa para funcionar, em qualquer
-- ambiente. Rode depois de schema.sql.
--
-- Perfis e permissões (RN21, RN27): o Administrador faz tudo o que o
-- Operador faz e, além disso, altera e exclui dados cadastrais, gerencia as
-- contas e consulta o histórico. As permissões marcadas como exclusivas do
-- Administrador não podem ser concedidas ao Operador.

SET NAMES utf8mb4;

INSERT INTO perfil (nome, visualiza_dados_sensiveis) VALUES
  ('Administrador', TRUE),
  ('Operador',      FALSE);

INSERT INTO permissao (codigo, descricao, grupo, exclusiva_administrador) VALUES
  ('cadastro.alterar',    'Alterar dados cadastrais',                                    'Cadastros', TRUE),
  ('cadastro.excluir',    'Excluir cadastros sem vínculos',                              'Cadastros', TRUE),
  ('usuario.gerenciar',   'Criar, alterar, desativar e conceder perfil às contas de acesso', 'Administração', TRUE),
  ('auditoria.consultar', 'Consultar o histórico de movimentações',                      'Administração', TRUE),
  ('cadastro.consultar',  'Consultar cadastros',                                         'Cadastros', FALSE),
  ('cadastro.incluir',    'Incluir cadastros',                                           'Cadastros', FALSE),
  ('cadastro.inativar',   'Inativar cadastros e desligar colaboradores',                 'Cadastros', FALSE),
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
  ('relatorio.consultar', 'Consultar o painel e os relatórios',                          'Relatórios', FALSE);

-- Administrador: todas as permissões (RN21)
INSERT INTO perfil_permissao (id_perfil, id_permissao)
SELECT p.id_perfil, pe.id_permissao
  FROM perfil p CROSS JOIN permissao pe
 WHERE p.nome = 'Administrador';

-- Operador: todas, menos as exclusivas do Administrador
INSERT INTO perfil_permissao (id_perfil, id_permissao)
SELECT p.id_perfil, pe.id_permissao
  FROM perfil p CROSS JOIN permissao pe
 WHERE p.nome = 'Operador' AND pe.exclusiva_administrador = FALSE;
