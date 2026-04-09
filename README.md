# Agentes de Conteudo Texto/Imagem - Baseado em Imagens de Referencia 

Este projeto gera rodadas com `N` versoes pareadas (`v1..vN`) contendo:
- imagem
- texto curto
- texto medio

Tudo via terminal/API local, com curadoria manual obrigatoria.

`N` e definido por `GENERATION_VARIANTS` no ambiente (padrao: `1`).

## Snapshot da versao (2026-04-09)

Estado atual validado para encerramento desta iteracao:

- Orquestracao 100% no `node-app` para imagem e texto.
- Geracao de imagem remota por perfis (`quality`, `balanced`, `fast`, `low-cost`) com referencias obrigatorias do heroi.
- Politica de falha deterministica (sem fallback automatico de perfil).
- Persistencia por rodada em `outputs/run_.../v1..vN` com `manifest.json`.
- Materializacao local de imagem quando provider retorna base64 (`image_path` passa a apontar para arquivo no run).
- Quantidade de versoes por rodada controlada por `GENERATION_VARIANTS` (padrao `1` para economizar credito).
- Curadoria manual com estados `pending`, `approved`, `rejected` e historico de rejeicao.

Limites conhecidos neste checkpoint:

- Ainda em ajuste fino de qualidade de prompts de texto/imagem por perfil.
- Em cenarios de timeout remoto, podem existir artefatos persistidos mesmo quando a resposta HTTP final da chamada retorna erro.

## 1) Arquitetura atual

- Texto: `node-app` chama OpenRouter.
- Imagem: `node-app` chama provedor externo de IA diretamente.
- Nao existe servico proprio de geracao de imagem no runtime atual.
- Selecao de modelo de imagem e por perfil: `quality`, `balanced`, `fast`, `low-cost`.

## 2) Pre-requisitos

- Docker + Docker Compose
- Node.js 20+

Validacao rapida:

```bash
./scripts/precheck.sh
```

## 3) Setup rapido para testar

1. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

2. Garanta que existe ao menos 1 imagem de referencia em `assets/hero-references/`.

3. Edite `.env` com as chaves e configuracoes necessarias.

Exemplo:

```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openrouter/free
TEXT_RETRIES=2
TEXT_TIMEOUT_MS=15000
GENERATION_VARIANTS=1

IMAGE_BACKEND=remote
IMAGE_PROVIDER_BASE_URL=https://api.openai.com/v1
IMAGE_PROFILES_CATALOG_PATH=/app/config/image-profiles.catalog.example.json
IMAGE_DEFAULT_PROFILE=balanced
HERO_REFERENCES_DIR=/workspace/assets/hero-references

OPENAI_API_KEY=...
```

Se quiser, voce pode copiar este bloco diretamente para o `.env` e depois preencher apenas as chaves:

```bash
cat > .env << 'EOF'
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openrouter/free
TEXT_RETRIES=2
TEXT_TIMEOUT_MS=15000
GENERATION_VARIANTS=1

IMAGE_BACKEND=remote
IMAGE_PROVIDER_BASE_URL=https://api.openai.com/v1
IMAGE_PROFILES_CATALOG_PATH=/app/config/image-profiles.catalog.example.json
IMAGE_DEFAULT_PROFILE=balanced
HERO_REFERENCES_DIR=/workspace/assets/hero-references

OPENAI_API_KEY=
EOF
```

Observacoes:
- `IMAGE_PROVIDER_BASE_URL` deve ser a URL real da API de imagem que seu backend remoto expoe.
- `IMAGE_PROFILES_CATALOG_PATH` em Docker deve apontar para caminho dentro do container (`/app/...`).
- Se voce rodar o `node-app` fora do Docker, ajuste caminhos locais (ex.: `./node-app/config/...` e `./assets/hero-references`).
- `GENERATION_VARIANTS` controla quantas versoes (`v1..vN`) serao geradas por rodada. Valor padrao recomendado para validacao economica: `1`.
- `short_count` e `medium_count` devem ser iguais ao valor de `GENERATION_VARIANTS` na requisicao.
- Nao commite chaves reais no repositorio.

## 4) Como configurar API keys por perfil

O catalogo de perfis fica em `node-app/config/image-profiles.catalog.example.json`.

Cada perfil define o campo `auth.apiKeyEnv`. Exemplo:
- todos os perfis usam `OPENAI_API_KEY` (configuracao recomendada para uso real inicial)

Mapeamento sugerido no catalogo para ficar proximo do comportamento de imagem do ChatGPT:
- `quality` -> `gpt-image-1.5`
- `balanced` -> `gpt-image-1`
- `fast` -> `gpt-image-1-mini`
- `low-cost` -> `gpt-image-1-mini` (perfil de menor custo; nao implica gratuidade do provider)

Significa que:
- se voce usar um perfil pago e a variavel exigida estiver vazia, a rodada falha antes de iniciar
- como o provider recomendado e OpenAI, considere todos os perfis dependentes de conta/plano valido

## 5) Subir e validar ambiente

Subir servicos:

```bash
docker compose up --build -d
```

Health:

```bash
curl -s http://localhost:3000/health | jq
```

Executar testes:

```bash
cd node-app
npm test
```

## 6) Teste 1: pipeline em modo mock (sem chamar provedor)

No `.env`:

```env
IMAGE_BACKEND=mock
```

Rode:

```bash
curl -s -X POST http://localhost:3000/pipeline/run \
  -H 'Content-Type: application/json' \
  -d '{
    "image": {
      "scene": "ruinas antigas",
      "mood": "sombrio",
      "variation_level": 0.7,
      "model_profile": "fast"
    },
    "text": {
      "theme": "disciplina",
      "tone": "reflexivo",
      "short_count": 1,
      "medium_count": 1,
      "avoid_direct_quotes": true
    }
  }' | jq
```

Resultado esperado:
- `status=success`
- `manifest.image_profile.resolved_profile=fast`
- pasta `outputs/run_...` criada com `manifest.json` e `v1..vN/content.json` (N = `GENERATION_VARIANTS`)

## 7) Teste 2: pipeline em modo remote (chamada real)

No `.env`:

```env
IMAGE_BACKEND=remote
```

Rode:

```bash
curl -s -X POST http://localhost:3000/pipeline/run \
  -H 'Content-Type: application/json' \
  -d '{
    "image": {
      "scene": "guerreiro no desfiladeiro",
      "mood": "sombrio",
      "variation_level": 0.6,
      "model_profile": "balanced"
    },
    "text": {
      "theme": "constancia",
      "tone": "agressivo",
      "short_count": 1,
      "medium_count": 1,
      "avoid_direct_quotes": false
    }
  }' | jq
```

Resultado esperado:
- `status=success` ou `status=partial` quando houver falha parcial
- em falha total: `status=failed` com `manifest.failure_reason`
- `manifest.no_fallback=true`

## 8) Teste 3: fallback para profile default

Envie sem `image.model_profile`:

```bash
curl -s -X POST http://localhost:3000/pipeline/run \
  -H 'Content-Type: application/json' \
  -d '{
    "image": {
      "scene": "fortaleza ao amanhecer",
      "mood": "sombrio",
      "variation_level": 0.5
    },
    "text": {
      "theme": "disciplina",
      "tone": "reflexivo",
      "short_count": 1,
      "medium_count": 1
    }
  }' | jq
```

Resultado esperado:
- `manifest.image_profile.requested_profile=null`
- `manifest.image_profile.resolved_profile` igual a `IMAGE_DEFAULT_PROFILE`

## 9) Curadoria manual

Consultar rodada:

```bash
curl -s http://localhost:3000/curation/<RUN_ID> | jq
```

Aprovar versao:

```bash
curl -s -X POST http://localhost:3000/curation/<RUN_ID>/item/v1 \
  -H 'Content-Type: application/json' \
  -d '{"status":"approved"}' | jq
```

Rejeitar versao:

```bash
curl -s -X POST http://localhost:3000/curation/<RUN_ID>/item/v2 \
  -H 'Content-Type: application/json' \
  -d '{"status":"rejected","reason":"nao aderiu ao tom"}' | jq
```

Regenerar parametros (somente se nenhuma aprovada):

```bash
curl -s -X POST http://localhost:3000/curation/<RUN_ID>/regenerate-params \
  -H 'Content-Type: application/json' \
  -d '{}' | jq
```

## 10) Politica de governanca de imagem

- Apenas modelos com suporte a `image_reference` podem entrar no catalogo.
- Sem fallback automatico entre perfis.
- Sem retry automatico na indisponibilidade remota.
- Timeout por perfil respeita teto global de 90s por imagem.
- Perfil pago sem credencial valida bloqueia a rodada antes da geracao.

## 11) Troubleshooting

- Erro de perfil invalido: confirme `image.model_profile` e perfis no catalogo.
- Erro de credencial: confira variavel `auth.apiKeyEnv` do perfil no catalogo e a chave correspondente no `.env`.
- Erro de timeout remoto: ajuste timeout do perfil ou verifique latencia/disponibilidade do provedor.
- Erro de referencias do heroi: confirme imagens validas em `assets/hero-references/` (`.png`, `.jpg`, `.jpeg`, `.webp`).
- Falha de texto OpenRouter: valide `OPENROUTER_API_KEY` e teste `OPENROUTER_MODEL=openrouter/free`.

## 12) Encerrar ambiente

```bash
docker compose down
```
