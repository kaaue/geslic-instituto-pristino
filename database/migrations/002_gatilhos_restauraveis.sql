-- GESLIC - migração 002: gatilhos do histórico restauráveis por backup.
--
-- Os gatilhos que impedem alterar ou excluir eventos do histórico (RN22)
-- foram criados com o corpo numa única instrução, e o MySQL guardou o ";"
-- final dentro do corpo. Com isso, o arquivo gerado pelo mysqldump não pode
-- ser restaurado (erro de sintaxe no CREATE TRIGGER), o que compromete as
-- cópias de segurança trimestrais (seção 2.3.2 da ERS).
--
-- Aqui os dois gatilhos são recriados com BEGIN ... END. A regra é a mesma;
-- só a forma de gravação muda. Não altera dados.

SET NAMES utf8mb4;

DROP TRIGGER IF EXISTS tg_movimentacao_sem_alteracao;
DROP TRIGGER IF EXISTS tg_movimentacao_sem_exclusao;

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
