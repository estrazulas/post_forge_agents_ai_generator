## ADDED Requirements

### Requirement: Geracao textual em dois formatos por rodada
O `node-app` SHALL gerar por rodada `N` textos curtos e `N` textos medios a partir de `theme`, `tone` e parametros de quantidade, onde `N` e `GENERATION_VARIANTS`.

#### Scenario: Rodada textual completa
- **WHEN** a requisicao textual valida for executada
- **THEN** o sistema MUST retornar `2N` itens validos no total, sendo `N` curtos e `N` medios

### Requirement: Pareamento semantico por versao
Cada texto medio SHALL complementar semanticamente um texto curto correspondente na mesma versao (`v1..vN`).

#### Scenario: Pareamento por versao
- **WHEN** os textos forem consolidados na rodada
- **THEN** o sistema MUST preservar relacao 1:1 entre curto e medio por versao

### Requirement: Regras de autoria e citacao
O agente textual SHALL operar em modo flexivel (autoral/parafraseado/citacao) e MUST incluir atribuicao explicita quando houver citacao direta de autor conhecido.

#### Scenario: Citacao direta presente
- **WHEN** o texto gerado contiver citacao direta de autor conhecido
- **THEN** o item MUST incluir atribuicao explicita do autor

### Requirement: Resiliencia a indisponibilidade do provedor textual
A integracao com provedor textual SHALL aplicar retry configuravel em falhas recuperaveis e completar itens faltantes quando resposta vier incompleta.

#### Scenario: Timeout temporario
- **WHEN** o provedor textual retornar timeout recuperavel
- **THEN** o sistema MUST executar retries conforme configuracao antes de finalizar com erro

#### Scenario: Timeout definitivo
- **WHEN** o timeout do provedor textual exceder o limite configurado sem sucesso
- **THEN** o sistema MUST retornar erro explicito com status de timeout

#### Scenario: Resposta incompleta
- **WHEN** o provedor retornar menos itens que o esperado
- **THEN** o sistema MUST solicitar apenas os itens faltantes antes de encerrar a rodada

### Requirement: Modo sem citacoes diretas
Quando solicitado explicitamente, o agente textual SHALL bloquear citacoes diretas e priorizar producao autoral.

#### Scenario: Solicitacao sem citacao
- **WHEN** a entrada da rodada indicar que citacoes diretas devem ser evitadas
- **THEN** os textos gerados MUST ser entregues sem citacoes diretas
