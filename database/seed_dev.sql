-- GESLIC - Instituto Prístino
-- Carga de demonstração, só para desenvolvimento e apresentação.
-- Rode depois de schema.sql e seed.sql.
--
-- Dados variados de propósito: setores diferentes, equipamentos ativos e
-- inativos, alguns de uso geral e alguns com licença alocada, projetos em
-- situações diferentes, para os filtros e as validações terem efeito visível
-- na demonstração.

SET NAMES utf8mb4;

-- ---------------------------------------------------------------
-- Setores e colaboradores
-- ---------------------------------------------------------------

INSERT INTO setor (nome) VALUES
  ('Administrativo'),
  ('Coordenação de TI'),
  ('Projetos Ambientais'),
  ('Campo e Monitoramento'),
  ('Comunicação');

INSERT INTO colaborador (nome, cargo, email, id_setor) VALUES
  ('Ana Paula Ribeiro',   'Gestora',              'ana.ribeiro@pristino.org.br',   1),
  ('Marina Castro Lima',  'Gestora',              'marina.lima@pristino.org.br',   1),
  ('Carlos Eduardo Alves','Analista de TI',       'carlos.alves@pristino.org.br',  2),
  ('Juliana Moreira',     'Bióloga',              'juliana.moreira@pristino.org.br', 3),
  ('Rafael Souza Pinto',  'Técnico de campo',     'rafael.pinto@pristino.org.br',  4),
  ('Beatriz Nogueira',    'Analista de projetos', 'beatriz.nogueira@pristino.org.br', 3),
  ('Tiago Fernandes',     'Designer',             'tiago.fernandes@pristino.org.br', 5),
  ('Luciana Prado',       'Assistente',           'luciana.prado@pristino.org.br', 1);

-- ---------------------------------------------------------------
-- Equipamentos (RF_B3): grava primeiro em bem e depois em equipamento,
-- com o mesmo id. Na aplicação isso acontece dentro de uma transação.
-- ---------------------------------------------------------------

INSERT INTO bem (categoria, identificacao, id_setor, situacao) VALUES
  ('equipamento','Notebook Dell Latitude 5440', 2, 'ativo'),
  ('equipamento','Notebook Dell Latitude 5440', 3, 'ativo'),
  ('equipamento','Desktop Lenovo ThinkCentre M70', 1, 'ativo'),
  ('equipamento','Desktop Lenovo ThinkCentre M70', 1, 'ativo'),
  ('equipamento','Notebook Acer Aspire 5', 5, 'ativo'),
  ('equipamento','Estação gráfica HP Z2 G9', 5, 'ativo'),
  ('equipamento','Notebook Positivo Motion', 4, 'ativo'),
  ('equipamento','Tablet Samsung Galaxy Tab A9', 4, 'ativo'),
  ('equipamento','Desktop Dell OptiPlex 3000', 2, 'ativo'),
  ('equipamento','Notebook Dell Vostro 3520', 3, 'ativo'),
  ('equipamento','Desktop da sala de reunião', 1, 'ativo'),
  ('equipamento','Notebook da sala de treinamento', 1, 'ativo'),
  ('equipamento','Desktop Itautec ST-4265', 1, 'inativo'),
  ('equipamento','Notebook Dell Inspiron 3421', 3, 'inativo'),
  ('equipamento','Servidor Dell PowerEdge T150', 2, 'ativo');

INSERT INTO equipamento
  (id_equipamento, etiqueta_instituto, etiqueta_netscanner, tipo, id_responsavel, uso_geral) VALUES
  ( 1, 'IP0101', 'NS-100045', 'Notebook',          3, FALSE),
  ( 2, 'IP0102', 'NS-100046', 'Notebook',          4, FALSE),
  ( 3, 'IP0103', 'NS-100051', 'Desktop',           1, FALSE),
  ( 4, 'IP0104', NULL,        'Desktop',           8, FALSE),
  ( 5, 'IP0105', 'NS-100062', 'Notebook',          7, FALSE),
  ( 6, 'IP0106', 'NS-100063', 'Estação gráfica',   7, FALSE),
  ( 7, 'IP0107', NULL,        'Notebook',          5, FALSE),
  ( 8, 'IP0108', NULL,        'Tablet',            5, FALSE),
  ( 9, 'IP0109', 'NS-100071', 'Desktop',           3, FALSE),
  (10, 'IP0110', 'NS-100072', 'Notebook',          6, FALSE),
  (11, 'IP0111', NULL,        'Desktop',        NULL, TRUE),
  (12, 'IP0112', NULL,        'Notebook',       NULL, TRUE),
  (13, 'IP0087', NULL,        'Desktop',        NULL, FALSE),
  (14, 'IP0092', NULL,        'Notebook',       NULL, FALSE),
  (15, 'IP0113', 'NS-100080', 'Servidor',          3, FALSE);

-- ---------------------------------------------------------------
-- Projetos (RF_B6)
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

-- ---------------------------------------------------------------
-- Fornecedores, softwares e licenças
-- Uma licença transferível e uma não transferível, para mostrar os dois
-- comportamentos previstos na RN08 ao inativar um equipamento.
-- ---------------------------------------------------------------

INSERT INTO fornecedor (razao_social, nome_fantasia, cnpj, tipo, contato, email) VALUES
  ('Brasoftware Informática Ltda.',  'Brasoftware', '00111222000101', 'software',   'Comercial', 'comercial@brasoftware.example'),
  ('Imagem Geosistemas Ltda.',       'Imagem',      '00333444000102', 'software',   'Comercial', 'vendas@imagem.example'),
  ('Seguradora Exemplo S.A.',        'Exemplo Seguros', '00555666000103', 'seguradora', 'Corretor', 'corretor@seguros.example');

INSERT INTO software (nome, fabricante, categoria) VALUES
  ('Microsoft 365 Business', 'Microsoft', 'Escritório'),
  ('ArcGIS Desktop',         'Esri',      'Geoprocessamento'),
  ('Adobe Creative Cloud',   'Adobe',     'Design');

-- Responsável pelas licenças: Carlos Eduardo Alves (3), Analista de TI.
-- Projeto adquirente por código: 1023, 2041 e 1022 (este já encerrado, RN18).
INSERT INTO licenca
  (codigo, id_software, nome_software, transferivel, id_projeto_adquirente, id_responsavel, data_aquisicao)
SELECT l.codigo, s.id_software, s.nome, l.transferivel, p.id_projeto, 3, '2026-01-10'
  FROM (SELECT 'LIC-0001' AS codigo, 'Microsoft 365 Business' AS software, TRUE AS transferivel, '1023' AS projeto UNION ALL
        SELECT 'LIC-0002', 'ArcGIS Desktop',       FALSE, '2041' UNION ALL
        SELECT 'LIC-0003', 'Adobe Creative Cloud', TRUE,  '1022') l
  JOIN software s ON s.nome = l.software
  JOIN projeto p  ON p.codigo = l.projeto
 ORDER BY l.codigo;

-- Uma vigência (a primeira) por licença, paga pelo projeto adquirente
INSERT INTO vigencia_licenca
  (id_licenca, numero, id_fornecedor, id_projeto_pagador, data_contratacao,
   data_inicio, data_fim, quantidade_contratada, valor_pago)
SELECT l.id_licenca, 1,
       CASE WHEN l.nome_software = 'ArcGIS Desktop' THEN 2 ELSE 1 END,
       l.id_projeto_adquirente, '2026-01-10', '2026-01-10', '2027-01-09', 1,
       CASE l.nome_software
         WHEN 'Microsoft 365 Business' THEN 1200.00
         WHEN 'ArcGIS Desktop'         THEN 9800.00
         ELSE 2700.00 END
  FROM licenca l
 ORDER BY l.id_licenca;

-- Uma instância por licença, sob responsabilidade do projeto adquirente
INSERT INTO instancia (id_licenca, id_vigencia, identificacao, id_projeto_atual)
SELECT l.id_licenca, v.id_vigencia, i.identificacao, l.id_projeto_adquirente
  FROM (SELECT 'LIC-0001' AS codigo, 'M365-01' AS identificacao UNION ALL
        SELECT 'LIC-0002', 'ARCGIS-01' UNION ALL
        SELECT 'LIC-0003', 'ADOBE-01') i
  JOIN licenca l          ON l.codigo = i.codigo
  JOIN vigencia_licenca v ON v.id_licenca = l.id_licenca AND v.numero = 1
 ORDER BY l.id_licenca;

-- IP0101 tem licença transferível alocada
-- IP0106 tem licença NÃO transferível alocada (bom exemplo para a RN08)
-- IP0109 tem licença transferível alocada
INSERT INTO alocacao (id_instancia, id_equipamento, data_inicio) VALUES
  (1,  1, '2026-03-10'),
  (2,  6, '2026-04-02'),
  (3,  9, '2026-05-20');
