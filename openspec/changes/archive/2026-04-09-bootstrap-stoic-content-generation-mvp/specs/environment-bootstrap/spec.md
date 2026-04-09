## ADDED Requirements

### Requirement: Ambiente local reproduzivel para os servicos
O sistema SHALL disponibilizar uma forma padronizada de subir `node-app` e `image-service` na mesma rede Docker, com dependencias de inicializacao por saude.

#### Scenario: Inicializacao com saude completa
- **WHEN** o usuario executar o comando padrao de subida do ambiente
- **THEN** os dois servicos MUST iniciar e reportar estado saudavel antes do pipeline ser considerado pronto

### Requirement: Validacao de pre-requisitos obrigatorios
O sistema SHALL validar pre-requisitos minimos do host antes da execucao do pipeline, incluindo Docker, Docker Compose, Node.js 20+ e Python 3.11+.

#### Scenario: Pre-requisito ausente
- **WHEN** qualquer pre-requisito obrigatorio estiver ausente ou com versao invalida
- **THEN** o sistema MUST falhar com mensagem explicita e orientacao de correcao

### Requirement: Configuracao versionada por ambiente
O sistema SHALL disponibilizar arquivo de ambiente de exemplo com variaveis de configuracao para os agentes de texto e imagem.

#### Scenario: Ambiente inicial sem configuracao manual previa
- **WHEN** o operador iniciar a configuracao do projeto em maquina nova
- **THEN** o sistema MUST fornecer variaveis documentadas para backend de imagem, identificador de modelo/checkpoint e parametros principais de inferencia

### Requirement: Bloqueio de pipeline sem saude do image-service
O `node-app` SHALL bloquear inicio de rodada quando o `image-service` estiver sem saude.

#### Scenario: Dependencia indisponivel
- **WHEN** o `image-service` nao responder no endpoint de health
- **THEN** o `node-app` MUST retornar erro orientativo e nao iniciar geracao
