# AnyBoot: Product Requirements Document (PRD)

**Version:** 1.0
**Date:**   2025-04-03
**Status:** Draft

## 1. Introduction

AnyBoot is a software tool delivered as a bootable live USB environment designed to simplify the creation, management, and execution of multi-boot operating system setups on personal computers. It provides a guided, safe, and flexible workflow for partitioning a target drive, downloading OS installation media, installing multiple operating systems (Windows, Linux, BSD) via controlled virtualization (QEMU) onto real partitions, and configuring a user-friendly boot manager (rEFInd). The system operates primarily from the USB drive, utilizing persistent storage for configuration, logs, and OS installation media.

## 2. Goals

*   **Simplify Multi-boot Setup:** Make the process of setting up complex multi-boot configurations significantly easier and less error-prone than traditional methods.
*   **Enhance Installation Safety:** Reduce the risk of data loss or bootloader corruption during the OS installation phase by leveraging virtualization (QEMU) to isolate the installer from the host system while still targeting real partitions.
*   **Provide User Flexibility:** Support installing a single OS initially with the option to add more later, or setting up multiple OSes simultaneously. Allow both graphically designed and potentially scripted/pre-defined layout configurations.
*   **Offer Accessibility:** Cater to different user preferences and environments by providing both a graphical (web-based) UI and a functional text-based UI.
*   **Ensure Portability & Persistence:** Operate entirely from a standard USB drive, persisting user configurations, downloaded ISOs, and logs across sessions on a user-accessible partition.
*   **Centralize Boot Management:** Reliably configure a modern boot manager (rEFInd) to automatically detect and present all successfully installed operating systems.
*   **Streamline ISO Management:** Integrate tools for downloading and potentially updating OS installation ISOs directly within the application.

## 3. Non-Goals

*   **General-Purpose Partitioning Tool:** AnyBoot is focused on partitioning *for the purpose of multi-boot OS installation*. It is not intended to replace dedicated tools like GParted for general disk management tasks.
*   **Data Backup/Recovery Solution:** AnyBoot modifies partitions and installs OSes; it does not provide data backup or recovery features. Users are expected to back up their data independently before using AnyBoot.
*   **Automatic Driver Installation:** AnyBoot facilitates the OS installation process. It does not automatically install specific hardware drivers *within* the installed OSes (though it will prompt the user about steps like running Windows Update).
*   **Support for Obscure/Legacy Hardware/OSes:** Initial focus is on modern UEFI systems and commonly used versions of Windows, Linux (Debian-based, Fedora-based, Arch-based initially), and potentially FreeBSD/OpenBSD. Legacy BIOS support or exotic OS compatibility is not a primary goal for v1.0.
*   **Full Disk Encryption Setup:** While installed OSes might support FDE, AnyBoot itself will not manage or automate the setup of complex full-disk encryption schemes during its partitioning/installation phase in v1.0.
*   **A Complete Desktop Environment:** The live USB environment is minimal, designed solely to run the AnyBoot application and necessary system tools.

## 4. User Personas

*   **PC Enthusiast:** Wants to experiment with different Linux distributions or BSD alongside their primary Windows installation. Values flexibility and control but may lack deep technical expertise in manual bootloader configuration.
*   **Developer/Tester:** Needs specific OS environments for development or testing purposes on bare metal. Requires a repeatable and reliable way to set up multiple OSes quickly.
*   **IT Professional/Sysadmin:** May need to deploy standardized multi-boot configurations on workstations. Values efficiency, reproducibility, and potentially scripting capabilities.
*   **Security Researcher:** May require isolated OS instances on the same hardware.

## 5. Features / User Stories

### 5.1. USB Environment & Setup

*   **USB-1:** As a user, I want to boot my computer from the AnyBoot USB drive into a functional live environment.
*   **USB-2:** As a user, upon first boot, I want to be guided through creating the necessary persistent partitions (System, MongoDB, Data) on the AnyBoot USB drive.
*   **USB-3:** As a user, I want the live environment to automatically detect and configure basic network connectivity via DHCP.
*   **USB-4:** As a user, I want the core AnyBoot application to launch automatically after the live environment boots.
*   **USB-5:** As a user, I want to be able to access the 'Data' partition (exFAT) from other operating systems (Windows, macOS, Linux) by plugging in the USB drive.

### 5.2. User Interface

*   **UI-1:** As a user, I want the option to use either a graphical interface (via Ungoogled Chromium) or a text-based interface (via Browsh) to control AnyBoot.
*   **UI-2:** As a user, in the graphical mode, I want the application to run full-screen (kiosk mode) for an immersive experience.
*   **UI-3:** As a user, I want a clear and intuitive interface for designing the target disk partition layout.
*   **UI-4:** As a user, I want to see real-time progress updates and logs for ongoing tasks like downloads and installations.
*   **UI-5:** As a user, I want to receive helpful prompts or warnings (e.g., reminder to let Windows install drivers before final reboot).
*   **UI-6:** As a user, I want the text-based interface (Browsh) to provide access to all core functionalities available in the graphical interface, rendering the same Next.js application.

### 5.3. Configuration & Layout

*   **CFG-1:** As a user, I want to select the target hard drive where the operating systems will be installed.
*   **CFG-2:** As a user, I want to define partitions for each OS, specifying size and filesystem type (where applicable/configurable).
*   **CFG-3:** As a user, I want AnyBoot to visually represent the proposed partition layout before applying changes.
*   **CFG-4:** As a user, I want to provide HTTPS URLs for the OS installation ISOs I intend to use.
*   **CFG-5:** As a user, I want to save my multi-boot configuration (layout, ISO list) for later use or modification.
*   **CFG-6:** As a user, I want to load a previously saved configuration.
*   **CFG-7:** As a user, I want AnyBoot to store my configurations and downloaded ISOs persistently on the USB drive's Data partition.
*   **CFG-8:** As a user, I want an option in the settings to make the AnyBoot web server accessible over the network (bind to `0.0.0.0`), allowing me to use the graphical UI from another machine.

### 5.4. OS Installation Process

*   **INST-1:** As a user, I want AnyBoot to download the specified ISOs securely over HTTPS and store them on the USB Data partition.
*   **INST-2:** As a user, I want AnyBoot to create the partitions on the target drive according to my defined layout.
*   **INST-3:** As a user, I want AnyBoot to launch the OS installer from the ISO inside a QEMU virtual machine.
*   **INST-4:** As a user, I want the QEMU VM to be configured to pass through the correct target partition as a raw disk, enabling the OS to install directly onto it.
*   **INST-5:** As a user, I want to interact with the standard graphical OS installer (e.g., Windows Setup, Ubuntu Ubiquity) running inside the QEMU window.
*   **INST-6:** As a user, I want AnyBoot to manage the installation process for one or multiple OSes sequentially (or potentially in parallel if safe).
*   **INST-7:** As a user, I want AnyBoot to handle potential errors during partitioning, download, or QEMU launch gracefully and provide informative logs.

### 5.5. Bootloader Management

*   **BOOT-1:** As a user, after all selected OS installations are complete within QEMU, I want AnyBoot to automatically install the rEFInd boot manager to the target system's EFI System Partition (ESP).
*   **BOOT-2:** As a user, I want rEFInd to be configured to automatically detect all the operating systems installed by AnyBoot.
*   **BOOT-3:** As a user, upon rebooting my computer without the AnyBoot USB, I want to see the rEFInd menu allowing me to boot into any of the installed operating systems.

### 5.6. Maintenance & Utilities

*   **UTIL-1:** As a user, I want a command-line tool (accessible from the live environment or potentially other OSes via the mounted Data partition) to update the list of available ISOs or fetch the latest versions based on a predefined source (e.g., GitHub file).
*   **UTIL-2:** As a user, I want to easily view logs generated by AnyBoot, stored on the USB Data partition.

## 6. Design & UX Considerations

*   **Simplicity:** The interface should guide the user clearly through the steps, abstracting complexity where possible.
*   **Consistency:** The experience in both GUI (Chromium) and Text (Browsh) modes should be functionally equivalent, leveraging the single Next.js application base.
*   **Visual Feedback:** Provide clear indicators of progress, success, failure, and current state.
*   **Safety Prompts:** Include clear warnings before destructive actions (partitioning) and reminders for post-install steps (driver updates).
*   **ExFAT Partition Usability:** Ensure the Data partition is easily usable by common desktop OSes for managing ISOs and configs manually if desired.
*   **rEFInd Theming:** Default rEFInd configuration should be clean and presentable. Consider including a few basic themes.
*   **Network Accessibility:** If the `0.0.0.0` binding is enabled, provide clear instructions or feedback on how to access the UI from another device.

## 7. Technical Requirements

*   **Platform:** Bootable USB drive, targeting modern x86-64 UEFI systems.
*   **Base OS:** Debian 12 Minimal Live environment.
*   **Core Application:** Next.js application serving both UI and backend API routes.
*   **Virtualization:** QEMU/KVM with OVMF firmware and raw partition access.
*   **Storage:** Adhere to the defined USB partition layout (ESP/FAT32, System/ext4, MongoDB/ext4, Data/exFAT).
*   **Persistence:** MongoDB for config/state, SQLite for tracking, exFAT for user files/ISOs/logs.
*   **Asynchronicity:** Use Redis for managing long-running background tasks (downloads, QEMU sessions).
*   **Real-time:** Utilize WebSockets (or SSE fallback) for frontend updates.
*   **Code Quality:** Adhere to the `coding-guidelines.md`, including the 500-line limit per file.

## 8. Release Criteria (Example for v1.0)

*   Core workflow (design layout, download ISO, partition, install via QEMU, configure rEFInd) is functional for at least:
    *   One Windows 11 installation.
    *   One common Linux distribution installation (e.g., Ubuntu 22.04 LTS).
    *   A combination of Windows 11 + Ubuntu 22.04 LTS.
*   USB persistence setup works correctly on first boot.
*   Both GUI (Chromium) and Text (Browsh) modes are functional for the core workflow.
*   rEFInd successfully detects and boots the installed OSes.
*   Basic ISO download and management functionality is present.
*   Basic configuration saving/loading is functional.
*   Critical user prompts and warnings are implemented.
*   Essential documentation (README, basic usage) is available.

## 9. Future Considerations

*   Support for scripting/automating setups (headless installs).
*   Wider range of tested and supported Linux distributions and BSDs.
*   More sophisticated error handling and recovery options.
*   Integration with cloud storage for configurations or ISOs.
*   Advanced partitioning options (e.g., LVM, ZFS - potentially complex).
*   Enhanced rEFInd theme customization.
*   Checksum validation for downloaded ISOs.
*   CI/CD pipeline for building the live USB image automatically.
*   Support for BIOS systems (lower priority).