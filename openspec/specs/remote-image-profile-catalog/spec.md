## ADDED Requirements

### Requirement: Catalogo versionado de perfis de imagem remota
O sistema SHALL manter um catalogo versionado no repositorio com os perfis `quality`, `balanced`, `fast` e `low-cost`, cada um mapeado para provider/modelo remoto permitido e parametros operacionais.

#### Scenario: Carregamento do catalogo no startup
- **WHEN** o `node-app` iniciar o fluxo de rodada com backend remoto de imagem
- **THEN** o sistema MUST carregar e validar o catalogo antes de executar geracao externa

### Requirement: Resolucao de perfil por prioridade
O sistema SHALL resolver o perfil efetivo da rodada com prioridade para `image.model_profile`; quando ausente, SHALL usar o perfil global padrao configurado.

#### Scenario: Override valido no payload
- **WHEN** `image.model_profile` for informado e existir no catalogo
- **THEN** o perfil efetivo MUST ser o perfil informado no payload

#### Scenario: Campo de perfil ausente
- **WHEN** `image.model_profile` nao for informado
- **THEN** o perfil efetivo MUST ser o perfil global padrao

### Requirement: Elegibilidade restrita a modelos com referencia do heroi
O catalogo SHALL incluir apenas modelos que suportem uso de referencias de imagem do heroi.

#### Scenario: Tentativa de registrar modelo sem suporte a referencia
- **WHEN** um modelo sem suporte a referencia for definido no catalogo
- **THEN** a validacao de configuracao MUST falhar e o perfil MUST ser rejeitado

### Requirement: Politica deterministica de falha no backend remoto
Para backend `remote`, o sistema SHALL operar sem fallback entre perfis e sem retry automatico em indisponibilidade do provider.

#### Scenario: Provider indisponivel
- **WHEN** o provider remoto do perfil efetivo estiver indisponivel
- **THEN** a rodada MUST falhar imediatamente sem trocar de perfil

### Requirement: Timeout por perfil com teto global
Cada perfil SHALL definir timeout proprio de geracao por imagem, e o sistema SHALL aplicar teto global de 90s por imagem como limite maximo absoluto.

#### Scenario: Timeout de perfil acima do teto global
- **WHEN** o timeout configurado do perfil exceder 90s por imagem
- **THEN** a validacao MUST falhar e impedir inicializacao do backend remoto

### Requirement: Validacao pre-execucao de perfis pagos
Quando o perfil efetivo exigir plano/credencial pago, o sistema SHALL validar elegibilidade antes de iniciar a rodada.

#### Scenario: Perfil pago sem elegibilidade
- **WHEN** a validacao de credencial/plano do perfil pago falhar
- **THEN** a rodada MUST ser bloqueada antes de qualquer geracao de imagem
