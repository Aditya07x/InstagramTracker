param(
    [switch]$SkipVerify
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

$npxArgs = @(
    'esbuild'
    'app/src/main/assets/www/app.jsx'
    '--bundle'
    '--format=iife'
    '--target=es2018'
    '--outfile=app/src/main/assets/www/app.bundle.js'
    '--jsx-factory=React.createElement'
    '--jsx-fragment=React.Fragment'
)

Write-Host '[rebundle_www] Rebuilding app.bundle.js from app.jsx...' -ForegroundColor Cyan
& npx @npxArgs

if (-not $SkipVerify) {
    Write-Host '[rebundle_www] Verifying critical web markers...' -ForegroundColor Cyan
    & "$projectRoot\verify_www_integrity.ps1"
}

Write-Host '[rebundle_www] Done.' -ForegroundColor Green
