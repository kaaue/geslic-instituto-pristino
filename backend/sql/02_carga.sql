-- GESLIC - carga inicial para a apresentação da RF_B3
-- Dados variados de propósito: setores diferentes, equipamentos ativos e inativos,
-- alguns de uso geral e alguns com licença alocada, para os filtros e as
-- validações terem efeito visível na demonstração.

-- Garante que os acentos sejam lidos corretamente ao rodar o script
SET NAMES utf8mb4;

USE geslic;

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

-- Equipamentos: grava primeiro em bem e depois em equipamento, com o mesmo id.
-- Na aplicação isso acontece dentro de uma transação.

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

-- Licenças: uma transferível e uma não transferível, para mostrar
-- os dois comportamentos previstos na RN08 ao inativar um equipamento.

INSERT INTO licenca (codigo, nome_software, transferivel) VALUES
  ('LIC-0001', 'Microsoft 365 Business',  TRUE),
  ('LIC-0002', 'ArcGIS Desktop',          FALSE),
  ('LIC-0003', 'Adobe Creative Cloud',    TRUE);

INSERT INTO instancia (id_licenca, identificacao) VALUES
  (1, 'M365-01'),
  (2, 'ARCGIS-01'),
  (3, 'ADOBE-01');

-- PRI-0101 tem licença transferível alocada
-- PRI-0106 tem licença NÃO transferível alocada (bom exemplo para a RN08)
-- PRI-0109 tem licença transferível alocada
INSERT INTO alocacao (id_instancia, id_equipamento, data_inicio) VALUES
  (1,  1, '2026-03-10'),
  (2,  6, '2026-04-02'),
  (3,  9, '2026-05-20');
