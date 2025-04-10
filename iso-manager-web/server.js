#!/usr/bin/env node

/**
 * ISO Manager Web Interface
 * Main server file that initializes and starts the Express server
 */

// Import required modules
const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const https = require('https');
const http = require('http');
const url = require('url');
const crypto = require('crypto');
const chokidar = require('chokidar');

// Load configuration from iso-manager.conf
function loadConfiguration() {
  try {
    const configPath = path.join(__dirname, '..', 'iso-manager', 'iso-manager.conf');
    console.log(`Loading configuration from ${configPath}`);
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } else {
      console.warn('Configuration file not found, using defaults');
      return {
        defaultIsoListUrl: 'https://raw.githubusercontent.com/mikl0s/iso-list/main/links.json',
        isoArchive: '/home/mikkel/repos/anyboot/iso-manager/ISO-Archive'
      };
    }
  } catch (error) {
    console.error('Error loading configuration:', error);
    return {
      defaultIsoListUrl: 'https://raw.githubusercontent.com/mikl0s/iso-list/main/links.json',
      isoArchive: '/home/mikkel/repos/anyboot/iso-manager/ISO-Archive'
    };
  }
}

// Load the configuration
const config = loadConfiguration();

// Import the iso-manager.js script
const isoManagerFactory = require('../iso-manager/iso-manager.js');
const isoManager = isoManagerFactory();

// Global objects to track downloads and their state
const downloads = {};
let nextDownloadId = 1;

// Global variables for ISO list caching
let isoListCache = null;
let isoListCacheTime = null;
const ISO_CACHE_DURATION = 3600000; // 1 hour in milliseconds

// Set up logging
const logPath = path.join(process.env.TEMP || '/tmp', 'anyboot-iso-manager', 'server.log');
const logDir = path.dirname(logPath);

// Create logger object
const logger = {
  log(message) {
    console.log(message);
    // Log to file if needed
  },
  error(message) {
    console.error(message);
    // Log to file if needed
  },
  warn(message) {
    console.warn(message);
    // Log to file if needed
  },
  info(message) {
    console.info(message);
    // Log to file if needed
  }
};

// Make sure the log directory exists
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (error) {
  console.error(`Failed to create log directory: ${error.message}`);
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to check and update the ISO list
async function checkAndUpdateIsoList(url) {
  // Check if we have a cached version that's still valid
  if (isoListCache && isoListCacheTime && (Date.now() - isoListCacheTime < ISO_CACHE_DURATION)) {
    logger.log('Using cached ISO list');
    return isoListCache;
  }

  // Fetch the ISO list from the URL
  return new Promise((resolve, reject) => {
    logger.log(`Fetching ISO list from ${url}`);
    
    // Parse the URL
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const request = client.get(url, (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        return reject(new Error(`Failed to fetch ISO list: ${response.statusCode} ${response.statusMessage}`));
      }
      
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          // Parse the JSON data
          const parsedData = JSON.parse(data);
          
          // Validate the data format
          if (!parsedData || typeof parsedData !== 'object' || Object.keys(parsedData).length === 0) {
            return reject(new Error('Received empty or invalid ISO list data'));
          }
          
          // Cache the data
          isoListCache = parsedData;
          isoListCacheTime = Date.now();
          
          // Return the data
          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Failed to parse ISO list data: ${error.message}`));
        }
      });
    });
    
    request.on('error', (error) => {
      reject(new Error(`Failed to fetch ISO list: ${error.message}`));
    });
    
    request.end();
  });
}

// Helper function to process ISO details
function processIsoDetails(name, details) {
  if (!details || !details.url) {
    logger.warn(`Skipping ISO '${name}' with missing URL`);
    return null;
  }
  
  // Create a processed details object
  return {
    name,
    url: details.url,
    size: details.size || 0,
    description: details.description || '',
    version: details.version || '',
    hash: details.hash || '',
    hashAlgorithm: details.hashAlgorithm || 'sha256',
    releaseDate: details.releaseDate || '',
    category: details.category || 'Other',
    tags: details.tags || [],
    inArchive: false,  // Will be updated later
    updateAvailable: false  // Will be updated later
  };
}

// Helper function to mark ISOs as archived
function markArchivedIsos(isoList) {
  try {
    // Get the archive path from configuration
    const archivePath = config.isoArchive;
    
    // Check if directory exists
    if (!fs.existsSync(archivePath)) {
      logger.warn(`Archive directory does not exist: ${archivePath}`);
      return isoList;
    }
    
    // Read directory contents
    const files = fs.readdirSync(archivePath);
    
    // Process each ISO in the list
    const markedIsos = {};
    
    for (const [name, details] of Object.entries(isoList)) {
      // Copy the details object to avoid modifying the original
      const detailsCopy = { ...details };
      
      // Check if the ISO is in the archive
      const isoFilename = path.basename(new URL(detailsCopy.url).pathname);
      const inArchive = files.includes(isoFilename);
      
      // If in archive, check if an update is available
      let updateAvailable = false;
      
      if (inArchive) {
        const archivedFilePath = path.join(archivePath, isoFilename);
        const stats = fs.statSync(archivedFilePath);
        
        // Check if the size is different (simple update check)
        if (detailsCopy.size && stats.size !== detailsCopy.size) {
          updateAvailable = true;
        }
      }
      
      // Update the details
      detailsCopy.inArchive = inArchive;
      detailsCopy.updateAvailable = updateAvailable;
      
      // Add to the marked list
      markedIsos[name] = detailsCopy;
    }
    
    return markedIsos;
  } catch (error) {
    logger.error(`Error marking archived ISOs: ${error.message}`);
    return isoList;
  }
}

// API endpoint to list all files in the ISO archive directory
app.get('/api/archive', async (req, res) => {
  try {
    // Get the archive path from configuration
    const archivePath = config.isoArchive;
    logger.log(`Listing files in archive: ${archivePath}`);
    
    // Check if directory exists
    if (!fs.existsSync(archivePath)) {
      logger.warn(`Archive directory does not exist: ${archivePath}`);
      return res.json([]);
    }
    
    // Read directory contents
    const files = fs.readdirSync(archivePath);
    
    // Process each file to get details
    const fileDetails = files.map(filename => {
      const filePath = path.join(archivePath, filename);
      const stats = fs.statSync(filePath);
      
      return {
        name: filename,
        path: filePath,
        size: stats.size,
        lastModified: stats.mtime
      };
    });
    
    res.json(fileDetails);
  } catch (error) {
    logger.error(`Error listing archive contents: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get configuration
app.get('/api/config', (req, res) => {
  try {
    // Only send the necessary config options to the client
    const clientConfig = {
      defaultIsoListUrl: config.defaultIsoListUrl,
      isoArchive: config.isoArchive,
      autoVerifyHashes: config.autoVerifyHashes || true,
      hashAlgorithm: config.hashAlgorithm || 'sha256'
    };
    
    res.json(clientConfig);
  } catch (error) {
    logger.error(`Error getting config: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get ISO list
app.get('/api/isos', async (req, res) => {
  try {
    const url = req.query.url || 'https://raw.githubusercontent.com/mikl0s/iso-list/main/links.json';
    logger.log(`Fetching ISO list from ${url}`);
    
    // Use the caching function to get the data
    let result;
    try {
      result = await checkAndUpdateIsoList(url);
      logger.log('Successfully fetched ISO list data:', Object.keys(result).length, 'ISOs found');
    } catch (error) {
      logger.error('Error fetching ISO list data:', error.message);
      return res.status(500).json({ error: `Failed to fetch ISO list: ${error.message}` });
    }
    
    // Process result and add file sizes if missing
    if (result && typeof result === 'object') {
      const processed = {};
      
      // Process each ISO in the list
      for (const [name, details] of Object.entries(result)) {
        // Skip entries without URL
        if (!details.url) {
          logger.warn(`Skipping ISO '${name}' missing URL`);
          continue;
        }
        
        // Copy the details object to avoid modifying the original
        const detailsCopy = { ...details };
        
        // Process ISO details
        const processedDetails = processIsoDetails(name, detailsCopy);
        if (processedDetails) {
          processed[name] = processedDetails;
        }
      }
      
      logger.log(`Processed ${Object.keys(processed).length} ISOs`);
      
      // Mark ISOs as archived if they exist in the download directory
      const markedIsos = markArchivedIsos(processed);
      
      // Log the final result
      logger.log(`Returning ${Object.keys(markedIsos).length} ISOs to client`);
      
      res.json(markedIsos);
    } else {
      logger.error('Invalid ISO list data format:', result);
      throw new Error('Invalid ISO list data format');
    }
  } catch (error) {
    logger.error('Error processing ISO list:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to verify an ISO file
app.post('/api/verify', async (req, res) => {
  try {
    const { path: filePath, algorithm = 'sha256' } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `File not found: ${filePath}` });
    }
    
    // Call the iso-manager to verify the file
    const result = await isoManager.verifyFile(filePath, algorithm);
    res.json(result);
  } catch (error) {
    logger.error(`Error verifying file: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to download an ISO
app.post('/api/download', async (req, res) => {
  try {
    const { url, outputPath, verify, hashAlgorithm } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    // Generate a unique download ID
    const downloadId = nextDownloadId++;
    
    // Create a download object to track progress
    downloads[downloadId] = {
      url,
      outputPath,
      verify,
      hashAlgorithm,
      progress: 0,
      status: 'initializing',
      startTime: Date.now(),
      error: null
    };
    
    // Return the download ID immediately
    res.json({ downloadId });
    
    // Start the download in the background
    try {
      // Call the iso-manager to download the file
      const downloadPromise = isoManager.downloadFile(url, outputPath, (progress) => {
        // Update progress
        if (downloads[downloadId]) {
          downloads[downloadId].progress = progress;
          downloads[downloadId].status = 'downloading';
        }
      });
      
      // Handle completion
      downloadPromise
        .then(result => {
          if (downloads[downloadId]) {
            downloads[downloadId].status = 'completed';
            downloads[downloadId].progress = 100;
            downloads[downloadId].result = result;
          }
        })
        .catch(error => {
          if (downloads[downloadId]) {
            downloads[downloadId].status = 'error';
            downloads[downloadId].error = error.message;
          }
        });
    } catch (error) {
      // Handle immediate errors
      if (downloads[downloadId]) {
        downloads[downloadId].status = 'error';
        downloads[downloadId].error = error.message;
      }
    }
  } catch (error) {
    logger.error(`Error starting download: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get download status
app.get('/api/download/:id', (req, res) => {
  const downloadId = parseInt(req.params.id, 10);
  
  if (isNaN(downloadId) || !downloads[downloadId]) {
    return res.status(404).json({ error: 'Download not found' });
  }
  
  const download = downloads[downloadId];
  
  // Calculate speed and ETA if download is in progress
  let speed = 0;
  let eta = 0;
  
  if (download.status === 'downloading' && download.progress > 0) {
    const elapsedTime = Date.now() - download.startTime;
    const remainingProgress = 100 - download.progress;
    
    // Calculate speed in percent per millisecond
    speed = download.progress / elapsedTime;
    
    // Calculate ETA in milliseconds
    eta = remainingProgress / speed;
  }
  
  res.json({
    ...download,
    speed,
    eta
  });
});

// API endpoint to get server status
app.get('/api/status', (req, res) => {
  try {
    const status = {
      version: '1.0.0',
      defaultIsoListUrl: config.defaultIsoListUrl,
      archivePath: config.isoArchive,
      uptime: process.uptime(),
      nodeVersion: process.version
    };
    
    res.json(status);
  } catch (error) {
    logger.error(`Error getting server status: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Ensure ISO archive directory exists
if (!fs.existsSync(config.isoArchive)) {
  try {
    console.log(`Creating ISO archive directory: ${config.isoArchive}`);
    fs.mkdirSync(config.isoArchive, { recursive: true });
  } catch (error) {
    console.error(`Failed to create ISO archive directory: ${error.message}`);
  }
}

// Set up file watcher for ISO archive
const watcher = chokidar.watch(config.isoArchive, {
  persistent: true,
  ignoreInitial: false,
  awaitWriteFinish: true,
  ignored: /(^|[\/\\])\../  // Ignore dotfiles
});

watcher
  .on('add', path => console.log(`File added to archive: ${path}`))
  .on('change', path => console.log(`File changed in archive: ${path}`))
  .on('unlink', path => console.log(`File removed from archive: ${path}`))
  .on('error', error => console.error(`Watcher error: ${error}`));

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`ISO Manager Web Interface running on port ${PORT}`);
  console.log(`ISO Archive path: ${config.isoArchive}`);
  console.log(`Default ISO List URL: ${config.defaultIsoListUrl}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Server shutting down...');
  watcher.close().then(() => {
    console.log('File watcher closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  console.error(`Uncaught exception: ${error.message}`);
  console.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});
