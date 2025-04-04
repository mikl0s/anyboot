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
    *   [P] Implement first-boot script to detect USB drive. (Placeholder: `config/includes.chroot/usr/local/bin/anyboot-first-boot-setup.sh`)
    *   [P] Implement first-boot script to prompt user for persistence setup. (Placeholder script exists)
    *   [P] Implement logic to create ESP (FAT32) partition on USB. (Placeholder script exists)
    *   [P] Implement logic to create System (ext4) partition on USB. (Placeholder script exists)
    *   [P] Implement logic to create MongoDB (ext4) partition on USB. (Placeholder script exists)
    *   [P] Implement logic to create Data (exFAT) partition on USB. (Placeholder script exists)
    *   [P] Configure the live system to correctly mount persistent partitions on boot. (Requires `persistence.conf` creation in script)
    *   [X] Install Openbox Window Manager. (Via package list)
    *   [X] Configure Openbox (e.g., `rc.xml`) for basic session. (Using defaults, autostart configured)
    *   [X] Configure LightDM (or alternative login manager/autostart script) to auto-start Openbox session and the AnyBoot Firefox instance. (`config/includes.chroot/etc/lightdm/lightdm.conf.d/`, `config/includes.chroot/etc/xdg/openbox/autostart`)
    *   [X] Install MongoDB service within the live environment. (Via package list, enabled via hook)
    *   [ ] Configure MongoDB to use the dedicated ext4 partition. (Requires hook/script post-persistence setup)
    *   [X] Install Redis service within the live environment. (Via package list, enabled via hook)
    *   [X] Install QEMU/KVM and OVMF packages. (Via package list)
    *   [X] Install rEFInd package and `refind-install` script. (Via package list)
    *   [X] Install Firefox package. (Via package list)
    *   [ ] Install Browsh (requires handling external dependencies/install script).
    *   [X] Install SMB/CIFS client tools (`cifs-utils`). (Via package list)
    *   [X] Install NFS client tools (`nfs-common`). (Via package list)
    *   [X] Ensure basic networking (DHCP client) works out-of-the-box. (Via NetworkManager package, enabled via hook)

## Epic: User Interface (Web & Text)

*   **Goal:** Develop the Next.js application providing both graphical and text-based user interfaces.
*   **Stories:**
    *   [X] Setup Next.js project structure.
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

## Epic: Backup & Restore (Clonezilla Integration)

*   **Goal:** Integrate Clonezilla to allow users to backup and restore entire disks or individual partitions to/from network storage (SMB, NFS, SSHFS).
*   **Stories:**
    *   [ ] Install Clonezilla and required tools (`clonezilla`, `cifs-utils`, `nfs-common`, `sshfs`, `pbzip2`, `p7zip`) into the live image package list.
    *   [ ] Implement backend logic for managing network share connections (saving credentials securely if possible, managing mount points).
    *   [ ] Implement persistence for network mounts across reboots (likely modifying `/etc/fstab` in the persistence layer).
    *   [ ] Create UI for managing network shares (add/edit/remove SMB/NFS/SSHFS shares, toggle auto-mount).
    *   [ ] Create UI for selecting source disk/partition for backup.
    *   [ ] Create UI for selecting target network share and directory/image name for backup.
    *   [ ] Create/Manage configuration file (e.g., `clonezilla_config.json`) for compression types (pbzip2, p7zip) and levels.
    *   [ ] Create UI for selecting compression type and level for backups.
    *   [ ] Implement backend logic to construct and execute non-interactive `ocs-sr` backup commands based on user selections.
    *   [ ] Create UI for browsing network shares to select an existing Clonezilla image for restore.
    *   [ ] Create UI for selecting target disk/partition for restore (with clear warnings).
    *   [ ] Implement backend logic to construct and execute non-interactive `ocs-sr` restore commands based on user selections.
    *   [ ] Display live output/progress of the `ocs-sr` command in a dedicated UI modal or log viewer.

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
    *   [X] Automate the `live-build` process (e.g., via a `Makefile` or script). (`Makefile`)
    *   [X] Document the steps to build the `anyboot.iso` image. (`docs/building-and-testing.md`)
    *   [X] Define the process for testing the built ISO using QEMU: (`scripts/test-qemu.sh`, `docs/building-and-testing.md`)
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