# Configuration d'une tâche planifiée quotidienne pour Stage Radar sur Windows
$taskName = "StageRadarDailyScrape"
$projectDir = Split-Path -Parent $PSScriptRoot
$batchPath = Join-Path $PSScriptRoot "run_daily.bat"

# Heure d'exécution par défaut : 08:30 chaque matin
$action = New-ScheduledTaskAction -Execute $batchPath -WorkingDirectory $projectDir
$trigger = New-ScheduledTaskTrigger -Daily -At "08:30"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Stage Radar daily scraper for AI/Data internships"
    Write-Host "[+] Tâche planifiée '$taskName' créée avec succès pour s'exécuter chaque jour à 08:30 !" -ForegroundColor Green
    Write-Host "    Pour voir la tâche : Get-ScheduledTask -TaskName $taskName"
} catch {
    Write-Host "[-] Erreur lors de la création de la tâche planifiée : $_" -ForegroundColor Red
}
