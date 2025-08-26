$ts = Get-Date -Format "yyyyMMdd_HHmm"
$backupPath = "backup"

# Ensure backup directory exists
if (-not (Test-Path $backupPath)) {
    New-Item -ItemType Directory -Force -Path $backupPath | Out-Null
}

# Backup main DB
if (Test-Path "underwriter_dev.db") {
    sqlite3 underwriter_dev.db ".dump" | Out-File -Encoding UTF8 "$backupPath\underwriter_dev_$ts.sql"
    Write-Host "Wrote $backupPath\underwriter_dev_$ts.sql"
} else {
    Write-Host "Skip: underwriter_dev.db not found"
}

# Backup instance DB
if (Test-Path "instance\underwriter_dev.db") {
    sqlite3 instance\underwriter_dev.db ".dump" | Out-File -Encoding UTF8 "$backupPath\instance_underwriter_dev_$ts.sql"
    Write-Host "Wrote $backupPath\instance_underwriter_dev_$ts.sql"
} else {
    Write-Host "Skip: instance\underwriter_dev.db not found"
}
