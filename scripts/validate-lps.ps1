$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$pages = @(
  'contabilidade-na-barra-funda/index.html'
  'contabilidade-na-barra-funda/whatsapp/index.html'
  'contabilidade-em-sao-paulo/index.html'
  'contabilidade-em-sao-paulo/whatsapp/index.html'
  'bpo-financeiro-sao-paulo/index.html'
  'bpo-financeiro-sao-paulo/whatsapp/index.html'
  'consultoria-tributaria-sao-paulo/index.html'
  'consultoria-tributaria-sao-paulo/whatsapp/index.html'
  'contabilidade-para-medicos-sao-paulo/index.html'
  'contabilidade-para-medicos-sao-paulo/whatsapp/index.html'
  'contabilidade-para-escolas-sao-paulo/index.html'
  'contabilidade-para-escolas-sao-paulo/whatsapp/index.html'
  'holding-familiar-sao-paulo/index.html'
  'holding-familiar-sao-paulo/whatsapp/index.html'
)

$errors = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()
$sitemapPath = Join-Path $root 'sitemap.xml'
$sitemap = Get-Content -LiteralPath $sitemapPath -Raw -Encoding UTF8

function Add-Error([string]$Page, [string]$Message) {
  $errors.Add("${Page}: $Message")
}

function Add-Warning([string]$Page, [string]$Message) {
  $warnings.Add("${Page}: $Message")
}

foreach ($page in $pages) {
  $path = Join-Path $root $page
  if (-not (Test-Path -LiteralPath $path)) {
    Add-Error $page 'arquivo ausente'
    continue
  }

  $html = Get-Content -LiteralPath $path -Raw -Encoding UTF8
  $isSpecializedPage = $page -match 'contabilidade-para-escolas|holding-familiar'

  $h1Count = ([regex]::Matches($html, '<h1\b', 'IgnoreCase')).Count
  if ($h1Count -ne 1) { Add-Error $page "esperado 1 H1; encontrado $h1Count" }

  $titleMatch = [regex]::Match($html, '<title>(.*?)</title>', 'IgnoreCase, Singleline')
  if (-not $titleMatch.Success) {
    Add-Error $page 'title ausente'
  } elseif ($titleMatch.Groups[1].Value.Trim().Length -gt $(if ($isSpecializedPage) { 65 } else { 60 })) {
    Add-Warning $page "title acima de 60 caracteres ($($titleMatch.Groups[1].Value.Trim().Length))"
  }

  $descriptionMatch = [regex]::Match($html, '<meta\s+name="description"\s+content="([^"]*)"', 'IgnoreCase')
  if (-not $descriptionMatch.Success) {
    Add-Error $page 'meta description ausente ou fora do formato esperado'
  } else {
    $descriptionLength = $descriptionMatch.Groups[1].Value.Length
    $minimumDescriptionLength = if ($isSpecializedPage) { 120 } else { 140 }
    if ($descriptionLength -lt $minimumDescriptionLength -or $descriptionLength -gt 160) {
      Add-Warning $page "meta description fora de 140-160 caracteres ($descriptionLength)"
    }
  }

  foreach ($required in @('canonical', 'og:title', 'og:description', 'og:image', 'og:url', 'twitter:card')) {
    if ($html -notmatch [regex]::Escape($required)) { Add-Error $page "metadado ausente: $required" }
  }

  $ids = [regex]::Matches($html, '\sid="([^"]+)"', 'IgnoreCase') | ForEach-Object { $_.Groups[1].Value }
  $duplicates = $ids | Group-Object | Where-Object Count -gt 1
  foreach ($duplicate in $duplicates) { Add-Error $page "id duplicado: $($duplicate.Name)" }

  $anchors = [regex]::Matches($html, 'href="#([^"#]+)"', 'IgnoreCase') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
  foreach ($anchor in $anchors) {
    if ($ids -notcontains $anchor) { Add-Error $page "âncora sem destino: #$anchor" }
  }

  $jsonBlocks = [regex]::Matches($html, '<script\s+type="application/ld\+json"[^>]*>(.*?)</script>', 'IgnoreCase, Singleline')
  if ($jsonBlocks.Count -lt 3) { Add-Error $page "esperados ao menos 3 JSON-LD; encontrados $($jsonBlocks.Count)" }
  foreach ($jsonBlock in $jsonBlocks) {
    try { $null = $jsonBlock.Groups[1].Value | ConvertFrom-Json }
    catch { Add-Error $page "JSON-LD inválido: $($_.Exception.Message)" }
  }

  $localRefs = [regex]::Matches($html, '(?:src|href)="(/assets/[^"?#]+)', 'IgnoreCase') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
  foreach ($ref in $localRefs) {
    $assetPath = Join-Path $root ($ref.TrimStart('/') -replace '/', [IO.Path]::DirectorySeparatorChar)
    if (-not (Test-Path -LiteralPath $assetPath)) { Add-Error $page "asset ausente: $ref" }
  }

  if ($html -match '(?i)lorem ipsum|\[CONFIRMAR|<!--\s*TODO\b') { Add-Error $page 'placeholder encontrado' }
  if ($html -notmatch 'class="[^"]*js-wa-link') { Add-Error $page 'CTA WhatsApp instrumentado ausente' }
  if ($html -notmatch '/assets/js/main\.js') { Add-Error $page 'main.js ausente' }

  if ($isSpecializedPage) {
    if ($html -match '<form\b') { Add-Error $page 'formulário não permitido nesta LP' }
    if ($html -match 'href="tel:') { Add-Error $page 'CTA de ligação não permitido nesta LP' }
    $waLinks = [regex]::Matches($html, '<a\b[^>]*class="[^"]*js-wa-link[^"]*"[^>]*>', 'IgnoreCase')
    if ($waLinks.Count -lt 8) { Add-Error $page "esperados ao menos 8 CTAs WhatsApp; encontrados $($waLinks.Count)" }
    foreach ($waLink in $waLinks) {
      if ($waLink.Value -notmatch 'data-cta-location="[^"]+"') { Add-Error $page 'CTA WhatsApp sem data-cta-location' }
      if ($waLink.Value -notmatch '5511910316319') { Add-Error $page 'CTA WhatsApp com número incorreto' }
    }
    if ($html -notmatch '<body[^>]+data-page-topic="[^"]+"') { Add-Error $page 'body sem data-page-topic' }
  }

  # Contrato da variante /whatsapp: mesma LP, sem modal e sem CTA de telefone,
  # fora do índice e com canonical apontando para a LP principal.
  if ($page -match '^(?<slug>[^/]+)/whatsapp/index\.html$') {
    $slug = $Matches['slug']
    if ($html -notmatch '<meta\s+name="robots"\s+content="noindex, follow"') {
      Add-Error $page 'variante /whatsapp precisa ser noindex, follow'
    }
    if ($html -notmatch [regex]::Escape("rel=`"canonical`" href=`"https://contabilidade.tileservicos.com.br/$slug`"")) {
      Add-Error $page 'canonical da variante deve apontar para a LP principal'
    }
    if ($html -notmatch [regex]::Escape("og:url`" content=`"https://contabilidade.tileservicos.com.br/$slug/whatsapp`"")) {
      Add-Error $page 'og:url deve apontar para a própria variante'
    }
    if ($html -notmatch [regex]::Escape("page_path: '/$slug/whatsapp'")) {
      Add-Error $page 'dataLayer page_path incorreto'
    }
    if ($html -notmatch [regex]::Escape("href=`"/$slug/whatsapp`"")) {
      Add-Error $page 'logo do header deve manter o visitante na variante'
    }
    if ($html -match 'wa-modal|js-open-wa-modal') { Add-Error $page 'modal de lead não permitido na variante' }
    if ($html -match 'js-phone-btn') { Add-Error $page 'CTA de telefone não permitido na variante' }
  }

  if ($page -notmatch '/whatsapp/' -and $html -match '<meta\s+name="robots"\s+content="index, follow"') {
    $canonicalMatch = [regex]::Match($html, '<link\s+rel="canonical"\s+href="([^"]+)"', 'IgnoreCase')
    if ($canonicalMatch.Success -and $sitemap -notmatch [regex]::Escape($canonicalMatch.Groups[1].Value)) {
      Add-Error $page 'canonical indexável ausente do sitemap.xml'
    }
  }
}

Write-Output "Páginas verificadas: $($pages.Count)"
Write-Output "Erros: $($errors.Count)"
$errors | ForEach-Object { Write-Output "ERRO $_" }
Write-Output "Avisos: $($warnings.Count)"
$warnings | ForEach-Object { Write-Output "AVISO $_" }

if ($errors.Count -gt 0) { exit 1 }
