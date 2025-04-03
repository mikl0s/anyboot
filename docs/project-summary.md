# AnyBoot: Project Summary

## Overview

AnyBoot is a portable, live-bootable application designed to help users plan, configure, and execute advanced multi-boot workstation setups. It operates from a USB drive containing a minimal Debian 12 environment and enables the installation of Windows, Linux, and BSD systems into *real* hardware partitions using controlled, virtualized installers (QEMU). AnyBoot emphasizes flexibility, safety, and ease of use, supporting both incremental and full multi-OS setups through a user-friendly interface available in graphical and text modes.

## Core Features

*   **Live USB System:** Boots into a minimal Debian 12 environment.
*   **Dual User Interface:**
    *   **Graphical:** Full-screen Firefox (kiosk mode).
    *   **Text:** Browsh browser interface (renders web apps in TTY).
*   **Persistent Storage:** Uses dedicated USB partitions, including a user-accessible exFAT partition for ISOs, configurations, and logs.
*   **Layout Designer:** Interactive interface to plan disk partitions.
*   **Virtualized Installation:** Uses QEMU to safely run OS installers targeting real disk partitions, minimizing risk and reboots during setup.
*   **Incremental Setup:** Install one OS now, add more later, or configure everything at once.
*   **rEFInd Integration:** Automatically installs and configures the rEFInd boot manager for a clean multi-boot menu.
*   **ISO Management:** Tools to download and update OS installation ISOs.

## Technology Highlights

*   **Base OS:** Debian 12 Live
*   **Application Framework:** Next.js (Frontend & Backend API Routes)
*   **Task Queue:** Redis (for async operations like downloads/installs)
*   **Real-time Updates:** WebSockets/SSE
*   **Databases:** MongoDB (configs/state), SQLite (tracking/metadata)
*   **Virtualization:** QEMU/KVM with OVMF (UEFI)
*   **Bootloader:** rEFInd

## USB Storage Layout

| Partition | Type  | Size        | Purpose                                           |
| :-------- | :---- | :---------- | :------------------------------------------------ |
| ESP       | FAT32 | ~512MB      | EFI system partition                              |
| System    | ext4  | ~4 GB       | Debian 12 OS + AnyBoot App + Chromium             |
| MongoDB   | ext4  | ~1 GB       | Dedicated MongoDB database storage                |
| Data      | exFAT | Remainder   | User-accessible (ISOs, configs, logs, scripts)    |
*Minimum Recommended USB Size: 16 GB*

## Workflow

1.  Boot AnyBoot USB.
2.  Auto-launch UI (GUI or Text).
3.  Design partition layout & select OSes.
4.  AnyBoot downloads ISOs & creates partitions.
5.  OS installers run inside QEMU, targeting real partitions.
6.  User completes installs within QEMU.
7.  AnyBoot installs & configures rEFInd.
8.  Reboot into the newly configured multi-boot system.

---