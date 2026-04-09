## 1. Fundacao do Projeto e Bootstrap

- [x] 1.1 Criar estrutura inicial de diretorios (`node-app`, `image-service`, `assets`, `prompts`, `outputs`) e arquivos base dos servicos
- [x] 1.2 Configurar Dockerfiles e `docker-compose` com rede compartilhada, healthchecks e dependencia por saude
- [x] 1.3 Implementar script de pre-check para validar Docker, Compose, Node.js 20+ e Python 3.11+
- [x] 1.4 Implementar endpoint de health em `node-app` e `image-service` e validar startup coordenado

## 2. Contratos e Integracao Interna

- [x] 2.1 Definir contrato HTTP do `image-service` para entrada (`scene`, `mood`, `variation_level`) e saida com metadados obrigatorios
- [x] 2.2 Definir contrato HTTP do `node-app` para rodada textual com pareamento por versao (`v1..v3`)
- [x] 2.3 Implementar validacoes de entrada e mensagens de erro orientativas para edge cases das US
- [x] 2.4 Implementar bloqueio de pipeline no `node-app` quando `image-service` estiver sem saude

## 3. Implementacao do Image Agent

- [x] 3.1 Implementar leitura obrigatoria do diretorio de referencias do heroi com validacao de acesso/conteudo
- [x] 3.2 Implementar geracao de exatamente 3 imagens 9:16 por rodada com controle de seed
- [x] 3.3 Persistir metadados por imagem (`prompt_used`, `seed`, `generation_time_ms`, local do artefato)
- [x] 3.4 Implementar tratamento de falha parcial com status parcial e persistencia dos itens validos

## 4. Implementacao do Text Agent

- [x] 4.1 Integrar OpenRouter no `node-app` com parametros de `theme`, `tone` e quantidades
- [x] 4.2 Implementar geracao de 3 textos curtos e 3 textos medios com pareamento semantico 1:1 por versao
- [x] 4.3 Implementar regras de autoria/citacao com atribuicao explicita para citacoes diretas
- [x] 4.4 Implementar modo sem citacoes diretas quando solicitado
- [x] 4.5 Implementar retries configuraveis para timeout/falhas recuperaveis e completude de itens faltantes

## 5. Persistencia por Rodada e Curadoria Manual

- [x] 5.1 Implementar criacao de subdiretorio unico por rodada em `outputs/run_*` com sufixo anti-colisao
- [x] 5.2 Persistir versoes `v1..v3` contendo imagem, texto curto e texto medio pareados
- [x] 5.3 Gerar `manifest.json` consolidado com entradas, modelos, seeds, tempos e status por item/rodada
- [x] 5.4 Implementar estados de curadoria (`pending`, `approved`, `rejected`) e transicoes validas
- [x] 5.5 Persistir historico de motivo de rejeicao e permitir retomada de curadoria parcial
- [x] 5.6 Implementar fluxo de regeneracao quando nenhuma versao for aprovada

## 6. Validacao de Aceite Tecnico e Operacional

- [x] 6.1 Criar testes de integracao para bootstrap e healthchecks dos servicos
- [x] 6.2 Criar testes de contrato para `image-service` e pipeline textual (quantidade, formato, obrigatoriedade de campos)
- [x] 6.3 Criar validacao automatizada da estrutura de saida e schema minimo do `manifest.json`
- [x] 6.4 Executar rodada ponta a ponta em ambiente limpo e registrar evidencias dos criterios tecnicos do PRD 001

## 7. Configuracao do Modelo de Imagem (Evolucao)

- [x] 7.1 Expandir `.env.example` com variaveis do Image Agent (`IMAGE_BACKEND`, `IMAGE_MODEL_ID`, `IMAGE_DEVICE`, `IMAGE_STEPS`, `IMAGE_GUIDANCE_SCALE`)
- [x] 7.2 Implementar carregamento e validacao dessas variaveis no `image-service` no startup
- [x] 7.3 Implementar branch de backend real sem quebrar o modo `mock` existente
- [x] 7.4 Adicionar testes cobrindo inicializacao e contrato em `mock` e em backend real simulado

## 8. Especificacao das Alteracoes nas Tasks

- [x] 8.1 Escopo do item 7.3 ampliado para incluir backend `ipadapter` com referencias locais e fallback preservado (`mock`/`real`)
- [x] 8.2 Escopo do item 7.4 ampliado para cobrir validacoes de configuracao do backend `ipadapter` e regressao do contrato HTTP
- [x] 8.3 README operacional atualizado com fluxo terminal completo para teste isolado do Image Agent em `ipadapter`
