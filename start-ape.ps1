$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $root 'backend'
$frontendPath = Join-Path $root 'ape'

Write-Host 'Starting APE backend...' -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$backendPath'; node server.js"
)

Start-Sleep -Seconds 2

Write-Host 'Starting APE frontend...' -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$frontendPath'; npm start"
)

Write-Host 'APE launch commands started.' -ForegroundColor Green
