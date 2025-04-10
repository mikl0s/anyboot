/**
 * ISO Manager Main Application
 * Coordinates all components and handles the main application logic
 */

// Simple UI helper class
function UIBase() {
  this.showToast = function(message, type, duration, isPersistent) {
    console.log(`[${type}] ${message}`);
    var toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
      console.warn('Toast container not found!');
      return null;
    }
    
    // For download toasts, use the special download type
    if (isPersistent) {
      type = 'download';
    }
    
    var toast = document.createElement('div');
    toast.className = `toast toast-${type} p-4 rounded shadow-lg flex items-center justify-between`;
    toast.innerHTML = `
      <span>${message}</span>
      <button class="ml-4 text-gray-400 hover:text-gray-600" onclick="this.parentNode.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Only auto-remove if it's not a persistent toast and duration > 0
    if (!isPersistent && duration > 0) {
      setTimeout(function() {
        if (toast.parentNode) {
          toast.remove();
        }
      }, duration);
    }
    
    return toast;
  };
  
  this.updateToast = function(toast, message, type, duration, isPersistent) {
    if (!toast || !toast.parentNode) {
      return this.showToast(message, type, duration, isPersistent);
    }
    
    // For download toasts, use the special download type
    if (isPersistent) {
      type = 'download';
    }
    
    toast.className = `toast toast-${type} p-4 rounded shadow-lg flex items-center justify-between`;
    toast.innerHTML = `
      <span>${message}</span>
      <button class="ml-4 text-gray-400 hover:text-gray-600" onclick="this.parentNode.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    // Only auto-remove if it's not a persistent toast and duration > 0
    if (!isPersistent && duration > 0) {
      setTimeout(function() {
        if (toast.parentNode) {
          toast.remove();
        }
      }, duration);
    }
    
    return toast;
  };
  
  this.formatFileSize = function(bytes) {
    if (!bytes || bytes === 0) return 'Unknown size';
    
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
    
    if (iso.inArchive) {
      badgeHtml = '<span class="badge badge-archive">In Archive</span>';
      actionText = 'Click to Verify';
      actionClass = 'verify';
      actionHandler = this.verifyHandler;
      
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
        <div class="mt-4">
          <button class="${actionClass}-button w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center">
            <i class="fas fa-${actionClass === 'download' ? 'download' : 'check-circle'} mr-2"></i>
            <span>${actionText}</span>
          </button>
        </div>
      </div>
    `;
    
    // Add event listener
    var button = card.querySelector(`.${actionClass}-button`);
    if (button) {
      button.addEventListener('click', function() {
        actionHandler(iso);
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
  this.ui = new UIBase();
  
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
    osMapping: {}
  };
  
  // Load OS list mapping
  loadOsListMapping().then(mapping => {
    this.state.osMapping = mapping;
    console.log('OS mapping loaded:', Object.keys(mapping).length, 'entries');
  }).catch(error => {
    console.error('Failed to load OS mapping:', error);
  });
  
  // Initialize the application
  this.init();
}

IsoManagerApp.prototype.init = function() {
  try {
    // Show loading state
    this.isoGrid.showLoading('Initializing application...');
    
    // Fetch server status
    this.fetchServerStatus();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load ISO list
    this.loadIsoList();
    
    // Show success toast
    this.ui.showToast('Application initialized successfully', 'success');
  } catch (error) {
    console.error('Error initializing application:', error);
    this.isoGrid.showError(`Failed to initialize application: ${error.message}`);
    this.ui.showToast(`Initialization error: ${error.message}`, 'error');
  }
};

IsoManagerApp.prototype.setupEventListeners = function() {
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
  
  // Tab switching functionality
  const tabButtons = document.querySelectorAll('.tab-btn');
  if (tabButtons.length > 0) {
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all buttons
        tabButtons.forEach(btn => {
          btn.classList.remove('active');
          btn.classList.remove('border-primary-500');
          btn.classList.remove('text-primary-400');
          btn.classList.add('border-transparent');
        });
        
        // Add active class to clicked button
        button.classList.add('active');
        button.classList.add('border-primary-500');
        button.classList.add('text-primary-400');
        button.classList.remove('border-transparent');
        
        // Hide all tab content
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
          content.classList.add('hidden');
        });
        
        // Show the selected tab content
        const tabName = button.getAttribute('data-tab-button');
        const selectedTab = document.querySelector(`.tab-content[data-tab-content="${tabName}"]`);
        if (selectedTab) {
          selectedTab.classList.remove('hidden');
        }
      });
    });
  }
};

IsoManagerApp.prototype.fetchServerStatus = function() {
  var self = this;
  fetch('/api/status')
    .then(function(response) {
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(function(status) {
      console.log('Server status:', status);
      
      // Update state
      self.state.serverStatus = status;
      
      // Update URL input if it exists
      var urlInput = document.getElementById('iso-list-url');
      if (urlInput && status.defaultIsoListUrl) {
        urlInput.value = status.defaultIsoListUrl;
      }
    })
    .catch(function(error) {
      console.error('Error fetching server status:', error);
      throw error;
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
      (this.state.serverStatus && this.state.serverStatus.defaultIsoListUrl) ||
      'https://raw.githubusercontent.com/mikl0s/iso-list/main/links.json'; // Default fallback URL
    
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
        self.state.isoListUrl = isoListUrl;
        
        // Update ISO grid
        self.isoGrid.loadIsos(isoList);
        
        // Show success toast
        self.ui.showToast(`Loaded ${isoList.length} ISOs`, 'success');
      })
      .catch(function(error) {
        console.error('Error loading ISO list:', error);
        self.isoGrid.showError(`Failed to load ISO list: ${error.message}`);
        self.ui.showToast(`Error loading ISO list: ${error.message}`, 'error');
      });
  } catch (error) {
    console.error('Error in loadIsoList:', error);
    this.isoGrid.showError(`Error: ${error.message}`);
    this.ui.showToast(`Error: ${error.message}`, 'error');
  }
};

IsoManagerApp.prototype.handleDownloadRequest = function(iso) {
  var self = this;
  try {
    console.log('Download requested for:', iso);
    
    // Create toast for download with progress indicator
    var toast = this.ui.showToast(
      `<div class="flex flex-col w-full">
        <div class="flex justify-between items-center w-full">
          <span>Starting download for ${iso.name}...</span>
          <span class="text-xs progress-percentage">0%</span>
        </div>
        <div class="mt-2 w-full bg-gray-700 rounded-full h-2.5">
          <div class="download-progress bg-purple-600 h-2.5 rounded-full" style="width: 0%"></div>
        </div>
      </div>`, 
      'info', 0, true
    );
    
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
        // Update toast with download progress
        var progressHtml = `
          <div class="flex flex-col w-full">
            <div class="flex justify-between items-center w-full">
              <span>Downloading ${iso.name}...</span>
              <span class="text-xs progress-percentage">0%</span>
            </div>
            <div class="mt-2 w-full bg-gray-700 rounded-full h-2.5">
              <div class="download-progress bg-purple-600 h-2.5 rounded-full" style="width: 0%"></div>
            </div>
          </div>
        `;
        
        // Update the toast with HTML content
        toast.innerHTML = progressHtml;
        
        // Store toast reference for updates
        self.state.activeDownloads.set(downloadInfo.downloadId, { 
          iso, 
          toast,
          startTime: new Date(),
          progress: 0
        });
        
        // Set up progress polling
        self.pollDownloadProgress(downloadInfo.downloadId);
      })
      .catch(function(error) {
        console.error('Error handling download request:', error);
        self.ui.updateToast(toast, `Download error: ${error.message}`, 'error', 0, true);
      });
  } catch (error) {
    console.error('Error handling download request:', error);
    this.ui.showToast(`Download error: ${error.message}`, 'error', 0, true);
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
        speed = self.formatSize(speedBps) + '/s';
        
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
      
      // Update the progress bar and text in the toast
      if (downloadData.toast && downloadData.toast.parentNode) {
        console.log('Updating progress display to:', downloadData.progress + '%');
        
        // Get the progress bar and percentage elements
        var progressBar = downloadData.toast.querySelector('.download-progress');
        var percentText = downloadData.toast.querySelector('.progress-percentage');
        
        // Update the progress bar width
        if (progressBar) {
          progressBar.style.width = downloadData.progress + '%';
          console.log('Set progress bar width to:', downloadData.progress + '%');
        } else {
          console.error('Progress bar element not found');
        }
        
        // Update the percentage text
        if (percentText) {
          percentText.textContent = Math.floor(downloadData.progress) + '% ' + (speed ? '• ' + speed : '');
          console.log('Updated percentage text to:', percentText.textContent);
        } else {
          console.error('Percentage text element not found');
        }
        
        // Update the main text if we have time remaining info
        if (timeRemaining) {
          var mainText = downloadData.toast.querySelector('.flex.justify-between span:first-child');
          if (mainText) {
            mainText.textContent = `Downloading ${downloadData.iso.name}... ${timeRemaining}`;
          }
        }
      }
      
      // If download is complete, update the toast
      if (progressData.status === 'completed') {
        // Create a success message
        var successMessage = `Download of ${downloadData.iso.name} completed successfully!`;
        console.log('Download completed:', successMessage);
        
        // Use the UI class's showToast method
        self.ui.showToast(successMessage, 'success', 5000, false);
        
        // Remove from active downloads
        self.state.activeDownloads.delete(downloadId);
      } else if (progressData.status === 'error') {
        // Create an error message
        var errorMessage = `Download of ${downloadData.iso.name} failed: ${progressData.error || 'Unknown error'}`;
        console.log('Download error:', errorMessage);
        
        // Use the UI class's showToast method
        self.ui.showToast(errorMessage, 'error', 5000, false);
        
        // Remove from active downloads
        self.state.activeDownloads.delete(downloadId);
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
  try {
    console.log('Verification requested for:', iso);
    
    // Create toast for verification
    var toast = this.ui.showToast(`Verifying ${iso.name}...`, 'info', 0, true);
    
    // Call the API to verify ISO
    fetch('/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: iso.path,
        algorithm: iso.hashAlgorithm || 'sha256'
      })
    })
      .then(function(response) {
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(function(result) {
        // Update toast based on result
        if (result.verified) {
          self.ui.updateToast(toast, `${iso.name} verified successfully`, 'success', 0, true);
        } else {
          self.ui.updateToast(toast, `${iso.name} verification failed`, 'error', 0, true);
        }
      })
      .catch(function(error) {
        console.error('Error handling verify request:', error);
        self.ui.updateToast(toast, `Verification error: ${error.message}`, 'error', 0, true);
      });
  } catch (error) {
    console.error('Error handling verify request:', error);
    this.ui.showToast(`Verification error: ${error.message}`, 'error', 0, true);
  }
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  window.app = new IsoManagerApp();
});
