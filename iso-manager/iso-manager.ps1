<#
.SYNOPSIS
    ISO Manager - A PowerShell script for managing ISO images
.DESCRIPTION
    This script provides functions for downloading ISO images with hash verification
    and no Node.js dependency.
.NOTES
    File Name      : iso-manager.ps1
    Author         : AnyBoot Project
    Prerequisite   : PowerShell 5.1 or later
.EXAMPLE
    .\iso-manager.ps1 download -Test
#>

# Default configuration
$DefaultConfig = @{
    DefaultIsoListUrl  = "https://raw.githubusercontent.com/mikl0s/iso-list/main/links.json"
    OutputFormat       = "json"
    MaxResults         = 100
    SaveFile           = "iso-list.json"
    GitRepo            = "https://github.com/mikl0s/iso-list.git"
    GitBranch          = "main"
    AutoVerifyHashes   = $true
    HashAlgorithm      = "sha256"
    HashMatch          = "{filename}.{hashAlgorithm}"
}

# Global variables
$ConfigFile = "iso-manager.conf"
$Mode = ""
$TargetUrl = ""
$Limit = 0
$OutputJson = $false
$SavePath = ""
$UseGit = $false
$VerifyHash = $false
$HashMatch = ""
$Download = $false
$TestMode = $false
$DownloadDir = Join-Path $PWD "downloads"

# Function to check required modules
function Test-Requirements {
    $missingModules = @()
    
    if (-not (Get-Command ConvertFrom-Json -ErrorAction SilentlyContinue)) {
        $missingModules += "PowerShell 3.0+ for ConvertFrom-Json"
    }
    
    if ($missingModules.Count -gt 0) {
        Write-Host "Error: The following required modules are missing:" -ForegroundColor Red
        foreach ($module in $missingModules) {
            Write-Host "  - $module" -ForegroundColor Red
        }
        Write-Host "Please install these modules and try again."
        exit 1
    }
}

# Function to load configuration
function Get-IsoConfig {
    if (Test-Path $ConfigFile) {
        Write-Host "Loaded configuration from $ConfigFile"
        try {
            $config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
            
            # Set configuration values from file
            if ($config.defaultIsoListUrl) { $script:DefaultIsoListUrl = $config.defaultIsoListUrl }
            if ($config.outputFormat) { 
                $script:OutputFormat = $config.outputFormat 
                if ($OutputFormat -eq "json") { $script:OutputJson = $true }
            }
            if ($config.maxResults) { $script:Limit = $config.maxResults }
            if ($config.saveFile) { $script:SavePath = $config.saveFile }
            if ($config.gitRepo) { $script:GitRepo = $config.gitRepo }
            if ($config.gitBranch) { $script:GitBranch = $config.gitBranch }
            if ($config.hashAlgorithm) { $script:HashAlgorithm = $config.hashAlgorithm }
            if ($config.hashMatch) { $script:HashMatch = $config.hashMatch }
        }
        catch {
            Write-Host "Warning: Failed to parse JSON configuration file." -ForegroundColor Yellow
            Write-Host $_.Exception.Message -ForegroundColor Yellow
        }
    }
    else {
        # Set defaults
        $script:DefaultIsoListUrl = $DefaultConfig.DefaultIsoListUrl
        $script:OutputFormat = $DefaultConfig.OutputFormat
        $script:Limit = $DefaultConfig.MaxResults
        $script:SavePath = $DefaultConfig.SaveFile
        $script:GitRepo = $DefaultConfig.GitRepo
        $script:GitBranch = $DefaultConfig.GitBranch
        $script:HashAlgorithm = $DefaultConfig.HashAlgorithm
        $script:HashMatch = $DefaultConfig.HashMatch
    }
}

# Function to show help and usage information
function Show-Help {
    Write-Host "ISO Manager - A tool for fetching and managing Linux distribution ISOs" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor White
    Write-Host "  .\iso-manager.ps1 [mode] [options]"
    Write-Host ""
    Write-Host "Modes:" -ForegroundColor Cyan
    Write-Host "  list            Fetch ISOs from a predefined JSON list"
    Write-Host "  verify          Verify and update ISO hashes"
    Write-Host "  download        Download an ISO file"
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "  -Url URL            Target URL to fetch data from"
    Write-Host "  -Limit N            Limit the number of results"
    Write-Host "  -Json               Output in JSON format"
    Write-Host "  -Save PATH          Save the results to a file"
    Write-Host "  -Git                Auto-commit and push changes to GitHub"
    Write-Host "  -Verify             Verify ISO hashes"
    Write-Host "  -HashMatch PATTERN  Pattern for finding hash files (default: '{filename}.{hashAlgorithm}')"
    Write-Host "  -Download           Download an ISO file"
    Write-Host "  -Test               Test mode - delete file after verification"
    Write-Host "  -DownloadDir DIR    Directory to save downloaded files (default: .\downloads)"
    Write-Host "  -Help               Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Cyan
    Write-Host "  .\iso-manager.ps1 list -Limit 10 -Json"
    Write-Host "  .\iso-manager.ps1 list -Url https://example.com/isos.json -Save list.json"
    Write-Host "  .\iso-manager.ps1 verify -Git"
    Write-Host "  .\iso-manager.ps1 download -Test"
    exit 0
}

# Function to parse arguments
function Parse-Arguments {
    param (
        [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
        [string[]]$Arguments
    )
    
    # If no arguments, show help
    if ($Arguments.Count -eq 0) {
        Show-Help
    }
    
    # Check if first argument is a mode
    if ($Arguments[0] -notmatch '^-') {
        $script:Mode = $Arguments[0]
        $Arguments = $Arguments[1..($Arguments.Count - 1)]
    }
    
    # Parse named parameters
    for ($i = 0; $i -lt $Arguments.Count; $i++) {
        switch ($Arguments[$i]) {
            { $_ -in '-Url', '-url' } {
                $script:TargetUrl = $Arguments[++$i]
            }
            { $_ -in '-Limit', '-limit' } {
                $script:Limit = [int]$Arguments[++$i]
            }
            { $_ -in '-Json', '-json' } {
                $script:OutputJson = $true
            }
            { $_ -in '-Save', '-save' } {
                $script:SavePath = $Arguments[++$i]
            }
            { $_ -in '-Git', '-git' } {
                $script:UseGit = $true
            }
            { $_ -in '-Verify', '-verify' } {
                $script:VerifyHash = $true
            }
            { $_ -in '-HashMatch', '-hashmatch' } {
                $script:HashMatch = $Arguments[++$i]
            }
            { $_ -in '-Download', '-download' } {
                $script:Download = $true
            }
            { $_ -in '-Test', '-test' } {
                $script:TestMode = $true
            }
            { $_ -in '-DownloadDir', '-downloaddir' } {
                $script:DownloadDir = $Arguments[++$i]
            }
            { $_ -in '-Help', '-help', '/?', '-?' } {
                Show-Help
            }
            default {
                if ($Arguments[$i] -match '^-') {
                    Write-Host "Unknown option: $($Arguments[$i])" -ForegroundColor Red
                    Show-Help
                }
            }
        }
    }
    
    # Set default mode to 'list' if not specified
    if (-not $script:Mode) {
        $script:Mode = "list"
    }
}

# Function to fetch data from URL
function Get-WebData {
    param (
        [string]$Url
    )
    
    try {
        # Use TLS 1.2 for secure connections
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        
        # Create web client with browser user agent
        $webClient = New-Object System.Net.WebClient
        $webClient.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
        
        # Download data
        $data = $webClient.DownloadString($Url)
        return $data
    }
    catch {
        Write-Host "Error: Failed to fetch data from $Url" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        exit 1
    }
}

# Function to fetch ISO list
function Get-IsoList {
    param (
        [string]$Url
    )
    
    Write-Host "Fetching ISO list from: $Url" -ForegroundColor Blue
    
    $data = Get-WebData -Url $Url
    $jsonData = $data | ConvertFrom-Json
    
    Write-Host "JSON data type: $($jsonData.GetType().Name)"
    
    if ($jsonData -is [System.Collections.IDictionary] -or $jsonData.PSObject.Properties.Count -gt 0) {
        $keyCount = if ($jsonData -is [System.Collections.IDictionary]) { $jsonData.Count } else { $jsonData.PSObject.Properties.Count }
        Write-Host "Object with $keyCount keys"
        
        # Convert to array of ISO objects
        $isoList = @()
        $index = 1
        
        # Process each key-value pair
        foreach ($prop in $jsonData.PSObject.Properties) {
            $name = $prop.Name
            $value = $prop.Value
            
            # Determine if the value is a string or object
            if ($value -is [string]) {
                $iso = @{
                    rank = $index
                    name = $name
                    link = $value
                    hash = ""
                    hashAlgorithm = "sha256"
                    lastVerified = ""
                    verified = $false
                }
            }
            else {
                # Handle the object case
                $iso = @{
                    rank = $index
                    name = $name
                    link = if ($value.url) { $value.url } elseif ($value.link) { $value.link } else { "" }
                    hash = if ($value.hash_value) { $value.hash_value } elseif ($value.hash) { $value.hash } else { "" }
                    hashAlgorithm = if ($value.hash_type) { $value.hash_type.ToLower() } elseif ($value.hashAlgorithm) { $value.hashAlgorithm.ToLower() } else { "sha256" }
                    lastVerified = if ($value.lastVerified) { $value.lastVerified } else { Get-Date -Format "o" }
                    verified = $true
                }
            }
            
            $isoList += [PSCustomObject]$iso
            $index++
        }
        
        return $isoList
    }
    else {
        Write-Host "Error: Invalid JSON data format" -ForegroundColor Red
        exit 1
    }
}

# Function to format file size
function Format-Size {
    param (
        [long]$Bytes
    )
    
    $sizes = "B", "KB", "MB", "GB", "TB"
    $order = 0
    $size = $Bytes
    
    while ($size -ge 1KB -and $order -lt 4) {
        $order++
        $size = $size / 1KB
    }
    
    "{0:N2} {1}" -f $size, $sizes[$order]
}

# Function to estimate ISO size based on name
function Get-EstimatedSize {
    param (
        [string]$Name,
        [string]$Type
    )
    
    # Convert name to lowercase for comparison
    $nameLower = $Name.ToLower()
    
    # Rough estimates based on common ISO sizes
    if ($nameLower -match "netinst|minimal") {
        return 400MB # ~400 MB
    }
    elseif ($nameLower -match "server") {
        return 1.2GB # ~1.2 GB
    }
    elseif ($nameLower -match "boot|bootonly") {
        return 300MB # ~300 MB
    }
    elseif ($Type -eq "debian") {
        return 700MB # ~700 MB
    }
    elseif ($Type -eq "ubuntu") {
        return 3GB # ~3 GB
    }
    elseif ($Type -eq "mint") {
        return 2.5GB # ~2.5 GB
    }
    else {
        return 2GB # ~2 GB
    }
}

# Function to format time
function Format-Time {
    param (
        [int]$Seconds
    )
    
    if ($Seconds -lt 60) {
        return "{0}s" -f $Seconds
    }
    elseif ($Seconds -lt 3600) {
        return "{0}m {1}s" -f [math]::Floor($Seconds / 60), ($Seconds % 60)
    }
    else {
        return "{0}h {1}m" -f [math]::Floor($Seconds / 3600), [math]::Floor(($Seconds % 3600) / 60)
    }
}

# Function to calculate hash of a file
function Get-FileHash {
    param (
        [string]$FilePath,
        [string]$Algorithm
    )
    
    if (-not (Test-Path $FilePath)) {
        return ""
    }
    
    try {
        $hash = (Microsoft.PowerShell.Utility\Get-FileHash -Path $FilePath -Algorithm $Algorithm).Hash.ToLower()
        return $hash
    }
    catch {
        Write-Host "Error calculating hash for ${FilePath}: $($_.Exception.Message)" -ForegroundColor Red
        return ""
    }
}

# Function to display progress during file download
function Write-ProgressBar {
    param (
        [long]$BytesTransferred,
        [long]$TotalBytes
    )
    
    $percent = if ($TotalBytes -gt 0) { ($BytesTransferred / $TotalBytes) * 100 } else { 0 }
    $barWidth = 50
    $completed = [math]::Floor($percent / 100 * $barWidth)
    $remaining = $barWidth - $completed
    
    $progressBar = "[" + ("=".PadRight($completed, "=")) + (" ".PadRight($remaining, " ")) + "]"
    $formatted = "{0,3:N0}% {1} {2}/{3}" -f $percent, $progressBar, (Format-Size $BytesTransferred), (Format-Size $TotalBytes)
    
    Write-Host "\r$formatted" -NoNewline
}

# Function to let user select an ISO to download
function Select-Iso {
    param (
        [array]$IsoList
    )
    
    Write-Host ""
    Write-Host "Available ISOs to download:" -ForegroundColor Cyan
    Write-Host ""
    
    for ($i = 0; $i -lt $IsoList.Count; $i++) {
        $name = $IsoList[$i].name
        $type = if ($IsoList[$i].type) { $IsoList[$i].type } else { "unknown" }
        $size = Get-EstimatedSize -Name $name -Type $type
        $sizeFormatted = Format-Size -Bytes $size
        Write-Host "$($i + 1). $name ($sizeFormatted)" -ForegroundColor Cyan
    }
    
    $selectedIndex = 0
    while ($selectedIndex -lt 1 -or $selectedIndex -gt $IsoList.Count) {
        Write-Host ""
        Write-Host "Select an ISO to download (1-$($IsoList.Count)):" -NoNewline
        try {
            $selectedIndex = [int](Read-Host " ")
            
            if ($selectedIndex -lt 1 -or $selectedIndex -gt $IsoList.Count) {
                Write-Host "Please enter a number between 1 and $($IsoList.Count)" -ForegroundColor Red
                $selectedIndex = 0
            }
        }
        catch {
            Write-Host "Please enter a valid number" -ForegroundColor Red
            $selectedIndex = 0
        }
    }
    
    return $IsoList[$selectedIndex - 1]
}

# Main script
Parse-Arguments -Arguments $args

switch ($Mode) {
    "list" {
        # Fetch ISO list
        $isoList = Get-IsoList -Url $TargetUrl
        
        # Process ISO list
        # ...
    }
    "verify" {
        # Verify ISO hashes
        # ...
    }
    "download" {
        # Download ISO
        # ...
    }
    default {
        Write-Host "Unknown mode: $Mode" -ForegroundColor Red
        exit 1
    }
}
