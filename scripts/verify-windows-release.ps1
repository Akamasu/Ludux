$ErrorActionPreference = 'Stop'

$package = Get-Content -Raw package.json | ConvertFrom-Json
$version = $package.version
$installerName = "Ludux-Setup-$version-x64.exe"
$installerPath = Join-Path 'release' $installerName
$blockmapPath = "$installerPath.blockmap"
$latestPath = Join-Path 'release' 'latest.yml'
$checksumPath = "$installerPath.sha256"

foreach ($path in @($installerPath, $blockmapPath, $latestPath)) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Fichier de release manquant : $path"
  }
}

$latest = Get-Content -Raw -LiteralPath $latestPath

if ($latest -notmatch "(?m)^version:\s*$([regex]::Escape($version))\s*$") {
  throw "latest.yml ne référence pas la version $version."
}

if ($latest -notmatch [regex]::Escape($installerName)) {
  throw "latest.yml ne référence pas $installerName."
}

$signature = Get-AuthenticodeSignature -LiteralPath $installerPath
$requireSignature = $env:LUDUX_REQUIRE_SIGNED_RELEASE -eq '1'

if ($requireSignature -and $signature.Status -ne 'Valid') {
  throw "La signature Authenticode est requise mais son état est $($signature.Status)."
}

$hash = (Get-FileHash -LiteralPath $installerPath -Algorithm SHA256).Hash.ToUpperInvariant()
Set-Content -LiteralPath $checksumPath -Value "$hash  $installerName" -Encoding ascii

$signatureLabel = if ($signature.Status -eq 'Valid') {
  "valide ($($signature.SignerCertificate.Subject))"
} else {
  "absente ($($signature.Status))"
}

Write-Output "Release Windows vérifiée : $installerName"
Write-Output "SHA-256 : $hash"
Write-Output "Signature : $signatureLabel"
