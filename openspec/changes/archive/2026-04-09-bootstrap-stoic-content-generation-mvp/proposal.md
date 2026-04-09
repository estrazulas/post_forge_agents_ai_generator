## Why

O projeto ainda nao possui implementacao funcional consolidada para gerar conteudo estoico (imagem + texto) com consistencia e rastreabilidade. Esta change prioriza um MVP semi-automatico para reduzir o tempo de producao manual mantendo curadoria humana obrigatoria.

## What Changes

- Estruturar a fundacao tecnica local com Docker Compose para `node-app` e `image-service`, incluindo healthchecks e pre-check de ambiente.
- Implementar geracao de imagens 9:16 em 3 variacoes por rodada, com uso obrigatorio de referencias locais do heroi e metadados de geracao.
- Implementar geracao textual via OpenRouter com 3 textos curtos e 3 textos medios pareados por versao, com regras de autoria/citacao.
- Implementar pipeline de persistencia por rodada em `outputs/run_*`, com versoes `v1..v3` e `manifest.json` consolidado.
- Implementar fluxo de curadoria manual com status por item (`approved`, `rejected`, `pending`) e historico de rejeicao.
- Definir configuracao explicita do Image Agent por variaveis de ambiente (modelo, checkpoint, device e parametros de inferencia), com modo `mock` para testes locais.
- Manter explicitamente fora de escopo qualquer publicacao automatizada em redes sociais nesta fase.

## Capabilities

### New Capabilities
- `environment-bootstrap`: provisionamento do ambiente local com servicos Node e Python saudaveis e validacao de pre-requisitos.
- `hero-image-generation`: geracao de 3 imagens verticais consistentes do heroi por rodada, com tratamento de falhas parciais.
- `image-model-configuration`: configuracao do backend/modelo de imagem para execucao real e modo mock de teste.
- `stoic-text-generation`: geracao de textos estoicos em formato curto e medio, com pareamento semantico por versao.
- `run-output-persistence`: organizacao dos resultados por rodada e versao com manifesto consolidado.
- `manual-curation-tracking`: curadoria manual com estados de aprovacao/rejeicao e rastreabilidade de decisoes.

### Modified Capabilities
- Nenhuma.

## Impact

- Novos componentes de aplicacao: `node-app` (orquestracao/pipeline/texto) e `image-service` (geracao de imagem).
- Novos contratos HTTP internos entre servicos e com provedor de texto (OpenRouter).
- Novas estruturas de dados e arquivos em disco para saida por rodada (`outputs/run_*/v*/` + `manifest.json`).
- Dependencias tecnicas principais: Node.js 20+, Python 3.11+, Docker/Compose, LangChain JS, FastAPI, stack de inferencia Stable Diffusion local.
- Variaveis operacionais adicionais para imagem: modelo/checkpoint, device (CPU/GPU) e parametros de inferencia versionados em ambiente.
