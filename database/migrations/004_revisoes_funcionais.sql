-- Migração 004: revisões funcionais (lote de revisões de interface e regras).
-- Só acrescenta colunas; nenhum dado é apagado.
--
--   - usuario.senha_provisoria_expira_em: prazo da senha provisória gerada
--     pelo Administrador (vencida, o login é recusado até uma nova ser gerada);
--   - usuario.cadastro_id_setor e cadastro_cargo: dados do colaborador
--     informados na solicitação de acesso. O colaborador só é criado na
--     aprovação; os dados ficam guardados na conta como registro do pedido.

ALTER TABLE usuario
  ADD COLUMN senha_provisoria_expira_em DATETIME NULL AFTER troca_senha_obrigatoria,
  ADD COLUMN cadastro_id_setor INT NULL AFTER aprovada_em,
  ADD COLUMN cadastro_cargo VARCHAR(80) NULL AFTER cadastro_id_setor,
  ADD CONSTRAINT fk_usuario_cadastro_setor FOREIGN KEY (cadastro_id_setor) REFERENCES setor (id_setor);
