-- GESLIC - Instituto Prístino
-- Tabelas e carga da função básica RF_B6 (Gerenciar projetos institucionais).
-- Rode depois de 01_schema.sql e 02_carga.sql. As tabelas seguem o modelo
-- relacional da ERS versão 2.4 (seção 3.3).
--
-- Além da tabela projeto, o script liga o projeto às tabelas que a RF_B3 já
-- criou (licenca e instancia) e cria colaborador_projeto. Esses vínculos são
-- o que a RF_B6 precisa para duas regras: a exclusão só é permitida em projeto
-- sem vínculos (RN22) e o encerramento não transfere nem cancela recursos (RN18).

SET NAMES utf8mb4;

USE geslic;

-- ---------------------------------------------------------------
-- Projeto institucional
-- ---------------------------------------------------------------

CREATE TABLE projeto (
  id_projeto          INT AUTO_INCREMENT PRIMARY KEY,
  -- código de quatro dígitos informado pelo usuário, não gerado pelo sistema (RN19)
  codigo              CHAR(4)      NOT NULL,
  nome                VARCHAR(120) NOT NULL,
  fonte_financiadora  VARCHAR(120) NOT NULL,
  id_responsavel      INT,
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

-- Licença: projeto adquirente. Instância: projeto atual (responsável pelo uso).
-- Ficam opcionais aqui porque a carga da RF_B3 foi feita antes dos projetos.
ALTER TABLE licenca
  ADD COLUMN id_projeto_adquirente INT NULL,
  ADD CONSTRAINT fk_licenca_projeto FOREIGN KEY (id_projeto_adquirente)
    REFERENCES projeto (id_projeto);

ALTER TABLE instancia
  ADD COLUMN id_projeto_atual INT NULL,
  ADD CONSTRAINT fk_instancia_projeto FOREIGN KEY (id_projeto_atual)
    REFERENCES projeto (id_projeto);

-- ---------------------------------------------------------------
-- Carga de demonstração
-- Situações variadas para os filtros e as regras terem efeito na apresentação:
-- - 1023 termina em poucos meses (aviso de término próximo)
-- - 1301 está em andamento com o término previsto já vencido (aviso)
-- - 1022 está encerrado e mantém uma licença vinculada (RN18)
-- - 1450 não tem nenhum vínculo: pode ser excluído (RN22)
-- - 0007 não tem término previsto
-- Códigos livres para cadastrar na hora: 1500 em diante.
-- ---------------------------------------------------------------

INSERT INTO projeto
  (codigo, nome, fonte_financiadora, id_responsavel, data_inicio, data_fim_prevista,
   data_encerramento, situacao) VALUES
  ('0007', 'Programa Prístino',                'Doação institucional',          1, '2020-03-01', NULL,         NULL,         'em_andamento'),
  ('1022', 'CAOMA 2024–2025',                  'Termo de Cooperação 11/2024',   4, '2024-01-01', '2025-12-31', '2026-01-15', 'encerrado'),
  ('1023', 'CAOMA 2025–2026',                  'Termo de Cooperação 08/2025',   2, '2025-01-01', '2026-12-31', NULL,         'em_andamento'),
  ('1234', 'Mata Atlântica Viva',              'Convênio estadual 14/2024',     6, '2025-04-20', '2027-04-19', NULL,         'em_andamento'),
  ('2041', 'NUGEO 2026',                       'Edital de pesquisa 03/2026',    3, '2026-01-05', '2027-04-30', NULL,         'em_andamento'),
  ('1301', 'Monitoramento do Rio Paraná',      'Convênio municipal 02/2025',    5, '2025-02-01', '2026-09-30', NULL,         'em_andamento'),
  ('1450', 'Educação Ambiental nas Escolas',   'Doação institucional',          7, '2026-08-01', '2027-07-31', NULL,         'em_andamento');

-- Participações (por código, para não depender dos ids gerados)
INSERT INTO colaborador_projeto (id_colaborador, id_projeto)
SELECT c.id, p.id_projeto
  FROM (SELECT 1 AS id, '0007' AS codigo UNION ALL
        SELECT 2, '1023' UNION ALL SELECT 4, '1023' UNION ALL SELECT 6, '1234' UNION ALL
        SELECT 3, '2041' UNION ALL SELECT 4, '2041' UNION ALL SELECT 5, '1301' UNION ALL
        SELECT 4, '1022') c
  JOIN projeto p ON p.codigo = c.codigo;

-- Licenças e instâncias da carga da RF_B3 ligadas aos projetos
UPDATE licenca l JOIN projeto p ON p.codigo = '1023' SET l.id_projeto_adquirente = p.id_projeto WHERE l.codigo = 'LIC-0001';
UPDATE licenca l JOIN projeto p ON p.codigo = '2041' SET l.id_projeto_adquirente = p.id_projeto WHERE l.codigo = 'LIC-0002';
UPDATE licenca l JOIN projeto p ON p.codigo = '1022' SET l.id_projeto_adquirente = p.id_projeto WHERE l.codigo = 'LIC-0003';
UPDATE instancia i JOIN licenca l ON l.id_licenca = i.id_licenca
   SET i.id_projeto_atual = l.id_projeto_adquirente;
