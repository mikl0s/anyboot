/**
 * ISO Manager Main Application
 * Coordinates all components and handles the main application logic
 */

// Import the UI class
import { UI } from './ui.js';

// Simple ISO Grid class
function IsoGrid(containerId, downloadHandler, verifyHandler) {
  this.container = document.querySelector(containerId);
  this.downloadHandler = downloadHandler;
  this.verifyHandler = verifyHandler;
  
  if (!this.container) {
    console.error(`Container ${containerId} not found`);
  }
  
  this.showLoading = function(message) {
    if (!this.container) return;
    
    // Hide the container while loading
    this.container.classList.add('hidden');
    
    // Show the loading indicator
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
      loadingIndicator.classList.remove('hidden');
      const loadingText = loadingIndicator.querySelector('p');
      if (loadingText) {
        loadingText.textContent = message;
      }
    } else {
      // Fallback if loading indicator doesn't exist
      this.container.innerHTML = `
        <div class="flex flex-col items-center justify-center p-8">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
          <p class="text-lg text-gray-300">${message}</p>
        </div>
      `;
      this.container.classList.remove('hidden');
    }
  };
  
  this.showError = function(message) {
    if (!this.container) return;
    
    // Hide the loading indicator
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
      loadingIndicator.classList.add('hidden');
    }
    
    // Show the container with error message
    this.container.classList.remove('hidden');
    this.container.innerHTML = `
      <div class="flex flex-col items-center justify-center p-8">
        <div class="text-red-500 text-6xl mb-4">
          <i class="fas fa-exclamation-circle"></i>
        </div>
        <p class="text-lg text-red-400 mb-4">${message}</p>
        <button id="retry-button" class="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded">
          <i class="fas fa-sync-alt mr-2"></i> Retry
        </button>
      </div>
    `;
    
    var retryButton = document.getElementById('retry-button');
    if (retryButton) {
      retryButton.addEventListener('click', function() {
        window.app.loadIsoList(true);
      });
    }
  };
  
  this.loadIsos = function(isoList) {
    if (!this.container) return;
    
    if (!isoList || isoList.length === 0) {
      this.showError('No ISOs found');
      return;
    }
    
    // Clear container
    this.container.innerHTML = '';
    
    // Remove hidden class to make the grid visible
    this.container.classList.remove('hidden');
    
    // Hide loading indicator
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
      loadingIndicator.classList.add('hidden');
    }
    
    // Add ISO cards directly to the container
    isoList.forEach(function(iso) {
      var card = this.createIsoCard(iso);
      this.container.appendChild(card);
    }.bind(this));
    
    // Check for title scrolling after adding to DOM
    this.container.querySelectorAll('[data-check-scrolling]').forEach(function(card) {
      const titleElement = card.querySelector('.scrolling-title');
      const titleContainer = card.querySelector('.title-container');
      if (titleElement && titleContainer) {
        // Wait for the DOM to be fully rendered
        setTimeout(() => {
          // If the title is wider than its container, keep the animation
          if (titleElement.offsetWidth > titleContainer.offsetWidth) {
            titleElement.classList.add('needs-scrolling');
          } else {
            // Otherwise remove the animation class
            titleElement.classList.remove('scrolling-title');
          }
        }, 100);
      }
      card.removeAttribute('data-check-scrolling');
    });
  };
  
  this.createIsoCard = function(iso) {
    var card = document.createElement('div');
    card.className = 'iso-card bg-dark-800 rounded-lg overflow-hidden border border-dark-700 hover:border-primary-500';
    card.dataset.isoId = iso.name; // Store the name

    // Extract and store filename (assuming it's derivable from URL if not present)
    let filename = iso.filename; // Use filename property if it exists
    if (!filename && iso.url) {
      try {
        const urlParts = iso.url.split('/');
        filename = urlParts[urlParts.length - 1];
      } catch (e) {
        console.warn('Could not extract filename from URL:', iso.url);
        filename = ''; // Fallback
      }
    }
    card.dataset.isoFilename = filename || ''; // Store the filename

    // Format size
    var sizeFormatted = this.formatSize(iso.size);
    
    // Determine OS logo based on OS name
    var osLogo = '';
    var osName = iso.name.toLowerCase();
    var osCode = 'LIN'; // Default to Linux
    
    // Try to find the OS in our mapping
    if (window.app && window.app.state.osMapping) {
      // First try exact matches
      if (window.app.state.osMapping[osName]) {
        osCode = window.app.state.osMapping[osName];
      } else {
        // Try partial matches
        var bestMatch = null;
        var bestMatchLength = 0;
        
        Object.keys(window.app.state.osMapping).forEach(function(key) {
          // Check if the key is a substring of the ISO name or vice versa
          if (osName.includes(key) && key.length > bestMatchLength) {
            bestMatch = window.app.state.osMapping[key];
            bestMatchLength = key.length;
          }
        });
        
        if (bestMatch) {
          osCode = bestMatch;
        } else {
          // Fallback to common OS types if no match found
          if (osName.includes('ubuntu')) {
            osCode = 'UBT';
          } else if (osName.includes('debian')) {
            osCode = 'DEB';
          } else if (osName.includes('windows')) {
            osCode = 'WIN';
          } else if (osName.includes('mint')) {
            osCode = 'MIN';
          } else if (osName.includes('freebsd')) {
            osCode = 'BSD';
          } else if (osName.includes('proxmox')) {
            osCode = 'LIN';
          } else if (osName.includes('fedora')) {
            osCode = 'FED';
          } else if (osName.includes('centos')) {
            osCode = 'CES';
          } else if (osName.includes('arch')) {
            osCode = 'ARL';
          }
        }
      }
    }
    
    console.log(`ISO: ${iso.name}, OS Code: ${osCode}`);
    
    // Set the card class based on OS for the accent color
    if (osName.includes('ubuntu')) {
      card.classList.add('ubuntu');
    } else if (osName.includes('debian')) {
      card.classList.add('debian');
    } else if (osName.includes('windows')) {
      card.classList.add('windows');
    } else if (osName.includes('mint')) {
      card.classList.add('mint');
    } else if (osName.includes('fedora')) {
      card.classList.add('fedora');
    } else if (osName.includes('freebsd')) {
      card.classList.add('freebsd');
    }
    
    // Create OS logo HTML using Font Awesome icons as fallback
    var faIcon = 'linux';
    if (osName.includes('windows')) {
      faIcon = 'windows';
    } else if (osName.includes('apple') || osName.includes('mac')) {
      faIcon = 'apple';
    } else if (osName.includes('android')) {
      faIcon = 'android';
    }
    
    // Use the OS logo images from the 48x48 directory
    osLogo = `<div class="os-logo">
      <img src="/OS-Logos/48x48/${osCode}.png" alt="${iso.name} logo" 
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"/>
      <i class="fas fa-${faIcon}" style="display:none;font-size:2rem;color:#6b7280;"></i>
    </div>`;
    
    // Create badge based on status
    var badgeHtml = '';
    var actionText = 'Click to Download';
    var actionClass = 'download';
    var actionHandler = this.downloadHandler;
    var buttonColorClass = 'bg-primary-600 hover:bg-primary-700';
    
    if (iso.inArchive) {
      // Remove the In Archive badge and change the button instead
      actionText = 'In archive - click to verify';
      actionClass = 'verify';
      actionHandler = this.verifyHandler;
      buttonColorClass = 'bg-accent3-500 hover:bg-accent3-600'; // Green button for archived ISOs
      
      if (iso.updateAvailable) {
        badgeHtml += '<span class="badge badge-update">Update Available</span>';
      }
    }
    
    // Determine version display
    var versionDisplay = iso.version || 'Latest';
    
    // Card content
    card.innerHTML = `
      <div class="card-accent"></div>
      <div class="p-4 flex flex-col h-full overflow-hidden">
        <div class="flex items-start">
          ${osLogo}
          <div class="ml-3 flex-grow overflow-hidden">
            <div class="title-container">
              <h3 class="text-lg font-semibold text-white mb-1 scrolling-title">${iso.name}</h3>
            </div>
            <div class="flex justify-between items-center">
              <div class="text-sm text-gray-400 flex items-center">
                <i class="fas fa-tag mr-1"></i>
                <span>${versionDisplay}</span>
              </div>
              <div class="text-sm text-gray-400 flex items-center">
                <i class="fas fa-file-archive mr-1"></i>
                <span>${sizeFormatted}</span>
              </div>
            </div>
          </div>
        </div>
        ${badgeHtml}
        <div class="flex-grow"></div>
        <div class="mt-4 pt-4 border-t border-dark-600 flex justify-between items-center text-sm">
          <span class="iso-size text-gray-400">${sizeFormatted}</span>
          <div class="flex items-center space-x-2"> <!-- Container for buttons -->
            <button class="${actionClass}-button ${buttonColorClass} text-white font-bold py-1 px-3 rounded text-xs flex items-center justify-center">
              <i class="fas fa-${actionClass === 'download' ? 'download' : 'check-circle'} mr-1.5"></i>
              <span>${actionText}</span>
            </button>
            <button class="delete-iso-button text-red-500 hover:text-red-400 transition-colors duration-200 hidden p-1 rounded" title="Delete Downloaded ISO">
              <i class="fas fa-trash-alt text-sm"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    
    // --- Button Visibility & Event Listeners ---
    const actionButton = card.querySelector(`.${actionClass}-button`); // Main button (Download/Verify)
    const deleteButton = card.querySelector('.delete-iso-button'); // Trashcan icon button

    // Set visibility for delete button based on download state
    if (actionClass === 'verify') {
        deleteButton.classList.remove('hidden'); // Show trashcan when Verify is shown
    } else {
       deleteButton.classList.add('hidden');
    }

    // Add listener to the delete button
    if (deleteButton) {
        // Prevent duplicate listeners if card is updated later
        if (!deleteButton.dataset.listenerAttached) { 
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click
                const filename = card.dataset.isoFilename; // Get filename from card data
                if (filename && confirm(`Are you sure you want to delete the downloaded file '${filename}'? This cannot be undone.`)) {
                    this.deleteIsoFile(filename, card); // Pass filename and card element
                }
            });
            deleteButton.dataset.listenerAttached = 'true'; // Mark as attached
        }
    }

    // Add listener to the main action button
    if (actionButton) {
        actionButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const cardElement = e.target.closest('.iso-card');
            if (!cardElement) return;
            const isoName = cardElement.dataset.isoId;
            const isoObject = this.state.isoList.find(item => item.name === isoName);
            if (isoObject) {
                actionHandler.call(this, isoObject);
            } else {
                console.error("Could not find ISO object for action button:", isoName);
            }
        });
    }

    // Check if title needs scrolling animation
    const titleElement = card.querySelector('.scrolling-title');
    const titleContainer = card.querySelector('.title-container');
    if (titleElement && titleContainer) {
      // Add the card to the DOM first so we can measure it
      // We'll check after it's been added to the DOM
      card.dataset.checkScrolling = 'true';
    }

    return card;
  };
  
  this.formatSize = function(bytes) {
    if (!bytes || isNaN(bytes) || bytes <= 0) {
      return 'Unknown size';
    }
    
    var units = ['B', 'KB', 'MB', 'GB', 'TB'];
    var size = bytes;
    var unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };
}

// Global OS list mapping
var osListMapping = null;

// Function to load OS list mapping
function loadOsListMapping() {
  if (osListMapping !== null) {
    return Promise.resolve(osListMapping);
  }
  
  return fetch('/OS-Logos/os-list.json')
    .then(response => response.json())
    .then(data => {
      osListMapping = {};
      // Create a mapping of lowercase name to code
      data.forEach(os => {
        osListMapping[os.name.toLowerCase()] = os.code;
        // Also map the slug for additional matching
        osListMapping[os.slug.toLowerCase()] = os.code;
      });
      return osListMapping;
    })
    .catch(error => {
      console.error('Error loading OS list mapping:', error);
      return {};
    });
}

// Simple class for handling ISO list
function IsoManagerApp() {
  // Initialize UI components
  this.ui = new UI();
  this.ui.init();
  
  // Create ISO grid
  this.isoGrid = new IsoGrid(
    '#isoGrid',
    this.handleDownloadRequest.bind(this),
    this.handleVerifyRequest.bind(this)
  );
  
  // Track application state
  this.state = {
    serverStatus: null,
    isoList: [],
    isoListUrl: null,
    activeDownloads: new Map(),
    osMapping: {},
    config: {},
    downloadedIsoFiles: [] // Holds filenames of ISOs present in the archive
  };
  
  // Load OS list mapping
  loadOsListMapping().then(mapping => {
    this.state.osMapping = mapping;
    console.log('OS mapping loaded:', Object.keys(mapping).length, 'entries');
  }).catch(error => {
    console.error('Failed to load OS mapping:', error);
  });
  
  // Fetch server configuration
  this.fetchServerStatus();
  
  // Fetch initially downloaded files
  this.fetchDownloadedIsos();
  
  // Initialize the application
  this.init();
}

IsoManagerApp.prototype.init = function() {
  try {
    // Show loading state
    this.isoGrid.showLoading('Initializing application...');
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load ISO list
    this.loadIsoList();
    
    // Show success toast that auto-disappears
    this.ui.createToast({
      message: 'Application initialized successfully',
      type: 'success',
      autoClose: true,
      autoCloseDelay: 3000
    });
  } catch (error) {
    console.error('Error initializing application:', error);
    this.isoGrid.showError(`Failed to initialize application: ${error.message}`);
    this.ui.createToast({ message: `Initialization error: ${error.message}`, type: 'error', autoClose: false });
  }
};

IsoManagerApp.prototype.setupEventListeners = function() {
  // Settings button
  var settingsButton = document.getElementById('settingsBtn');
  if (settingsButton) {
    settingsButton.addEventListener('click', function() {
      this.showSettingsModal();
    }.bind(this));
  }

  // Search and Filter
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => this.filterIsoList());
  }

  // Refresh button
  var refreshButton = document.getElementById('refreshBtn');
  if (refreshButton) {
    refreshButton.addEventListener('click', function() {
      this.loadIsoList(true);
    }.bind(this));
  }
  
  // URL input form
  var urlForm = document.getElementById('url-form');
  if (urlForm) {
    urlForm.addEventListener('submit', function(event) {
      event.preventDefault();
      var urlInput = document.getElementById('iso-list-url');
      if (urlInput && urlInput.value) {
        this.loadIsoList(true, urlInput.value);
      }
    }.bind(this));
  }

  // Settings Modal Buttons
  const closeBtn = document.getElementById('closeSettingsModalBtn');
  const cancelBtn = document.getElementById('cancelSettingsBtn');
  const saveBtn = document.getElementById('saveSettingsBtn');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => this.hideSettingsModal());
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => this.hideSettingsModal());
  }
  if (saveBtn) {
    saveBtn.addEventListener('click', () => this.saveSettings());
  }
  
  // Clicking outside the modal content (on the backdrop) to close
  const settingsModal = document.getElementById('settingsModal');
  if (settingsModal) {
      settingsModal.addEventListener('click', (event) => {
          // Check if the click is directly on the backdrop
          if (event.target === settingsModal) {
              this.hideSettingsModal();
          }
      });
  }
};

IsoManagerApp.prototype.fetchServerStatus = function() {
  var self = this;
  
  // Fetch server status and configuration
  console.log('Fetching server configuration...');
  fetch('/api/config')
    .then(function(response) {
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(function(data) {
      console.log('Server configuration:', data);
      self.state.config = data;
      // Update state that might depend on config, like isoListUrl
      if (data.isoListUrl && !self.state.isoListUrl) {
        self.state.isoListUrl = data.isoListUrl;
        console.log('Setting initial ISO list URL from config:', self.state.isoListUrl);
      }
    })
    .catch(function(error) {
      console.error('Error fetching server config:', error);
      self.ui.createToast({ message: `Failed to load server configuration: ${error.message}`, type: 'error' });
    });
};

IsoManagerApp.prototype.loadIsoList = function(forceRefresh, url) {
  var self = this;
  try {
    // Show loading state
    this.isoGrid.showLoading('Loading ISO list...');
    
    // Determine URL to use
    var isoListUrl = url || 
      this.state.isoListUrl || 
      (this.state.config && this.state.config.isoListUrl) || // Use fetched config value
      'https://raw.githubusercontent.com/mikl0s/iso-list/main/links.json'; // Default fallback URL
    
    // Ensure state reflects the URL being used
    if (isoListUrl !== this.state.isoListUrl) {
       this.state.isoListUrl = isoListUrl;
    }

    console.log(`Loading ISO list from ${isoListUrl}`);
    
    // Fetch ISO list
    fetch(`/api/isos?url=${encodeURIComponent(isoListUrl)}`)
      .then(function(response) {
        if (!response.ok) {
          const errorText = response.text();
          throw new Error(`Server returned ${response.status}: ${response.statusText}. ${errorText}`);
        }
        return response.json();
      })
      .then(function(isoData) {
        console.log('Received ISO data:', isoData);
        
        // Convert the ISO object to an array for the grid
        var isoList = [];
        
        if (isoData && typeof isoData === 'object') {
          isoList = Object.entries(isoData).map(function([name, details]) {
            return {
              ...details,
              name: name
            };
          });
          console.log(`Processed ${isoList.length} ISOs`);
        } else {
          console.warn('Received invalid ISO data format');
          self.isoGrid.showError('Invalid ISO data format received from server');
          return;
        }
        
        // Update state
        self.state.isoList = isoList;
        
        // Update ISO grid
        self.isoGrid.loadIsos(isoList);
        
        // Show success toast that auto-disappears
        self.ui.createToast({
          message: `Loaded ${isoList.length} ISOs`,
          type: 'success',
          autoClose: true,
          autoCloseDelay: 3000
        });
      })
      .catch(function(error) {
        console.error('Error loading ISO list:', error);
        self.isoGrid.showError(`Failed to load ISO list: ${error.message}`);
        self.ui.createToast({ message: `Error loading ISO list: ${error.message}`, type: 'error', autoClose: false });
      });
  } catch (error) {
    console.error('Error in loadIsoList:', error);
    this.isoGrid.showError(`Error: ${error.message}`);
    this.ui.createToast({ message: `Error: ${error.message}`, type: 'error', autoClose: false });
  }
};

IsoManagerApp.prototype.handleDownloadRequest = function(iso) {
  var self = this;
  try {
    console.log('Download requested for:', iso);
    
    // Show a simple toast notification that download has started
    this.ui.createToast({
      message: `Download started for ${iso.name}`,
      type: 'info',
      autoClose: true,
      autoCloseDelay: 3000
    });
    
    // Find the ISO card in the DOM
    const isoCard = document.querySelector(`[data-iso-id="${iso.name}"]`);
    if (isoCard) {
      // Create download overlay using the UI class method
      const overlayElements = this.ui.createDownloadOverlay(isoCard, iso);
      
      // Call the API to start download
      fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: iso.url
        })
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(function(downloadInfo) {
        // Store download information
        self.state.activeDownloads.set(downloadInfo.downloadId, { 
          iso, 
          overlayElements,
          startTime: new Date(),
          progress: 0,
          isoCard
        });
        
        // Set up progress polling
        self.pollDownloadProgress(downloadInfo.downloadId);
      })
      .catch(function(error) {
        console.error('Error handling download request:', error);
        
        // Remove the overlay
        if (overlayElements) {
          self.ui.removeDownloadOverlay(overlayElements);
        }
        
        // Show error toast
        self.ui.createToast({ message: `Download error: ${error.message}`, type: 'error', autoClose: false });
      });
    } else {
      console.error('ISO card not found in DOM for:', iso.name);
      this.ui.createToast({ message: `Could not find ISO card for ${iso.name}`, type: 'error', autoClose: false });
    }
  } catch (error) {
    console.error('Error handling download request:', error);
    this.ui.createToast({ message: `Download error: ${error.message}`, type: 'error', autoClose: false });
  }
};

IsoManagerApp.prototype.pollDownloadProgress = function(downloadId) {
  var self = this;
  var downloadData = this.state.activeDownloads.get(downloadId);
  
  if (!downloadData) {
    console.warn(`No download data found for ID: ${downloadId}`);
    return;
  }
  
  // Poll the progress endpoint
  fetch(`/api/download/${downloadId}`)
    .then(function(response) {
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(function(progressData) {
      console.log('Progress data received:', progressData);
      
      // Update download data - use the correct property name from the server response
      downloadData.progress = progressData.progress || 0;
      
      // If progress is 0 but status is 'downloading', set a minimum progress
      if (progressData.status === 'downloading' && downloadData.progress === 0) {
        downloadData.progress = 1; // Set a minimum progress to show activity
      }
      
      // Calculate time remaining and speed if progress > 0
      var timeElapsed = (new Date() - downloadData.startTime) / 1000; // in seconds
      var speed = '';
      var timeRemaining = '';
      
      if (downloadData.progress > 0 && timeElapsed > 0) {
        // Calculate download speed
        var totalSize = downloadData.iso.size;
        var downloadedSize = totalSize * (downloadData.progress / 100);
        var speedBps = downloadedSize / timeElapsed;
        speed = self.ui.formatFileSize(speedBps) + '/s';
        
        // Calculate time remaining
        var remainingSize = totalSize - downloadedSize;
        var remainingSeconds = remainingSize / speedBps;
        
        if (remainingSeconds > 60) {
          var minutes = Math.floor(remainingSeconds / 60);
          var seconds = Math.floor(remainingSeconds % 60);
          timeRemaining = `${minutes}m ${seconds}s remaining`;
        } else {
          timeRemaining = `${Math.floor(remainingSeconds)}s remaining`;
        }
      }
      
      // Update the progress display on the ISO card
      if (downloadData.overlayElements) {
        console.log('Updating progress display to:', downloadData.progress + '%');
        
        // Update the progress and ETA text
        self.ui.updateDownloadOverlay(downloadData.overlayElements, downloadData.progress, timeRemaining || 'Calculating...');
      }
      
      // If download is complete, update the UI
      if (progressData.status === 'completed') {
        // Create a success message
        var successMessage = `Download of ${downloadData.iso.name} completed successfully!`;
        console.log('Download completed:', successMessage);
        
        // Show success toast
        self.ui.createToast({
          message: successMessage,
          type: 'success',
          autoClose: true,
          autoCloseDelay: 5000
        });
        
        // Remove from active downloads
        self.state.activeDownloads.delete(downloadId);
        
        // Remove the overlay
        if (downloadData.overlayElements) {
          self.ui.removeDownloadOverlay(downloadData.overlayElements);
        }
      } else if (progressData.status === 'error') {
        // Create an error message
        var errorMessage = `Download of ${downloadData.iso.name} failed: ${progressData.error || 'Unknown error'}`;
        console.log('Download error:', errorMessage);
        
        // Show error toast
        self.ui.createToast({
          message: errorMessage,
          type: 'error',
          autoClose: false
        });
        
        // Remove from active downloads
        self.state.activeDownloads.delete(downloadId);
        
        // Remove the overlay
        if (downloadData.overlayElements) {
          self.ui.removeDownloadOverlay(downloadData.overlayElements);
        }
      } else {
        // Continue polling if download is still in progress
        setTimeout(function() {
          self.pollDownloadProgress(downloadId);
        }, 1000); // Poll every second
      }
    })
    .catch(function(error) {
      // Don't log empty error objects as they're just noise
      if (Object.keys(error).length > 0) {
        console.error('Error polling download progress:', error);
      }
      
      // Continue polling despite error
      setTimeout(function() {
        self.pollDownloadProgress(downloadId);
      }, 2000); // Poll every 2 seconds after an error
    });
};

IsoManagerApp.prototype.handleVerifyRequest = function(iso) {
  var self = this;
  console.log('handleVerifyRequest called with ISO:', iso); 
  let verificationModal = null; 

  try {
    console.log('Verification requested for:', iso);

    // Check if the ISO has a path property
    if (!iso.path) {
      const archivePath = self.state.config.isoArchive || '/home/mikkel/repos/anyboot/iso-manager/ISO-Archive';
      const isoFilename = new URL(iso.url).pathname.split('/').pop();
      iso.path = `${archivePath}/${isoFilename}`;
      console.log('Constructed ISO path:', iso.path);
    }

    // --- Use UI.js to create the modal --- 
    verificationModal = self.ui.createVerificationModal(iso);
    if (!verificationModal || !verificationModal.steps || !verificationModal.modal) {
      console.error('Failed to create verification modal or modal structure is invalid.');
      self.ui.createToast({ message: 'Failed to create verification modal.', type: 'error', autoClose: false });
      return;
    }
    verificationModal.show(); 
    verificationModal.steps.hashStep.updateStatus('pending'); 

    // Call the API to verify ISO
    fetch('/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: iso.path,
        algorithm: iso.hashAlgorithm || 'sha256',
        expectedHash: iso.hash || ''
      })
    })
    .then(response => {
      if (!response.ok) {
        return response.text().then(text => { 
          let errorMessage = `Server error ${response.status}: ${text || response.statusText}`; 
          try {
            const errorJson = JSON.parse(text);
            errorMessage = errorJson.error || errorMessage;
          } catch (e) { /* Ignore */ }
          // Add error details to the error object
          const error = new Error(errorMessage);
          error.details = text; // Store raw response text
          throw error;
        });
      }
      return response.json();
    })
    .then(result => {
      console.log('Verification result:', result);

      // --- Update modal steps based on API result --- 
      verificationModal.steps.hashStep.updateStatus('success');
      const algorithm = result.algorithm ? result.algorithm.toUpperCase() : 'SHA256';
      const hashDisplay = result.hash || 'N/A';
      verificationModal.steps.hashStep.updateDetails(`Calculated ${algorithm}: ${hashDisplay}`);

      if (result.isValid) {
        verificationModal.steps.compareStep.updateStatus('success');
        verificationModal.steps.compareStep.updateDetails('Hash values match. The ISO is authentic.');
      } else {
        verificationModal.steps.compareStep.updateStatus('error');
        const expectedHash = result.expectedHash || 'Not provided';
        verificationModal.steps.compareStep.updateDetails(
          `Hashes do not match!\nExpected: ${expectedHash}\nActual:   ${hashDisplay}`
        );
      }
      // --- End modal update --- 
    })
    .catch(error => {
      console.error('Error during verification API call:', error);
      
      // --- Update modal steps to show error --- 
      if (verificationModal && verificationModal.steps) { 
        // Determine which step failed based on error or assume hash/compare failed
        verificationModal.steps.hashStep.updateStatus('error');
        verificationModal.steps.hashStep.updateDetails('Failed during hash calculation or comparison.');
        verificationModal.steps.compareStep.updateStatus('error');
        verificationModal.steps.compareStep.updateDetails(`Error: ${error.message}`);
      }
      // --- End modal error update --- 
    }); // End of fetch promise chain
  } catch (error) {
    console.error('Error setting up verification request:', error);
    // Show toast for errors *before* modal creation or fetch call
    self.ui.createToast({ message: `Setup error: ${error.message}`, type: 'error', autoClose: false });
  }
};

IsoManagerApp.prototype.showSettingsModal = function() {
  const modal = document.getElementById('settingsModal');
  const urlInput = document.getElementById('settingsIsoListUrlInput');
  const downloadPathInput = document.getElementById('settingsDefaultDownloadPathInput');
  // Add other inputs like hash algo, auto verify when implemented

  if (modal && urlInput && downloadPathInput) {
    // Populate with current state/config
    urlInput.value = this.state.isoListUrl || '';
    downloadPathInput.value = this.state.config?.defaultDownloadPath || '';
    // Populate other fields...

    modal.classList.remove('hidden');
  } else {
    console.error('Settings modal elements not found!');
    this.ui.createToast({ message: 'Could not open settings.', type: 'error' });
  }
};

IsoManagerApp.prototype.hideSettingsModal = function() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.add('hidden');
  }
};

IsoManagerApp.prototype.saveSettings = function() {
  const newUrl = document.getElementById('settingsIsoListUrlInput').value.trim();
  const newDownloadPath = document.getElementById('settingsDefaultDownloadPathInput').value.trim();
  // Get other settings values here when implemented

  const settingsPayload = {
      // Only include settings that are meant to be saved
      ...(newUrl && { isoListUrl: newUrl }),
      ...(newDownloadPath && { defaultDownloadPath: newDownloadPath }),
      // Add other settings to payload when implemented
      // defaultHashAlgorithm: ..., 
      // autoVerify: ... 
  };

  // Check if there's anything to save
  if (Object.keys(settingsPayload).length === 0) {
     this.ui.createToast({ message: 'No settings changed.', type: 'info', autoClose: true, autoCloseDelay: 2000 });
     this.hideSettingsModal();
     return;
  }
  
  console.log('Attempting to save settings:', settingsPayload);

  // Send updated settings to the backend
  fetch('/api/config', {
      method: 'POST', // Or PUT, depending on backend implementation
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify(settingsPayload),
  })
  .then(response => {
      if (!response.ok) {
          // Try to get error message from backend response body
          return response.text().then(text => { 
              throw new Error(`Server error ${response.status}: ${text || response.statusText}`); 
          });
      }
      return response.json(); // Assuming backend returns updated config or success message
  })
  .then(updatedConfig => {
      console.log('Settings saved successfully:', updatedConfig);
      this.ui.createToast({ message: 'Settings saved successfully!', type: 'success', autoClose: true, autoCloseDelay: 3000 });
      
      // Update local state with potentially confirmed/updated values from backend
      this.state.config = { ...this.state.config, ...updatedConfig }; 
      if (updatedConfig.isoListUrl) {
          this.state.isoListUrl = updatedConfig.isoListUrl;
          // Reload ISO list only if the URL actually changed and was saved
          if (newUrl && newUrl !== this.state.isoListUrl) {
              console.log('Reloading ISO list due to URL change.');
              this.loadIsoList(true, newUrl);
          } else {
              console.log('ISO List URL confirmed, no reload needed.');
          }
      }
      this.hideSettingsModal();
  })
  .catch(error => {
      console.error('Error saving settings:', error);
      this.ui.createToast({ message: `Failed to save settings: ${error.message}`, type: 'error', autoClose: false });
      // Optionally, don't hide the modal on error
  });

};

IsoManagerApp.prototype.filterIsoList = function() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
  const isoGridContainer = document.getElementById('isoGrid');
  const isoCards = isoGridContainer.querySelectorAll('.iso-card');
  let visibleCount = 0;

  isoCards.forEach(card => {
    const isoName = card.dataset.isoId.toLowerCase(); // Assuming isoId stores the name
    const isoFilename = card.dataset.isoFilename.toLowerCase(); // Get filename
    // Add more fields to search if needed, e.g., iso.filename if stored
    const isMatch = isoName.includes(searchTerm) || isoFilename.includes(searchTerm);

    if (isMatch) {
      card.style.display = ''; // Show card
      visibleCount++;
    } else {
      card.style.display = 'none'; // Hide card
    }
  });

  // Handle empty state (Optional: Show/hide an empty state message)
  const emptyState = document.getElementById('emptyState');
  if (emptyState) {
    if (visibleCount === 0 && this.state.isoList.length > 0) {
      emptyState.classList.remove('hidden');
      // Optionally update empty state text for search context
      const emptyText = emptyState.querySelector('h3');
      if (emptyText) emptyText.textContent = 'No ISOs Match Your Search';
      const emptyPara = emptyState.querySelector('p');
      if (emptyPara) emptyPara.textContent = 'Try adjusting your search term.';
    } else {
      emptyState.classList.add('hidden');
    }
  }
};

IsoManagerApp.prototype.fetchDownloadedIsos = function() {
  console.log("Fetching list of downloaded ISOs...");
  fetch('/api/iso-archive')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(filenames => {
      console.log("Downloaded ISOs found:", filenames);
      this.state.downloadedIsoFiles = filenames;
      // Re-render or update cards if necessary after fetching
      // This might be complex depending on how rendering is handled.
      // For now, we assume cards are created *after* this fetch completes or
      // that createIsoCard will be called again when needed.
      // If cards are already rendered, we might need to iterate them:
       this.updateExistingCardDeleteButtons(); 
    })
    .catch(error => {
      console.error('Error fetching downloaded ISO list:', error);
      this.ui.createToast({ message: 'Failed to get list of downloaded ISOs.', type: 'error' });
      this.state.downloadedIsoFiles = []; // Ensure it's empty on error
    });
};

IsoManagerApp.prototype.updateExistingCardDeleteButtons = function() {
    const isoGridContainer = document.getElementById('isoGrid');
    if (!isoGridContainer) return;
    const cards = isoGridContainer.querySelectorAll('.iso-card');
    cards.forEach(card => {
        const deleteButton = card.querySelector('.delete-iso-button');
        const filename = card.dataset.isoFilename;
        if (deleteButton && filename) {
            if (this.state.downloadedIsoFiles.includes(filename)) {
                deleteButton.classList.remove('hidden');
                // Ensure listener is attached (might need removal first if re-attaching)
                 // Check if listener already exists to prevent duplicates
                if (!deleteButton.dataset.listenerAttached) {
                    deleteButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete the file '${filename}'? This cannot be undone.`)) {
                            this.deleteIsoFile(filename, card);
                        }
                    });
                    deleteButton.dataset.listenerAttached = 'true'; // Mark as attached
                }
            } else {
                deleteButton.classList.add('hidden');
                 // Optionally remove listener if hiding?
                 // For simplicity, we might leave it, but ideally, it would be removed.
            }
        }
    });
};

IsoManagerApp.prototype.deleteIsoFile = function(filename, cardElement) {
  if (!filename) {
    console.error("Delete attempt failed: filename is missing.");
    return;
  }
  console.log(`Attempting to delete ISO file: ${filename}`);
  this.ui.createToast({ message: `Deleting ${filename}...`, type: 'info', autoClose: false });

  fetch(`/api/iso-archive/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  })
  .then(response => {
    this.ui.closeAllToasts(); // Close the 'deleting...' toast
    if (!response.ok) {
      return response.json().then(errData => {
        throw new Error(errData.error || `Server error ${response.status}`);
      }).catch(() => {
        throw new Error(`Server error ${response.status}`); // Fallback if no JSON error body
      });
    }
    return response.json();
  })
  .then(data => {
    console.log('Delete successful:', data.message);
    this.ui.createToast({ message: `'${filename}' deleted successfully.`, type: 'success', autoClose: true, autoCloseDelay: 4000 });

    // Update state
    this.state.downloadedIsoFiles = this.state.downloadedIsoFiles.filter(f => f !== filename);

    // Update UI for the specific card
    if (cardElement) {
      const deleteButton = cardElement.querySelector('.delete-iso-button');
      if (deleteButton) {
        deleteButton.classList.add('hidden');
        deleteButton.dataset.listenerAttached = 'false'; // Reset marker
      }
      // Change the main button back to 'Download'
      const actionButton = cardElement.querySelector('.verify-button'); // Find the verify button specifically
      if (actionButton) {
        const isoName = cardElement.dataset.isoId;
        const isoObject = this.state.isoList.find(item => item.name === isoName);
        if (isoObject) {
          // Change classes, icon, text
          actionButton.classList.remove('verify-button', 'bg-accent3-500', 'hover:bg-accent3-600');
          actionButton.classList.add('download-button', 'bg-primary-600', 'hover:bg-primary-700');
          actionButton.querySelector('i').className = 'fas fa-download mr-1.5'; // Update icon
          actionButton.querySelector('span').textContent = 'Download'; // Update text

          // Replace listener to point to the download handler
          this.replaceButtonListener(actionButton, this.handleDownloadRequest, isoObject);
        } else {
          console.warn("Could not find ISO object to reset action button after delete for:", isoName);
        }
      }
      // Refresh list or specific card state? For now, just hide button.

    }
    // Refresh list or specific card state? For now, just hide button.

  })
  .catch(error => {
    this.ui.closeAllToasts();
    console.error('Error deleting ISO file:', error);
    this.ui.createToast({ message: `Error deleting file: ${error.message}`, type: 'error', autoClose: false });
  });
};

IsoManagerApp.prototype.replaceButtonListener = function(button, newHandler, isoObject) {
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    newButton.addEventListener('click', (e) => {
        e.stopPropagation();
        newHandler.call(this, isoObject);
    });
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  window.app = new IsoManagerApp();
});
