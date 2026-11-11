-- GESLIC - Instituto Prístino
-- Carga de demonstração, só para desenvolvimento e apresentação.
-- Rode depois de schema.sql e seed.sql.
--
-- Quatro setores (NUGEO, Onça, CAOMA e ADMINISTRATIVO); alguns colaboradores
-- atuam em mais de um setor (colaborador_setor, migração 006).
-- Dados variados de propósito: setores diferentes, equipamentos ativos e
-- inativos, alguns de uso geral e alguns com licença alocada, projetos em
-- situações diferentes, para os filtros e as validações terem efeito visível
-- na demonstração.

SET NAMES utf8mb4;

-- ---------------------------------------------------------------
-- Setores e colaboradores
-- ---------------------------------------------------------------

-- 1 NUGEO (núcleo de geoprocessamento), 2 Onça (projetos de campo com a
-- onça-pintada), 3 CAOMA (projetos de cooperação ambiental) e 4 ADMINISTRATIVO
INSERT INTO setor (nome) VALUES
  ('NUGEO'),
  ('Onça'),
  ('CAOMA'),
  ('ADMINISTRATIVO');

INSERT INTO colaborador (nome, cargo, email) VALUES
  ('Ana Paula Ribeiro',   'Gestora',              'ana.ribeiro@pristino.org.br'),
  ('Marina Castro Lima',  'Gestora',              'marina.lima@pristino.org.br'),
  ('Carlos Eduardo Alves','Analista de TI',       'carlos.alves@pristino.org.br'),
  ('Juliana Moreira',     'Bióloga',              'juliana.moreira@pristino.org.br'),
  ('Rafael Souza Pinto',  'Técnico de campo',     'rafael.pinto@pristino.org.br'),
  ('Beatriz Nogueira',    'Analista de projetos', 'beatriz.nogueira@pristino.org.br'),
  ('Tiago Fernandes',     'Designer',             'tiago.fernandes@pristino.org.br'),
  ('Luciana Prado',       'Assistente',           'luciana.prado@pristino.org.br');

-- Colaborador desligado, com a data efetiva do desligamento (RN07, RN37)
INSERT INTO colaborador (nome, cargo, email, ativo, data_desligamento) VALUES
  ('Rafael Antunes', 'Técnico de campo', 'rafael.antunes@pristino.org.br', FALSE, '2026-09-30');

-- Equipe do NUGEO. Pedro Henrique Matos é o colaborador da conta de
-- exemplo "operador" (perfil Operador, criada pelo setup-db.js).
INSERT INTO colaborador (nome, cargo, email) VALUES
  ('Pedro Henrique Matos', 'Analista de geoprocessamento', 'pedro.matos@pristino.org.br'),
  ('Camila Duarte Rocha',  'Geógrafa',                     'camila.rocha@pristino.org.br');

-- Setores de cada colaborador. Em mais de um setor: Marina (CAOMA e
-- ADMINISTRATIVO), Carlos (NUGEO e ADMINISTRATIVO), Juliana (Onça e CAOMA)
-- e Pedro (NUGEO e Onça).
INSERT INTO colaborador_setor (id_colaborador, id_setor) VALUES
  ( 1, 4),
  ( 2, 3), ( 2, 4),
  ( 3, 1), ( 3, 4),
  ( 4, 2), ( 4, 3),
  ( 5, 2),
  ( 6, 3),
  ( 7, 4),
  ( 8, 4),
  ( 9, 2),
  (10, 1), (10, 2),
  (11, 1);

-- Coordenadores dos setores: colaboradores ativos (RF_B5)
UPDATE setor SET id_coordenador = CASE id_setor
    WHEN 1 THEN 11 WHEN 2 THEN 5 WHEN 3 THEN 4 WHEN 4 THEN 1 END
 WHERE id_setor BETWEEN 1 AND 4;

-- ---------------------------------------------------------------
-- Equipamentos (RF_B3): grava primeiro em bem e depois em equipamento,
-- com o mesmo id. Na aplicação isso acontece dentro de uma transação.
-- ---------------------------------------------------------------

INSERT INTO bem (categoria, identificacao, id_setor, situacao) VALUES
  ('equipamento','Notebook Dell Latitude 5440', 1, 'ativo'),
  ('equipamento','Notebook Dell Latitude 5440', 3, 'ativo'),
  ('equipamento','Desktop Lenovo ThinkCentre M70', 4, 'ativo'),
  ('equipamento','Desktop Lenovo ThinkCentre M70', 4, 'ativo'),
  ('equipamento','Notebook Acer Aspire 5', 4, 'ativo'),
  ('equipamento','Estação gráfica HP Z2 G9', 1, 'ativo'),
  ('equipamento','Notebook Positivo Motion', 2, 'ativo'),
  ('equipamento','Tablet Samsung Galaxy Tab A9', 2, 'ativo'),
  ('equipamento','Desktop Dell OptiPlex 3000', 4, 'ativo'),
  ('equipamento','Notebook Dell Vostro 3520', 3, 'ativo'),
  ('equipamento','Desktop da sala de reunião', 4, 'ativo'),
  ('equipamento','Notebook da sala de treinamento', 4, 'ativo'),
  ('equipamento','Desktop Itautec ST-4265', 4, 'inativo'),
  ('equipamento','Notebook Dell Inspiron 3421', 3, 'inativo'),
  ('equipamento','Servidor Dell PowerEdge T150', 4, 'ativo');

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

-- Datas efetivas do descarte dos dois equipamentos inativos (RN37)
UPDATE bem SET data_inativacao = '2025-11-20' WHERE id_bem = 13;
UPDATE bem SET data_inativacao = '2026-03-12' WHERE id_bem = 14;

-- ---------------------------------------------------------------
-- Projetos (RF_F1)
-- - 1023 termina em poucos meses (aviso de término próximo)
-- - 1301 está em andamento com o término previsto já vencido (aviso)
-- - 1022 está encerrado e mantém uma licença vinculada (RN18)
-- - 1450 não tem nenhum vínculo: pode ser excluído (RN22)
-- - 0007 não tem término previsto
-- Setor responsável (RN43): 2041 no NUGEO, 1022 e 1023 no CAOMA e 1301 na
-- Onça; os demais sem setor. Os colaboradores ativos do setor constam entre
-- os participantes, como faria o formulário ao escolher o setor.
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

UPDATE projeto SET id_setor = CASE codigo
    WHEN '2041' THEN 1 WHEN '1301' THEN 2 WHEN '1022' THEN 3 WHEN '1023' THEN 3 END
 WHERE codigo IN ('2041', '1301', '1022', '1023');

-- Participações (por código, para não depender dos ids gerados)
INSERT INTO colaborador_projeto (id_colaborador, id_projeto)
SELECT c.id, p.id_projeto
  FROM (SELECT 1 AS id, '0007' AS codigo UNION ALL
        SELECT 2, '1023' UNION ALL SELECT 4, '1023' UNION ALL SELECT 6, '1023' UNION ALL
        SELECT 6, '1234' UNION ALL
        SELECT 3, '2041' UNION ALL SELECT 4, '2041' UNION ALL SELECT 10, '2041' UNION ALL SELECT 11, '2041' UNION ALL
        SELECT 5, '1301' UNION ALL SELECT 4, '1301' UNION ALL SELECT 10, '1301' UNION ALL
        SELECT 4, '1022' UNION ALL SELECT 6, '1022' UNION ALL
        SELECT 7, '1450') c
  JOIN projeto p ON p.codigo = c.codigo;

-- ---------------------------------------------------------------
-- Fornecedores, softwares e licenças
-- Uma licença transferível e uma não transferível, para mostrar os dois
-- comportamentos previstos na RN08 ao inativar um equipamento.
-- ---------------------------------------------------------------

INSERT INTO fornecedor (razao_social, nome_fantasia, cnpj, tipo, contato, telefone, email) VALUES
  ('Brasoftware Informática Ltda.',  'Brasoftware', '00111222000101', 'software',   'Comercial', '(11) 3030-1000', 'comercial@brasoftware.example'),
  ('Imagem Geosistemas Ltda.',       'Imagem',      '00333444000102', 'software',   'Comercial', '(12) 3946-8800', 'vendas@imagem.example'),
  ('Seguradora Exemplo S.A.',        'Exemplo Seguros', '00555666000103', 'seguradora', 'Corretor', '(31) 3222-0000', 'corretor@seguros.example'),
  ('Serra Verde Seguros S.A.',       'Serra Verde', '00777888000104', 'seguradora', 'Corretora', '(31) 3555-2000', 'atendimento@serraverde.example');

INSERT INTO software (nome, versao, fabricante, categoria, observacoes) VALUES
  ('Microsoft 365 Business', NULL,   'Microsoft', 'Escritório',       NULL),
  ('ArcGIS Desktop',         '10.8', 'Esri',      'Geoprocessamento', 'Usado pelo NUGEO e pelos projetos de monitoramento.'),
  ('Adobe Creative Cloud',   '2024', 'Adobe',     'Design',           NULL),
  ('QGIS',                   '3.34', 'OSGeo',     'Geoprocessamento', 'Software livre, sem licença registrada.');

-- Software fora de uso: inativo, sai das listas de novos cadastros
INSERT INTO software (nome, versao, fabricante, categoria, ativo) VALUES
  ('CorelDRAW', 'X7', 'Corel', 'Design', FALSE);

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

-- ---------------------------------------------------------------
-- Bens seguráveis (RF_B6), tipos de seguro e coberturas (RF_B7) e duas
-- apólices de exemplo. O drone DJI Mavic 3 é coberto pelas duas apólices
-- e, por meio delas, relaciona-se a dois projetos (RN40, CA18). O bem não
-- tem campo de projeto.
-- ---------------------------------------------------------------

INSERT INTO bem (categoria, identificacao, placa, renavam, ano_modelo, valor, id_setor) VALUES
  ('veiculo', 'Toyota Hilux', 'QAB-1D23', '01234567890', '2023/2024', 285000.00, 2);

INSERT INTO bem (categoria, identificacao, numero_serie, patrimonio, valor, id_setor) VALUES
  ('drone', 'DJI Mavic 3',   '1581F4QF', '0451', 21500.00, 1),
  ('drone', 'DJI Phantom 4', '0AXDE8',   NULL,    9800.00, 2);

INSERT INTO bem (categoria, identificacao, endereco, matricula, area_construida_m2, valor, id_setor) VALUES
  ('imovel', 'Base de campo de Três Marias', 'Rua das Garças, 120 · Três Marias – MG',
   '12.345 · 1º CRI', 180.00, 610000.00, 4);

INSERT INTO tipo_seguro (descricao) VALUES
  ('Automóvel / frota'), ('Equipamentos'), ('Vida em grupo'), ('Responsabilidade civil'), ('Imóvel');

INSERT INTO cobertura (id_tipo_seguro, descricao)
SELECT t.id_tipo_seguro, c.descricao
  FROM (SELECT 'Automóvel / frota' AS tipo, 'Colisão' AS descricao, 1 AS ordem UNION ALL
        SELECT 'Automóvel / frota', 'Roubo', 2 UNION ALL
        SELECT 'Automóvel / frota', 'Terceiros', 3 UNION ALL
        SELECT 'Automóvel / frota', 'Vidros', 4 UNION ALL
        SELECT 'Equipamentos', 'Danos elétricos', 5 UNION ALL
        SELECT 'Equipamentos', 'Roubo e furto qualificado', 6 UNION ALL
        SELECT 'Equipamentos', 'Quebra acidental', 7 UNION ALL
        SELECT 'Vida em grupo', 'Morte', 8 UNION ALL
        SELECT 'Vida em grupo', 'Invalidez', 9 UNION ALL
        SELECT 'Responsabilidade civil', 'Danos a terceiros', 10 UNION ALL
        SELECT 'Imóvel', 'Incêndio', 11 UNION ALL
        SELECT 'Imóvel', 'Danos elétricos', 12 UNION ALL
        SELECT 'Imóvel', 'Vendaval', 13) c
  JOIN tipo_seguro t ON t.descricao = c.tipo
 ORDER BY c.ordem;

-- Apólices de exemplo, com a vigência 1 e o projeto que a financia
INSERT INTO apolice (id_seguradora, numero, id_tipo_seguro, id_responsavel, id_setor, id_projeto_responsavel)
SELECT f.id_fornecedor, a.numero, t.id_tipo_seguro, a.responsavel, a.setor, p.id_projeto
  FROM (SELECT 'AP-003' AS numero, 'Seguradora Exemplo S.A.' AS seguradora, 'Equipamentos' AS tipo,
               5 AS responsavel, 2 AS setor, '1301' AS projeto UNION ALL
        SELECT 'AP-007', 'Serra Verde Seguros S.A.', 'Responsabilidade civil', 3, 1, '2041') a
  JOIN fornecedor f  ON f.razao_social = a.seguradora
  JOIN tipo_seguro t ON t.descricao = a.tipo
  JOIN projeto p     ON p.codigo = a.projeto
 ORDER BY a.numero;

INSERT INTO vigencia_apolice (id_apolice, numero, data_inicio, data_fim, valor_premio, id_projeto_pagador)
SELECT ap.id_apolice, 1, v.inicio, v.fim, v.premio, ap.id_projeto_responsavel
  FROM (SELECT 'AP-003' AS numero, '2025-12-16' AS inicio, '2026-12-15' AS fim, 4200.00 AS premio UNION ALL
        SELECT 'AP-007', '2026-03-01', '2027-02-28', 2600.00) v
  JOIN apolice ap ON ap.numero = v.numero
 ORDER BY v.numero;

-- Coberturas contratadas: todas as do tipo de seguro de cada apólice
INSERT INTO vigencia_cobertura (id_vigencia_apolice, id_cobertura)
SELECT va.id_vigencia_apolice, c.id_cobertura
  FROM vigencia_apolice va
  JOIN apolice ap  ON ap.id_apolice = va.id_apolice
  JOIN cobertura c ON c.id_tipo_seguro = ap.id_tipo_seguro;

INSERT INTO item_segurado (id_vigencia_apolice, id_bem, valor_segurado)
SELECT va.id_vigencia_apolice, b.id_bem, i.valor
  FROM (SELECT 'AP-003' AS numero, 'DJI Mavic 3' AS bem, 21500.00 AS valor UNION ALL
        SELECT 'AP-003', 'DJI Phantom 4', 9800.00 UNION ALL
        SELECT 'AP-007', 'DJI Mavic 3', 50000.00) i
  JOIN apolice ap          ON ap.numero = i.numero
  JOIN vigencia_apolice va ON va.id_apolice = ap.id_apolice AND va.numero = 1
  JOIN bem b               ON b.identificacao = i.bem;

-- Cada item coberto por todas as coberturas contratadas na vigência
INSERT INTO item_cobertura (id_item, id_cobertura)
SELECT it.id_item, vc.id_cobertura
  FROM item_segurado it
  JOIN vigencia_cobertura vc ON vc.id_vigencia_apolice = it.id_vigencia_apolice;
