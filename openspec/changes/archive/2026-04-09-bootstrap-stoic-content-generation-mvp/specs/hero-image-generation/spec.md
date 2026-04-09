## ADDED Requirements

### Requirement: Geracao de tres imagens verticais por rodada
O `image-service` SHALL gerar exatamente 3 imagens por rodada no formato vertical 9:16, a partir de `scene`, `mood` e `variation_level`.

#### Scenario: Rodada de imagem bem-sucedida
- **WHEN** uma requisicao valida de geracao de imagem for recebida
- **THEN** o servico MUST retornar 3 itens de imagem com dimensao 9:16

### Requirement: Uso obrigatorio de referencias do heroi
O processo de geracao SHALL exigir acesso ao diretorio local de referencias do heroi para reforcar consistencia visual.

#### Scenario: Diretorio de referencias invalido
- **WHEN** o diretorio de referencias estiver vazio, ausente ou inacessivel
- **THEN** o servico MUST abortar a rodada com erro claro e sem retornar imagens inconsistentes

### Requirement: Metadados por imagem gerada
Cada imagem gerada SHALL incluir `image_path` (ou base64), `prompt_used`, `seed` e `generation_time_ms`.

#### Scenario: Retorno com metadados completos
- **WHEN** a rodada finalizar com sucesso
- **THEN** cada item retornado MUST conter todos os campos obrigatorios de metadados

### Requirement: Tratamento de falha parcial da rodada
O sistema SHALL persistir imagens geradas antes da falha e marcar a rodada como parcial quando menos de 3 imagens forem produzidas.

#### Scenario: Falha apos duas imagens
- **WHEN** apenas 2 de 3 imagens forem geradas
- **THEN** o sistema MUST marcar status parcial com motivo e persistir os itens validos

### Requirement: Configuracao explicita do modelo de imagem
O `image-service` SHALL permitir configuracao de backend e modelo por ambiente, incluindo pelo menos: backend (`mock`, `real` ou `ipadapter`), identificador de modelo/checkpoint, `device`, `steps` e `guidance_scale`.

#### Scenario: Inicializacao com backend real
- **WHEN** o servico for iniciado em modo de geracao real
- **THEN** o backend e o identificador de modelo MUST ser lidos da configuracao de ambiente antes de aceitar requisicoes de geracao

#### Scenario: Inicializacao com backend ipadapter
- **WHEN** o servico for iniciado em modo `ipadapter`
- **THEN** o sistema MUST validar variaveis especificas de IP-Adapter e dependencias de inferencia antes de aceitar requisicoes

### Requirement: Modo mock para testes de contrato
O `image-service` SHALL suportar modo `mock` para testes locais de pipeline sem depender de runtime de inferencia pesada.

#### Scenario: Execucao de testes automatizados
- **WHEN** o servico estiver configurado em modo `mock`
- **THEN** a resposta MUST preservar o mesmo contrato HTTP da geracao real, inclusive quantidade de itens e metadados obrigatorios

### Requirement: Uso de referencias locais no backend ipadapter
No backend `ipadapter`, o `image-service` SHALL consumir imagens de referencia locais validas (`.png`, `.jpg`, `.jpeg`, `.webp`) para condicionar a geracao.

#### Scenario: Rodada com tres versoes e multiplas referencias
- **WHEN** houver referencias validas no diretorio do heroi
- **THEN** o servico MUST aplicar referencias em ordem sequencial por versao e manter contrato de 3 imagens por rodada
