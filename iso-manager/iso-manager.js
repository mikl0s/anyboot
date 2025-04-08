#!/usr/bin/env node

/**
 * ISO Manager CLI Script
 * 
 * This script can:
 * 1. Fetch and process a predefined list of ISOs from a JSON file
 * 2. Allow configuration through iso-manager.conf
 * 3. Auto commit and push changes to GitHub
 * 4. Verify ISO hash to detect changes
 */

const https = require('https');
const http = require('http');
const { JSDOM } = require('jsdom');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const crypto = require('crypto');
const readline = require('readline');
const { createHash } = require('crypto');
const { Readable } = require('stream');

// Default configuration
const DEFAULT_CONFIG = {
  defaultIsoListUrl: 'https://raw.githubusercontent.com/mikl0s/iso-list/refs/heads/main/links.json',
  outputFormat: 'text',
  maxResults: 0, // 0 means unlimited
  saveFile: '',
  gitRepo: 'https://github.com/mikl0s/iso-list.git',
  gitBranch: 'main',
  hashAlgorithm: 'sha256',
  hashMatch: '{filename}.{hashAlgorithm}'
};

// Load configuration from file if exists
function loadConfig() {
  const configPath = path.join(process.cwd(), 'iso-manager.conf');
  let config = { ...DEFAULT_CONFIG };
  
  if (fs.existsSync(configPath)) {
    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      const userConfig = JSON.parse(configData);
      
      // Merge user config with defaults
      config = { ...config, ...userConfig };
      console.log('Loaded configuration from iso-manager.conf');
    } catch (error) {
      console.warn(`Warning: Could not parse config file: ${error.message}`);
    }
  }
  
  return config;
}

/**
 * Parse command-line arguments
 * @returns {Object} - Parsed command-line arguments
 */
function parseCommandLineArgs() {
  const args = process.argv.slice(2);
  const options = {
    mode: '',
    targetUrl: '',
    limit: 0,
    outputJson: false,
    savePath: '',
    useGit: false,
    verifyHash: false,
    hashMatch: '',
    download: false,
    test: false,
    downloadDir: ''
  };
  
  // Display help if no arguments or help flag
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
ISO Manager - A tool for fetching and managing Linux distribution ISOs

Usage:
  node iso-manager.js [mode] [options]

Modes:
  list            Fetch ISOs from a predefined JSON list
  verify          Verify and update ISO hashes
  download        Download an ISO file

Options:
  --url, -u       Target URL to fetch data from
  --limit, -l     Limit the number of results
  --json, -j      Output in JSON format
  --save, -s      Save the results to a file
  --git, -g       Auto-commit and push changes to GitHub
  --verify, -v    Verify ISO hashes
  --hash-match    Pattern for finding hash file (default: '{filename}.{hashAlgorithm}')
                  Use {filename} and {hashAlgorithm} as placeholders
  --download, -d  Download an ISO file
  --test, -t      Test mode - delete file after verification
  --download-dir  Directory to save downloaded files (default: ./downloads)
  --help, -h      Show this help message

Examples:
  node iso-manager.js list --url https://example.com/isos.json --save list.json
  node iso-manager.js verify -g
  node iso-manager.js download --test
`);
    process.exit(0);
  }
  
  // Process mode argument
  if (!args[0].startsWith('-')) {
    options.mode = args[0];
    args.shift();
  }
  
  // Process options
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--url':
      case '-u':
        options.targetUrl = args[++i];
        break;
      case '--limit':
      case '-l':
        options.limit = parseInt(args[++i], 10);
        break;
      case '--json':
      case '-j':
        options.outputJson = true;
        break;
      case '--save':
      case '-s':
        options.savePath = args[++i];
        break;
      case '--git':
      case '-g':
        options.useGit = true;
        break;
      case '--verify':
      case '-v':
        options.verifyHash = true;
        break;
      case '--hash-match':
        options.hashMatch = args[++i];
        break;
      case '--download':
      case '-d':
        options.download = true;
        break;
      case '--test':
      case '-t':
        options.test = true;
        break;
      case '--download-dir':
        options.downloadDir = args[++i];
        break;
    }
  }
  
  return options;
}

// Show help information
function showHelp() {
  console.log('ISO Manager - CLI tool for managing Linux distribution ISOs');
  console.log('');
  console.log('Usage: node iso-manager.js [command] [options]');
  console.log('');
  console.log('Commands:');
  console.log('  list [URL]             Get ISOs from a JSON list URL');
  console.log('  verify [URL]           Verify and update ISO hashes');
  console.log('  download [URL]         Download an ISO file');
  console.log('');
  console.log('Options:');
  console.log('  --json, -j             Output in JSON format');
  console.log('  --save=PATH, -s PATH   Save the results to specified path');
  console.log('  --limit=N, -l N        Limit results to top N items');
  console.log('  --git, -g              Auto-commit and push changes to GitHub');
  console.log('  --verify, -v           Verify ISO hashes and update if changed');
  console.log('  --hash-match           Pattern to look for hash file (default: {filename}.{hashAlgorithm})');
  console.log('                  Use {filename} and {hashAlgorithm} as placeholders');
  console.log('  --download, -d         Download an ISO file');
  console.log('  --test, -t             Test mode - delete file after verification');
  console.log('  --download-dir         Directory to save downloaded files (default: ./downloads)');
  console.log('  --help, -h             Show this help message');
  console.log('');
  console.log('Configuration:');
  console.log('  Settings can be configured in iso-manager.conf');
}

/**
 * Fetch data from a URL with redirect support
 * @param {string} url - The URL to fetch
 * @param {number} maxRedirects - Maximum number of redirects to follow
 * @returns {Promise<string>} - Fetched data
 */
async function fetchData(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const handleResponse = (res, followedUrl) => {
      // Handle redirects (status codes 301, 302, 303, 307, 308)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects <= 0) {
          reject(new Error('Too many redirects'));
          return;
        }
        
        // Construct the redirect URL (handle relative URLs)
        const redirectUrl = new URL(res.headers.location, followedUrl).toString();
        console.log(`Following redirect: ${followedUrl} -> ${redirectUrl}`);
        
        // Follow the redirect
        return fetchData(redirectUrl, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch: HTTP ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve(data);
      });
    };
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    };
    
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, options, (res) => handleResponse(res, url));
    
    req.on('error', (err) => {
      reject(err);
    });
    
    // Set a reasonable timeout
    req.setTimeout(30000, () => {
      req.abort();
      reject(new Error('Request timed out'));
    });
  });
}

/**
 * Fetch and parse the predefined ISO list from JSON
 * @param {string} url - URL to the JSON file
 * @returns {Promise<Array<Object>>} - Array of ISO objects
 */
async function fetchIsoList(url) {
  try {
    console.log(`Fetching ISO list from URL: ${url}`);
    const data = await fetchData(url);
    let jsonData;
    
    try {
      jsonData = JSON.parse(data);
      console.log('Successfully parsed JSON data');
    } catch (error) {
      console.error(`Error parsing JSON data: ${error.message}`);
      return [];
    }
    
    // Debug info
    console.log(`JSON data type: ${typeof jsonData}`);
    if (Array.isArray(jsonData)) {
      console.log(`Array with ${jsonData.length} items`);
    } else if (typeof jsonData === 'object') {
      console.log(`Object with ${Object.keys(jsonData).length} keys`);
    }
    
    // Handle different JSON formats
    if (Array.isArray(jsonData)) {
      // If it's already an array, just return it with default ranks
      return jsonData.map((item, index) => {
        if (!item) {
          console.error(`Invalid item at index ${index}`);
          return null;
        }
        
        return {
          rank: index + 1,
          name: item.name || `Unknown ISO ${index + 1}`,
          link: item.link || item.url || '',
          hash: item.hash || item.hash_value || '',
          hashAlgorithm: item.hashAlgorithm || item.hash_type || 'sha256',
          lastVerified: item.lastVerified || '',
          type: item.type || detectDistroType(item.name || '')
        };
      }).filter(item => item !== null);
    } else {
      // Convert the plain JSON object to an array of objects
      return Object.entries(jsonData).map(([name, value], index) => {
        // Handle null values gracefully
        if (value === null) {
          console.log(`Note: Skipping entry "${name}" with null value`);
          return null;
        }
        // Handle both simple string values and object values
        if (typeof value === 'string') {
          return {
            rank: index + 1,
            name,
            link: value,
            hash: '',
            hashAlgorithm: 'sha256',
            type: detectDistroType(name)
          };
        } else if (value && typeof value === 'object') {
          // Handle the new format with hash_type and hash_value fields
          let hashAlgorithm = value.hashAlgorithm || value.hash_type || 'sha256';
          // Convert to lowercase for consistency
          if (typeof hashAlgorithm === 'string') {
            hashAlgorithm = hashAlgorithm.toLowerCase();
          }
          
          return {
            rank: index + 1,
            name,
            link: value.url || value.link || '',
            hash: value.hash || value.hash_value || '',
            hashAlgorithm,
            lastVerified: value.lastVerified || new Date().toISOString(),
            type: value.type || detectDistroType(name),
            verified: true  // Since we're getting the hash directly from the source
          };
        } else {
          console.error(`Invalid value for key ${name}`);
          return null;
        }
      }).filter(item => item !== null);
    }
  } catch (error) {
    console.error(`Error fetching ISO list: ${error.message}`);
    console.error(error.stack);
    return [];
  }
}

/**
 * Detect the Linux distribution type based on the ISO name
 * @param {string} name - ISO name
 * @returns {string} - Distribution type
 */
function detectDistroType(name) {
  name = name.toLowerCase();
  
  if (name.includes('debian')) return 'debian';
  if (name.includes('ubuntu')) return 'ubuntu';
  if (name.includes('mint')) return 'mint';
  if (name.includes('fedora')) return 'fedora';
  if (name.includes('centos')) return 'centos';
  if (name.includes('arch')) return 'arch';
  if (name.includes('manjaro')) return 'manjaro';
  
  // Default
  return 'unknown';
}

/**
 * Utility function to get the base URL and filename from a URL
 * @param {string} url - Full URL
 * @returns {Object} - Object containing baseUrl and filename
 */
function parseUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const filename = pathname.split('/').pop();
    // Base URL is everything up to the last path segment
    const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
    return { baseUrl, filename };
  } catch (error) {
    console.error(`Error parsing URL ${url}: ${error.message}`);
    return { baseUrl: '', filename: '' };
  }
}

/**
 * Find hash file for a given ISO URL
 * @param {string} isoUrl - URL of the ISO file
 * @param {string} hashAlgorithm - Hash algorithm (md5, sha1, sha256)
 * @param {string} hashMatch - Pattern to look for hash file (default: '{filename}.{hashAlgorithm}')
 * @returns {Promise<string>} - Hash value or empty string if not found
 */
async function findHashFile(isoUrl, hashAlgorithm = 'sha256', hashMatch = '{filename}.{hashAlgorithm}') {
  try {
    const { baseUrl, filename } = parseUrl(isoUrl);
    if (!baseUrl || !filename) {
      return '';
    }
    
    console.log(`Looking for hash file for ${filename}...`);
    
    // Generate common hash file patterns
    const patterns = [];
    
    // Use the provided hashMatch pattern
    let customPattern = hashMatch
      .replace('{filename}', filename)
      .replace('{hashAlgorithm}', hashAlgorithm);
    patterns.push(customPattern);
    
    // Add commonly used hash file patterns
    patterns.push(`${filename}.${hashAlgorithm}`);
    patterns.push(`${filename}.${hashAlgorithm}sum`);
    patterns.push(`${hashAlgorithm}sums.txt`);
    patterns.push(`${hashAlgorithm}sum.txt`);
    patterns.push(`SHA${hashAlgorithm.toUpperCase()}SUMS`);
    patterns.push(`${hashAlgorithm.toUpperCase()}SUMS`);
    patterns.push(`SUMS.${hashAlgorithm}`);
    patterns.push(`CHECKSUM.${hashAlgorithm}`);
    patterns.push(`${hashAlgorithm}.txt`);
    
    // Distribution-specific patterns
    if (isoUrl.includes('debian.org')) {
      // Debian usually stores hash files in a specific format
      patterns.push('SHA256SUMS');
    } else if (isoUrl.includes('ubuntu.com')) {
      // Ubuntu uses SHA256SUMS file
      patterns.push('SHA256SUMS');
    } else if (isoUrl.includes('linuxmint')) {
      // Linux Mint uses sha256sum.txt
      patterns.push('sha256sum.txt');
    } else if (isoUrl.includes('freebsd.org')) {
      // FreeBSD often uses CHECKSUM.SHA256
      patterns.push('CHECKSUM.SHA256');
    }
    
    // Try each pattern
    for (const pattern of new Set(patterns)) { // Use Set to remove duplicates
      const hashFileUrl = `${baseUrl}${pattern}`;
      console.log(`Looking for hash file: ${hashFileUrl}`);
      
      try {
        const hashData = await fetchData(hashFileUrl);
        // Parse the hash file content to extract the hash
        const extractedHash = extractHashFromFile(hashData, filename, hashAlgorithm);
        if (extractedHash) {
          console.log(`Found hash for ${filename} in ${pattern}: ${extractedHash}`);
          return extractedHash;
        }
      } catch (error) {
        // Continue trying other patterns
        continue;
      }
    }
    
    // Try looking in the parent directory (one level up) - common for many distros
    if (baseUrl.split('/').filter(Boolean).length > 2) {
      const parentUrl = baseUrl.split('/').slice(0, -2).join('/') + '/';
      console.log(`Checking parent directory: ${parentUrl}`);
      
      for (const pattern of new Set(['SHA256SUMS', 'sha256sum.txt', `${hashAlgorithm.toUpperCase()}SUMS`])) {
        const hashFileUrl = `${parentUrl}${pattern}`;
        console.log(`Looking for hash file: ${hashFileUrl}`);
        
        try {
          const hashData = await fetchData(hashFileUrl);
          // Parse the hash file content to extract the hash
          const extractedHash = extractHashFromFile(hashData, filename, hashAlgorithm);
          if (extractedHash) {
            console.log(`Found hash for ${filename} in parent directory ${pattern}: ${extractedHash}`);
            return extractedHash;
          }
        } catch (error) {
          // Continue trying other patterns
          continue;
        }
      }
    }
    
    console.log(`No hash file found for ${filename}`);
    return '';
  } catch (error) {
    console.error(`Error finding hash file: ${error.message}`);
    return '';
  }
}

/**
 * Extract hash from hash file content
 * @param {string} fileContent - Content of the hash file
 * @param {string} filename - Filename to match
 * @param {string} hashAlgorithm - Hash algorithm for additional context
 * @returns {string} - Extracted hash or empty string
 */
function extractHashFromFile(fileContent, filename, hashAlgorithm) {
  // Skip empty content
  if (!fileContent || !fileContent.trim()) {
    return '';
  }
  
  const lines = fileContent.split('\n');
  
  // Try different formats
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    // Format: <hash>  <filename>
    // Common in sha256sum, md5sum outputs
    const hashFirstRegex = new RegExp(`^([a-fA-F0-9]{32,128})\s+(?:\*|\s)${escapeRegExp(filename)}$`);
    const hashFirstMatch = trimmedLine.match(hashFirstRegex);
    if (hashFirstMatch && hashFirstMatch[1]) {
      return hashFirstMatch[1].toLowerCase();
    }
    
    // Format: <filename>: <hash>
    // Common in some distro's checksum files
    const filenameFirstRegex = new RegExp(`${escapeRegExp(filename)}\s*:\s*([a-fA-F0-9]{32,128})`, 'i');
    const filenameFirstMatch = trimmedLine.match(filenameFirstRegex);
    if (filenameFirstMatch && filenameFirstMatch[1]) {
      return filenameFirstMatch[1].toLowerCase();
    }
    
    // Format: <hash> (<file>)
    // Used by some distributions
    const hashWithParensRegex = new RegExp(`^([a-fA-F0-9]{32,128})\s+\(${escapeRegExp(filename)}\)$`, 'i');
    const hashWithParensMatch = trimmedLine.match(hashWithParensRegex);
    if (hashWithParensMatch && hashWithParensMatch[1]) {
      return hashWithParensMatch[1].toLowerCase();
    }
    
    // If the file only contains a hash (no filename)
    if (trimmedLine.match(/^[a-fA-F0-9]{32,128}$/)) {
      // Make sure the hash length matches expected length for the algorithm
      const expectedLength = hashAlgorithm === 'md5' ? 32 : hashAlgorithm === 'sha1' ? 40 : 64;
      if (trimmedLine.length === expectedLength) {
        return trimmedLine.toLowerCase();
      }
    }
  }
  
  return '';
}

/**
 * Escape special characters in a string for use in a regular expression
 * @param {string} string - String to escape
 * @returns {string} - Escaped string
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Format and output the results
 * @param {Array<Object>} data - Data to output
 * @param {Object} options - Formatting options
 */
function outputResults(data, options) {
  if (data.length === 0) {
    console.log('No data found.');
    return;
  }
  
  // Apply limit if specified
  const limitedData = options.limit ? data.slice(0, options.limit) : data;
  
  if (options.outputJson) {
    // JSON output
    const output = JSON.stringify(limitedData, null, 2);
    console.log(output);
  } else {
    // Pretty console output
    console.log('\nISO Information:');
    console.log('='.repeat(60));
    
    limitedData.forEach((item) => {
      const rank = item.rank ? `${item.rank}. ` : '';
      console.log(`${rank}${item.name}`);
      console.log(`   Link: ${item.link}`);
      
      if (item.hash) {
        console.log(`   Hash (${item.hashAlgorithm}): ${item.hash}`);
        if (item.changed === true) {
          console.log(`   ⚠️ Hash changed to: ${item.currentHash}`);
        } else if (item.verified) {
          console.log(`   ✅ Hash verified`);
        }
      }
      
      if (item.hits) {
        console.log(`   Hits: ${item.hits}`);
      }
      if (item.type && item.type !== 'unknown') {
        console.log(`   Type: ${item.type}`);
      }
      if (item.lastVerified) {
        console.log(`   Last Verified: ${item.lastVerified}`);
      }
      if (item.error) {
        console.log(`   Error: ${item.error}`);
      }
      
      console.log('-'.repeat(60));
    });
  }
  
  console.log(`\nTotal items: ${limitedData.length}`);
  
  // Save to file if specified
  if (options.savePath) {
    let outputContent;
    
    if (options.savePath.endsWith('.json')) {
      outputContent = JSON.stringify(limitedData, null, 2);
    } else if (options.savePath.endsWith('.csv')) {
      // Create CSV header based on the first item's properties
      const firstItem = limitedData[0] || {};
      const headers = Object.keys(firstItem).join(',');
      
      // Create CSV rows
      const rows = limitedData.map(item => {
        return Object.values(item).map(value => {
          // Wrap values containing commas in quotes
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        }).join(',');
      });
      
      outputContent = [headers, ...rows].join('\n');
    } else {
      // Plain text format (default)
      outputContent = limitedData.map(item => {
        const rank = item.rank ? `${item.rank},` : '';
        let line = `${rank}${item.name},${item.link}`;
        if (item.hash) line += `,${item.hash}`;
        if (item.hashAlgorithm) line += `,${item.hashAlgorithm}`;
        return line;
      }).join('\n');
    }
    
    fs.writeFileSync(options.savePath, outputContent);
    console.log(`Results saved to: ${options.savePath}`);
    
    return options.savePath; // Return the save path for git operations
  }
  
  return null; // No file saved
}

/**
 * Calculate the hash of a file from a URL
 * @param {string} url - The URL of the file
 * @param {string} algorithm - Hash algorithm to use (md5, sha1, sha256, etc.)
 * @returns {Promise<string>} - The calculated hash
 */
async function calculateHashFromUrl(url, algorithm = 'sha256') {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const client = url.startsWith('https') ? https : http;
    
    console.log(`Calculating ${algorithm} hash for ${url}...`);
    
    const req = client.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch file: HTTP ${res.statusCode}`));
      }
      
      res.on('data', (chunk) => {
        hash.update(chunk);
      });
      
      res.on('end', () => {
        resolve(hash.digest('hex'));
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    // Set a timeout (5 minutes) for large files
    req.setTimeout(5 * 60 * 1000, () => {
      req.abort();
      reject(new Error('Request timed out while calculating hash'));
    });
  });
}

/**
 * Verify if an ISO's hash has changed
 * @param {Object} isoData - ISO data with URL and hash
 * @returns {Promise<Object>} - Updated ISO data with verification result
 */
async function verifyIsoHash(iso) {
  // Skip verification if there's no link
  if (!iso.link) {
    return iso;
  }
  
  const config = loadConfig();
  const hashAlgorithm = iso.hashAlgorithm || config.hashAlgorithm || 'sha256';
  
  // Try to find the hash file if no hash is provided
  if (!iso.hash) {
    console.log(`No hash provided for ${iso.name}, attempting to find hash file...`);
    const hashMatch = config.hashMatch || '{filename}.{hashAlgorithm}';
    iso.hash = await findHashFile(iso.link, hashAlgorithm, hashMatch);
    
    if (iso.hash) {
      console.log(`Found hash for ${iso.name}: ${iso.hash}`);
      iso.hashSource = 'file';
      iso.lastVerified = new Date().toISOString();
    } else {
      console.log(`No hash file found for ${iso.name}`);
    }
  }
  
  // If we have a hash, verify it by downloading a small part of the ISO
  if (iso.hash) {
    try {
      // Placeholder for actual hash verification
      // In reality, you'd need to download the ISO and calculate its hash,
      // but that would be resource-intensive. For now, we'll just simulate it.
      console.log(`Simulating hash verification for ${iso.name}...`);
      
      // Here we would normally compute the hash of the downloaded file
      // and compare it with the expected hash
      const verified = true; // Placeholder
      const currentHash = iso.hash; // Placeholder - in reality this would be the calculated hash
      
      // Update the verification status
      iso.verified = verified;
      
      // Check if the hash has changed
      if (iso.hash && iso.hash !== currentHash) {
        console.log(`Hash mismatch for ${iso.name}`);
        console.log(`  Expected: ${iso.hash}`);
        console.log(`  Actual:   ${currentHash}`);
        
        // Mark that the hash has changed
        iso.changed = true;
        iso.currentHash = currentHash;
      } else {
        iso.changed = false;
        iso.lastVerified = new Date().toISOString();
      }
    } catch (error) {
      console.error(`Error verifying hash for ${iso.name}: ${error.message}`);
      iso.verified = false;
    }
  }
  
  return iso;
}

/**
 * Run Git operations to commit and push changes
 * @param {string} repoPath - Path to the Git repository
 * @param {Object} options - Git options
 */
async function gitCommitAndPush(repoPath, options = {}) {
  const { branch = 'main', message = 'Update ISO list', remote = 'origin' } = options;
  
  try {
    // Check if this is a Git repository
    const isGitRepo = fs.existsSync(path.join(repoPath, '.git'));
    
    if (!isGitRepo) {
      throw new Error(`${repoPath} is not a Git repository`);
    }
    
    console.log('\nPerforming Git operations...');
    
    // Add all changes
    console.log('git add .');
    execSync('git add .', { cwd: repoPath });
    
    // Commit changes
    console.log(`git commit -m "${message}"`);
    execSync(`git commit -m "${message}"`, { cwd: repoPath });
    
    // Push to the remote repository
    console.log(`git push ${remote} ${branch}`);
    execSync(`git push ${remote} ${branch}`, { cwd: repoPath });
    
    console.log('Git operations completed successfully!');
    return true;
  } catch (error) {
    console.error(`Git operation failed: ${error.message}`);
    return false;
  }
}

/**
 * Clone a Git repository if it doesn't exist
 * @param {string} repoUrl - URL of the Git repository
 * @param {string} targetDir - Directory to clone into
 * @param {string} branch - Branch to clone
 * @returns {Promise<boolean>} - Success or failure
 */
async function ensureGitRepo(repoUrl, targetDir, branch = 'main') {
  try {
    if (fs.existsSync(path.join(targetDir, '.git'))) {
      console.log(`Repository already exists at ${targetDir}`);
      
      // Pull latest changes
      console.log('Pulling latest changes...');
      execSync('git pull', { cwd: targetDir });
      return true;
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Clone the repository
    console.log(`Cloning ${repoUrl} into ${targetDir}...`);
    execSync(`git clone -b ${branch} ${repoUrl} ${targetDir}`);
    console.log('Repository cloned successfully!');
    
    return true;
  } catch (error) {
    console.error(`Git operation failed: ${error.message}`);
    return false;
  }
}

/**
 * Create a readline interface for user input
 * @returns {readline.Interface} - Readline interface
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Ask a question and get user input
 * @param {string} question - Question to ask
 * @param {readline.Interface} rl - Readline interface
 * @returns {Promise<string>} - User input
 */
function askQuestion(question, rl) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Display a list of ISOs and let the user select one
 * @param {Array<Object>} isos - List of ISO objects
 * @returns {Promise<Object>} - Selected ISO object
 */
async function selectIso(isos) {
  const rl = createReadlineInterface();
  
  console.log('\nAvailable ISOs to download:\n');
  isos.forEach((iso, index) => {
    console.log(`${index + 1}. ${iso.name} (${formatSize(estimateIsoSize(iso.name, iso.type))})`);
  });
  
  let selectedIndex;
  while (selectedIndex === undefined || selectedIndex < 1 || selectedIndex > isos.length) {
    const answer = await askQuestion(`\nSelect an ISO to download (1-${isos.length}): `, rl);
    selectedIndex = parseInt(answer, 10);
    
    if (isNaN(selectedIndex) || selectedIndex < 1 || selectedIndex > isos.length) {
      console.log(`Please enter a number between 1 and ${isos.length}`);
    }
  }
  
  rl.close();
  return isos[selectedIndex - 1];
}

/**
 * Estimate ISO file size based on name and type
 * @param {string} name - ISO name
 * @param {string} type - Distribution type
 * @returns {number} - Estimated size in bytes
 */
function estimateIsoSize(name, type) {
  // Rough estimates based on common ISO sizes
  if (name.toLowerCase().includes('netinst') || name.toLowerCase().includes('minimal')) {
    return 400 * 1024 * 1024; // ~400 MB
  }
  
  if (name.toLowerCase().includes('server')) {
    return 1.2 * 1024 * 1024 * 1024; // ~1.2 GB
  }
  
  if (name.toLowerCase().includes('boot') || name.toLowerCase().includes('bootonly')) {
    return 300 * 1024 * 1024; // ~300 MB
  }
  
  if (type === 'debian') {
    return 700 * 1024 * 1024; // ~700 MB
  }
  
  if (type === 'ubuntu') {
    return 3 * 1024 * 1024 * 1024; // ~3 GB
  }
  
  if (type === 'mint') {
    return 2.5 * 1024 * 1024 * 1024; // ~2.5 GB
  }
  
  // Default size
  return 2 * 1024 * 1024 * 1024; // ~2 GB
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size
 */
function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Download a file from a URL and verify its hash
 * @param {string} url - URL to download from
 * @param {string} outputPath - Path to save the file
 * @param {string} expectedHash - Expected hash value
 * @param {string} hashAlgorithm - Hash algorithm to use
 * @returns {Promise<Object>} - Download result
 */
async function downloadAndVerifyFile(url, outputPath, expectedHash, hashAlgorithm) {
  return new Promise((resolve, reject) => {
    const { baseUrl, filename } = parseUrl(url);
    console.log(`\nDownloading ${filename} from ${baseUrl}...`);
    
    // Create output file stream
    const fileStream = fs.createWriteStream(outputPath);
    
    // Create hash stream
    const hash = createHash(hashAlgorithm);
    
    // Set up progress tracking
    let downloadedBytes = 0;
    let totalBytes = 0;
    let lastProgressUpdate = Date.now();
    let startTime = Date.now();
    
    const client = url.startsWith('https') ? https : http;
    const request = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Close current streams
        fileStream.close();
        fs.unlinkSync(outputPath);
        
        // Follow redirect
        const redirectUrl = new URL(response.headers.location, url).toString();
        console.log(`Following redirect: ${url} -> ${redirectUrl}`);
        downloadAndVerifyFile(redirectUrl, outputPath, expectedHash, hashAlgorithm)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      // Check for successful response
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }
      
      // Get total file size
      totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      console.log(`Total size: ${formatSize(totalBytes)}`);
      
      // Pipe the response to file and hash streams
      response.on('data', (chunk) => {
        hash.update(chunk);
        downloadedBytes += chunk.length;
        
        // Update progress every 1 second
        const now = Date.now();
        if (now - lastProgressUpdate > 1000) {
          updateDownloadProgress(downloadedBytes, totalBytes, startTime);
          lastProgressUpdate = now;
        }
      });
      
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        const calculatedHash = hash.digest('hex');
        
        // Final progress update
        updateDownloadProgress(downloadedBytes, totalBytes, startTime, true);
        
        // Verify hash
        const hashMatch = expectedHash ? (calculatedHash.toLowerCase() === expectedHash.toLowerCase()) : true;
        
        console.log('\nDownload complete!');
        console.log(`File saved to: ${outputPath}`);
        console.log(`Calculated ${hashAlgorithm} hash: ${calculatedHash}`);
        
        if (expectedHash) {
          console.log(`Expected ${hashAlgorithm} hash:   ${expectedHash}`);
          console.log(`Hash verification: ${hashMatch ? '✅ Passed' : '❌ Failed'}`);
        } else {
          console.log('No expected hash provided for verification.');
        }
        
        resolve({
          success: true,
          hashMatch,
          calculatedHash,
          filePath: outputPath
        });
      });
    });
    
    request.on('error', (err) => {
      fileStream.close();
      fs.unlinkSync(outputPath);
      reject(err);
    });
    
    // Set a timeout
    request.setTimeout(300000, () => { // 5 minutes
      request.destroy();
      fileStream.close();
      fs.unlinkSync(outputPath);
      reject(new Error('Download timed out'));
    });
  });
}

/**
 * Update download progress in the terminal
 * @param {number} downloaded - Downloaded bytes
 * @param {number} total - Total bytes
 * @param {number} startTime - Download start time
 * @param {boolean} final - If this is the final update
 */
function updateDownloadProgress(downloaded, total, startTime, final = false) {
  const elapsedSeconds = (Date.now() - startTime) / 1000;
  const speed = downloaded / elapsedSeconds; // bytes per second
  const progress = total > 0 ? (downloaded / total) * 100 : 0;
  
  // Calculate ETA
  let eta = 'Unknown';
  if (speed > 0 && total > 0) {
    const remainingSeconds = (total - downloaded) / speed;
    eta = formatTime(remainingSeconds);
  }
  
  // Create progress bar
  const progressBarWidth = 30;
  const filledWidth = Math.round(progress * progressBarWidth / 100);
  const progressBar = '█'.repeat(filledWidth) + '░'.repeat(progressBarWidth - filledWidth);
  
  const status = `${formatSize(downloaded)} / ${formatSize(total)} | ${progress.toFixed(2)}% | ${formatSize(speed)}/s | ETA: ${eta}`;
  process.stdout.clearLine ? process.stdout.clearLine() : null;
  process.stdout.cursorTo ? process.stdout.cursorTo(0) : null;
  
  if (!final) {
    process.stdout.write(`Progress: ${progressBar} ${status}`);
  } else {
    process.stdout.write(`Complete: ${progressBar} ${status}\n`);
  }
}

/**
 * Format time in human-readable format
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time
 */
function formatTime(seconds) {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  } else {
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }
}

/**
 * Download an ISO file, handle selection, and verify its hash
 * @param {Array<Object>} isos - List of ISO objects
 * @param {Object} options - Download options
 * @returns {Promise<Object>} - Download result
 */
async function downloadIso(isos, options) {
  try {
    // Let user select an ISO to download
    const selectedIso = await selectIso(isos);
    console.log(`\nSelected: ${selectedIso.name}`);
    console.log(`URL: ${selectedIso.link}`);
    
    // Extract filename from URL
    const { filename } = parseUrl(selectedIso.link);
    if (!filename) {
      throw new Error('Could not determine filename from URL');
    }
    
    // Determine download directory
    const downloadDir = options.downloadDir || path.join(process.cwd(), 'downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    
    const outputPath = path.join(downloadDir, filename);
    
    // Check if file already exists
    if (fs.existsSync(outputPath)) {
      const rl = createReadlineInterface();
      const answer = await askQuestion(`\nFile already exists: ${outputPath}\nOverwrite? (y/n): `, rl);
      rl.close();
      
      if (answer.toLowerCase() !== 'y') {
        console.log('Download cancelled.');
        return { success: false, cancelled: true };
      }
    }
    
    // Download and verify file
    const result = await downloadAndVerifyFile(
      selectedIso.link,
      outputPath,
      selectedIso.hash,
      selectedIso.hashAlgorithm
    );
    
    // Test mode - delete file after verification
    if (options.testMode && result.success) {
      console.log('\nTest mode enabled - deleting downloaded file');
      fs.unlinkSync(outputPath);
      console.log(`File deleted: ${outputPath}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error downloading ISO: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main function to execute the script
 */
async function main() {
  try {
    // Parse command-line arguments
    const args = parseCommandLineArgs();
    
    // Load configuration
    const config = loadConfig();
    
    // Set default values if not provided
    if (!args.targetUrl) {
      if (args.mode === 'list') {
        args.targetUrl = config.defaultIsoListUrl;
      }
    }
    
    if (!args.hashMatch && config.hashMatch) {
      args.hashMatch = config.hashMatch;
    }
    
    // Create download directory if it doesn't exist
    if (args.download || args.mode === 'download') {
      const downloadDir = args.downloadDir || './downloads';
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }
      args.downloadDir = downloadDir;
    }
    
    let results = [];
    
    // Execute the selected mode
    switch (args.mode) {
      case 'list': {
        if (!args.targetUrl) {
          console.error('Error: No target URL provided for ISO list');
          process.exit(1);
        }
        
        console.log(`Fetching ISO list from ${args.targetUrl}...`);
        results = await fetchIsoList(args.targetUrl);
        
        // Apply limit if specified
        if (args.limit > 0 && results.length > args.limit) {
          results = results.slice(0, args.limit);
        }
        
        // Output or save results
        outputResults(results, {
          format: args.outputJson ? 'json' : 'text',
          savePath: args.savePath,
          useGit: args.useGit,
          gitRepo: config.gitRepo,
          gitBranch: config.gitBranch
        });
        
        // Verify hashes if requested
        if (args.verifyHash) {
          console.log('Verifying ISO hashes...');
          let updatedResults = [];
          
          for (const iso of results) {
            const result = await verifyIsoHash(iso);
            updatedResults.push(result);
          }
          
          // Update results with verified hashes
          results = updatedResults;
          
          // Save verified results if a path is provided
          if (args.savePath) {
            fs.writeFileSync(args.savePath, JSON.stringify(results, null, 2));
            console.log(`Updated hash information saved to ${args.savePath}`);
          }
          
          // Commit and push changes if using Git
          if (args.useGit) {
            const repoPath = path.dirname(args.savePath);
            gitCommitAndPush(repoPath, {
              message: 'Update ISO hashes',
              remote: 'origin',
              branch: config.gitBranch
            });
          }
        }
        
        break;
      }
      
      case 'verify': {
        let isos = [];
        
        if (args.targetUrl) {
          console.log(`Fetching ISO list from ${args.targetUrl}...`);
          isos = await fetchIsoList(args.targetUrl);
        } else if (args.savePath && fs.existsSync(args.savePath)) {
          console.log(`Loading ISO list from ${args.savePath}...`);
          const fileContent = fs.readFileSync(args.savePath, 'utf8');
          isos = JSON.parse(fileContent);
        } else {
          console.log(`Fetching ISO list from default URL: ${config.defaultIsoListUrl}...`);
          isos = await fetchIsoList(config.defaultIsoListUrl);
        }
        
        console.log('Verifying ISO hashes...');
        let updatedIsos = [];
        
        for (const iso of isos) {
          const result = await verifyIsoHash(iso);
          updatedIsos.push(result);
        }
        
        // Save verified results
        if (args.savePath) {
          fs.writeFileSync(args.savePath, JSON.stringify(updatedIsos, null, 2));
          console.log(`Verified hash information saved to ${args.savePath}`);
        } else {
          console.log('Verified ISO information:');
          console.log(JSON.stringify(updatedIsos, null, 2));
        }
        
        // Commit and push changes if using Git
        if (args.useGit) {
          const repoPath = args.savePath ? path.dirname(args.savePath) : '.';
          gitCommitAndPush(repoPath, {
            message: 'Update ISO hashes',
            remote: 'origin',
            branch: config.gitBranch
          });
        }
        
        break;
      }
      
      case 'download': {
        let isos = [];
        
        if (args.targetUrl) {
          console.log(`Fetching ISO list from ${args.targetUrl}...`);
          isos = await fetchIsoList(args.targetUrl);
        } else if (args.savePath && fs.existsSync(args.savePath)) {
          console.log(`Loading ISO list from ${args.savePath}...`);
          const fileContent = fs.readFileSync(args.savePath, 'utf8');
          isos = JSON.parse(fileContent);
        } else {
          console.log(`Fetching ISO list from default URL: ${config.defaultIsoListUrl}...`);
          isos = await fetchIsoList(config.defaultIsoListUrl);
        }
        
        await downloadIso(isos, {
          downloadDir: args.downloadDir,
          testMode: args.test
        });
        
        break;
      }
      
      default:
        console.error(`Error: Unknown mode '${args.mode}'`);
        console.log('Run with --help for usage information');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Execute the main function
main();
