-- GESLIC - Instituto Prístino
-- Dados de referência que o sistema precisa para funcionar, em qualquer
-- ambiente. Rode depois de schema.sql.
--
-- Perfis e permissões (RN21, RN27, RN41): permissões fixas por perfil. A
-- matriz é explicativa e não editável: o Administrador atribui o perfil às
-- contas, mas não personaliza as permissões. O Administrador faz o que o
-- Operador faz e, além disso, corrige e exclui cadastros, desliga
-- colaboradores, conclui solicitações de ajuste, gerencia as contas e
-- consulta relatórios e histórico. Só o Operador emite solicitação de
-- ajuste: o Administrador corrige diretamente (Protótipo 13.2).
-- As permissões de autorização (RF_F15) já fazem parte da matriz, embora a
-- função ainda esteja em desenvolvimento.

SET NAMES utf8mb4;

INSERT INTO perfil (nome, visualiza_dados_sensiveis) VALUES
  ('Administrador', TRUE),
  ('Operador',      FALSE);

INSERT INTO permissao (codigo, descricao, grupo, exclusiva_administrador, exclusiva_operador) VALUES
  ('cadastro.consultar',    'Consultar cadastros',                                             'Cadastros',     FALSE, FALSE),
  ('cadastro.incluir',      'Incluir cadastros',                                               'Cadastros',     FALSE, FALSE),
  ('cadastro.inativar',     'Inativar cadastros (com data efetiva)',                           'Cadastros',     FALSE, FALSE),
  ('cadastro.alterar',      'Corrigir dados cadastrais, desligar colaboradores e alterar participantes', 'Cadastros', TRUE, FALSE),
  ('cadastro.excluir',      'Excluir cadastros sem vínculos',                                  'Cadastros',     TRUE,  FALSE),
  ('ajuste.solicitar',      'Emitir solicitações de ajuste cadastral',                         'Cadastros',     FALSE, TRUE),
  ('ajuste.concluir',       'Concluir solicitações de ajuste cadastral',                       'Cadastros',     TRUE,  FALSE),
  ('projeto.prorrogar',     'Prorrogar o término previsto de projetos',                        'Projetos',      FALSE, FALSE),
  ('projeto.encerrar',      'Encerrar projetos',                                               'Projetos',      FALSE, FALSE),
  ('licenca.consultar',     'Consultar licenças e instâncias',                                 'Licenças',      FALSE, FALSE),
  ('licenca.registrar',     'Registrar licenças de software',                                  'Licenças',      FALSE, FALSE),
  ('licenca.movimentar',    'Alocar, transferir e liberar instâncias',                         'Licenças',      FALSE, FALSE),
  ('licenca.renovar',       'Renovar licenças',                                                'Licenças',      FALSE, FALSE),
  ('licenca.inativar',      'Inativar licenças e instâncias',                                  'Licenças',      FALSE, FALSE),
  ('excecao.confirmar',     'Confirmar exceções administrativas autorizadas',                  'Licenças',      FALSE, FALSE),
  ('apolice.consultar',     'Consultar apólices',                                              'Apólices',      FALSE, FALSE),
  ('apolice.registrar',     'Registrar apólices e vincular bens e pessoas',                    'Apólices',      FALSE, FALSE),
  ('apolice.renovar',       'Renovar apólices',                                                'Apólices',      FALSE, FALSE),
  ('apolice.cancelar',      'Cancelar apólices',                                               'Apólices',      FALSE, FALSE),
  ('documento.gerenciar',   'Anexar e consultar documentos PDF',                               'Documentos',    FALSE, FALSE),
  ('autorizacao.emitir',    'Emitir autorizações operacionais',                                'Autorizações',  TRUE,  FALSE),
  ('autorizacao.registrar', 'Registrar o resultado das autorizações',                          'Autorizações',  FALSE, FALSE),
  ('painel.consultar',      'Consultar o painel de acompanhamento',                            'Consultas',     FALSE, FALSE),
  ('relatorio.consultar',   'Consultar os relatórios',                                         'Consultas',     TRUE,  FALSE),
  ('auditoria.consultar',   'Consultar o histórico de movimentações e auditoria',              'Consultas',     TRUE,  FALSE),
  ('usuario.gerenciar',     'Gerenciar contas e perfis e aprovar solicitações de acesso',      'Administração', TRUE,  FALSE);

-- Administrador: todas, menos as exclusivas do Operador
INSERT INTO perfil_permissao (id_perfil, id_permissao)
SELECT p.id_perfil, pe.id_permissao
  FROM perfil p CROSS JOIN permissao pe
 WHERE p.nome = 'Administrador' AND pe.exclusiva_operador = FALSE;

-- Operador: todas, menos as exclusivas do Administrador
INSERT INTO perfil_permissao (id_perfil, id_permissao)
SELECT p.id_perfil, pe.id_permissao
  FROM perfil p CROSS JOIN permissao pe
 WHERE p.nome = 'Operador' AND pe.exclusiva_administrador = FALSE;

-- Tipos de aviso (RN24, RF_B9). Padrões dos vencimentos: seis meses e um
-- mês (RN24). Nova autorização: aviso imediato e lembrete após uma semana
-- (exemplo validado, Quadro 8). Os demais padrões ainda serão confirmados
-- com o Instituto; o término de projeto segue os dos vencimentos.
INSERT INTO tipo_notificacao
  (codigo, nome, descricao, modo, momento, exclusivo_administrador, prazos_padrao, ordem) VALUES
  ('licenca_vencimento',   'Vencimento de licença',                  'antecedência',              'antecedencia', NULL,              FALSE,
     '[{"quantidade": 6, "unidade": "mes"}, {"quantidade": 1, "unidade": "mes"}]', 1),
  ('apolice_vencimento',   'Vencimento de apólice',                  'antecedência',              'antecedencia', NULL,              FALSE,
     '[{"quantidade": 6, "unidade": "mes"}, {"quantidade": 1, "unidade": "mes"}]', 2),
  ('projeto_termino',      'Término de projeto',                     'antecedência',              'antecedencia', NULL,              FALSE,
     '[{"quantidade": 6, "unidade": "mes"}, {"quantidade": 1, "unidade": "mes"}]', 3),
  ('autorizacao_nova',     'Nova autorização',                       'aviso imediato',            'imediato',     'na emissão',      FALSE, NULL, 4),
  ('autorizacao_pendente', 'Autorização ainda pendente',             'lembrete após a emissão',   'lembrete',     NULL,              FALSE,
     '[{"quantidade": 1, "unidade": "semana"}]', 5),
  ('ajuste_novo',          'Nova solicitação de ajuste',             'aviso imediato',            'imediato',     'na solicitação',  FALSE, NULL, 6),
  ('conclusao',            'Conclusão de autorização ou solicitação', 'aviso imediato',           'imediato',     'na conclusão',    FALSE, NULL, 7),
  ('conta_aguardando',     'Conta aguardando aprovação',             'exclusivo do Administrador', 'imediato',    'na solicitação',  TRUE,  NULL, 8);
