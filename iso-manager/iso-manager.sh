#!/usr/bin/env bash

# ISO Manager - A bash script for fetching and managing Linux distribution ISOs
# No Node.js required!

set -e

# Import utility functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/iso-manager-utils.sh"

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
DEFAULT_DOWNLOAD_DIR="ISO-Archive"

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
DOWNLOAD_DIR="$(pwd)/${DEFAULT_DOWNLOAD_DIR}"

# Show usage information
show_help() {
  echo -e "${CYAN}ISO Manager - A tool for fetching and managing Linux distribution ISOs${RESET}"
  echo ""
  echo -e "${BOLD}Usage:${RESET}"
  echo "  $0 [mode] [options]"
  echo ""
  echo -e "${BOLD}Modes:${RESET}"
  echo "  list            List available ISOs"
  echo "  verify          Verify downloaded ISOs against hashes"
  echo "  download        Download an ISO file"
  echo ""
  echo -e "${BOLD}Options:${RESET}"
  echo "  -u, --url URL      URL to fetch ISO list from"
  echo "  -l, --limit N      Limit output to N results"
  echo "  -j, --json         Output in JSON format"
  echo "  -s, --save FILE    Save output to FILE"
  echo "  -g, --git          Auto-commit and push changes to Git"
  echo "  -v, --verify       Verify ISO hashes"
  echo "  --hash-alg ALGO    Hash algorithm (md5, sha1, sha256, sha512)"
  echo "  --hash-match PATTERN  Pattern for finding hash files (default: '{filename}.{hashAlgorithm}')"
  echo "  -d, --download        Download an ISO file"
  echo "  -t, --test            Test mode - delete file after verification"
  echo "  --download-dir DIR    Directory to save downloaded files (default: ./ISO-Archive)"
  echo "  -h, --help            Show this help message"
  echo ""
  echo -e "${BOLD}Examples:${RESET}"
  echo "  $0 list --url https://example.com/isos.json --limit 5"
  echo "  $0 verify --hash-alg sha256"
  echo "  $0 download --download-dir ./isos"
}

# Parse command line arguments
parse_args() {
  if [ $# -eq 0 ]; then
    show_help
    exit 0
  fi
  
  # Parse mode
  case "$1" in
    "list"|"verify"|"download")
      MODE="$1"
      shift
      ;;
    "-h"|"--help")
      show_help
      exit 0
      ;;
  esac
  
  # Parse options
  while [ $# -gt 0 ]; do
    case "$1" in
      "-u"|"--url")
        TARGET_URL="$2"
        shift 2
        ;;
      "-l"|"--limit")
        LIMIT="$2"
        shift 2
        ;;
      "-j"|"--json")
        OUTPUT_JSON=true
        shift
        ;;
      "-s"|"--save")
        SAVE_PATH="$2"
        shift 2
        ;;
      "-g"|"--git")
        USE_GIT=true
        shift
        ;;
      "-v"|"--verify")
        VERIFY_HASH=true
        shift
        ;;
      "--hash-alg")
        HASH_ALGORITHM="$2"
        shift 2
        ;;
      "--hash-match")
        HASH_MATCH="$2"
        shift 2
        ;;
      "-d"|"--download")
        DOWNLOAD=true
        shift
        ;;
      "-t"|"--test")
        TEST_MODE=true
        shift
        ;;
      "--download-dir")
        DOWNLOAD_DIR="$2"
        shift 2
        ;;
      *)
        echo -e "${RED}Unknown option: $1${RESET}"
        exit 1
        ;;
    esac
  done
}

# Fetch ISO list from JSON URL
fetch_iso_list() {
  local url="$1"
  local iso_data
  
  echo "Fetching ISO list from: $url"
  
  iso_data=$(fetch_data "$url")
  local exit_code=$?
  
  if [ $exit_code -ne 0 ] || [ -z "$iso_data" ]; then
    echo -e "${RED}Error: Failed to fetch ISO list${RESET}"
    return 1
  fi
  
  # Parse JSON data
  if ! echo "$iso_data" | jq '.' &>/dev/null; then
    echo -e "${RED}Error: Invalid JSON data${RESET}"
    return 1
  fi
  
  # Process ISO list
  local isos=$(echo "$iso_data" | jq -c '.links[]')
  
  # Add size estimates if missing
  local processed_isos="[]"
  
  while read -r iso; do
    local name=$(echo "$iso" | jq -r '.name')
    local link=$(echo "$iso" | jq -r '.link')
    local type=$(echo "$iso" | jq -r '.osType // "unknown"')
    local hash=$(echo "$iso" | jq -r '.hash // ""')
    local hash_algorithm=$(echo "$iso" | jq -r '.hashAlgorithm // ""')
    local size=$(echo "$iso" | jq -r '.size // 0')
    
    if [ "$size" = "0" ] || [ "$size" = "null" ]; then
      size=$(estimate_iso_size "$name" "$type")
    fi
    
    # Create processed ISO entry
    processed_iso='{"name":"'"$name"'","link":"'"$link"'","osType":"'"$type"'","size":'"$size"',"prettySize":"'"$(format_size $size)"'"'
    
    if [ -n "$hash" ]; then
      processed_iso="$processed_iso"',"hash":"'"$hash"'"'
    fi
    
    if [ -n "$hash_algorithm" ]; then
      processed_iso="$processed_iso"',"hashAlgorithm":"'"$hash_algorithm"'"'
    fi
    
    processed_iso="$processed_iso"'}'
    
    processed_isos=$(echo "$processed_isos" | jq '. += ['"$processed_iso"']')
  done <<< "$isos"
  
  echo "$processed_isos"
}

# Select an ISO from a list
select_iso() {
  local iso_list="$1"
  local count=$(echo "$iso_list" | jq '. | length')
  
  if [ "$count" -eq 0 ]; then
    echo -e "${RED}Error: No ISOs found in the list${RESET}" >&2
    return 1
  fi
  
  echo -e "\n${CYAN}Available ISOs to download:${RESET}"
  echo ""
  
  # Display ISO list
  for i in $(seq 0 $((count - 1))); do
    local iso=$(echo "$iso_list" | jq -r ".[$i]")
    local name=$(echo "$iso" | jq -r '.name')
    local size_str=$(echo "$iso" | jq -r '.prettySize')
    
    echo -e "$((i + 1)). ${CYAN}$name${RESET} ($size_str)"
  done
  
  # Let user select an ISO
  local selection=0
  while [ "$selection" -lt 1 ] || [ "$selection" -gt "$count" ]; do
    echo -en "\nSelect an ISO to download (1-$count): "
    read -r selection
    
    if [[ ! "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt "$count" ]; then
      echo -e "${RED}Invalid selection. Please enter a number between 1 and $count.${RESET}"
      selection=0
    fi
  done
  
  # Return the selected ISO
  echo "$iso_list" | jq -r ".[$((selection - 1))]"
}

# Download an ISO file
download_iso() {
  local iso_list="$1"
  local download_dir="$2"
  local test_mode="$3"
  local selected_iso
  
  # Create download directory if it doesn't exist
  if [ ! -d "$download_dir" ]; then
    mkdir -p "$download_dir"
    echo -e "${GREEN}Created download directory: $download_dir${RESET}"
  fi
  
  # Select ISO to download
  selected_iso=$(select_iso "$iso_list")
  
  if [ -z "$selected_iso" ]; then
    echo "No ISO selected"
    return 1
  fi
  
  # Extract ISO information
  local name=$(echo "$selected_iso" | jq -r '.name')
  local url=$(echo "$selected_iso" | jq -r '.link')
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

# Output results
output_results() {
  local iso_list="$1"
  local limit="$2"
  local output_json="$3"
  local save_path="$4"
  
  if [ "$limit" -gt 0 ]; then
    iso_list=$(echo "$iso_list" | jq ". | sort_by(.name) | .[0:$limit]")
  else
    iso_list=$(echo "$iso_list" | jq ". | sort_by(.name)")
  fi
  
  # Create formatted output
  if [ "$output_json" = true ]; then
    formatted_output='{"links":'
    formatted_output+="$iso_list"
    formatted_output+='}'
    
    # Pretty print for terminal output
    if [ -z "$save_path" ]; then
      echo "$formatted_output" | jq .
    else
      echo "$formatted_output" | jq . > "$save_path"
      echo -e "${GREEN}Saved ISO list to: $save_path${RESET}"
    fi
  else
    # Text format
    local count=$(echo "$iso_list" | jq '. | length')
    echo -e "\n${CYAN}Found $count ISO images:${RESET}\n"
    
    for i in $(seq 0 $((count - 1))); do
      local iso=$(echo "$iso_list" | jq -r ".[$i]")
      local name=$(echo "$iso" | jq -r '.name')
      local link=$(echo "$iso" | jq -r '.link')
      local type=$(echo "$iso" | jq -r '.osType')
      local size_str=$(echo "$iso" | jq -r '.prettySize')
      
      echo -e "${BOLD}${CYAN}$name${RESET} (${MAGENTA}$type${RESET}, ${YELLOW}$size_str${RESET})"
      echo -e "  ${BLUE}$link${RESET}\n"
    done
    
    if [ -n "$save_path" ]; then
      # Save as JSON anyway for machine readability
      formatted_output='{"links":'
      formatted_output+="$iso_list"
      formatted_output+='}'
      echo "$formatted_output" | jq . > "$save_path"
      echo -e "${GREEN}Saved ISO list to: $save_path${RESET}"
    fi
  fi
  
  return 0
}

# Main function
main() {
  # Check for required tools
  check_requirements
  
  # Parse command line arguments
  parse_args "$@"
  
  # Load configuration
  load_config
  
  # Set default URL if not specified
  if [ -z "$TARGET_URL" ]; then
    TARGET_URL="$DEFAULT_ISO_LIST_URL"
  fi
  
  # Set default output path if not specified and save is requested
  if [ -z "$SAVE_PATH" ] && [ "$USE_GIT" = true ]; then
    SAVE_PATH="$SAVE_FILE"
  fi
  
  # Process based on mode
  case "$MODE" in
    "list")
      # Fetch ISO list
      iso_list=$(fetch_iso_list "$TARGET_URL")
      if [ $? -ne 0 ]; then
        exit 1
      fi
      
      # Output results
      output_results "$iso_list" "$LIMIT" "$OUTPUT_JSON" "$SAVE_PATH"
      
      # Git operations if requested
      if [ "$USE_GIT" = true ] && [ -n "$SAVE_PATH" ]; then
        git_operations "$SAVE_PATH" "$GIT_REPO" "$GIT_BRANCH"
      fi
      ;;
    "verify")
      echo "Verify mode not implemented yet"
      exit 1
      ;;
    "download")
      # Fetch ISO list
      iso_list=$(fetch_iso_list "$TARGET_URL")
      if [ $? -ne 0 ]; then
        exit 1
      fi
      
      # Download an ISO
      download_iso "$iso_list" "$DOWNLOAD_DIR" "$TEST_MODE"
      ;;
    *)
      echo -e "${RED}Error: Unknown mode: $MODE${RESET}"
      show_help
      exit 1
      ;;
  esac
  
  return 0
}

# Run the main function with all arguments
main "$@"
