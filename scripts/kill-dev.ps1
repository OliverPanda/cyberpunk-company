param(
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$repoName = Split-Path -Leaf $repoRoot
$dbPorts = 54329..54349

function Matches-CyberpunkDevProcess {
  param(
    [Parameter(Mandatory = $true)]
    $ProcessInfo,
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,
    [Parameter(Mandatory = $true)]
    [string]$RepoName
  )

  $commandLine = [string]$ProcessInfo.CommandLine
  if ([string]::IsNullOrWhiteSpace($commandLine)) {
    return $false
  }

  $normalized = $commandLine.ToLowerInvariant()
  $repoRootNormalized = $RepoRoot.ToLowerInvariant()
  $repoNameNormalized = $RepoName.ToLowerInvariant()

  if ($normalized -like "*postgres*") {
    return $false
  }

  if ($normalized -like "*$repoRootNormalized*") {
    return $true
  }

  if ($normalized -like "*$repoNameNormalized*" -and ($normalized -like "*node*" -or $normalized -like "*pnpm*" -or $normalized -like "*tsx*")) {
    return $true
  }

  return $false
}

function Stop-TargetProcesses {
  param(
    [Parameter(Mandatory = $true)]
    [System.Collections.IEnumerable]$Targets,
    [Parameter(Mandatory = $true)]
    [string]$Label,
    [switch]$DryRunMode
  )

  $items = @($Targets)
  if ($items.Count -eq 0) {
    Write-Host "No $Label found."
    return
  }

  Write-Host "Found $($items.Count) ${Label}:"
  foreach ($item in $items) {
    Write-Host "  PID $($item.ProcessId)  $($item.Description)"
  }

  if ($DryRunMode) {
    Write-Host "Dry run only. Re-run without -DryRun to stop these processes."
    return
  }

  foreach ($item in $items) {
    try {
      Stop-Process -Id $item.ProcessId -Force -ErrorAction Stop
      Write-Host "  Stopped PID $($item.ProcessId)"
    } catch {
      Write-Warning "Failed to stop PID $($item.ProcessId): $($_.Exception.Message)"
    }
  }
}

$devProcesses = Get-CimInstance Win32_Process |
  Where-Object { Matches-CyberpunkDevProcess -ProcessInfo $_ -RepoRoot $repoRoot -RepoName $repoName } |
  Sort-Object ProcessId |
  ForEach-Object {
    $description = if ([string]::IsNullOrWhiteSpace([string]$_.CommandLine)) { $_.Name } else { $_.CommandLine }
    [pscustomobject]@{
      ProcessId = $_.ProcessId
      Description = $description
    }
  }

$dbConnections = foreach ($port in $dbPorts) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
}

$dbProcesses = @($dbConnections |
  Group-Object OwningProcess |
  ForEach-Object {
    $processId = [int]$_.Name
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
    if ($null -eq $process) {
      return
    }

    $commandDescription =
      if ([string]::IsNullOrWhiteSpace([string]$process.CommandLine)) { $process.Name } else { $process.CommandLine }

    [pscustomobject]@{
      ProcessId = $processId
      Description = "listening on " + (($_.Group | Select-Object -ExpandProperty LocalPort | Sort-Object -Unique) -join ", ") + " :: " + $commandDescription
    }
  } |
  Sort-Object ProcessId -Unique)

Stop-TargetProcesses -Targets $devProcesses -Label "Cyberpunk Company dev process(es)" -DryRunMode:$DryRun
Write-Host ""
Stop-TargetProcesses -Targets $dbProcesses -Label "embedded PostgreSQL process(es) on ports $($dbPorts[0])-$($dbPorts[-1])" -DryRunMode:$DryRun
