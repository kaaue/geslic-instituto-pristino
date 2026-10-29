-- GESLIC - Instituto Prístino
-- Dados de referência que o sistema precisa para funcionar, em qualquer
-- ambiente. Rode depois de schema.sql.
--
-- Perfis e permissões (RN21, RN27): o Administrador faz tudo o que o
-- Operador faz e, além disso, altera e exclui dados cadastrais, gerencia as
-- contas e consulta o histórico.

SET NAMES utf8mb4;

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
