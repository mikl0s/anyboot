# AnyBoot: Project Description

## Introduction

AnyBoot is a comprehensive solution designed to streamline the setup and management of multi-boot computer systems. It operates from a bootable USB drive containing a minimal Debian 12 live environment. AnyBoot provides a user-friendly interface (available in both graphical and text modes) to guide users through partitioning their hard drive, downloading OS installation media (ISOs), installing multiple operating systems (like Windows, various Linux distributions, and BSDs) onto *real* hardware partitions via a controlled QEMU environment, and finally configuring the rEFInd boot manager for seamless OS selection upon reboot.

## Vision

To be the definitive, user-friendly tool for creating, managing, and replicating complex multi-boot environments on personal computers, empowering users with flexibility and control over their operating system choices without the traditional risks and complexities.

## Goals

*   **Simplify Multi-Booting:** Abstract away the low-level complexities of partitioning, bootloader configuration, and sequential OS installation.
*   **Enhance Safety:** Utilize virtualization (QEMU) to run OS installers, targeting real partitions but reducing the risk of accidental data loss or bootloader corruption during the setup phase.
*   **Provide Flexibility:** Allow users to install a single OS initially and add more later, or configure a complete multi-OS setup in one go. Support both predefined/scripted layouts and ad-hoc configurations.
*   **Ensure Portability:** Run entirely from a USB drive with persistent storage for user configurations, downloaded ISOs, and logs.
*   **Offer Accessibility:** Provide both a modern graphical web UI (via Ungoogled Chromium) and a functional text-based UI (via Lynx) to cater to different user preferences and environments.
*   **Facilitate Reproducibility:** Enable users to save, load, and potentially share multi-boot configuration profiles.
*   **Maintain Up-to-Date Resources:** Include tools for easily updating the library of OS ISOs to their latest versions.

## What Problem Does AnyBoot Solve?

Setting up a multi-boot system traditionally involves several potentially risky steps:

1.  **Manual Partitioning:** Requires careful planning and execution, with high risk of data loss if done incorrectly.
2.  **Sequential Installation:** Often requires installing OSes in a specific order (e.g., Windows first) and involves multiple reboots.
3.  **Bootloader Management:** Different OSes may try to overwrite each other's bootloaders, leading to unbootable systems. Manually configuring bootloaders like GRUB for multiple OSes (especially mixing Linux, Windows, BSD) can be complex.
4.  **ISO Management:** Users need to manually download, verify, and manage potentially large ISO files.

AnyBoot addresses these pain points by:

*   **Automating Partitioning:** Based on user design, handles partition creation.
*   **Parallelized (Virtual) Installs:** Uses QEMU to run installers targeting real partitions, eliminating the need for sequential reboots during the setup phase.
*   **Centralized Boot Management:** Installs and configures rEFInd *after* all OSes are in place, providing a robust and aesthetically pleasing boot menu that reliably detects installed systems.
*   **Integrated ISO Management:** Provides tools to download and update ISOs directly within the application.
*   **Persistent USB Environment:** Keeps all tools, configurations, and downloaded ISOs together on a portable USB drive with a user-accessible exFAT partition.

## Value Proposition

AnyBoot offers significant value to PC enthusiasts, developers, testers, and IT professionals who need to run multiple operating systems on a single machine. It saves time, reduces the likelihood of critical errors, provides a consistent and repeatable process, and makes advanced multi-boot configurations accessible to a wider audience.

---