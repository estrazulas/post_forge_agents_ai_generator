## Context

O fluxo atual foi desenhado para suportar geracao de imagem local com stack de inferencia pesada, incluindo variantes de backend voltadas a execucao no proprio host. Na pratica, o ambiente de operacao nao possui capacidade computacional suficiente para manter essa estrategia com confiabilidade operacional.

Ao mesmo tempo, o produto exige consistencia visual do heroi via referencias de imagem e previsibilidade de comportamento para curadoria manual. Portanto, a migracao para provedores externos precisa preservar contrato funcional e rastreabilidade, reduzindo dependencia de hardware local sem introduzir comportamento nao deterministico e sem operar servico proprio de geracao de imagem.

## Goals / Non-Goals

**Goals:**
- Substituir backend local real de imagem por chamada direta do `node-app` a provedores externos, mantendo o contrato funcional da rodada.
- Introduzir selecao por perfil (`quality`, `balanced`, `fast`, `low-cost`) com catalogo versionado no repositorio.
- Permitir override por execucao via `image.model_profile` com fallback para perfil global padrao.
- Garantir que apenas modelos com suporte a referencias do heroi sejam elegiveis.
- Manter politica deterministica de falha: sem fallback de perfil, sem retry automatico em indisponibilidade de provider.
- Aplicar timeout por perfil com teto global de 90s por imagem.

**Non-Goals:**
- Reintroduzir inferencia local real como contingencia.
- Manter o `image-service` como componente necessario para geracao real.
- Selecionar provider/modelo diretamente no payload da rodada.
- Implementar roteamento inteligente entre providers ou failover automatico.
- Alterar a logica do agente de texto via OpenRouter.

## Decisions

1. Geracao real sera feita por integracao externa direta no `node-app`
- Decisao: remover caminho de execucao real local e remover dependencia de `image-service` para geracao de imagem.
- Racional: elimina gargalo de hardware local e simplifica arquitetura, evitando manutencao de servico proprio para imagem.
- Alternativa considerada: manter `image-service` como adaptador remoto.
- Motivo de descarte: adiciona componente extra sem necessidade operacional para o caso de uso atual.

2. Catalogo versionado de perfis de imagem
- Decisao: definir perfis no repositorio em arquivo versionado, com mapeamento para provider/modelo e parametros operacionais.
- Racional: rastreabilidade de mudancas, revisao por PR e reprodutibilidade.
- Alternativa considerada: configurar tudo por variaveis de ambiente.
- Motivo de descarte: baixa auditabilidade e maior risco de drift entre ambientes.

3. Override de execucao apenas por perfil
- Decisao: payload aceita `image.model_profile`; ausencia desse campo usa perfil global padrao.
- Racional: mantem flexibilidade para testes sem expor detalhes de provider/modelo ao contrato publico.
- Alternativa considerada: aceitar provider/modelo direto no payload.
- Motivo de descarte: aumenta acoplamento e risco de bypass de regras de governanca.

4. Elegibilidade restrita a modelos com referencia do heroi
- Decisao: catalogo so pode incluir modelos/provedores que suportem uso de imagem de referencia.
- Racional: preservar consistencia visual como requisito central de produto.
- Alternativa considerada: permitir perfis sem referencia para reduzir custo/latencia.
- Motivo de descarte: degrada a identidade visual e aumenta descarte em curadoria.

5. Politica de falha deterministica para remoto
- Decisao: sem fallback entre perfis e sem retries automaticos na indisponibilidade do provider.
- Racional: previsibilidade de custo e diagnostico objetivo de falha.
- Alternativa considerada: fallback/retry automaticos.
- Motivo de descarte: risco de custo inesperado e comportamento dificil de auditar.

6. Guardrails de custo e latencia antes da execucao
- Decisao: validar credencial/plano para perfis pagos antes de iniciar rodada; aplicar timeout por perfil limitado por teto global de 90s por imagem.
- Racional: evita execucoes inviaveis e limita bloqueios longos em operacao.
- Alternativa considerada: delegar tudo ao erro retornado pelo provider.
- Motivo de descarte: pior UX e falha tardia com menor clareza.

## Risks / Trade-offs

- [Dependencia externa de provider remoto] -> Mitigacao: erro explicito e monitoramento por motivo de falha no manifesto.
- [Mudanca arquitetural ao remover `image-service`] -> Mitigacao: migracao incremental com mocks de contrato no `node-app` e retirada controlada de dependencias.
- [Mudancas de capacidade/preco no provider] -> Mitigacao: governanca via catalogo versionado e revisao por PR.
- [Timeout inadequado por perfil] -> Mitigacao: timeout por perfil com teto global e ajuste controlado por configuracao versionada.
- [Vazamento de consistencia visual por modelo inadequado] -> Mitigacao: catalogo restrito a modelos compativeis com referencias do heroi.
- [Aumento de custo em perfis pagos] -> Mitigacao: validacao pre-execucao de credencial/plano e futura extensao para limite de custo por rodada (fora desta change).
