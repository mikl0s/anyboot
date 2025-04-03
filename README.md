# Product Requirements Document – AnyBoot

## Overview
AnyBoot is a live Linux-based utility designed to allow users to plan and execute advanced multi-boot setups on real hardware. It supports installing multiple operating systems incrementally using virtualization tools, with persistent configuration and ISO management from a user-accessible USB.

---

## Goals

- Provide a persistent, self-contained live system to manage multi-OS installations
- Allow ISO-based installs of Windows, Linux, BSD using QEMU
- Store configuration data in a dedicated, isolated local database (MongoDB)
- Store logs, ISO files, and user scripts on an exFAT partition for cross-OS accessibility
- Offer both graphical and text-based UI

---

## Functional Requirements

1. **Bootable Environment**
   - Based on Debian 12 Live
   - Automatic login to lightweight window manager
   - Launch app fullscreen

2. **UI Options**
   - Fullscreen browser (Chromium) in GUI
   - Lynx-based UI in CLI mode

3. **Partitioning Tool**
   - Visual and scriptable partition designer
   - Uses parted and mkfs tools
   - Stores layouts in MongoDB

4. **ISO Management**
   - Download ISO from HTTPS links
   - Validate and cache in exFAT partition
   - Show download status and history

5. **Virtualized Installation**
   - Launch ISO in QEMU with target partition
   - Monitor install progress and logs
   - Trigger rEFInd update post-install

6. **Persistence**
   - MongoDB on dedicated 1GB ext4 partition
   - Configs and logs on exFAT partition
   - ISO cache on exFAT

7. **System Requirements**
   - Minimum USB: 16GB
   - Partitions auto-configured on first boot

---

## Non-Functional Requirements

- Should operate fully offline after initial ISO downloads
- Must not enforce user sign-in
- Must operate reliably with minimal RAM (2GB+)
- Fully open for personal use under Elastic 2.0 license

---

## Future Features

- Cloud config sync
- USB-to-USB clone tool
- Community shared layout templates
