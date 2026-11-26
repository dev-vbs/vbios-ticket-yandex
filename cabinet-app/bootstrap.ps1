$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    flutter create --template app --platforms android,ios,windows --org ru.pbalka --project-name vbios_cabinet --no-pub .
    if ($LASTEXITCODE -ne 0) { throw 'Flutter project generation failed.' }

    $manifestPath = Join-Path $PWD 'android/app/src/main/AndroidManifest.xml'
    [xml]$manifest = Get-Content -Raw -LiteralPath $manifestPath
    $androidNamespace = 'http://schemas.android.com/apk/res/android'
    $internet = $manifest.manifest.'uses-permission' | Where-Object {
        $_ -and $_.GetAttribute('name', $androidNamespace) -eq 'android.permission.INTERNET'
    }
    if (!$internet) {
        $permission = $manifest.CreateElement('uses-permission')
        $attribute = $manifest.CreateAttribute('android', 'name', $androidNamespace)
        $attribute.Value = 'android.permission.INTERNET'
        [void]$permission.Attributes.Append($attribute)
        [void]$manifest.manifest.InsertBefore($permission, $manifest.manifest.application)
    }
    $manifest.manifest.application.SetAttribute('label', $androidNamespace, 'vBios') | Out-Null
    $manifest.Save($manifestPath)
    $generatedTest = Join-Path $PWD 'test/widget_test.dart'
    if (Test-Path -LiteralPath $generatedTest) {
        $starter = Get-Content -Raw -LiteralPath $generatedTest
        if ($starter.Contains('Counter increments smoke test') -and $starter.Contains('const MyApp()')) {
            Remove-Item -LiteralPath $generatedTest
        }
    }

    flutter pub get
    if ($LASTEXITCODE -ne 0) { throw 'Flutter dependency resolution failed.' }
} finally {
    Pop-Location
}
