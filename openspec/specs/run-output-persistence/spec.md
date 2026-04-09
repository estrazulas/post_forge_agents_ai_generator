## ADDED Requirements

### Requirement: Subdiretorio unico por rodada
Cada execucao SHALL criar um subdiretorio unico em `outputs/` no formato `run_YYYYMMDD_HHMMSS` ou equivalente com sufixo unico quando necessario.

#### Scenario: Colisao de nome de rodada
- **WHEN** ja existir um diretorio com o nome base da rodada
- **THEN** o sistema MUST gerar sufixo unico sem sobrescrever resultados anteriores

### Requirement: Persistencia de versoes pareadas
A rodada SHALL persistir versoes `v1..vN` contendo imagem, texto curto e texto medio correspondentes, onde `N` e `GENERATION_VARIANTS`.

#### Scenario: Estrutura por versao
- **WHEN** a rodada concluir com itens suficientes
- **THEN** o sistema MUST salvar cada versao com seus ativos e metadados pareados

### Requirement: Materializacao local de imagem quando retorno for base64
Quando o provider retornar imagem em base64, o sistema SHALL materializar arquivo local dentro da pasta da versao e atualizar `image_path` para o caminho local persistido.

#### Scenario: Resposta remota com `image_base64`
- **WHEN** uma versao retornar `image_base64`
- **THEN** o sistema MUST gravar um arquivo de imagem local (ex.: `v1/image.png`) e remover o base64 do payload persistido

### Requirement: Manifesto consolidado da rodada
Cada rodada SHALL incluir `manifest.json` com parametros de entrada, modelos, seeds, tempos, `variation_count` e status por item/rodada.

#### Scenario: Manifesto completo
- **WHEN** a rodada for finalizada (sucesso ou parcial)
- **THEN** o `manifest.json` MUST ser gravado com campos obrigatorios e status coerente

### Requirement: Tratamento de erro de escrita
O sistema SHALL interromper a rodada com status de falha quando ocorrer erro de escrita em disco e MUST registrar log detalhado de diagnostico.

#### Scenario: Falha de I/O
- **WHEN** ocorrer erro de permissao ou escrita durante persistencia
- **THEN** o sistema MUST encerrar a rodada com falha e registrar causa detalhada
