# AnyBoot UI Layout Description (Graphical Browser Mode)

## Overall Layout Structure

The UI adopts a wizard-style navigation through multiple steps. It features a persistent Header Bar, a dynamic Main Content Area specific to each step, and a persistent Footer Navigation Bar. Consistency in element appearance and behavior is prioritized. Warnings and confirmations precede destructive actions.

## Persistent Elements

### Header Bar
*   **Left:** AnyBoot Logo/Name.
*   **Center:** Current Step Indicator (e.g., "Step 3 of 7: Design Partition Layout").
*   **Right:**
    *   Floppy Disk Icon (Tooltip: "Save Draft Layout to USB Data").
    *   Folder Icon (Tooltip: "Load Layout from USB Data").
    *   Gear Icon (Tooltip: "Settings") - Opens a modal window for Network Binding and Network Share configuration.
    *   Logs Icon (Tooltip: "Show Activity Log") - Opens the main activity log in a modal window.

### Footer Navigation Bar
*   **Left:** "Back" button (enabled where appropriate).
*   **Right:** "Next" or action-specific button (e.g., "Start Installation", "Finish") (enabled when step requirements are met).

## Step-by-Step Main Content Area

### Step 1: Welcome & Initialization
*   **Heading:** Welcome to AnyBoot
*   **Content:** Brief description of AnyBoot's purpose. Read-only area displaying system checks (UEFI Mode, Network Status, Memory).
*   **Actions:** Two large buttons/cards: "Start New Configuration" and "Load Existing Configuration" (uses USB Data partition).
*   **Footer:** "Next" enabled after selecting an option.

### Step 2: Target Disk Selection
*   **Heading:** Select Target Disk
*   **Content:** List of detected block devices (Name, Model, Size, Type Icon). Radio buttons for selection.
*   **Warning:** Prominent box warning about potential data loss and the need for backups.
*   **Footer:** "Back" and "Next" buttons (Next enabled after selection).

### Step 3: Design Partition Layout
*   **Heading:** Design Partition Layout for [Selected Disk Name]
*   **Content:**
    *   Horizontal Visual Disk Bar representing the disk, showing allocated/unallocated space.
    *   Partition Definition Area:
        *   Button: "+ Add Partition".
        *   Table/List of partitions. Each row includes: Label (Input), OS Type (Dropdown), Size (Input + Unit/Fill), Filesystem (Dropdown).
        *   Per-row Action Buttons: "Remove", "Advanced..." (opens a modal for partition flags/options).
    *   Summary Info: Displaying Total Allocated, Remaining Unallocated space.
*   **Footer:** "Back" and "Next" buttons (Next enabled when layout seems valid).

### Step 4: Configure Operating Systems & ISOs
*   **Heading:** Configure Operating Systems
*   **Content:** List/Cards for partitions marked as an OS Type. For each OS:
    *   OS Label and Target Partition info displayed.
    *   ISO Source Section Heading: "Provide Installation Media".
    *   Options:
        *   Input field for "HTTPS ISO URL".
        *   Button: "Select from Library..." (opens modal listing known ISOs from `library.json`).
        *   Button: "Browse USB Data Partition..." (file browser scoped to USB Data).
        *   Button: "Browse Network Share..." (file browser for configured shares).
    *   Status Indicator: Shows state (Not Specified, URL Provided, Local File Selected, Downloading, Downloaded, Error).
    *   Overall Status: Summary like "X of Y OSes configured".
*   **Footer:** "Back" and "Next" buttons (Next enabled when all OS partitions have a valid ISO source).

### Step 5: Review & Confirmation
*   **Heading:** Review Configuration
*   **Content:** Read-only summary sections for Target Disk, Final Partition Layout (visual bar + list), and Operating Systems (list with ISO sources).
*   **Critical Warning:** Red-bordered box emphasizing irreversible actions, data destruction risk, and backup necessity.
*   **Confirmation:** Checkbox "[ ] I understand the risks, have backed up my data, and wish to proceed."
*   **Footer:** "Back" button and "Start Installation" button (disabled until checkbox is ticked).

### Step 6: Installation Progress
*   **Heading:** Installation in Progress...
*   **Content:**
    *   Overall Progress: Flow diagram/list showing main stages (Partitioning, Downloading, Install OS 1, Install OS 2, Configure Bootloader) with current stage highlighted.
    *   Detailed Status Area: Shows text updates for the current stage.
    *   QEMU Interaction Section (appears per OS install):
        *   Text: "Launching installer for [OS Name] in a separate window..."
        *   Status: "Waiting for user interaction in QEMU window..."
        *   Button: "**Confirm [OS Name] Installation Complete**" (enabled when QEMU runs; clicking signals backend completion for cleanup and proceeding).
    *   Log Viewer Button: "Show Detailed Logs" opens logs in a modal window.
*   **Footer:** Potential limited "Cancel" button. No "Back" or "Next".

### Step 7: Completion
*   **Heading:** Installation Successful!
*   **Content:**
    *   Confirmation message.
    *   Instructions: Advise removing USB and rebooting. Mention rEFInd menu.
    *   Reminder: Suggest updating drivers/OS after first boot.
    *   Link/Button: "View Final Logs" (opens modal).
    *   Link/Button: "Save Final Configuration" (saves to USB Data).
    *   Action Buttons: "Shutdown", "Reboot" (for the live environment).
*   **Footer:** No navigation buttons, only action buttons.