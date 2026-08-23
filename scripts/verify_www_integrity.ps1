param(
    [switch]$CheckMergedAssets
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

$failures = New-Object System.Collections.Generic.List[string]

function Test-RequiredMarkers {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string[]]$Markers
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        $failures.Add("Missing file: $Path")
        return
    }

    $content = Get-Content -LiteralPath $Path -Raw
    foreach ($marker in $Markers) {
        if (-not $content.Contains($marker)) {
            $failures.Add("$Path missing marker: $marker")
        }
    }
}

$coreChecks = @(
    @{
        Path = 'app/src/main/assets/www/app.jsx'
        Markers = @(
            'session_transition_matrix',
            'const derivedMindfulStreak = (() => {',
            'const moodDissonance = (() => {',
            'mindfulStreak: maybeNum(rawData?.mindfulStreak) ?? derivedMindfulStreak,',
            'moodDissonance,'
        )
    },
    @{
        Path = 'app/src/main/assets/www/screens/MonitorScreen.jsx'
        Markers = @(
            'mindful in a row',
            'improving last 3 sessions',
            'Math.sqrt(Math.max(0, f.pct) / 100) * 100'
        )
    },
    @{
        Path = 'app/src/main/assets/www/screens/DashboardScreen.jsx'
        Markers = @(
            'function MoodDissonanceCard({ data })',
            '<MoodDissonanceCard data={data} />'
        )
    },
    @{
        Path = 'app/src/main/assets/www/app.bundle.js'
        Markers = @(
            'const sessTransition = rawData?.model_parameters?.session_transition_matrix;',
            'const derivedMindfulStreak = (() => {',
            'const moodDissonance = (() => {',
            'function MoodDissonanceCard({ data })',
            'Math.sqrt(Math.max(0, f.pct) / 100) * 100',
            'improving last 3 sessions'
        )
    }
)

foreach ($check in $coreChecks) {
    Test-RequiredMarkers -Path $check.Path -Markers $check.Markers
}

if ($CheckMergedAssets) {
    $mergedChecks = @(
        'app/build/intermediates/assets/debug/mergeDebugAssets/www/app.bundle.js',
        'app/build/intermediates/assets/release/mergeReleaseAssets/www/app.bundle.js'
    )
    foreach ($mergedPath in $mergedChecks) {
        if (Test-Path -LiteralPath $mergedPath) {
            Test-RequiredMarkers -Path $mergedPath -Markers @(
                'function MoodDissonanceCard({ data })',
                'Math.sqrt(Math.max(0, f.pct) / 100) * 100',
                'const sessTransition = rawData?.model_parameters?.session_transition_matrix;'
            )
        }
    }
}

if ($failures.Count -gt 0) {
    Write-Host '[verify_www_integrity] FAILED' -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host " - $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host '[verify_www_integrity] All checks passed.' -ForegroundColor Green
