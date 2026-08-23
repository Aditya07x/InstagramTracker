$dest = "C:\Android Projects\InstagramTracker\app\src\main\assets\www"
$libs = @(
    @{ file = "react.production.min.js";     url = "https://unpkg.com/react@18/umd/react.production.min.js" },
    @{ file = "react-dom.production.min.js"; url = "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" },
    @{ file = "babel.standalone.min.js";     url = "https://unpkg.com/@babel/standalone/babel.min.js" },
    @{ file = "prop-types.js";               url = "https://unpkg.com/prop-types@15.8.1/prop-types.js" },
    @{ file = "recharts.js";                 url = "https://unpkg.com/recharts@2.12.0/umd/Recharts.js" },
    @{ file = "lucide-react.js";             url = "https://unpkg.com/lucide-react@0.344.0/dist/umd/lucide-react.js" },
    @{ file = "tailwind.js";                 url = "https://cdn.tailwindcss.com" }
)
foreach ($lib in $libs) {
    $outPath = Join-Path $dest $lib.file
    Write-Host "Downloading $($lib.file)..."
    Invoke-WebRequest -Uri $lib.url -OutFile $outPath -UseBasicParsing
    $size = (Get-Item $outPath).Length
    Write-Host "  -> $size bytes"
}
Write-Host "ALL DONE"
