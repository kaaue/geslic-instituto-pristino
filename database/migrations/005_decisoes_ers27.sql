-- Migração 005: decisões da ERS 2.7 (novembro de 2026). Nada é apagado.
--
--   - projeto.id_setor: setor responsável, opcional (RN43);
--   - usuario.situacao aceita "recusada": a solicitação de acesso recusada é
--     preservada (RN22), em vez de removida;
--   - o responsável de cada projeto passa a constar entre os participantes
--     (RN43). Cada inclusão fica no histórico, em nome do primeiro
--     Administrador cadastrado, com a indicação de que veio da migração.

ALTER TABLE projeto
  ADD COLUMN id_setor INT NULL AFTER id_responsavel,
  ADD CONSTRAINT fk_projeto_setor FOREIGN KEY (id_setor) REFERENCES setor (id_setor);

ALTER TABLE usuario DROP CHECK ck_usuario_situacao;
ALTER TABLE usuario
  ADD CONSTRAINT ck_usuario_situacao CHECK (situacao IN ('pendente', 'recusada', 'ativo', 'inativo'));

CREATE TEMPORARY TABLE responsaveis_incluidos AS
SELECT p.id_projeto, p.id_responsavel, p.codigo, p.nome
  FROM projeto p
 WHERE NOT EXISTS (SELECT 1 FROM colaborador_projeto cp
                    WHERE cp.id_projeto = p.id_projeto AND cp.id_colaborador = p.id_responsavel);

INSERT INTO colaborador_projeto (id_colaborador, id_projeto)
SELECT id_responsavel, id_projeto FROM responsaveis_incluidos;

INSERT INTO movimentacao (id_usuario, tipo, entidade, id_registro, data_evento, descricao, dados_posteriores)
SELECT a.id_usuario, 'correcao', 'projeto', r.id_projeto, CURDATE(),
       CONCAT('Projeto ', r.codigo, ' · ', r.nome, ': responsável incluído entre os participantes (migração 005, RN43)'),
       JSON_OBJECT('participante_incluido', r.id_responsavel)
  FROM responsaveis_incluidos r
  JOIN (SELECT MIN(u.id_usuario) AS id_usuario
          FROM usuario u JOIN perfil pf ON pf.id_perfil = u.id_perfil
         WHERE pf.nome = 'Administrador') a ON a.id_usuario IS NOT NULL;

DROP TEMPORARY TABLE responsaveis_incluidos;
