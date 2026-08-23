$ErrorActionPreference = 'Stop'
$projectId = 'reelio-web-20260312'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

if (-not (Test-Path '.\landing.html')) {
  throw 'landing.html was not found in the project root.'
}

New-Item -ItemType Directory -Path '.\firebase_public' -Force | Out-Null
Copy-Item '.\landing.html' '.\firebase_public\index.html' -Force

Write-Host 'Synced landing.html -> firebase_public/index.html'
Write-Host 'Deploying Firebase Hosting...'

firebase deploy --only hosting --project $projectId
