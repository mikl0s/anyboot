# AnyBoot ISO Manager

<div align="center">
  <img src="https://img.shields.io/badge/Platform-Linux%20%7C%20macOS%20%7C%20Windows-blue" alt="Platform">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</div>

## Overview

AnyBoot ISO Manager is a modern web interface for browsing, downloading, and managing OS installation images (ISOs) with a sleek, user-friendly design. It features a dark-themed UI with vibrant accent colors and interactive elements for a professional experience.

<img src="https://via.placeholder.com/800x450?text=ISO+Manager+Screenshot" alt="ISO Manager Screenshot">

## Key Features

- **Modern UI**: Dark slate background with vibrant accent colors and gradient elements
- **ISO Discovery**: Browse and search through various operating system ISOs
- **Version Control**: View available versions with update notifications
- **Download Management**: Easy downloading with progress tracking
- **Hash Verification**: Verify downloaded ISO integrity
- **Archive Integration**: Track previously downloaded ISOs
- **Responsive Design**: Works across desktop and mobile devices

## Installation

```bash
# Clone the repository
git clone https://github.com/mikl0s/anyboot.git
cd anyboot/iso-manager

# Install dependencies
npm install

# Start the web interface
./run-web.sh
```

The web interface will be available at http://localhost:5001

## Configuration

Config options are available in `iso-manager.conf`:

```json
{
  "defaultIsoListUrl": "https://raw.githubusercontent.com/mikl0s/iso-list/main/links.json",
  "isoArchive": "/path/to/ISO-Archive"
}
```

## Credits

- Operating system icons from [operating-system-logos](https://github.com/ngeenx/operating-system-logos)

## License

MIT License
