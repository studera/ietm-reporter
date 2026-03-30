# Project Structure

This document describes the complete folder structure of the IETM Playwright Client project.

```
ietm-playwright-client/
├── src/                            # Source code
│   ├── client/                     # IETM API client
│   │   ├── IETMClient.ts          # Main API client class
│   │   └── ServiceDiscovery.ts    # OSLC service discovery
│   ├── config/                     # Configuration management
│   │   └── ConfigManager.ts       # Configuration loader and validator
│   ├── reporter/                   # Playwright reporter
│   │   └── IETMReporter.ts        # Main reporter implementation
│   ├── builders/                   # XML/resource builders
│   │   ├── XmlBuilder.ts          # Abstract XML builder base class
│   │   ├── ExecutionResultBuilder.ts # Builds execution result XML
│   │   └── index.ts
│   ├── models/                     # Domain model interfaces and helpers
│   │   ├── ExecutionResult.ts     # ExecutionResult, StepResult, enums, helpers
│   │   ├── TestCase.ts            # TestCase model and helpers
│   │   ├── TestExecutionRecord.ts # TestExecutionRecord model and helpers
│   │   └── index.ts
│   ├── mapper/                     # Test case mapping
│   │   ├── TestCaseMapper.ts      # Maps Playwright tests to IETM test cases
│   │   └── index.ts
│   ├── transformer/                # Result transformation
│   │   ├── ResultTransformer.ts   # Transforms Playwright results to IETM format
│   │   └── index.ts
│   ├── attachments/                # Attachment handling
│   │   ├── AttachmentHandler.ts   # Uploads test output to execution results
│   │   └── index.ts
│   ├── auth/                       # Authentication
│   │   ├── AuthManager.ts         # HTTP client with Basic Auth and retry
│   │   ├── types.ts               # Auth-specific types
│   │   ├── index.ts
│   │   └── README.md
│   ├── errors/                     # Error classes
│   │   ├── IETMError.ts           # Base error with context and hints
│   │   ├── AuthenticationError.ts # Auth-specific errors
│   │   ├── NetworkError.ts        # Network/HTTP errors
│   │   ├── ValidationError.ts     # Validation errors
│   │   ├── CircuitBreaker.ts      # Circuit breaker pattern
│   │   └── index.ts
│   ├── logging/                    # Logging infrastructure
│   │   ├── Logger.ts              # Singleton Winston logger
│   │   └── index.ts
│   ├── utils/                      # Utility functions
│   │   └── XmlParser.ts           # XML parsing helpers
│   ├── types/                      # TypeScript type definitions
│   │   └── index.ts               # IETMConfig, TestResult, Attachment, etc.
│   ├── resources/                  # Static resource files
│   │   └── ExecutionResultTemplate.xml  # IETM execution result XML template
│   └── index.ts                    # Main entry point (public exports)
├── tests/                          # Test files
│   ├── unit/                       # Unit tests
│   └── integration/                # Integration tests
├── config/                         # Configuration files
│   ├── ietm.config.example.json   # Example configuration
│   ├── ietm.config.json           # Local configuration (gitignored)
│   └── ietm.config.schema.json    # JSON schema for validation
├── docs/                           # Documentation
│   ├── installation.md
│   ├── configuration.md
│   ├── api-reference.md
│   ├── authentication-setup.md
│   ├── integration-guide.md
│   ├── attachment-upload.md
│   ├── troubleshooting.md
│   ├── security-best-practices.md
│   ├── java-implementation-analysis.md
│   ├── DOCUMENTATION-INDEX.md
│   ├── PROJECT_STRUCTURE.md
│   └── IETM-Playwright-Implementation-Plan.md
├── examples/                       # Example projects
│   ├── basic-example/
│   ├── advanced-example/
│   └── reporter-example/
├── ietm-results/                   # Generated result artifacts
├── playwright-report/              # Generated Playwright HTML report
├── dist/                           # Compiled JavaScript (generated)
├── coverage/                       # Test coverage reports (generated)
├── .eslintrc.json                 # ESLint configuration
├── .prettierrc.json               # Prettier configuration
├── .gitignore                     # Git ignore rules
├── jest.config.js                 # Jest test configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # NPM package configuration
└── README.md                      # Main project documentation
```

## Key Directories

### `/src` - Source Code
Contains all TypeScript source code organized by functionality:
- **client/**: IETM API communication layer (`IETMClient`, `ServiceDiscovery`)
- **auth/**: Authentication (`AuthManager` with Basic Auth + retry)
- **config/**: Configuration loading and validation
- **reporter/**: Playwright reporter implementation
- **builders/**: XML builder base class and execution result builder
- **models/**: Domain model interfaces and helper functions
- **mapper/**: Playwright test → IETM test case mapping
- **transformer/**: Playwright result → IETM execution result transformation
- **attachments/**: Test output upload to execution results
- **errors/**: Structured error classes with context and retry metadata
- **logging/**: Singleton Winston logger
- **utils/**: XML parsing utilities
- **types/**: TypeScript type definitions

### `/tests` - Tests
Contains all test files:
- **unit/**: Unit tests for individual modules
- **integration/**: Integration tests with IETM server

### `/config` - Configuration
Example configuration files, local config (gitignored), and JSON schema.

### `/docs` - Documentation
Comprehensive documentation for users and developers.

### `/examples` - Examples
Working example projects demonstrating various use cases.

## File Naming Conventions

- **TypeScript files**: PascalCase for classes (e.g., `IETMClient.ts`)
- **Test files**: `*.test.ts` or `*.spec.ts`
- **Configuration files**: kebab-case (e.g., `ietm.config.json`)
- **Documentation**: kebab-case (e.g., `installation.md`)

## Build Output

- **`/dist`**: Compiled JavaScript and type definitions
- **`/coverage`**: Test coverage reports
- **`/logs`**: Application logs (not committed)

## Development Workflow

1. Make changes in `/src`
2. Write tests in `/tests`
3. Run `npm run build` to compile
4. Run `npm test` to test
5. Run `npm run lint` to check code style
6. Update documentation in `/docs`