# AnyBoot: Coding Guidelines

## Introduction

These guidelines are intended to ensure the codebase for AnyBoot remains readable, maintainable, and consistent. Adhering to these standards helps streamline development, reduce bugs, and make collaboration easier.

*This is a living document and may be updated as the project evolves.*

## Core Principle: Modularity and Readability

Our primary goal is code that is easy to understand, modify, and debug. This often means favouring clarity over excessive cleverness and breaking down complex logic into smaller, manageable pieces.

## The 500-Line Rule

*   **Guideline:** No single source code file should exceed **500 lines** of code (LoC).
*   **Rationale:** Large files are often difficult to navigate, understand, and maintain. They tend to accumulate unrelated logic (low cohesion) and become tightly coupled to many other parts of the system. Keeping files small encourages better organization and modularity.
*   **Measurement:** Lines of code typically exclude comments and blank lines, but use good judgment. The *intent* is to keep logical units small.
*   **Action:** If a file approaches or exceeds the 500-line limit, it **must** be refactored.
*   **Exceptions:**
    *   **External Libraries/Vendored Code:** Files originating from third-party libraries are exempt.
    *   **Generated Code:** Automatically generated code (e.g., specific outputs from build tools, *not* boilerplate) might be exempt on a case-by-case basis if refactoring is impractical or defeats the purpose of the generation.
    *   **Data Files:** Large configuration files (JSON, YAML) or data structures are not subject to this rule.
    *   **Specific Framework Files:** Some frameworks might have specific files that naturally grow larger (e.g., central routing files). Use judgment, but still strive to delegate logic elsewhere. If an exception seems necessary, discuss it with the team.

## Refactoring Guidance When Exceeding the Limit

When a file exceeds 500 lines, consider the following refactoring strategies:

1.  **Extract Components/Modules:** Identify distinct functionalities within the file and move them into separate, new files/modules. (e.g., Extract React components, helper functions, specific logic classes/modules).
2.  **Create Helper Functions/Classes:** Move reusable blocks of code into well-named helper functions or classes, potentially in separate utility files.
3.  **Delegate Responsibility:** Can the logic be handled by a different existing module or service that is better suited for the task?
4.  **Configuration over Code:** Can complex conditional logic be simplified by using configuration objects or data structures?

## Other Guidelines (Placeholders - To Be Expanded)

*   **Naming Conventions:** (e.g., camelCase for variables/functions, PascalCase for classes/components - *To be defined based on language/framework standards*)
*   **Code Formatting:** Use Prettier (or chosen formatter) with the project's configuration. Format code before committing.
*   **Linting:** Use ESLint (or chosen linter) with the project's configuration. Address linting errors/warnings before committing.
*   **Comments:** Write comments to explain *why* something is done, not *what* it does (the code should explain the 'what'). Avoid obvious comments. Document complex logic, workarounds, or non-intuitive parts.
*   **Testing:** (To be defined - e.g., expectations for unit tests, integration tests).
*   **Error Handling:** (To be defined - e.g., consistent error reporting, logging practices).
*   **Commit Messages:** Follow conventional commit message standards (e.g., `feat:`, `fix:`, `refactor:`, `docs:`, `test:`).

---