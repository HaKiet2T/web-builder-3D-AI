$ErrorActionPreference = 'Stop'

if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
    throw 'Python Install Manager (py) is required. Install it from python.org, then run this script again.'
}

$supportedVersions = @('3.13', '3.12', '3.11')
$selectedVersion = $null

foreach ($version in $supportedVersions) {
    & py "-$version" --version *> $null
    if ($LASTEXITCODE -eq 0) {
        $selectedVersion = $version
        break
    }
}

if (-not $selectedVersion) {
    Write-Output 'No supported Python runtime found. Installing Python 3.13 with Python Install Manager.'
    & py install 3.13
    if ($LASTEXITCODE -ne 0) {
        throw 'Could not install Python 3.13. Install Python 3.11-3.13, then run this script again.'
    }
    $selectedVersion = '3.13'
}

$venvPath = Join-Path $PSScriptRoot '..\.venv-product-images'
$venvPython = Join-Path $venvPath 'Scripts\python.exe'
$requirementsPath = Join-Path $PSScriptRoot '..\requirements-image-processing.txt'

if (-not (Test-Path $venvPython)) {
    & py "-$selectedVersion" -m venv $venvPath
    if ($LASTEXITCODE -ne 0) {
        throw "Could not create the image processor environment with Python $selectedVersion."
    }
}

& $venvPython -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) {
    throw 'Could not upgrade pip in the image processor environment.'
}

& $venvPython -m pip install -r $requirementsPath
if ($LASTEXITCODE -ne 0) {
    throw 'Could not install the image processor dependencies.'
}

Write-Output "Image processor is ready at $venvPython"
