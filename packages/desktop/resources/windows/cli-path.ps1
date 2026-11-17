param(
  [Parameter(Mandatory = $true)][ValidateSet('install', 'uninstall')][string]$Action,
  [Parameter(Mandatory = $true)][string]$Directory,
  [Parameter(Mandatory = $true)][string]$AppId
)

$ErrorActionPreference = 'Stop'
$environment = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment', $true)
$ownerPath = "Software\Houshiar\CliPath\$AppId"
$owner = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey($ownerPath)
try {
  $value = $environment.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
  $kind = if ($environment.GetValueNames() -contains 'Path') { $environment.GetValueKind('Path') } else { [Microsoft.Win32.RegistryValueKind]::ExpandString }
  $entries = @($value -split ';')
  if ($Action -eq 'install') {
    if ($entries -notcontains $Directory) {
      $updated = if ($value -eq '') { $Directory } elseif ($value.EndsWith(';')) { $value + $Directory } else { $value + ';' + $Directory }
      $environment.SetValue('Path', $updated, $kind)
      $owner.SetValue('Directory', $Directory)
    }
  } elseif ($owner.GetValue('Directory') -eq $Directory) {
    $removed = $false
    $updated = @(foreach ($entry in $entries) {
      if (-not $removed -and $entry -eq $Directory) { $removed = $true; continue }
      $entry
    }) -join ';'
    if ($removed) { $environment.SetValue('Path', $updated, $kind) }
    $owner.DeleteValue('Directory', $false)
  }
} finally {
  $owner.Close()
  $environment.Close()
}
