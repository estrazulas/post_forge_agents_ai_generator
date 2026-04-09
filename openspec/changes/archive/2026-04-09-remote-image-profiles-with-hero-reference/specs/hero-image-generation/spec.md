## MODIFIED Requirements

### Requirement: Geracao de imagem remota no node-app
O `node-app` SHALL gerar imagens diretamente via provider remoto (sem `image-service` dedicado), usando entrada `scene`, `mood`, `variation_level` e perfil de modelo resolvido.

#### Scenario: Rodada de imagem bem-sucedida
- **WHEN** uma requisicao valida de geracao de imagem for recebida
- **THEN** o sistema MUST retornar `N` itens de imagem, onde `N` e definido por `GENERATION_VARIANTS`

### Requirement: Quantidade configuravel de variacoes por rodada
O sistema SHALL gerar quantidade de variacoes por rodada conforme `GENERATION_VARIANTS`, com valor padrao `1`.

#### Scenario: Configuracao padrao
- **WHEN** `GENERATION_VARIANTS` nao for informado
- **THEN** a rodada MUST gerar exatamente 1 variacao

#### Scenario: Configuracao customizada
- **WHEN** `GENERATION_VARIANTS` for definido com valor inteiro valido
- **THEN** a rodada MUST gerar exatamente essa quantidade de variacoes

### Requirement: Uso obrigatorio de referencias do heroi
O processo de geracao SHALL exigir acesso ao diretorio local de referencias do heroi para reforcar consistencia visual.

#### Scenario: Diretorio de referencias invalido
- **WHEN** o diretorio de referencias estiver vazio, ausente ou inacessivel
- **THEN** o sistema MUST abortar a rodada com erro claro e sem retornar imagens inconsistentes

### Requirement: Metadados por imagem gerada
Cada imagem gerada SHALL incluir `image_path` (URL ou caminho local), `prompt_used`, `seed` e `generation_time_ms`.

#### Scenario: Retorno com metadados completos
- **WHEN** a rodada finalizar com sucesso
- **THEN** cada item retornado MUST conter todos os campos obrigatorios de metadados

### Requirement: Politica de falha deterministica
O sistema SHALL falhar sem fallback automatico entre perfis quando houver indisponibilidade remota ou timeout por perfil.

#### Scenario: Timeout remoto por perfil
- **WHEN** o provider remoto exceder o timeout do perfil
- **THEN** a rodada MUST retornar erro explicito de timeout, sem trocar de perfil automaticamente

### Requirement: Modo mock para testes de contrato
O `node-app` SHALL suportar modo `mock` para testes locais sem chamada externa de imagem.

#### Scenario: Execucao de testes automatizados
- **WHEN** o backend de imagem estiver configurado em modo `mock`
- **THEN** a resposta MUST preservar o mesmo contrato HTTP da geracao remota, inclusive metadados obrigatorios
