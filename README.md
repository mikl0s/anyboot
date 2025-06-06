![AnyBoot Logo](logo.png)

# AnyBoot

**Your Multi-Boot Workstation, Simplified.**

<!-- Badges - Centering these often uses <p align="center"> in GFM -->
[![Build Status](https://img.shields.io/github/actions/workflow/status/mikl0s/anyboot/build.yml?branch=main&label=Build&logo=githubactions&logoColor=white)](https://github.com/mikl0s/anyboot/actions) [![License: ELv2](https://img.shields.io/badge/License-ELv2-blueviolet.svg)](LICENSE) [![Version](https://img.shields.io/badge/version-v0.1.0--alpha-blue)](./) [![Contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](./#contributing) [![Platform: Anything with UEFI](https://img.shields.io/badge/Platform-Anything%20with%20UEFI-lightgrey)](./)  

---

## About AnyBoot

AnyBoot is a portable, live-bootable application designed to help users plan, configure, and execute advanced multi-boot workstation setups with ease. It operates from a USB drive containing a minimal Debian 12 environment and enables the installation of Windows, Linux, and BSD systems into *real* hardware partitions using controlled, virtualized installers (QEMU).

**AnyBoot** aims to remove the fear and complexity from multi-booting, providing a safe, guided environment to create powerful, customized workstation environments quickly and reliably.

## The Problem We Solve

Setting up a multi-boot PC is powerful but often involves:

*   Complex and risky manual partitioning.
*   Potential bootloader conflicts breaking existing OSes.
*   Time-consuming sequential installs and multiple reboots.
*   Difficulty managing various OS installer ISOs.
*   Challenges in achieving a consistent, reproducible setup.
*   Limited options for BSD installation.
*   Inability to handle complex partition layouts.
*   Accessing network shares during the setup process to retrieve files or configurations can be difficult.

**AnyBoot** tackles these issues head-on by providing an integrated, guided, and safer installation process.

## Key Features

*   🖥️ **Live USB System:** Boots into a minimal Debian 12 environment.
*   🖱️ **Dual User Interface:** Graphical (Firefox) & Text (Browsh) modes via a unified Next.js app.
*   💾 **Persistent Storage:** Uses dedicated USB partitions (incl. user-accessible exFAT) for ISOs, configs & logs.
*   📐 **Layout Designer:** Interactively plan target disk partitions.
*   🛡️ **Virtualized Installation:** Safely runs OS installers via QEMU targeting *real* partitions.
*   ➕ **Flexible & Incremental:** Install one OS now, add more later, or setup all at once.
*   💾 **Backup & Restore:** Integrated Clonezilla for backing up/restoring disks/partitions to network shares (SMB/NFS/SSHFS).
*   🚀 **rEFInd Integration:** Automatically installs & configures the rEFInd boot manager.
*   🔄 **ISO Management:** Tools to download and update OS installation ISOs.
*   📝 **Configuration Management:** Save and load configurations for reproducible setups.
*   🛠️ **Developer Tools:** Includes QEMU, rEFInd, and other development tools.
*   📚 **Documentation:** Comprehensive documentation and guides.

## Goals

*   **Simplify:** Abstract away the complexities of partitioning and bootloader management.
*   **Enhance Safety:** Minimize risks during installation using QEMU virtualization.
*   **Provide Flexibility:** Support incremental, full, and potentially scripted setups.
*   **Ensure Portability:** Run entirely from a USB with persistent, user-accessible data.
*   **Offer Accessibility:** Cater to users via both GUI and Text interfaces.
*   **Facilitate Reproducibility:** Allow saving and loading of configurations.

## Technology Stack

AnyBoot leverages a modern web stack within a tailored Linux environment:

*   **Base OS:** Debian 12 Live
*   **App Framework:** Next.js (React)
*   **Backend/API:** Next.js API Routes
*   **Async Tasks:** Redis Queue
*   **Virtualization:** QEMU/KVM + OVMF (UEFI)
*   **Databases:** MongoDB (Config/State) & SQLite (Tracking)
*   **Bootloader:** rEFInd

For a detailed breakdown, see [project-techstack.md](project-techstack.md).

## Components

### ISO Manager (iso-manager)

The ISO Manager is a modular, multi-language suite of tools designed to simplify the management of OS installation images. It helps users find, download, verify, and organize ISO files for various operating systems.

#### Key Features

* **Modular Architecture**: Built with multiple specialized components, each under 500 lines of code for maintainability
* **Hash Verification**: Automatically verifies downloaded ISOs against SHA256/MD5 hashes
* **Multi-OS Support**: Handles Windows, Linux, and BSD distribution ISOs
* **Command-Line Interface**: Powerful CLI for automation and scripting
* **Customizable**: Configurable settings via `iso-manager.conf`

#### Components

* **Core Scripts**:
  * `iso-manager.sh`: Main Bash script for basic operations
  * `iso-manager-utils.sh`: Utility functions for the Bash component
  * `iso-manager-core.js`: Main Node.js script for advanced operations

* **Specialized Modules**:
  * `iso-utils.js`: Common utility functions
  * `iso-downloader.js`: Handles file downloads with progress tracking
  * `iso-list-manager.js`: Manages ISO lists and metadata
  * `iso-hash-verifier.js`: Verifies file integrity

#### Usage

```bash
# Basic ISO listing
./iso-manager.sh list

# Download an ISO with verification
./iso-manager-core.js download --download-dir ./ISO-Archive

# Verify an existing ISO
./iso-manager-core.js verify --hash-alg sha256
```

### ISO Manager Web Interface (iso-manager-web)

The ISO Manager Web Interface provides a modern, user-friendly web application for managing OS installation images. It offers the same functionality as the command-line tools but with an intuitive visual interface.

#### Key Features

* **Modern UI**: Clean, responsive design with card-based layout and dark mode
* **Visual Progress**: Real-time download progress with speed and ETA indicators
* **ISO Browsing**: Visual catalog of available ISO images with filtering and search
* **One-Click Downloads**: Simple, guided download experience
* **Integrated Verification**: Built-in hash checking ensures file integrity

#### Components

* **Server**: Node.js Express server that communicates with the ISO Manager backend
* **Frontend**: Modern JavaScript application with responsive UI
* **API**: RESTful endpoints for ISO operations

#### Usage

```bash
# Start the web interface
cd iso-manager
./run-web.sh

# Access the interface at http://localhost:5001
```

## Getting Started

*AnyBoot is currently under active development. These are the intended steps:*

1.  **Download:** Obtain the latest AnyBoot USB image (`.img` file).
2.  **Flash:** Write the image to a USB drive (minimum 16GB recommended) using tools like BalenaEtcher or `dd`.
3.  **Boot:** Boot your computer from the prepared AnyBoot USB drive.
4.  **Setup Persistence:** On first boot, follow the prompts to set up the persistent partitions on the USB drive itself.
5.  **Use AnyBoot:** The main application will launch automatically. Use the interface (GUI or Text) to:
    *   Design your target disk layout.
    *   Select OSes and provide ISO download links.
    *   Initiate the installation process.
    *   Follow the on-screen instructions for each OS installation within the QEMU window.
6.  **Reboot:** Once AnyBoot confirms completion and rEFInd setup, reboot your system (removing the AnyBoot USB) into your new multi-boot environment!

## Current Progress & Roadmap

This project is in its early stages. Development progress, including planned features, epics, and user stories, is tracked in the [**Project Plan**](project-plan.md).

The initial focus (v1.0 target) is on delivering the core workflow for installing Windows 11 and common Linux distributions (e.g., Ubuntu) reliably.

## Contributing

Contributions are welcome! Whether it's bug reports, feature suggestions, documentation improvements, or code contributions, your help is appreciated.

1.  **Issues:** Please check the existing [Issues](https://github.com/YourUsername/anyboot/issues) before creating a new one. Use templates if available.
2.  **Pull Requests:** For code changes, please open an issue first to discuss the proposed changes. Follow the guidelines in `CONTRIBUTING.md` (to be created) and ensure adherence to the [Coding Guidelines](coding-guidelines.md).
3.  **Code Style:** Please follow the guidelines outlined in [coding-guidelines.md](coding-guidelines.md).

## License

This project uses the **Elastic License 2.0** (ELv2). We chose this license because:

*   **Open Source for Security:** The source code is available for review and audit, enhancing security and trust.
*   **Free for Personal Use:** Individuals can freely use AnyBoot for personal projects and non-commercial purposes.
*   **Commercial Use Available:** For commercial use, please contact us to discuss licensing options.

See the [LICENSE](LICENSE) file for full details.

---

*Copyright 2025 Dataloes / Mikkel Georgsen*