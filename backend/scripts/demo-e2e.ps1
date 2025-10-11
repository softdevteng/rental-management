# E2E PowerShell demo for landlord/tenant/caretaker workflow
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5000'

function PostJson($url, $body, $token) {
  $headers = @{'Content-Type'='application/json'}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  $json = $null
  if ($body) { $json = ($body | ConvertTo-Json -Depth 6) }
  return Invoke-RestMethod -Method Post -Uri ($base + $url) -Headers $headers -Body $json
}

function PutJson($url, $body, $token) {
  $headers = @{'Content-Type'='application/json'}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  $json = $null
  if ($body) { $json = ($body | ConvertTo-Json -Depth 6) }
  return Invoke-RestMethod -Method Put -Uri ($base + $url) -Headers $headers -Body $json
}

function GetJson($url, $token) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  return Invoke-RestMethod -Method Get -Uri ($base + $url) -Headers $headers
}

$rand = Get-Random -Maximum 1000000
$landlord = @{ email = "landlord.demo+$rand@example.com"; password = 'Passw0rd!'; role = 'landlord' }
$tenant   = @{ email = "tenant.demo+$rand@example.com";   password = 'Passw0rd!'; role = 'tenant' }
$caret    = @{ email = "caretaker.demo+$rand@example.com"; password = 'Passw0rd!'; role = 'caretaker' }

# Register landlord and tenant
try { PostJson '/api/auth/register' $landlord $null | Out-Null } catch {}
try { PostJson '/api/auth/register' $tenant   $null | Out-Null } catch {}

# Login
Write-Host 'Logging in landlord/tenant...'
$ll = PostJson '/api/auth/login' @{ email=$landlord.email; password=$landlord.password } $null
$tt = PostJson '/api/auth/login' @{ email=$tenant.email;   password=$tenant.password }   $null
$llToken = $ll.token
$ttToken = $tt.token

# Create estate and apartment
Write-Host 'Creating estate & apartment...'
$est = PostJson '/api/landlords/estates' @{ name = "Demo Estate $rand"; address = '123 Demo St' } $llToken
$apt = PostJson ("/api/landlords/estates/$($est.id)/apartments") @{ number = "A-$rand"; rent = 1500; deposit = 2000 } $llToken

# Assign tenant to apartment (get tenant id)
$tenantMe = GetJson '/api/tenants/me' $ttToken
if ($tenantMe -and $tenantMe.id) { PostJson ("/api/landlords/apartments/$($apt.id)/assign-tenant") @{ tenantId = $tenantMe.id } $llToken | Out-Null }

# Register caretaker for this apartment
Write-Host 'Registering caretaker...'
$caretBody = @{ email = $caret.email; password = $caret.password; role = 'caretaker'; fullName = 'Demo Caretaker'; idNumber = '12345678'; apartmentId = $apt.id }
try { PostJson '/api/auth/register' $caretBody $null | Out-Null } catch {}
$ct = PostJson '/api/auth/login' @{ email=$caret.email; password=$caret.password } $null
$ctToken = $ct.token

# Post rent reminder
Write-Host 'Posting rent reminder...'
PostJson '/api/payments/reminders/estate' @{ estateId = $est.id; title = 'Rent Reminder'; message = 'Your rent is due.' } $llToken | Out-Null

# Create two tickets as tenant
Write-Host 'Creating tickets...'
$t1 = PostJson '/api/tenants/tickets' @{ description = 'Leaky tap' } $ttToken
$t2 = PostJson '/api/tenants/tickets' @{ description = 'Broken light' } $ttToken

# Resolve: caretaker in-progress, landlord closed
Write-Host 'Updating ticket statuses...'
PutJson ("/api/landlords/tickets/$($t1.id)/status") @{ status = 'in-progress' } $ctToken | Out-Null
PutJson ("/api/landlords/tickets/$($t2.id)/status") @{ status = 'closed' } $llToken | Out-Null

# Verify notices via tenant
$me = GetJson '/api/tenants/me' $ttToken
$estateId = if ($me -and $me.Apartment -and $me.Apartment.Estate) { $me.Apartment.Estate.id } else { $est.id }
$notices = GetJson ("/api/notices/estate/$estateId") $ttToken

Write-Host "DEMO SUMMARY: estate=$($est.name); apartmentId=$($apt.id); caretaker=Demo Caretaker; tickets=[$($t1.id),$($t2.id)]; notices=$($notices.Count)"
