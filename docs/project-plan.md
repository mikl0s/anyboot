# AnyBoot: Project Plan (Epics & Stories)

*This is a living document tracking the development progress of AnyBoot. Mark items as done by changing `[ ]` to `[x]`.*

## Introduction

This plan breaks down the AnyBoot project into manageable Epics and User Stories. The goal is to have granular tasks that can be implemented and tested individually.

---

## Epic: Core Environment & USB Setup

*   **Goal:** Create the basic bootable Debian 12 Live USB environment with persistence.
*   **Stories:**
    *   [X] Define minimal Debian package set for the live OS. (`live-build-config/config/package-lists/anyboot.list.chroot`)
    *   [X] Configure live-build (or alternative) to generate the base ISO. (`live-build-config/auto/config`)
    *   [ ] Implement first-boot script to detect USB drive.
    *   [ ] Implement first-boot script to prompt user for persistence setup.
    *   [ ] Implement logic to create ESP (FAT32) partition on USB.
    *   [ ] Implement logic to create System (ext4) partition on USB.
    *   [ ] Implement logic to create MongoDB (ext4) partition on USB.
    *   [ ] Implement logic to create Data (exFAT) partition on USB.
    *   [ ] Configure the live system to correctly mount persistent partitions on boot.
    *   [ ] Install Openbox Window Manager.
    *   [ ] Configure Openbox (e.g., `rc.xml`) for basic session.
    *   [ ] Configure LightDM (or alternative login manager/autostart script) to auto-start Openbox session and the AnyBoot Firefox instance.
    *   [ ] Install MongoDB service within the live environment.
    *   [ ] Configure MongoDB to use the dedicated ext4 partition.
    *   [ ] Install Redis service within the live environment.
    *   [ ] Install QEMU/KVM and OVMF packages.
    *   [ ] Install rEFInd package and `refind-install` script.
    *   [ ] Install Firefox package.
    *   [ ] Install Browsh (requires handling external dependencies/install script).
    *   [ ] Install SMB/CIFS client tools (`cifs-utils`).
    *   [ ] Install NFS client tools (`nfs-common`).
    *   [ ] Ensure basic networking (DHCP client) works out-of-the-box.

## Epic: User Interface (Web & Text)

*   **Goal:** Develop the Next.js application providing both graphical and text-based user interfaces.
*   **Stories:**
    *   [ ] Setup Next.js project structure.
    *   [ ] Design basic UI layout/wireframes.
    *   [ ] Implement main application shell/navigation.
    *   [ ] Create component for designing/visualizing disk partition layout.
    *   [ ] Create component for listing/selecting OSes to install.
    *   [ ] Create component for managing ISO sources/URLs.
    *   [ ] Create component for displaying task progress and logs.
    *   [ ] Implement WebSocket/SSE client logic for real-time updates.
    *   [ ] Develop API route structure in Next.js.
    *   [ ] Ensure UI renders correctly in Firefox (Kiosk Mode).
    *   [ ] Ensure UI is functional and readable in Browsh (Text Mode).
    *   [ ] Implement UI theme selection/support (basic themes).
    *   [ ] Create UI element for user guidance/prompts (e.g., Windows driver warning).
    *   [ ] Add interface elements for triggering CLI tools (ISO update, config management).
    *   [ ] Implement UI elements for configuring and mounting network shares (SMB/NFS).

## Epic: Backend & Core Logic

*   **Goal:** Implement the backend API routes and core logic for managing installations.
*   **Stories:**
    *   [ ] Implement API route for listing available disks/partitions on the host machine.
    *   [ ] Implement API route for creating partitions (`parted` wrapper).
    *   [ ] Implement API route for formatting partitions (`mkfs` wrapper).
    *   [ ] Implement API route for downloading ISOs (handle async, progress reporting).
    *   [ ] Implement API route for validating ISO checksums (optional).
    *   [ ] Implement Redis task queue integration.
    *   [ ] Implement background job worker for ISO downloads using Redis queue.
    *   [ ] Implement API route to trigger QEMU instance launch.
    *   [ ] Develop logic to construct correct QEMU command-line arguments (memory, CPU, disk passthrough, ISO C D).
    *   [ ] Implement background job worker for managing QEMU processes using Redis queue.
    *   [ ] Implement API route/logic for installing rEFInd (`refind-install` wrapper).
    *   [ ] Implement logic to detect installed OSes for rEFInd configuration.
    *   [ ] Implement API route for saving/loading user configurations (layouts, ISO lists) to MongoDB.
    *   [ ] Implement logging mechanism for backend operations (store logs on exFAT partition).
    *   [ ] Implement WebSocket/SSE server logic to push progress/log updates to UI.
    *   [ ] Define SQLite schema for tracking job status/history.
    *   [ ] Implement API routes for interacting with SQLite database.

## Epic: OS Installation Workflow

*   **Goal:** Orchestrate the end-to-end process of installing an OS via QEMU.
*   **Stories:**
    *   [ ] Define data structure for an "Installation Job".
    *   [ ] Implement workflow: User defines layout -> Partitions created -> ISO downloaded -> QEMU launched.
    *   [ ] Ensure QEMU launches with the correct target partition passed as raw disk.
    *   [ ] Ensure QEMU uses OVMF/UEFI firmware.
    *   [ ] Ensure QEMU boots from the specified ISO.
    *   [ ] Monitor QEMU process state (running, finished, error).
    *   [ ] Provide mechanism for user to know when OS install *inside* QEMU is complete.
    *   [ ] Handle errors during partitioning, download, or QEMU launch.
    *   [ ] Implement workflow for installing multiple OSes sequentially or concurrently (via multiple QEMU instances if feasible/safe).
    *   [ ] Implement final step: Run `refind-install` after all selected OS installs are complete.

## Epic: CLI Tools & Maintenance

*   **Goal:** Provide command-line utilities for managing ISOs and configurations.
*   **Stories:**
    *   [ ] Create script/tool to fetch/update ISOs based on a predefined list (e.g., from GitHub).
    *   [ ] Create script/tool to add/remove custom ISO sources.
    *   [ ] Create script/tool to list/manage saved configurations from the command line.
    *   [ ] Ensure CLI tools can be run from within the live environment.
    *   [ ] Ensure CLI tools can potentially be run by mounting the USB's exFAT partition on another OS.

## Epic: Development & Testing Workflow
*   **Goal:** Establish a reliable process for building, testing, and iterating on the AnyBoot live image.
*   **Stories:**
    *   [ ] Automate the `live-build` process (e.g., via a `Makefile` or script).
    *   [ ] Document the steps to build the `anyboot.iso` image.
    *   [ ] Define the process for testing the built ISO using QEMU:
        *   Create a virtual disk image (e.g., `qemu-img create -f raw anyboot-test.img 16G`).
        *   Write the `anyboot.iso` to the virtual disk image (simulating `dd` or using QEMU's ISO boot capability initially).
        *   Launch QEMU/KVM, attaching `anyboot-test.img` as a USB drive (`-drive if=none,id=stick,format=raw,file=anyboot-test.img -device usb-storage,drive=stick`).
        *   Ensure UEFI boot via OVMF (`-bios /usr/share/ovmf/OVMF.fd` or similar).
    *   [ ] Establish baseline tests to run within QEMU (e.g., check boot, persistence setup prompt, network access, UI launch).

## Epic: Documentation & Testing

*   **Goal:** Document the project and ensure basic functionality through testing.
*   **Stories:**
    *   [ ] Write README.md for the project.
    *   [ ] Add basic usage instructions.
    *   [ ] Document the USB partition layout.
    *   [ ] Document how to contribute (CONTRIBUTING.md).
    *   [ ] Perform manual testing of the core workflow (Single Windows install).
    *   [ ] Perform manual testing of the core workflow (Single Linux install).
    *   [ ] Perform manual testing of a multi-boot scenario (e.g., Windows + Ubuntu).
    *   [ ] Test persistence across reboots.
    *   [ ] Test both GUI and Text UI modes.
    *   [ ] (Optional) Setup basic unit tests for critical backend logic.
    *   [ ] (Optional) Setup basic integration tests for API routes.

---