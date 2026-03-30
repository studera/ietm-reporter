# Project Structure

This document describes the complete folder structure of the IETM Playwright Client project.

```
ietm-playwright-client/
├── .bob/                           # Bob AI assistant metadata
├── src/                            # Source code
│   ├── client/                     # IETM API client
│   │   ├── IETMClient.ts          # Main API client class
│   │   └── ResourceBuilder.ts     # OSLC resource builders (TODO)
│   ├── config/                     # Configuration management
│   │   ├── ConfigManager.ts       # Configuration loader and validator
│   │   └── schema.ts              # Configuration schema (TODO)
│   ├── reporter/                   # Playwright reporter
│   │   ├── IETMReporter.ts        # Main reporter implementation
│   │   ├── ResultTransformer.ts   # Transform Playwright results (TODO)
│   ├── utils/                      # Utility functions (TODO)
│   │   ├── logger.ts              # Winston logger setup
│   │   ├── retry.ts               # Retry logic
│   │   └── xml-builder.ts         # RDF/XML builder
│   ├── types/                      # TypeScript type definitions
│   │   └── index.ts               # Main type exports
│   └── index.ts                    # Main entry point
├── tests/                          # Test files
│   ├── unit/                       # Unit tests
│   │   ├── ConfigManager.test.ts  # Config manager tests
│   │   ├── IETMClient.test.ts     # API client tests (TODO)
│   │   └── ResultTransformer.test.ts # Transformer tests (TODO)
│   ├── integration/                # Integration tests (TODO)
│   │   └── e2e.test.ts            # End-to-end tests
│   └── fixtures/                   # Test fixtures (TODO)
│       ├── mock-responses.ts      # Mock IETM API responses
│       └── test-data.ts           # Test data
├── config/                         # Configuration files
│   ├── ietm.config.example.json   # Example configuration
│   └── ietm.config.schema.json    # JSON schema (TODO)
├── docs/                           # Documentation
│   ├── installation.md            # Installation guide
│   ├── configuration.md           # Configuration guide (TODO)
│   ├── mapping.md                 # Test case mapping guide (TODO)
│   ├── api-reference.md           # API reference (TODO)
│   ├── troubleshooting.md         # Troubleshooting guide (TODO)
│   └── architecture.md            # Architecture overview (TODO)
├── examples/                       # Example projects
│   ├── basic-example/             # Basic usage example
│   │   ├── tests/
│   │   │   └── login.spec.ts     # Example test
│   │   ├── playwright.config.ts   # Playwright config
│   │   └── ietm.config.json      # IETM config (TODO)
│   ├── advanced-example/          # Advanced usage (TODO)
│   └── ci-cd-example/             # CI/CD integration (TODO)
├── dist/                           # Compiled JavaScript (generated)
├── coverage/                       # Test coverage reports (generated)
├── logs/                           # Log files (generated)
├── node_modules/                   # Dependencies (generated)
├── .eslintrc.json                 # ESLint configuration
├── .prettierrc.json               # Prettier configuration
├── .gitignore                     # Git ignore rules
├── .env.example                   # Environment variables example
├── jest.config.js                 # Jest test configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # NPM package configuration
├── README.md                      # Main documentation
├── CHANGELOG.md                   # Version history (TODO)
├── CONTRIBUTING.md                # Contribution guidelines (TODO)
├── LICENSE                        # License file (TODO)
└── README.md                      # Main project documentation

```

## Key Directories

### `/src` - Source Code
Contains all TypeScript source code organized by functionality:
- **client/**: IETM API communication layer
- **config/**: Configuration management
- **reporter/**: Playwright reporter implementation
- **utils/**: Shared utilities
- **types/**: TypeScript type definitions

### `/tests` - Tests
Contains all test files:
- **unit/**: Unit tests for individual modules
- **integration/**: Integration tests with IETM server
- **fixtures/**: Test data and mocks

### `/config` - Configuration
Example configuration files and schemas.

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

## Next Steps

Files marked with (TODO) need to be created as part of the implementation plan.