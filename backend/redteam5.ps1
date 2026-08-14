$ErrorActionPreference = 'SilentlyContinue'

Write-Host "
--- TESTE 5: RATE LIMITING (BOMBARDEMENTO > 50 reqs) ---"
for ($i=1; $i -le 60; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:3333/auth/login" -Method POST -Body '{"email":"operador@fortal.com.br","senhaBruta":"wrong"}' -ContentType "application/json" -UseBasicParsing
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 429) {
      Write-Host "STATUS_LITERAL: 429 na tentativa $i"
      break
    } elseif ($i -eq 60) {
      Write-Host "Falhou na tentativa 60 com status: $($_.Exception.Response.StatusCode.value__)"
    }
  }
}
