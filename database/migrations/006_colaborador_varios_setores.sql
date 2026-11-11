-- Migração 006: o colaborador pode pertencer a mais de um setor.
--
-- O vínculo único colaborador.id_setor dá lugar à tabela colaborador_setor
-- (N:N). Cada colaborador continua com o setor que tinha, agora como uma
-- linha em colaborador_setor; nenhum registro é apagado (RN22). Só a coluna
-- antiga sai, depois que os vínculos foram copiados.

CREATE TABLE colaborador_setor (
  id_colaborador INT NOT NULL,
  id_setor       INT NOT NULL,
  PRIMARY KEY (id_colaborador, id_setor),
  KEY ix_colabsetor_setor (id_setor),
  CONSTRAINT fk_colabsetor_colaborador FOREIGN KEY (id_colaborador)
    REFERENCES colaborador (id_colaborador),
  CONSTRAINT fk_colabsetor_setor FOREIGN KEY (id_setor)
    REFERENCES setor (id_setor)
);

INSERT INTO colaborador_setor (id_colaborador, id_setor)
SELECT id_colaborador, id_setor FROM colaborador WHERE id_setor IS NOT NULL;

ALTER TABLE colaborador DROP FOREIGN KEY fk_colaborador_setor;
ALTER TABLE colaborador DROP COLUMN id_setor;
