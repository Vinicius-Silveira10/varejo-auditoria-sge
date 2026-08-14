$ErrorActionPreference = 'Stop'

Write-Host "
--- TESTE 1: REQUEST SEM TOKEN ---"
try {
  $r = Invoke-WebRequest -Uri "http://localhost:3333/dashboards/accuracy" -UseBasicParsing
  Write-Host "FALHOU: Retornou $($r.StatusCode)"
} catch {
  Write-Host "STATUS_LITERAL: $($_.Exception.Response.StatusCode.value__)"
  Write-Host "BODY_LITERAL: $($_.ErrorDetails.Message)"
}

Write-Host "
--- TESTE 2: PERFIL SEM PERMISSAO (OPERADOR -> ADMIN ROTA) ---"
try {
  $loginBody = '{"email":"operador1@fortal.com.br","senhaBruta":"SenhaSegura123!"}'
  $login = Invoke-WebRequest -Uri "http://localhost:3333/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
  $tokenOp = ($login.Content | ConvertFrom-Json).accessToken
  $r = Invoke-WebRequest -Uri "http://localhost:3333/dashboards/accuracy" -Headers @{Authorization="Bearer $tokenOp"} -UseBasicParsing
  Write-Host "FALHOU: Retornou $($r.StatusCode)"
} catch {
  Write-Host "STATUS_LITERAL: $($_.Exception.Response.StatusCode.value__)"
  Write-Host "BODY_LITERAL: $($_.ErrorDetails.Message)"
}

Write-Host "
--- TESTE 3: TOKEN FORJADO (SECRET DEFAULT DA INTERNET) ---"
# eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInBlcmZpbCI6IkFETUlOIiwiaWF0IjoxNzg2NDg0MzUxLCJleHAiOjE4ODY0ODQzNTF9.faked_signature
try {
  $r = Invoke-WebRequest -Uri "http://localhost:3333/dashboards/accuracy" -Headers @{Authorization="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInBlcmZpbCI6IkFETUlOIiwiaWF0IjoxNzg2NDg0MzUxLCJleHAiOjE4ODY0ODQzNTF9.faked_signature"} -UseBasicParsing
  Write-Host "FALHOU: Retornou $($r.StatusCode)"
} catch {
  Write-Host "STATUS_LITERAL: $($_.Exception.Response.StatusCode.value__)"
  Write-Host "BODY_LITERAL: $($_.ErrorDetails.Message)"
}

Write-Host "
--- TESTE 4: CORS (ORIGIN EVIL.COM) ---"
try {
  $r = Invoke-WebRequest -Uri "http://localhost:3333/auth/login" -Method OPTIONS -Headers @{Origin="https://evil.com";"Access-Control-Request-Method"="POST"} -UseBasicParsing
  Write-Host "FALHOU: Retornou $($r.StatusCode) e Access-Control-Allow-Origin: $($r.Headers['Access-Control-Allow-Origin'])"
} catch {
  Write-Host "STATUS_LITERAL: $($_.Exception.Response.StatusCode.value__)"
  Write-Host "BLOQUEADO CORRETAMENTE PELO CORS (SEM ACCESS-CONTROL-ALLOW-ORIGIN ECOADO)"
}

Write-Host "
--- TESTE 5: RATE LIMITING (BOMBARDEMENTO) ---"
try {
  for ($i=0; $i -lt 15; $i++) {
    $r = Invoke-WebRequest -Uri "http://localhost:3333/auth/login" -Method POST -Body '{"email":"invalid","senhaBruta":"x"}' -ContentType "application/json" -UseBasicParsing
  }
} catch {
  Write-Host "STATUS_LITERAL: $($_.Exception.Response.StatusCode.value__)"
  Write-Host "BODY_LITERAL: $($_.ErrorDetails.Message)"
}
