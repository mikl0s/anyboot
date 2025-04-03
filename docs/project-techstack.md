# AnyBoot: Technology Stack

*This is a living document. Please update it as the technology choices evolve.*

## Introduction

This document outlines the core technologies and architectural components used in the AnyBoot project. AnyBoot is designed as a portable, live-bootable application for managing multi-OS installations.

## Architecture Overview

AnyBoot runs within a custom Debian 12 Live environment booted from a USB drive. It uses a web-based technology stack for its user interface and backend logic, interacting with system tools for partitioning, virtualization, and bootloader management. Data persistence is handled via dedicated partitions on the USB drive.

## Core Components

### 1. Base Operating System & Environment

*   **OS:** Debian 12 (Slim/Minimal)
*   **Boot Method:** Live USB Image
*   **Window Manager:** Lightweight WM (e.g., Openbox, i3, or similar TBD) - Auto-launches the AnyBoot UI.
*   **Persistence:** Achieved via dedicated partitions on the USB drive (see Storage Layout).

### 2. Frontend & User Interface

*   **Framework:** Next.js (React-based)
    *   Provides Server-Side Rendering (SSR) or Static Site Generation (SSG) for the UI.
    *   Handles routing and UI logic.
*   **Graphical Mode Browser:** Ungoogled Chromium (from Debian 12 packages)
    *   Runs in Kiosk mode (`--kiosk`) for a full-screen application experience.
*   **Text Mode Browser:** Browsh
    *   Renders the Next.js web application in a TTY environment using Firefox's headless mode.
    *   Provides a richer text-based experience compared to pure text browsers like Lynx.
*   **Styling:** CSS Modules / Tailwind CSS / Emotion (TBD - choose one for consistency)
*   **Real-time Updates:** WebSockets (primary) or Server-Sent Events (SSE) (fallback) for pushing progress/logs from backend to frontend.

### 3. Backend & Middleware

*   **Web Server Binding:** Configurable to bind to `localhost` (default) or `0.0.0.0` (for network access).
*   **Framework:** Next.js API Routes
    *   Provides serverless function endpoints for handling application logic.
*   **Runtime:** Node.js (inherent to Next.js)
*   **Task Queue:** Redis
    *   Manages asynchronous background jobs (ISO downloads, QEMU instance management, long-running operations).
    *   Helps maintain frontend responsiveness.
*   **Process Execution:** Node.js `child_process` module (or similar library like `execa`)
    *   Used to invoke system commands (`parted`, `mkfs`, `qemu-system-x86_64`, `refind-install`, etc.).

### 4. Databases & Storage

*   **Configuration/State Storage:** MongoDB
    *   Stores user-defined layouts, session state, application settings, ISO metadata.
    *   Runs as a local service within the live environment.
    *   Data stored on a dedicated `ext4` partition on the USB.
*   **Relational/Tracking Data:** SQLite
    *   Stores job history, task status, install logs references, potentially structured metadata mappings.
    *   Database file stored likely within the MongoDB partition or System partition.
*   **USB Storage Layout:**
    *   **Partition 1 (ESP):** `FAT32` (~512MB) - For UEFI boot files.
    *   **Partition 2 (System):** `ext4` (~4GB) - Debian 12 OS, AnyBoot application, Chromium, supporting tools.
    *   **Partition 3 (MongoDB):** `ext4` (~1GB) - Dedicated storage for MongoDB data files.
    *   **Partition 4 (Data):** `exFAT` (Remainder) - User-accessible storage for downloaded ISOs, exported configurations, logs, helper scripts.

### 5. Virtualization / Emulation

*   **Engine:** QEMU/KVM
    *   `qemu-system-x86_64` used to boot OS ISO installers.
    *   KVM enabled (`-enable-kvm`) for hardware acceleration.
*   **Firmware:** OVMF (UEFI firmware for QEMU)
*   **Machine Type:** `q35` (Modern chipset emulation)
*   **Disk Access:** Raw partition passthrough (`-drive file=/dev/sdXN,format=raw`) allowing installers to write directly to target partitions.
*   **Drivers:** VirtIO drivers potentially used for better performance during install within QEMU (network, disk).

### 6. Bootloader Management

*   **Target Bootloader:** rEFInd
    *   Installed to the host machine's ESP (or the target disk's ESP).
    *   `refind-install` script used for installation.
    *   Configuration (`refind.conf`) potentially managed by AnyBoot to add/update entries and themes.

### 7. Supporting Tools & Libraries

*   **Partitioning:** `parted`, `lsblk`, `sfdisk` (command-line tools)
*   **Filesystem:** `mkfs.*` (e.g., `mkfs.ntfs`, `mkfs.ext4`, `mkfs.vfat`, `mkfs.exfat`), `mount`, `umount`
*   **ISO Downloading:** `curl` or `wget`, potentially Node.js HTTP clients (`axios`, `node-fetch`).
*   **Scripting:** Bash/Shell scripts for orchestration, potentially Python if more complex logic is needed.
*   **Build/Packaging:** Tools to create the custom Debian Live USB image (e.g., `live-build`)

### 8. Development & Infrastructure

*   **Version Control:** Git / GitHub (or similar)
*   **Package Management:** `npm` or `yarn` (for Node.js), `apt` (for Debian packages)
*   **Linting/Formatting:** ESLint, Prettier (TBD)
*   **CI/CD:** (Optional/Future) GitHub Actions or similar for automated testing and build of the live USB image.

---