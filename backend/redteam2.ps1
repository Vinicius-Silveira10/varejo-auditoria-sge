$ErrorActionPreference = 'Stop'

Write-Host "
--- TESTE 2: PERFIL SEM PERMISSAO (OPERADOR -> ADMIN ROTA) ---"
try {
  $loginBody = '{"email":"operador@fortal.com.br","senhaBruta":"SenhaSegura123!"}'
  $login = Invoke-WebRequest -Uri "http://localhost:3333/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
  $tokenOp = ($login.Content | ConvertFrom-Json).accessToken
  Write-Host "Login efetuado com sucesso (OPERADOR). Token obtido."
  $r = Invoke-WebRequest -Uri "http://localhost:3333/dashboards/accuracy" -Headers @{Authorization="Bearer $tokenOp"} -UseBasicParsing
  Write-Host "FALHOU: Retornou $($r.StatusCode)"
} catch {
  Write-Host "STATUS_LITERAL: $($_.Exception.Response.StatusCode.value__)"
  Write-Host "BODY_LITERAL: $($_.ErrorDetails.Message)"
}

Write-Host "
--- TESTE 5: RATE LIMITING (BOMBARDEMENTO) ---"
try {
  for ($i=0; $i -lt 25; $i++) {
    $r = Invoke-WebRequest -Uri "http://localhost:3333/auth/login" -Method POST -Body '{"email":"invalid@fortal.com.br","senhaBruta":"wrong"}' -ContentType "application/json" -UseBasicParsing
  }
} catch {
  Write-Host "STATUS_LITERAL: $($_.Exception.Response.StatusCode.value__)"
  Write-Host "BODY_LITERAL: $($_.ErrorDetails.Message)"
}
