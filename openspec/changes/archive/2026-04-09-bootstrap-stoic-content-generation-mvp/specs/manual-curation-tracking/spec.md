## ADDED Requirements

### Requirement: Estados de curadoria por item
O sistema SHALL expor e persistir status de curadoria por item com os valores `pending`, `approved` e `rejected`.

#### Scenario: Estado inicial
- **WHEN** uma nova rodada for criada
- **THEN** todos os itens MUST iniciar com status `pending`

### Requirement: Registro de motivo de rejeicao
Itens rejeitados SHALL manter historico de motivo para suporte ao ajuste futuro de prompts.

#### Scenario: Rejeicao de item
- **WHEN** um item for marcado como `rejected`
- **THEN** o sistema MUST registrar motivo associado e manter historico rastreavel

### Requirement: Persistencia de curadoria parcial
O sistema SHALL persistir progresso parcial de curadoria para permitir retomada posterior sem perda de estado.

#### Scenario: Interrupcao durante curadoria
- **WHEN** a curadoria for interrompida antes da conclusao
- **THEN** o estado parcial MUST estar disponivel para retomada

### Requirement: Regeneracao da rodada sem aprovados
Quando nenhum item da rodada estiver `approved`, o sistema SHALL permitir regeneracao usando os mesmos parametros base da rodada anterior.

#### Scenario: Nenhum aprovado
- **WHEN** todos os itens da rodada estiverem `rejected` ou `pending` ao final da revisao
- **THEN** o sistema MUST permitir iniciar nova rodada reutilizando os parametros base
