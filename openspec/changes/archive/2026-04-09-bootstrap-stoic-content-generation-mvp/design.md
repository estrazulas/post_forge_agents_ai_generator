## Context

O estado atual do projeto e bootstrap completo sem implementacao funcional consolidada. O PRD 001 define uma arquitetura com dois servicos independentes (`node-app` e `image-service`) integrados por HTTP em Docker Compose, com saida pareada por rodada e curadoria manual.

Restricoes principais:
- Priorizar previsibilidade operacional local (ambiente de criador solo).
- Garantir rastreabilidade minima por item (prompt, seed, modelo, tempo, status).
- Manter fora de escopo qualquer publicacao automatizada em redes sociais.

## Goals / Non-Goals

**Goals:**
- Subir ambiente local de forma reproduzivel com verificacao de saude entre servicos.
- Executar pipeline semi-automatico de rodada com 3 imagens + 3 textos curtos + 3 textos medios pareados.
- Persistir artefatos e metadados por rodada em estrutura estavel de arquivos.
- Habilitar curadoria manual com estados e historico de rejeicao.

**Non-Goals:**
- Publicacao automatizada em qualquer rede social.
- Interface grafica web/app nesta fase.
- Treinamento de LoRA customizado no MVP.

## Decisions

1. Separacao de responsabilidades por servico
- Decisao: manter `node-app` como orquestrador e gerador textual, e `image-service` como gerador de imagem.
- Racional: reduz acoplamento e permite evolucao independente da pilha de texto e imagem.
- Alternativa considerada: monolito unico para texto e imagem.
- Motivo de descarte: mistura de dependencias pesadas e maior risco de degradar operacao local.

2. Contratos HTTP internos com verificacao de saude
- Decisao: `docker compose` com healthchecks e `depends_on` por saude para evitar chamadas precoces.
- Racional: reduz falhas por startup parcial e melhora diagnostico em bootstrap.
- Alternativa considerada: retry cego sem healthcheck.
- Motivo de descarte: mascara erro de inicializacao e aumenta tempo de falha.

3. Persistencia por rodada orientada a filesystem
- Decisao: gravar resultados em `outputs/run_<timestamp>/v1..v3` com `manifest.json` consolidado.
- Racional: facilita curadoria manual, auditoria e reproducao de entradas.
- Alternativa considerada: banco de dados no MVP.
- Motivo de descarte: aumenta complexidade operacional sem ganho proporcional para uso inicial solo.

4. Geracao textual resiliente com retries limitados
- Decisao: implementar retry configuravel para falhas temporarias de provedor textual e completar itens faltantes quando retorno vier incompleto.
- Racional: melhora confiabilidade da rodada sem ocultar erros estruturais.
- Alternativa considerada: falhar imediatamente sem retry.
- Motivo de descarte: piora experiencia e aumenta retrabalho manual.

5. Curadoria manual como etapa obrigatoria
- Decisao: estado inicial de cada item como `pending`, transicoes para `approved` ou `rejected`, com motivo quando rejeitado.
- Racional: protege qualidade editorial no estagio inicial e cria base para aprendizado de prompt.
- Alternativa considerada: aprovacao automatica por heuristica.
- Motivo de descarte: alto risco de baixa qualidade e desalinhamento editorial.

6. Configuracao explicita do backend de imagem
- Decisao: introduzir configuracao por ambiente para backend de imagem (`IMAGE_BACKEND=mock|diffusers`), identificador de modelo/checkpoint, device e parametros de inferencia.
- Racional: separa operacao de teste (rapida e deterministica) da operacao real (render de imagem), sem quebrar contrato HTTP.
- Alternativa considerada: manter comportamento placeholder fixo sem controle por ambiente.
- Motivo de descarte: dificulta transicao segura para geracao real e gera ambiguidade operacional.

## Risks / Trade-offs

- [Hardware local sem GPU suficiente] -> Mitigacao: definir perfil minimo e fallback de parametros de inferencia (resolucao/steps) no `image-service`.
- [Inconsistencia visual do heroi sem LoRA] -> Mitigacao: referencias obrigatorias, seeds rastreaveis e ajuste iterativo de prompts.
- [Ambiente configurado incorretamente para geracao real] -> Mitigacao: defaults explicitos, validacao no startup e documentacao do `.env.example`.
- [Timeout/custo variavel de provedor textual] -> Mitigacao: timeout por rodada, retries limitados e modelo padrao configuravel.
- [Falhas parciais de rodada] -> Mitigacao: status parcial explicito no manifesto e persistencia dos itens gerados antes da falha.

## Migration Plan

1. Criar estrutura de pastas base e scaffolds de servicos.
2. Entregar US01 com bootstrap + healthchecks + pre-check.
3. Entregar US02 e US03 com contratos definidos e validacao de entradas.
4. Entregar US04 para consolidar estrutura de output e manifesto.
5. Entregar US05 para estados de curadoria e historico.
6. Validar criterios tecnicos ponta a ponta e registrar baseline de negocio.

Rollback:
- Como e fase inicial, rollback consiste em retornar para estado anterior do branch e remover diretorios de output gerados durante testes.

## Open Questions

- Qual intervalo oficial permitido para `variation_level` (normalizacao vs rejeicao) no contrato final?
- Qual politica final de retry/timeout do provedor textual (limites por rodada e por item)?
- Qual schema minimo obrigatorio de `manifest.json` para bloquear regressao futura?
- Qual backend de imagem real sera adotado primeiro no modo produtivo (`diffusers` local, ComfyUI API, ou Automatic1111 API)?
