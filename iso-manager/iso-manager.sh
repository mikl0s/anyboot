#!/usr/bin/env bash

# ISO Manager - A bash script for fetching and managing Linux distribution ISOs
# No Node.js required!

set -e

# Default configuration
DEFAULT_ISO_LIST_URL="https://raw.githubusercontent.com/mikl0s/iso-list/main/links.json"
OUTPUT_FORMAT="json"
MAX_RESULTS=100
SAVE_FILE="iso-list.json"
GIT_REPO="https://github.com/mikl0s/iso-list.git"
GIT_BRANCH="main"
AUTO_VERIFY_HASHES=true
HASH_ALGORITHM="sha256"
HASH_MATCH="{filename}.{hashAlgorithm}"

# Global variables
CONFIG_FILE="iso-manager.conf"
MODE=""
TARGET_URL=""
LIMIT=0
OUTPUT_JSON=false
SAVE_PATH=""
USE_GIT=false
VERIFY_HASH=false
HASH_MATCH=""
DOWNLOAD=false
TEST_MODE=false
DOWNLOAD_DIR="$(pwd)/downloads"

# Terminal colors
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
MAGENTA="\033[0;35m"
CYAN="\033[0;36m"
RESET="\033[0m"
BOLD="\033[1m"

# Check for required tools
check_requirements() {
  local missing_tools=()
  
  for tool in curl jq sed awk grep head tail; do
    if ! command -v "$tool" &> /dev/null; then
      missing_tools+=("$tool")
    fi
  done
  
  if [ ${#missing_tools[@]} -gt 0 ]; then
    echo -e "${RED}Error: The following required tools are missing:${RESET}"
    for tool in "${missing_tools[@]}"; do
      echo "  - $tool"
    done
    echo "Please install these tools and try again."
    exit 1
  fi
}

# Load configuration from file
load_config() {
  if [ -f "$CONFIG_FILE" ]; then
    echo "Loaded configuration from $CONFIG_FILE"
    # Use jq to parse the JSON configuration file
    if command -v jq &> /dev/null; then
      if [ -n "$(jq -r '.defaultIsoListUrl' "$CONFIG_FILE" 2>/dev/null)" ]; then
        DEFAULT_ISO_LIST_URL=$(jq -r '.defaultIsoListUrl' "$CONFIG_FILE")
      fi
      
      if [ -n "$(jq -r '.outputFormat' "$CONFIG_FILE" 2>/dev/null)" ]; then
        OUTPUT_FORMAT=$(jq -r '.outputFormat' "$CONFIG_FILE")
        if [ "$OUTPUT_FORMAT" = "json" ]; then
          OUTPUT_JSON=true
        fi
      fi
      
      if [ -n "$(jq -r '.maxResults' "$CONFIG_FILE" 2>/dev/null)" ]; then
        MAX_RESULTS=$(jq -r '.maxResults' "$CONFIG_FILE")
      fi
      
      if [ -n "$(jq -r '.saveFile' "$CONFIG_FILE" 2>/dev/null)" ]; then
        SAVE_FILE=$(jq -r '.saveFile' "$CONFIG_FILE")
      fi
      
      if [ -n "$(jq -r '.gitRepo' "$CONFIG_FILE" 2>/dev/null)" ]; then
        GIT_REPO=$(jq -r '.gitRepo' "$CONFIG_FILE")
      fi
      
      if [ -n "$(jq -r '.gitBranch' "$CONFIG_FILE" 2>/dev/null)" ]; then
        GIT_BRANCH=$(jq -r '.gitBranch' "$CONFIG_FILE")
      fi
      
      if [ -n "$(jq -r '.hashAlgorithm' "$CONFIG_FILE" 2>/dev/null)" ]; then
        HASH_ALGORITHM=$(jq -r '.hashAlgorithm' "$CONFIG_FILE")
      fi
      
      if [ -n "$(jq -r '.hashMatch' "$CONFIG_FILE" 2>/dev/null)" ]; then
        HASH_MATCH=$(jq -r '.hashMatch' "$CONFIG_FILE")
      fi
    else
      echo "Warning: jq is not installed. Cannot parse JSON configuration file."
    fi
  else
    # Set defaults
    DEFAULT_ISO_LIST_URL="https://raw.githubusercontent.com/mikl0s/iso-list/main/links.json"
    OUTPUT_FORMAT="json"
    MAX_RESULTS=100
    SAVE_FILE="iso-list.json"
    GIT_REPO="https://github.com/mikl0s/iso-list.git"
    GIT_BRANCH="main"
    HASH_ALGORITHM="sha256"
    HASH_MATCH="{filename}.{hashAlgorithm}"
  fi
}

# Show usage information
show_help() {
  echo -e "${BOLD}ISO Manager${RESET} - A tool for fetching and managing Linux distribution ISOs"
  echo ""
  echo "Usage:"
  echo "  ./iso-manager.sh [mode] [options]"
  echo ""
  echo -e "${BOLD}Modes:${RESET}"
  echo "  list            Fetch ISOs from a predefined JSON list"
  echo "  verify          Verify and update ISO hashes"
  echo "  download        Download an ISO file"
  echo ""
  echo -e "${BOLD}Options:${RESET}"
  echo "  -u, --url URL         Target URL to fetch data from"
  echo "  -l, --limit N         Limit the number of results"
  echo "  -j, --json            Output in JSON format"
  echo "  -s, --save PATH       Save the results to a file"
  echo "  -g, --git             Auto-commit and push changes to GitHub"
  echo "  -v, --verify          Verify ISO hashes"
  echo "  --hash-match PATTERN  Pattern for finding hash files (default: '{filename}.{hashAlgorithm}')"
  echo "  -d, --download        Download an ISO file"
  echo "  -t, --test            Test mode - delete file after verification"
  echo "  --download-dir DIR    Directory to save downloaded files (default: ./downloads)"
  echo "  -h, --help            Show this help message"
  echo ""
  echo -e "${BOLD}Examples:${RESET}"
  echo "  ./iso-manager.sh list --url https://example.com/isos.json --save list.json"
  echo "  ./iso-manager.sh verify -g"
  echo "  ./iso-manager.sh download --test"
  exit 0
}

# Parse command line arguments
parse_args() {
  # If no arguments, show help
  if [ $# -eq 0 ]; then
    show_help
  fi
  
  # Check if first argument is a mode
  if [[ ! "$1" =~ ^- ]]; then
    MODE="$1"
    shift
  fi
  
  # Parse options
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -u|--url)
        TARGET_URL="$2"
        shift 2
        ;;
      -l|--limit)
        LIMIT="$2"
        shift 2
        ;;
      -j|--json)
        OUTPUT_JSON=true
        shift
        ;;
      -s|--save)
        SAVE_PATH="$2"
        shift 2
        ;;
      -g|--git)
        USE_GIT=true
        shift
        ;;
      -v|--verify)
        VERIFY_HASH=true
        shift
        ;;
      --hash-match)
        HASH_MATCH="$2"
        shift 2
        ;;
      -d|--download)
        DOWNLOAD=true
        shift
        ;;
      -t|--test)
        TEST_MODE=true
        shift
        ;;
      --download-dir)
        DOWNLOAD_DIR="$2"
        shift 2
        ;;
      -h|--help)
        show_help
        ;;
      *)
        echo "Unknown option: $1"
        show_help
        ;;
    esac
  done
  
  # Set default mode to 'list' if not specified
  if [ -z "$MODE" ]; then
    MODE="list"
  fi
}

# Fetch data from URL
fetch_data() {
  local url="$1"
  
  # Use curl to fetch data
  if ! curl -s -L "$url"; then
    echo "Error: Failed to fetch data from $url" >&2
    exit 1
  fi
}

# Fetch ISO list from JSON URL
fetch_iso_list() {
  local url="$1"
  local json_data
  
  json_data=$(fetch_data "$url")
  
  # Check if the response is valid JSON
  if ! echo "$json_data" | jq . > /dev/null 2>&1; then
    echo "Error: Invalid JSON response from $url" >&2
    exit 1
  fi
  
  # Process JSON data
  echo "$json_data" | jq -c '.[]' | while IFS= read -r iso; do
    local name=$(echo "$iso" | jq -r '.name')
    local url=$(echo "$iso" | jq -r '.url')
    local hash=$(echo "$iso" | jq -r '.hash // ""')
    local type=$(echo "$iso" | jq -r '.type // "unknown"')
    
    # If type is unknown, try to detect it
    if [ "$type" = "unknown" ]; then
      type=$(detect_distro_type "$name")
    fi
    
    # Output as JSON or text
    if [ "$OUTPUT_JSON" = true ]; then
      echo "$iso" | jq '.' 
    else
      echo "Name: $name"
      echo "URL: $url"
      echo "Hash: $hash"
      echo "Type: $type"
      echo ""
    fi
  done
}

# Format file size in human-readable format
format_size() {
  local size=$1
  local suffixes=("B" "KB" "MB" "GB" "TB")
  local i=0
  
  while (( size > 1024 && i < ${#suffixes[@]}-1 )); do
    size=$(( size / 1024 ))
    ((i++))
  done
  
  echo "$size ${suffixes[$i]}"
}

# Estimate ISO file size based on name and type
estimate_iso_size() {
  local name=$1
  local type=$2
  local size=0
  
  case "$type" in
    "ubuntu"|"debian"|"fedora"|"opensuse")
      if [[ "$name" == *"dvd"* || "$name" == *"DVD"* ]]; then
        size=$((4*1024*1024*1024)) # 4GB
      elif [[ "$name" == *"desktop"* || "$name" == *"live"* ]]; then
        size=$((2*1024*1024*1024)) # 2GB
      elif [[ "$name" == *"server"* || "$name" == *"minimal"* ]]; then
        size=$((1*1024*1024*1024)) # 1GB
      else
        size=$((3*1024*1024*1024)) # 3GB default
      fi
      ;;
    "arch"|"alpine"|"void"|"gentoo")
      if [[ "$name" == *"minimal"* ]]; then
        size=$((600*1024*1024)) # 600MB
      else
        size=$((1*1024*1024*1024)) # 1GB
      fi
      ;;
    *)
      size=$((2*1024*1024*1024)) # 2GB default
      ;;
  esac
  
  echo "$size"
}

# Format time in human-readable format
format_time() {
  local seconds=$1
  local minutes=$(( seconds / 60 ))
  local hours=$(( minutes / 60 ))
  seconds=$(( seconds % 60 ))
  minutes=$(( minutes % 60 ))
  
  if [ $hours -gt 0 ]; then
    printf "%02d:%02d:%02d" $hours $minutes $seconds
  else
    printf "%02d:%02d" $minutes $seconds
  fi
}

# Calculate hash of a file
calculate_hash() {
  local file=$1
  local algorithm=${2:-sha256}
  local hash=""
  
  case "$algorithm" in
    md5)
      if command -v md5sum &> /dev/null; then
        hash=$(md5sum "$file" | awk '{print $1}')
      elif command -v md5 &> /dev/null; then
        # macOS uses md5 instead of md5sum
        hash=$(md5 -q "$file")
      else
        echo "Error: No MD5 command available" >&2
        return 1
      fi
      ;;
    sha1)
      hash=$(sha1sum "$file" | awk '{print $1}')
      ;;
    sha256)
      hash=$(sha256sum "$file" | awk '{print $1}')
      ;;
    sha512)
      hash=$(sha512sum "$file" | awk '{print $1}')
      ;;
    *)
      echo "Error: Unsupported hash algorithm: $algorithm" >&2
      return 1
      ;;
  esac
  
  echo "$hash"
}

# Display a list of ISOs and let the user select one
select_iso() {
  local iso_list="$1"
  local counter=1
  local iso_array=()
  
  # Convert the ISO list to an array
  while IFS= read -r iso; do
    iso_array+=("$iso")
    local name=$(echo "$iso" | jq -r '.name')
    local type=$(echo "$iso" | jq -r '.type // "unknown"')
    
    # Get size estimate
    local size=$(estimate_iso_size "$name" "$type")
    local formatted_size=$(format_size "$size")
    
    echo "$counter) $name ($formatted_size)"
    ((counter++))
  done <<< "$(echo "$iso_list" | jq -c '.[]')"
  
  # Ask user to select an ISO
  echo ""
  echo -n "Enter the number of the ISO to download (1-$((counter-1))): "
  read selection
  
  # Validate selection
  if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -ge "$counter" ]; then
    echo "Invalid selection"
    return 1
  fi
  
  # Return the selected ISO
  echo "${iso_array[$((selection-1))]}"
}

# Download a file with progress bar and verify hash
download_and_verify_file() {
  local url=$1
  local output_file=$2
  local expected_hash=$3
  local hash_algorithm=${4:-sha256}
  local start_time=$(date +%s)
  local total_size=0
  local downloaded=0
  local percentage=0
  local speed=0
  local eta="--:--"
  
  # Get filename from URL if not specified
  if [ -z "$output_file" ]; then
    output_file=$(basename "$url")
  fi
  
  # Create parent directory if it doesn't exist
  mkdir -p "$(dirname "$output_file")"
  
  echo "Downloading $url to $output_file"
  
  # Check if curl supports progress bar
  if curl --help | grep -q '\--progress-bar'; then
    # Use curl with progress bar and write to file
    curl -L -o "$output_file" --progress-bar "$url"
  else
    # Fallback for systems without progress bar support
    curl -L -o "$output_file" "$url"
  fi
  
  if [ $? -ne 0 ]; then
    echo "Error: Failed to download $url"
    return 1
  fi
  
  echo "Download completed in $(format_time $(($(date +%s) - start_time)))"
  
  # Calculate hash of downloaded file
  echo "Calculating $hash_algorithm hash..."
  local actual_hash=$(calculate_hash "$output_file" "$hash_algorithm")
  
  # Verify hash if expected hash is provided
  if [ -n "$expected_hash" ]; then
    echo "Expected hash: $expected_hash"
    echo "Actual hash:   $actual_hash"
    
    if [ "$actual_hash" = "$expected_hash" ]; then
      echo -e "${GREEN}✓ Hash verification successful${RESET}"
      return 0
    else
      echo -e "${RED}✗ Hash verification failed${RESET}"
      return 1
    fi
  else
    echo "No expected hash provided. Actual hash: $actual_hash"
    return 0
  fi
}

# Download an ISO file
download_iso() {
  local iso_list="$1"
  local download_dir="$2"
  local test_mode="$3"
  local selected_iso
  
  # Select ISO to download
  selected_iso=$(select_iso "$iso_list")
  
  if [ -z "$selected_iso" ]; then
    echo "No ISO selected"
    return 1
  fi
  
  # Extract ISO information
  local name=$(echo "$selected_iso" | jq -r '.name')
  local url=$(echo "$selected_iso" | jq -r '.url')
  local hash=$(echo "$selected_iso" | jq -r '.hash // ""')
  local hash_algorithm=${HASH_ALGORITHM:-sha256}
  
  # Create output filename
  local output_file="$download_dir/$(basename "$url")"
  
  # Download and verify the file
  download_and_verify_file "$url" "$output_file" "$hash" "$hash_algorithm"
  local result=$?
  
  # If test mode is enabled, delete the file after verification
  if [ "$test_mode" = true ] && [ -f "$output_file" ]; then
    echo "Test mode: Deleting downloaded file"
    rm "$output_file"
  fi
  
  return $result
}

# Run git operations
git_operations() {
  local repo_dir="$1"
  local file="$2"
  local message="$3"
  local branch=${4:-main}
  
  # Ensure we're in the git repo directory
  cd "$repo_dir"
  
  # Initialize git repo if not already initialized
  if [ ! -d ".git" ]; then
    echo "Initializing git repository..."
    git init
    git branch -m "$branch"
  fi
  
  # Check if remote origin exists
  if ! git remote | grep -q "^origin$"; then
    echo "Adding remote origin..."
    git remote add origin "$GIT_REPO"
  fi
  
  # Add the file to git
  git add "$file"
  
  # Commit the changes
  git commit -m "$message"
  
  # Push to remote
  echo "Pushing changes to remote repository..."
  if git push origin "$branch"; then
    echo -e "${GREEN}✓ Changes pushed to remote repository${RESET}"
  else
    echo -e "${RED}✗ Failed to push changes to remote repository${RESET}"
    echo "You may need to set up SSH keys or credentials for your git repository."
    return 1
  fi
  
  return 0
}

# Output results
output_results() {
  local data="$1"
  local format=${2:-json}
  local save_path="$3"
  local use_git="$4"
  
  # Output the results
  if [ "$format" = "json" ]; then
    # Pretty print JSON
    formatted_data=$(echo "$data" | jq -s '.')
    
    # Save to file if specified
    if [ -n "$save_path" ]; then
      echo "$formatted_data" > "$save_path"
      echo "Results saved to $save_path"
      
      # Commit and push to git if specified
      if [ "$use_git" = true ]; then
        local repo_dir=$(dirname "$save_path")
        local file=$(basename "$save_path")
        local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
        local message="Update ISO list - $timestamp"
        
        if git_operations "$repo_dir" "$file" "$message" "$GIT_BRANCH"; then
          echo "Git operations completed successfully"
        else
          echo "Git operations failed"
        fi
      fi
    else
      # Print to stdout
      echo "$formatted_data"
    fi
  else
    # Output as plain text
    if [ -n "$save_path" ]; then
      # Save to file
      echo "$data" > "$save_path"
      echo "Results saved to $save_path"
    else
      # Print to stdout
      echo "$data"
    fi
  fi
}

# Main function
main() {
  # Check for required tools
  check_requirements
  
  # Load configuration
  load_config
  
  # Parse command line arguments
  parse_args "$@"
  
  # Set default URL if not specified
  if [ -z "$TARGET_URL" ]; then
    if [ "$MODE" = "list" ]; then
      TARGET_URL="$DEFAULT_ISO_LIST_URL"
    fi
  fi
  
  # Process based on mode
  case "$MODE" in
    "list")
      if [ -z "$TARGET_URL" ]; then
        echo "Error: No target URL specified"
        exit 1
      fi
      
      echo "Fetching ISO list from $TARGET_URL"
      result=$(fetch_iso_list "$TARGET_URL")
      
      # Output results
      output_results "$result" "$OUTPUT_FORMAT" "$SAVE_PATH" "$USE_GIT"
      ;;
    
    "verify")
      echo "Verifying ISO hashes..."
      # Implementation pending
      ;;
    
    "download")
      # Ensure download directory exists
      mkdir -p "$DOWNLOAD_DIR"
      
      # Fetch ISO list
      if [ -z "$TARGET_URL" ]; then
        TARGET_URL="$DEFAULT_ISO_LIST_URL"
      fi
      
      echo "Fetching ISO list from $TARGET_URL"
      iso_list=$(fetch_data "$TARGET_URL")
      
      # Download selected ISO
      download_iso "$iso_list" "$DOWNLOAD_DIR" "$TEST_MODE"
      ;;
    
    *)
      echo "Error: Unknown mode '$MODE'"
      show_help
      ;;
  esac
}

# Run the main function with all arguments
main "$@"
