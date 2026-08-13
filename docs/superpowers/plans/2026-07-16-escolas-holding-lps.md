# Escolas e Holding LPs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar duas landing pages estáticas, especializadas e indexáveis para “Contabilidade para Escolas em São Paulo” e “Holding Familiar em São Paulo”, com WhatsApp como única conversão.

**Architecture:** Cada rota terá um `index.html` independente, seguindo a identidade visual e os componentes estáticos das LPs existentes. O JavaScript compartilhado será ampliado de forma retrocompatível para atribuição de campanha e eventos contextuais; o validador PowerShell cobrirá SEO, schemas, assets, CTAs e restrições de conversão.

**Tech Stack:** HTML5, CSS inline crítico + CSS compartilhado existente, JavaScript vanilla, JSON-LD, PowerShell para QA, Vercel static hosting.

## Global Constraints

- Rotas: `/contabilidade-para-escolas-sao-paulo` e `/holding-familiar-sao-paulo`.
- WhatsApp único: `5511910316319`, sem formulário e sem CTA de ligação.
- Mensagens predefinidas exatamente conforme os prompts fornecidos.
- Não instalar dependências ou alterar o comportamento das páginas existentes.
- Preservar GTM/GA4, consentimento, UTMs, `gclid`, `gbraid`, `wbraid`, entrada e referenciador.
- Um clique gera exatamente um `whatsapp_click` e um `cta_click`; nunca `generate_lead`.
- Somente dados institucionais comprovados; sem promessas tributárias, trabalhistas, jurídicas ou patrimoniais.
- Páginas indexáveis, com canonical, OG, Twitter Card, Service/AccountingService, FAQPage e WebPage.
- BreadcrumbList somente se houver breadcrumb visível.

---

### Task 1: Testes de aceite das novas rotas

**Files:**
- Modify: `scripts/validate-lps.ps1`
- Test: `scripts/validate-lps.ps1`

**Interfaces:**
- Consumes: arquivos HTML e `sitemap.xml`.
- Produces: saída não zero para rota, SEO, CTA, schema, asset ou restrição ausente.

- [ ] Adicionar as duas rotas à matriz de páginas e configurar metadados esperados (`canonical`, tópico, mensagem e quantidade mínima de FAQ).
- [ ] Validar ausência de `<form`, `href="tel:`, botões WhatsApp sem `data-cta-location`, mensagem incorreta e canonical ausente do sitemap.
- [ ] Executar `& .\scripts\validate-lps.ps1` e confirmar falha por arquivos ausentes.

### Task 2: Landing page Contabilidade para Escolas

**Files:**
- Create: `contabilidade-para-escolas-sao-paulo/index.html`
- Test: `scripts/validate-lps.ps1`

**Interfaces:**
- Consumes: `/assets/css/styles.css`, `/assets/js/main.js`, imagens e fontes existentes.
- Produces: página estática acessível na rota `/contabilidade-para-escolas-sao-paulo`.

- [ ] Criar head completo com title, description, canonical, social cards e JSON-LD coerente.
- [ ] Criar header/hero e as 18 seções temáticas do prompt, FAQ com 20 perguntas, CTA final, rodapé e botão flutuante.
- [ ] Usar links `https://wa.me/5511910316319?text=...`, classe `js-wa-link`, `data-page-topic="contabilidade_para_escolas_sao_paulo"` e `data-cta-location` em cada CTA.
- [ ] Confirmar inexistência de formulário, link telefônico, dados de alunos, alegação de consultoria pedagógica e promessa tributária/trabalhista.
- [ ] Executar o validador e corrigir somente falhas desta rota.

### Task 3: Landing page Holding Familiar

**Files:**
- Create: `holding-familiar-sao-paulo/index.html`
- Test: `scripts/validate-lps.ps1`

**Interfaces:**
- Consumes: `/assets/css/styles.css`, `/assets/js/main.js`, imagens e fontes existentes.
- Produces: página estática acessível na rota `/holding-familiar-sao-paulo`.

- [ ] Criar head completo com title, description, canonical, social cards e JSON-LD coerente.
- [ ] Criar header/hero e as 20 seções temáticas do prompt, FAQ com 24 perguntas, CTA final, rodapé e botão flutuante.
- [ ] Incluir de forma visível “quando pode não compensar”, atuação conjunta com profissional jurídico e alertas contra ocultação/fraude/proteção absoluta.
- [ ] Usar classe `js-wa-link`, `data-page-topic="holding_familiar_sao_paulo"` e `data-cta-location` em cada CTA.
- [ ] Confirmar inexistência de formulário, link telefônico, promessa de economia, blindagem, eliminação de inventário ou serviço jurídico direto.
- [ ] Executar o validador e corrigir somente falhas desta rota.

### Task 4: Atribuição e rastreamento compartilhados

**Files:**
- Modify: `assets/js/main.js`
- Test: `scripts/validate-lps.ps1`

**Interfaces:**
- Consumes: `data-page-topic` no `body` e `data-cta-location` nos links.
- Produces: eventos `whatsapp_click` e `cta_click` com `page_type`, `page_topic`, `page_path`, `whatsapp_number`, `cta_location`, `cta_text`, `link_url` e parâmetros de atribuição.

- [ ] Expandir as chaves capturadas para `gbraid` e `wbraid`, preservando entrada, URL e referenciador em `sessionStorage`.
- [ ] Manter a mensagem visível do WhatsApp intacta, sem anexar códigos técnicos.
- [ ] Emitir um evento de cada tipo por clique, mantendo páginas antigas funcionais.
- [ ] Executar `node --check assets/js/main.js` e o validador.

### Task 5: Descoberta, deploy e verificação final

**Files:**
- Modify: `sitemap.xml`
- Modify: `vercel.json`
- Test: `scripts/validate-lps.ps1`

**Interfaces:**
- Consumes: canonicals das duas novas páginas.
- Produces: URLs descobertas por buscadores e headers de cache consistentes.

- [ ] Adicionar as duas URLs ao sitemap com `lastmod` 2026-07-16.
- [ ] Adicionar headers HTML equivalentes aos das demais rotas, sem redirects desnecessários.
- [ ] Rodar `& .\scripts\validate-lps.ps1`, `node --check assets/js/main.js`, parse XML/JSON e `git diff --check`.
- [ ] Inspecionar `git status --short` e registrar pendências de validação visual/publicação.
