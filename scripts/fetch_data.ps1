param([string]$Dest = "data\raw")

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force $Dest | Out-Null

if (-not (git lfs version)) { throw "git-lfs not found -- install from https://git-lfs.github.com" }

$clone = Join-Path $Dest "_clone"
if (-not (Test-Path $clone)) {
    git clone --depth 1 https://github.com/afrith/crime-stats.git $clone
}
Push-Location $clone
git lfs pull
Pop-Location

$hash = (Get-FileHash (Join-Path $clone "crime-stats.csv") -Algorithm SHA256).Hash.ToLower()
$expected = "5bae2fa9842064167eb07831e3356a1cdbf0ede55f58cb89e855d52e28199377"
if ($hash -ne $expected) {
    throw "crime-stats.csv hash mismatch (got $hash, expected $expected) -- download corrupted, re-run fetch"
}

Copy-Item (Join-Path $clone "crime-stats.csv") (Join-Path $Dest "crime-stats.csv") -Force
Copy-Item (Join-Path $clone "police_stations.csv") (Join-Path $Dest "police_stations.csv") -Force
Copy-Item (Join-Path $clone "police_stations.gpkg") (Join-Path $Dest "police_stations.gpkg") -Force

Write-Output "DATA FETCH COMPLETE"
