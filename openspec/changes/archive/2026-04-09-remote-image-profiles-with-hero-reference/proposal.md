## Why

A geracao de imagem local exige capacidade computacional que nao esta disponivel na maquina de operacao do projeto, bloqueando a execucao confiavel do pipeline. Esta mudanca e necessaria agora para executar a geracao diretamente em provedores externos de IA, sem operar servico proprio de imagem e sem perder consistencia visual do heroi nem controle por perfil.

## What Changes

- Remover o `image-service` da arquitetura de runtime para geracao real de imagem.
- Integrar o `node-app` diretamente a provedores externos de IA para gerar imagens com referencia do heroi.
- Manter `mock` para testes de contrato sem chamada externa.
- Introduzir catalogo versionado de perfis de imagem (`quality`, `balanced`, `fast`, `low-cost`) com mapeamento para modelos permitidos.
- Permitir override por execucao somente via `image.model_profile`; quando ausente, usar perfil global padrao.
- Restringir o catalogo a modelos que suportam uso de referencias do heroi; modelos sem esse suporte ficam fora do escopo operacional.
- Aplicar validacao pre-execucao para perfis pagos (credencial/plano) antes de iniciar rodada.
- Definir politicas de falha deterministicas para backend remoto: sem fallback entre perfis, sem retry em instabilidade do provider, falha imediata em indisponibilidade.
- Tornar timeout configuravel por perfil com teto global de 90s por imagem.
- **BREAKING**: remover suporte de backend real local e o fluxo de geracao via `image-service`.

## Capabilities

### New Capabilities
- `remote-image-profile-catalog`: Gerencia catalogo versionado de perfis de imagem, selecao por perfil no acionamento e validacoes de elegibilidade do perfil/modelo.

### Modified Capabilities
- `hero-image-generation`: Altera geracao para chamada direta do `node-app` a provedores externos, preserva uso obrigatorio de referencias do heroi e muda politica de falha/timeout para execucao externa.
- `environment-bootstrap`: Ajusta requisitos de ambiente removendo dependencia de stack de inferencia local pesada e removendo dependencia operacional de `image-service` para geracao de imagem.
- `run-output-persistence`: Expande manifesto com metadados de perfil remoto selecionado e motivo de falha deterministica quando aplicavel.

## Impact

- `node-app/src/pipeline.js` e modulos de integracao externa: chamada direta ao provedor de imagem, validacoes de perfil e suporte ao campo `image.model_profile`.
- Descomissionamento do uso de `image-service` para geracao de imagem no fluxo de runtime.
- Configuracoes versionadas (novo arquivo de catalogo de perfis) e `.env.example`.
- Testes de contrato e integracao de imagem para cobrir modo remoto deterministico e regra de perfil.
- Documentacao operacional para onboarding e testes de perfil remoto.
