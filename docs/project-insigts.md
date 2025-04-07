# AnyBoot: Project Insights & Lessons Learned

## Introduction

This document serves as a shared knowledge base for the AnyBoot development team. Its purpose is to capture key insights, discoveries, solutions to tricky problems, and lessons learned during the development process. By documenting these, we aim to avoid repeating mistakes, onboard new developers more quickly, and maintain a collective understanding of *why* certain decisions were made.

## How to Use This Document

When you encounter a significant challenge, discover a non-obvious solution, make a key architectural decision, or learn something valuable that others might benefit from, please add an entry to the "Insights Log" section below.

**To add an entry:**

1.  **Copy** the entire `## Template: Insight Entry` section below (from the `## Template:` line down to the horizontal rule `---`).
2.  **Paste** the copied template at the **top** of the "Insights Log" section.
3.  **Fill out** the fields in the pasted template with relevant information.
    *   Use clear and concise language.
    *   Provide context.
    *   Explain the reasoning.
    *   Link to relevant code, documentation, or discussion if applicable.
4.  Update the `Date` and `Author` fields.

---

## Template: Insight Entry

*   **Date:** YYYY-MM-DD
*   **Author:** Your Name/Handle
*   **Title/Topic:** Brief description of the insight (e.g., "Handling Windows Install Driver Detection in QEMU", "Choosing exFAT for Data Partition")

### Context/Problem

*   Describe the situation, challenge, or question that led to this insight. What were we trying to achieve? What was the difficulty?

### Insight/Discovery/Decision

*   What was learned? What solution was found? What specific decision was made? Be specific.

### Impact/Implication

*   How does this insight/decision affect the project? What are the consequences (positive or negative)? How does it influence other parts of the system?

### Action/Recommendation (Optional)

*   Are there specific actions to take based on this insight? Recommendations for future development? Best practices to follow?

---

## Insights Log

*   **Date:** 2025-04-04
*   **Author:** Mikkel & Cascade
*   **Title:** React Hydration Error: Whitespace in <html>

### Context/Problem

*   The Next.js application threw a hydration error (`In HTML, whitespace text nodes cannot be a child of <html>`) in the browser console.

### Insight/Discovery/Decision

*   The root layout file (`src/app/layout.tsx`) contained unintended whitespace (a newline) between the `<html>` tag and the `<body>` tag.
*   React/Next.js hydration requires the server-rendered HTML structure to exactly match the client-side virtual DOM structure. Extraneous whitespace outside of standard container tags like `<head>` or `<body>` can cause a mismatch.
*   Removing the whitespace resolved the hydration error.

### Impact/Implication

*   Ensures correct hydration and prevents potential rendering issues or unexpected behavior.
*   Reinforces the need to be careful about whitespace in JSX, particularly at the top level of the HTML document structure in Next.js layouts.

### Action/Recommendation (Optional)

*   Be mindful of extra whitespace/newlines when structuring the root `layout.tsx` file.

---

*   **Date:** 2025-04-04
*   **Author:** Mikkel & Cascade
*   **Title:** Component State vs. Global State for Navigation Control

### Context/Problem

*   The "Next" button in the `FooterNav` component (controlling wizard navigation) was not enabling correctly on Step 2 after selecting a disk in the `DiskSelection` component.

### Insight/Discovery/Decision

*   `FooterNav` relied on the global Zustand store (`selectedDiskId`) to determine if navigation should be enabled.
*   `DiskSelection` was initially implemented using *local* React component state (`useState`) to track the selected disk for visual purposes.
*   The local state in `DiskSelection` was not automatically propagating to the global Zustand state needed by `FooterNav`.
*   The solution involved refactoring `DiskSelection` to:
    1.  Remove its local state for tracking selection.
    2.  Read the `selectedDiskId` directly from the Zustand store for rendering.
    3.  Call the Zustand action (`setSelectedDiskId`) when a disk is clicked to update the global state.

### Impact/Implication

*   Ensures that UI components responsible for triggering state changes update the *shared* global state when that state is needed by other independent components (like the navigation).
*   Fixes the navigation logic, allowing users to proceed from Step 2 to Step 3 after making a selection.

### Action/Recommendation (Optional)

*   When designing components that interact with a shared workflow or state (like a wizard), carefully consider whether component state should be local or managed globally (e.g., via Zustand, Context API, Redux) to ensure all dependent components have access to the correct, up-to-date information.

---

*   **Date:** 2025-04-04
*   **Author:** Mikkel & Cascade
*   **Title:** QEMU Networking: Bridged vs. User Mode for Host Access

*   **Context/Problem:** Firefox inside the QEMU guest could not connect to the Next.js development server running on the host machine using the default user-mode IP `10.0.2.2:3000`.
*   **Discovery/Solution:** Investigation of `scripts/test-qemu.sh` revealed it was explicitly configured for bridged networking (`-netdev bridge,id=net0,br=br0`) rather than user-mode. The correct approach in this bridged setup is for the guest to access the host using the host's actual IP address on the bridged network (e.g., `10.4.0.180:3000`). Updated `anyboot.conf` KIOSK_URL accordingly.
*   **Reasoning/Takeaway:** QEMU's network configuration dictates how the guest accesses the host. User-mode networking provides the convenient `10.0.2.2` alias, while bridged networking requires using the host's real IP on the shared network segment. Ensure `anyboot.conf` matches the QEMU network setup used for testing.
*   **Relevant Links/Code:** `scripts/test-qemu.sh`, `anyboot.conf`

---

*   **Date:** 2025-04-04
*   **Author:** Mikkel & Cascade
*   **Title:** .gitignore: Inline Comments Break Patterns

*   **Context/Problem:** Git failed to ignore specific files (e.g., `live-build-config/live-image-amd64.packages`) even when explicit rules (`/live-build-config/live-image-amd64.packages`) were present in the `.gitignore` file.
*   **Discovery/Solution:** The problematic lines in `.gitignore` had inline comments appended after the pattern (e.g., `pattern # comment`). Removing these inline comments resolved the issue, and the files were correctly ignored.
*   **Reasoning/Takeaway:** Standard Git `.gitignore` syntax does not support inline comments. Comments must be on their own lines, starting with `#`. Any text after a pattern on the same line is treated as part of the pattern, breaking the intended match.
*   **Relevant Links/Code:** `.gitignore`

---

*   **Date:** 2025-04-04
*   **Author:** Mikkel & Cascade
*   **Title:** Live-Build Hook Reliability vs. Direct File Inclusion

*   **Context/Problem:** Initial attempt to configure the Openbox autostart file involved using a live-build chroot hook (`config/hooks/chroot/999-configure-kiosk.hook.chroot`). This hook failed to execute reliably or produce the desired output file within the built ISO.
*   **Discovery/Solution:** Switched strategy to generating the required configuration file (`/etc/xdg/openbox/autostart`) directly within the `config/includes.chroot/` directory structure from the main `build.sh` script. This involves reading settings from `anyboot.conf` and writing the file to the correct path (`config/includes.chroot/etc/xdg/openbox/autostart`) before `lb build` runs.
*   **Reasoning/Takeaway:** Placing files directly into the `includes.chroot` directory guarantees their inclusion in the final image filesystem at the specified path. This is often more reliable and easier to debug than relying on the complex execution context and environment of live-build hooks, especially for simple file generation.
*   **Relevant Links/Code:** `build.sh`, `config/includes.chroot/`, `anyboot.conf`, (Deleted hook: `config/hooks/chroot/999-configure-kiosk.hook.chroot`)

---