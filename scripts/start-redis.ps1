$ErrorActionPreference = "Stop"

function Test-RedisPort([int]$Port) {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    $ok = $async.AsyncWaitHandle.WaitOne(500)
    if (-not $ok) {
      $client.Close()
      return $false
    }
    $client.EndConnect($async)
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

if (Test-RedisPort 6379) {
  Write-Output "Redis is reachable on :6379"
  exit 0
}

if (Test-RedisPort 6380) {
  Write-Output "Redis is reachable on :6380 (set REDIS_URL=redis://127.0.0.1:6380)"
  exit 0
}

Write-Host @"
Redis is not running locally.

Start it with Docker:
  docker compose up -d

Or install Redis 7+ and point REDIS_URL in .env at it (default redis://127.0.0.1:6379).
"@
exit 1
