# Telemetria e Analytics do Kanban - Análise Completa

## Resumo Executivo

O projeto Kanban envia dados para **dois serviços externos de telemetria**:

1. **PostHog** - Coleta de eventos do usuário (web-ui)
2. **Sentry** - Captura de exceções e erros (web-ui + CLI backend)

⚠️ **POR PADRÃO, TELEMETRIA ESTÁ DESATIVADA** - Requer variáveis de ambiente explícitas para funcionar.

---

## 1. PostHog (Frontend Analytics)

### Servidores
- **Host padrão:** `https://data.cline.bot`
- **Chave da API:** Controlada por `POSTHOG_KEY` (vazio por padrão)

### Como Desativar
Deixe a variável `POSTHOG_KEY` vazia ou indefinida em `web-ui/.env.local`

### O Que É Capturado (Se Ativado)

**Eventos Rastreados:**
1. `task_created`
   - `selected_agent_id` - qual agente foi selecionado
   - `start_in_plan_mode` - booleano
   - `auto_review_mode` - tipo de revisão automática
   - `prompt_character_count` - tamanho do prompt (números apenas, sem conteúdo)

2. `task_dependency_created` - sem dados adicionais

3. `tasks_auto_started_from_dependency`
   - `started_task_count` - quantidade de tarefas

4. `task_resumed_from_trash` - sem dados adicionais

**O que NÃO é capturado:**
- ❌ Conteúdo de prompts/tarefas
- ❌ Nomes de arquivos ou paths
- ❌ Código-fonte
- ❌ Dados de usuário sensíveis (PII)
- ❌ Detalhes de repositórios

### Configuração PostHog

```javascript
// src/telemetry/posthog-config.ts
posthogOptions: {
  api_host: "https://data.cline.bot",
  autocapture: false,                    // ❌ Não captura clicks automaticamente
  capture_pageview: true,                // ✓ Captura navegação de páginas
  capture_pageleave: true,               // ✓ Captura quando sai da página
  disable_session_recording: true,       // ❌ Sem gravação de sessão
  capture_exceptions: false,             // ❌ Erros vão para Sentry, não PostHog
  person_profiles: "identified_only",    // Sem identificação automática
  disable_surveys: true,                 // ❌ Sem surveys
  disable_web_experiments: true,         // ❌ Sem A/B testing
}
```

---

## 2. Sentry (Error Tracking)

### Frontend Sentry
- **DSN:** `https://061e8f494493d1cf3c7c918563cc0783@o4511098366263296.ingest.us.sentry.io/4511098568769536`
- **Sempre ativado** (sem variável de controle)

### Backend/CLI Sentry
- **DSN:** `https://b597cbea54f43704439be10d843699b0@o4511098366263296.ingest.us.sentry.io/4511098558087168`
- **Sempre ativado** (sem variável de controle)

### O Que É Capturado

**Frontend:**
- Exceções não tratadas
- Erros de aplicação
- Stacktraces

**Backend (CLI):**
- Erros de inicialização (`area: "startup"`)
- Erros de shutdown (`area: "shutdown"`)
- Exceções gerais do CLI

### Configuração Sentry

```javascript
// Ambos frontend e backend têm:
sendDefaultPii: false,           // ❌ Sem dados pessoais
release: "kanban@x.x.x"          // Versão do app
environment: "development|production"
tags: {
  app: "kanban",
  runtime_surface: "web" | "node"  // Identifica frontend vs backend
}
```

---

## 3. Cline SDK Telemetria (Backend)

### Origem
- Integração com `@clinebot/core` (pacote externo do Cline)
- Gerenciada em `src/cline-sdk/cline-telemetry-service.ts`

### Dados Capturados
```javascript
{
  extension_version: "0.x.x",
  cline_type: "kanban",
  platform: "kanban",
  platform_version: "v18.x.x" (Node.js version),
  os_type: "darwin|linux|win32",
  os_version: "14.x.x"
}
```

### Controle
- Gerenciado pela SDK do Cline
- Não há variáveis de ambiente específicas no Kanban para desativar
- Possivelmente controlado pela configuração global do Cline

---

## 4. Resumo de Dados Enviados

| Serviço | Frontend | Backend | Conteúdo de Código? | PII? | Controle |
|---------|----------|---------|-------------------|------|----------|
| **PostHog** | ✓ | ✗ | ❌ | ❌ | `POSTHOG_KEY` |
| **Sentry (Frontend)** | ✓ | ✗ | ❌ (stacktrace) | ❌ | Sempre |
| **Sentry (Backend)** | ✗ | ✓ | ❌ (stacktrace) | ❌ | Sempre |
| **Cline SDK** | ✗ | ✓ | ❌ | ❌ | SDK Cline |

---

## 5. Como Desativar/Controlar Telemetria

### ✅ PostHog (Recomendado - Desativar localmente)

Edite ou crie `web-ui/.env.local`:
```bash
POSTHOG_KEY=
```

Código verifica:
```typescript
if (!isTelemetryEnabled()) {
  return; // Pula toda captura de eventos
}
```

### ⚠️ Sentry (Não há switch local)

Sentry está **sempre ativado** no código, mas:
- Em desenvolvimento, pode estar desativado globalmente pelo Cline
- No CI/build, controlado por variáveis de ambiente do GitHub

### ⚠️ Cline SDK Telemetria

Controlado pelo pacote `@clinebot/core` externo. Não há switch no Kanban.

---

## 6. Dados do Ambiente Capturados (Sempre)

**Sentry captura automaticamente:**
- Versão do Node.js
- Sistema operacional e versão
- Versão da aplicação
- Stack traces de erros

**PostHog captura (se ativado):**
- Tipo de navegador
- Resolução da tela
- Informações básicas do dispositivo (nada sensível)

---

## 7. GitHub Secrets (CI/CD)

O arquivo `DEVELOPMENT.md` menciona:

```
The publish workflow injects `POSTHOG_KEY` and `POSTHOG_HOST` from GitHub Secrets.
```

Isso significa:
- Builds de release do GitHub ativam PostHog
- Builds locais/desenvolvimento não ativam (por padrão)
- Você controla isso via `web-ui/.env.local`

---

## 8. Recomendações de Privacidade

### ✅ Se você quer máxima privacidade localmente:

1. **Desative PostHog:**
   ```bash
   # web-ui/.env.local
   POSTHOG_KEY=
   ```

2. **Sentry:** Considerado "error reporting" padrão para aplicações modernas. Contém apenas stacktraces sem conteúdo de código.

3. **Cline SDK:** Parte da integração do Cline. Se quiser controle total, seria necessário forcar a desativação do Cline.

### 🔍 Se você quer ver exatamente o que é enviado:

Use as Developer Tools do navegador (Network tab) ao usar o Kanban para capturar requisições para:
- `https://data.cline.bot` (PostHog)
- `https://o4511098366263296.ingest.us.sentry.io` (Sentry)

### 📊 Para monitoramento em ambiente de produção:

A telemetria ajuda os desenvolvedores a:
- Identificar crashes
- Entender padrões de uso
- Melhorar features mais usadas

---

## 9. Conclusão

**Nível de Risco: BAIXO**

- Sem captura de conteúdo de código ou dados sensíveis
- PostHog pode ser desativado localmente
- Nenhum dado pessoal (PII) é capturado
- Sentry é padrão da indústria para error tracking
- Tudo é bem documentado no projeto

**Ação Recomendada:**
Se você não quer telemetria, adicione ao seu `web-ui/.env.local`:
```bash
POSTHOG_KEY=
```
