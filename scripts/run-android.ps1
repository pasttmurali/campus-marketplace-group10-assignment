$ErrorActionPreference = "Stop"

$androidSdk = "G:\Android\Sdk"
$androidUserHome = "G:\Android\UserHome"
$gradleUserHome = "G:\Android\GradleHome"
$javaHome = "C:\Program Files\Eclipse Adoptium\jdk-17.0.13.11-hotspot"

$env:ANDROID_HOME = $androidSdk
$env:ANDROID_SDK_ROOT = $androidSdk
$env:ANDROID_USER_HOME = $androidUserHome
$env:ANDROID_PREFS_ROOT = $androidUserHome
$env:ANDROID_SDK_HOME = $androidUserHome
$env:GRADLE_USER_HOME = $gradleUserHome
$env:JAVA_HOME = $javaHome
$env:Path = "$androidSdk\platform-tools;$androidSdk\cmdline-tools\latest\bin;$javaHome\bin;$env:Path"

New-Item -ItemType Directory -Force -Path $androidUserHome, $gradleUserHome | Out-Null

$adb = Join-Path $androidSdk "platform-tools\adb.exe"
if (-not (Test-Path -LiteralPath $adb)) {
  Write-Error "Android platform-tools are missing at $adb"
  exit 1
}

$deviceLines = & $adb devices 2>&1
$deviceLines | Out-Host

$connectedDevice = $deviceLines | Select-String -Pattern "\sdevice$"
if (-not $connectedDevice) {
  Write-Host ""
  Write-Host "No Android phone is connected." -ForegroundColor Yellow
  Write-Host "1. Phone: enable Developer options and USB debugging."
  Write-Host "2. Connect USB and accept the RSA authorization prompt."
  Write-Host "3. Run: npm run android:windows"
  exit 1
}

& npx.cmd expo run:android
exit $LASTEXITCODE
