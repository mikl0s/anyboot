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
*   **Title:** QEMU Networking: Bridged vs. User Mode for Host Access

*   **Context/Problem:** Firefox inside the QEMU guest could not connect to the Next.js development server running on the host machine using the default user-mode IP `10.0.2.2:3000`.
*   **Discovery/Solution:** Investigation of `scripts/test-qemu.sh` revealed it was explicitly configured for bridged networking (`-netdev bridge,id=net0,br=br0`) rather than user-mode. The correct approach in this bridged setup is for the guest to access the host using the host's actual IP address on the bridged network (e.g., `10.4.0.180:3000`). Updated `anyboot.conf` KIOSK_URL accordingly.
*   **Reasoning/Takeaway:** QEMU's network configuration dictates how the guest accesses the host. User-mode networking provides the convenient `10.0.2.2` alias, while bridged networking requires using the host's real IP on the shared network segment. Ensure `anyboot.conf` matches the QEMU network setup used for testing.
*   **Relevant Links/Code:** `scripts/test-qemu.sh`, `anyboot.conf`

---

*   **Date:** 2025-04-04
*   **Author:** Mikkel & Cascade
*   **Title:** Node/NVM Commands in Non-Interactive Environments

*   **Context/Problem:** Attempting to run `npx create-next-app` via the tooling failed with `npx: command not found`, despite NVM and Node being correctly installed and available in the user's interactive terminal.
*   **Discovery/Solution:** The execution environment used by the tooling does not automatically inherit the shell initialisation that configures the NVM `PATH`. Using the full, absolute path to the `npx` executable (e.g., `/home/mikkel/.nvm/versions/node/v22.14.0/bin/npx`) allowed the command to run successfully.
*   **Reasoning/Takeaway:** Tools or scripts running non-interactively may not have the same environment (especially `PATH`) as the user's login shell. When calling commands managed by version managers like NVM, using the absolute path can ensure they are found.

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