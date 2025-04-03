# AnyBoot: Network Management

## Goal

To provide reliable network connectivity within the AnyBoot live environment, enabling essential functions like downloading OS ISOs and fetching configuration updates. The system prioritizes automatic configuration where possible but provides a user-friendly mechanism for manual setup (especially for Wi-Fi) when needed.

## Core Technology: NetworkManager

AnyBoot utilizes the standard Debian **NetworkManager** service (`network-manager` package) as the primary tool for managing network connections.

**Rationale:**

*   Handles both wired (Ethernet) and wireless (Wi-Fi) interfaces dynamically.
*   Manages DHCP client requests automatically.
*   Integrates with `wpa_supplicant` for robust Wi-Fi authentication (WPA/WPA2/WPA3).
*   Provides standard command-line (`nmcli`) and text-UI (`nmtui`) tools for interaction and status checking.

## Required Components & Setup

The following components must be included in the AnyBoot Debian Live build and configured correctly:

1.  **Packages:**
    *   `network-manager`: The core service and tools.
    *   `wpa_supplicant`: For Wi-Fi authentication (usually a dependency).
    *   `nmtui`: NetworkManager Text User Interface for user interaction.
    *   **Wireless Firmware:** Essential for Wi-Fi hardware support. Include relevant packages like:
        *   `firmware-iwlwifi` (Intel)
        *   `firmware-realtek`
        *   `firmware-atheros`
        *   `firmware-brcm80211` (Broadcom)
        *   `firmware-misc-nonfree` (Others)
        *(Ensure `non-free` and `non-free-firmware` sources are enabled during build).*
2.  **Service Enabling:** The `NetworkManager.service` must be enabled to start automatically on boot within the live environment.

## Connection Flow

AnyBoot employs a connectivity check *before* launching the main user interface (Ungoogled Chromium or Browsh).

1.  **Automatic Startup:** NetworkManager service starts automatically upon booting the live environment.
2.  **Automatic Wired Connection:** If an Ethernet cable is connected to a network providing DHCP, NetworkManager will typically configure the connection and obtain an IP address automatically without user interaction.
3.  **Pre-Application Connectivity Check:**
    *   A script runs *after* NetworkManager starts but *before* the main AnyBoot UI launches.
    *   This script checks the network status using `nmcli networking connectivity`.
    *   **Scenario A: Connection Established:** If the status is `full` (indicating internet access), the script exits successfully, and the boot process proceeds to launch the main AnyBoot UI.
    *   **Scenario B: No/Limited Connection:** If the status is `none` or `limited`:
        *   The script automatically launches the `nmtui` application directly in the current terminal (TTY).
        *   The user interacts with `nmtui` to:
            *   Activate a connection.
            *   Scan for and select a Wi-Fi network (SSID).
            *   Enter the Wi-Fi password if required.
        *   The script waits for the user to exit `nmtui`.
        *   Upon `nmtui` exit, the script **re-checks** the connectivity using `nmcli networking connectivity`.
        *   **If connectivity is now `full`:** The script exits successfully, and the AnyBoot UI launches with network access.
        *   **If connectivity is still `none` or `limited`:** (User cancelled `nmtui` or connection failed) The script prints a warning message to the console indicating that network features will be unavailable, then exits successfully. The AnyBoot UI launches in a potentially offline-capable mode.

## User Experience Summary

*   For users with a simple wired DHCP setup, networking should work transparently without interruption.
*   For users needing to connect to Wi-Fi or configure a connection manually, they will be presented with the `nmtui` interface *before* the main AnyBoot application starts.
*   The main application will only launch once the network is either confirmed working or the user has bypassed/failed the manual setup, ensuring network-dependent features are either available or the user is aware they are not.
*   Network configuration details (like saved Wi-Fi passwords) are managed securely by NetworkManager itself, not stored within AnyBoot's MongoDB database.