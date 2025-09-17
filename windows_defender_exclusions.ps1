# Windows Defender Exclusions Configuration Script
# Run this in Administrator PowerShell

Write-Host "=== Windows Defender Development Exclusions Setup ===" -ForegroundColor Green
Write-Host "This script will add development directory exclusions to Windows Defender" -ForegroundColor Yellow
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit
}

# Development directories to exclude
$excludePaths = @(
    "C:\Users\Yorstonw\modbusIOmodule\",
    "C:\Users\Yorstonw\.platformio\",
    "C:\Users\Yorstonw\.vscode\",
    "C:\Users\Yorstonw\AppData\Local\Programs\Microsoft VS Code\",
    "C:\Program Files\Microsoft VS Code\"
)

# File extensions to exclude (optional)
$excludeExtensions = @(
    "*.cpp", "*.h", "*.hpp", "*.c", "*.cc",
    "*.json", "*.ini", "*.cfg", "*.conf",
    "*.md", "*.txt", "*.log",
    "*.js", "*.html", "*.css", "*.xml",
    "*.py", "*.yml", "*.yaml"
)

Write-Host "Paths to exclude from Windows Defender:" -ForegroundColor Cyan
$excludePaths | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
Write-Host ""

# Check if Windows Defender is running
Write-Host "Checking Windows Defender status..." -ForegroundColor Yellow
try {
    $defenderStatus = Get-MpComputerStatus
    if ($defenderStatus.RealTimeProtectionEnabled) {
        Write-Host "Windows Defender Real-time Protection is ENABLED" -ForegroundColor Green
    } else {
        Write-Host "Windows Defender Real-time Protection is DISABLED" -ForegroundColor Red
    }
} catch {
    Write-Host "Could not check Windows Defender status" -ForegroundColor Red
}

Write-Host ""
Write-Host "Adding Windows Defender exclusions..." -ForegroundColor Yellow

# Add path exclusions
$successCount = 0
$failCount = 0

foreach ($path in $excludePaths) {
    try {
        Add-MpPreference -ExclusionPath $path -Force
        Write-Host "  ✓ Added path exclusion: $path" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "  ✗ Failed to add: $path" -ForegroundColor Red
        Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    }
}

# Optionally add file extension exclusions
Write-Host ""
$addExtensions = Read-Host "Do you want to add file extension exclusions? (y/n)"

if ($addExtensions -eq 'y' -or $addExtensions -eq 'Y') {
    Write-Host "Adding file extension exclusions..." -ForegroundColor Yellow
    
    foreach ($ext in $excludeExtensions) {
        try {
            Add-MpPreference -ExclusionExtension $ext.Replace("*.", "") -Force
            Write-Host "  ✓ Added extension exclusion: $ext" -ForegroundColor Green
            $successCount++
        } catch {
            Write-Host "  ✗ Failed to add: $ext" -ForegroundColor Red
            $failCount++
        }
    }
}

# Add process exclusions for development tools
Write-Host ""
Write-Host "Adding process exclusions for development tools..." -ForegroundColor Yellow

$processExclusions = @(
    "Code.exe",           # VS Code
    "platformio.exe",     # PlatformIO
    "pio.exe",           # PlatformIO CLI
    "gcc.exe",           # GCC Compiler
    "g++.exe",           # G++ Compiler
    "clang.exe",         # Clang Compiler
    "node.exe"           # Node.js (for extensions)
)

foreach ($process in $processExclusions) {
    try {
        Add-MpPreference -ExclusionProcess $process -Force
        Write-Host "  ✓ Added process exclusion: $process" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "  ✗ Failed to add process: $process" -ForegroundColor Red
        $failCount++
    }
}

# Display current exclusions
Write-Host ""
Write-Host "=== CURRENT WINDOWS DEFENDER EXCLUSIONS ===" -ForegroundColor Cyan
try {
    $preferences = Get-MpPreference
    
    Write-Host "Path Exclusions:" -ForegroundColor Yellow
    if ($preferences.ExclusionPath) {
        $preferences.ExclusionPath | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
    } else {
        Write-Host "  (None)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Extension Exclusions:" -ForegroundColor Yellow
    if ($preferences.ExclusionExtension) {
        $preferences.ExclusionExtension | ForEach-Object { Write-Host "  - *.$_" -ForegroundColor White }
    } else {
        Write-Host "  (None)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Process Exclusions:" -ForegroundColor Yellow
    if ($preferences.ExclusionProcess) {
        $preferences.ExclusionProcess | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
    } else {
        Write-Host "  (None)" -ForegroundColor Gray
    }
} catch {
    Write-Host "Could not retrieve current exclusions" -ForegroundColor Red
}

# Summary
Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "Successfully added: $successCount exclusions" -ForegroundColor Green
Write-Host "Failed to add: $failCount exclusions" -ForegroundColor Red

if ($failCount -eq 0) {
    Write-Host ""
    Write-Host "🎉 All exclusions added successfully!" -ForegroundColor Green
    Write-Host "Windows Defender should no longer interfere with your development files." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️  Some exclusions failed to add." -ForegroundColor Yellow
    Write-Host "This might be due to insufficient permissions or Windows Defender being managed by group policy." -ForegroundColor Yellow
}

# Create a batch file for easy re-running
try {
    $batchContent = '@echo off
echo Running Windows Defender exclusions configuration...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0windows_defender_exclusions.ps1"
pause'
    
    $batchContent | Out-File -FilePath "C:\Users\Yorstonw\windows_defender_exclusions.bat" -Encoding ASCII -Force
    Write-Host ""
    Write-Host "Created batch file: C:\Users\Yorstonw\windows_defender_exclusions.bat" -ForegroundColor Green
    Write-Host "You can run this anytime to reconfigure exclusions" -ForegroundColor Yellow
} catch {
    Write-Host "Could not create batch file" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== TESTING INSTRUCTIONS ===" -ForegroundColor Cyan
Write-Host "After configuring exclusions:" -ForegroundColor Yellow
Write-Host "1. Restart VS Code" -ForegroundColor White
Write-Host "2. Try creating a test file in your project" -ForegroundColor White
Write-Host "3. Check if compilation errors are resolved" -ForegroundColor White
Write-Host "4. If issues persist, try temporarily disabling real-time protection" -ForegroundColor White

Write-Host ""
Write-Host "Script completed! Press any key to exit..." -ForegroundColor Green
pause