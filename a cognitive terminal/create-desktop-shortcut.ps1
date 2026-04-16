# Create SOMA Cognitive Terminal Desktop Shortcut
# Run this script to add a shortcut to your desktop

$WScriptShell = New-Object -ComObject WScript.Shell
$Desktop = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop "SOMA Terminal.lnk"

$Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "C:\Windows\System32\cmd.exe"
$Shortcut.Arguments = "/c `"cd /d `"$PSScriptRoot`" && launch-soma-terminal.bat`""
$Shortcut.WorkingDirectory = $PSScriptRoot
$Shortcut.Description = "SOMA Cognitive Terminal - AI Assistant"
$Shortcut.IconLocation = "$PSScriptRoot\build\soma-icon.ico"
$Shortcut.WindowStyle = 1
$Shortcut.Save()

Write-Host "Desktop shortcut created: $ShortcutPath" -ForegroundColor Green
Write-Host "Points to: $PSScriptRoot" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: You can move the cognitive-terminal folder anywhere," -ForegroundColor Yellow
Write-Host "      then re-run this script to update the shortcut path." -ForegroundColor Yellow
