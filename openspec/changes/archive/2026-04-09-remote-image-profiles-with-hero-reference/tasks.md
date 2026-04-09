## 1. Configuracao e Catalogo de Perfis

- [x] 1.1 Criar arquivo versionado de catalogo de perfis remotos (`quality`, `balanced`, `fast`, `low-cost`) com provider/modelo e timeout por perfil
- [x] 1.2 Implementar validacao de schema do catalogo no startup do `image-service`
- [x] 1.3 Implementar validacao de teto global de timeout (90s por imagem) no carregamento do catalogo
- [x] 1.4 Atualizar `.env.example` para backend `remote`, perfil global padrao e configuracoes relacionadas

## 2. Migracao do Image Service para Backend Remoto

- [x] 2.1 Remover caminho de backend real local e remover dependencia de `image-service` para geracao real
- [x] 2.2 Implementar resolucao de perfil efetivo por prioridade (`image.model_profile` -> perfil global padrao) no `node-app`
- [x] 2.3 Implementar cliente de provedor externo no `node-app` com autenticacao e mapeamento de parametros por perfil
- [x] 2.4 Implementar envio das imagens de referencia do heroi ao provedor externo conforme contrato do modelo
- [x] 2.5 Implementar parse/persistencia padronizada da resposta externa (imagem, metadados e erros)
- [x] 2.6 Implementar bloqueio de execucao para perfil inexistente no catalogo
- [x] 2.7 Implementar validacao de elegibilidade de perfil pago (credencial/plano) antes de iniciar rodada
- [x] 2.8 Implementar politica deterministica de falha remota (sem retry automatico e sem fallback de perfil)

## 3. Regras de Referencia do Heroi

- [x] 3.1 Preservar validacao obrigatoria do diretorio local de referencias do heroi
- [x] 3.2 Implementar verificacao de compatibilidade de modelo com uso de referencia do heroi
- [x] 3.3 Bloquear rodada quando o perfil/modelo nao suportar condicionamento por referencia

## 4. Contrato do Pipeline e Persistencia

- [x] 4.1 Atualizar validacao de entrada no `node-app` para aceitar `image.model_profile`
- [x] 4.2 Garantir fallback para perfil global quando `image.model_profile` estiver ausente
- [x] 4.3 Expandir `manifest.json` com `requested_profile`, `resolved_profile`, provider/modelo efetivo e `failure_reason`
- [x] 4.4 Garantir registro explicito de falha sem fallback no manifesto

## 5. Testes e Evidencias

- [x] 5.1 Atualizar testes de contrato no `node-app` para modos `mock` e `remote` sem `image-service`
- [x] 5.2 Adicionar testes de validacao de perfil (existencia, paid eligibility e timeout cap)
- [x] 5.3 Adicionar testes de falha deterministica em indisponibilidade do provider remoto
- [x] 5.4 Atualizar teste ponta a ponta do pipeline para `image.model_profile` e default global

## 6. Documentacao Operacional

- [x] 6.1 Atualizar README com fluxo de configuracao de backend remoto por perfil
- [x] 6.2 Documentar catalogo de perfis e politica de governanca (somente modelos com suporte a referencia)
- [x] 6.3 Documentar erros esperados: perfil invalido, perfil pago sem elegibilidade e timeout remoto
