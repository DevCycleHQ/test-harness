# Project Coding Standards and Conventions

## Configuration and Tooling

- The project root contains configuration files for building, linting, formatting, and testing.
- Key files include:
  - `package.json`: Project dependencies and scripts
  - `tsconfig.json`: TypeScript configuration
  - `jest.config.ts`: Jest test runner configuration
  - `.eslintrc.json`: ESLint configuration
  - `.prettierrc`: Prettier formatting rules
  - `docker-compose.yml`: Docker Compose setup for multi-service testing
  - `README.md`: Project overview and instructions

## Formatting

- Defer all formatting to Prettier for supported file types (JavaScript, TypeScript, JSON, Markdown, etc.).
- ESLint enforces code quality and linting rules.

## Git Commit Message Conventions

- Follow Conventional Commits specification: `<type>: <description>` (scopes rarely used)
- Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- Description should be imperative mood, lowercase, single sentence, no multi-line descriptions.
- Examples: `feat: add support for multi-threaded tests`, `fix: correct response for invalid input`

## Naming Conventions

- Files and variables in `harness/` and `proxies/` should use camelCase (starting with a lowercase letter).
- Folders should use kebab-case.

## Project Structure Guide

- The project root contains configuration files for building, linting, formatting, and testing, such as `package.json`, `jest.config.ts`, and `.eslintrc.json`.
- The main source code for the test harness is under the `harness/` directory, which contains:
  - `features/`: Test features and scenarios
  - `helpers/`: Shared test utilities and helpers
  - `mockData/`: Mock data for tests
  - `mockServer/`: Mock server implementations
  - `types/`: Shared type definitions
- The `proxies/` directory contains language-specific SDK proxies for integration testing, including:
  - `dotnet/`
  - `go/`
  - `java/`
  - `nodejs/`
  - `openfeature-nodejs/`
  - `php/`
  - `python/`
  - `ruby/`
- Each language-specific proxy may contain its own handlers, helpers, and configuration as needed for integration with the test harness.
- Documentation is found in the `docs/` directory, with templates in `docs/widdershins/templates/`.
- The main `README.md` at the project root provides an overview of the repository and usage instructions.

## Testing and Mocks

- Test files: use `.test.ts`, `.test.js`, `.spec.ts`, or `.spec.js` suffixes
- Tests located directly in feature or module directories (suffix-based convention is primary approach)
- Mock implementations are placed in `__mocks__/` directories within each package or module, such as `harness/mockData/` or `harness/mockServer/`
- This convention is followed in both the main test harness and all SDK proxies

### Test Harness Specific Guidelines

- This is a universal testing system for DevCycle SDKs across multiple programming languages.
- Tests are written in Jest and run against "proxy servers" written in the native language of each SDK.
- The harness supports both cloud and local bucketing modes for server-side SDKs.
- Each proxy server runs in its own Docker container via `docker-compose.yml`.
- Environment variables control which SDKs to test and their versions:
  - `SDKS_TO_TEST`: The name of the SDK to run tests for
  - `{SDK_NAME}_SDK_VERSION`: The version of the given SDK
  - `SDK_GITHUB_SHA`: SHA of an unreleased commit to test against
- Local development mode can be enabled with `LOCAL_MODE=1` to run against local proxy servers.
- Use `yarn start:{sdk}` to run individual proxy servers locally for debugging.

### Aviator CLI Workflow (optional)

- Use Aviator CLI (`av`) for managing stacked branches: `av branch chore-fix-invalid-input`
- Sync and push changes: `av sync --push=yes`
- Create PR: `av pr --title "<title>" --body "<body>"`
  - title follows Conventional Commits, body uses markdown/bullets, `av pr` will push the branch
- GitHub PR descriptions should be short and mainly focus on the reasons the changes were made in this PR, with minimal additional descriptions about testing state and listing the changes made.
