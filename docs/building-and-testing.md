# Building and Testing AnyBoot

This document outlines the process for building the AnyBoot live ISO image and testing it using QEMU.

## Prerequisites

*   **Debian/Ubuntu based system:** The build process relies on `live-build`.
*   **Required Packages:** `live-build`, `qemu-system-x86`, `qemu-utils`, `ovmf`, `git`, `make`
    ```bash
    sudo apt update
    sudo apt install --needed live-build qemu-system-x86 qemu-utils ovmf git make
    ```
*   **Git:** To clone the repository.
*   **Make:** To use the provided Makefile.

## Building the ISO

The build process uses Debian's `live-build` tool, configured in the `live-build-config` directory.

1.  **Clone the repository:**
    ```bash
    git clone <repository-url> anyboot
    cd anyboot
    ```
2.  **Run the build:**
    ```bash
    make build
    ```
    This command will configure `live-build` (if not already done) and then start the build process. It downloads Debian packages and constructs the ISO file. **This can take a significant amount of time and download several gigabytes**, especially on the first run.

3.  **Output:** The resulting ISO file will be located at `live-build-config/anyboot.iso`.

## Cleaning the Build Environment

To remove all build artifacts and downloaded packages:

```bash
make clean
```

## Testing with QEMU

A helper script and Makefile target are provided to simplify testing the built ISO in a QEMU virtual machine.

1.  **Ensure the ISO is built:** Run `make build` if you haven't already.

2.  **Run the test environment:**
    ```bash
    make test
    ```
    This command performs the following actions:
    *   Checks if `live-build-config/anyboot.iso` exists.
    *   Checks if `anyboot-test.img` (a 16GB raw disk image) exists. If not, it creates it using `qemu-img`.
    *   Launches QEMU/KVM with:
        *   4GB RAM, 2 CPU cores.
        *   UEFI boot enabled via OVMF.
        *   The `anyboot.iso` attached as a virtual CD-ROM.
        *   The `anyboot-test.img` attached as a virtual USB storage device.
        *   Basic networking (user mode) enabled.
        *   VirtIO VGA and USB tablet for better guest interaction.

3.  **Inside QEMU:** The virtual machine should boot from the ISO. You can then interact with the AnyBoot live environment and test its functionality, including the persistence setup which should target the virtual USB drive (`/dev/sda` or similar within the VM).

## Cleaning the Test Environment

To remove the `anyboot-test.img` virtual disk image:

```bash
make test-clean
```

## Makefile Summary

*   `make build`: Build the ISO.
*   `make clean`: Clean build artifacts.
*   `make test`: Launch QEMU test environment (builds ISO if needed).
*   `make test-clean`: Remove the test disk image.
*   `make help`: Show available targets.
