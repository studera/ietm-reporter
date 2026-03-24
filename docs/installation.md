# Installation Guide

## Overview

This guide covers the setup and installation of the IETM Playwright Client **development environment**. This is a development project that you're building from scratch, not a published npm package.

## Prerequisites

Before starting, ensure you have:

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **Git** (for version control)
- Access to an **IBM Engineering Test Management** server (version 7.x or later)
- OAuth credentials for IETM API access

## Development Setup

### 1. Navigate to Project Directory

```bash
cd c:/Users/RobertStudera/Documents/DEVELOP/bob/mcp1
```

### 2. Install Dependencies

Install all required dependencies from `package.json`:

```bash
npm install
```

This will install:
- **@playwright/test** - Playwright testing framework
- **axios** - HTTP client for API calls
- **dotenv** - Environment variable management
- **winston** - Logging framework
- **oauth-1.0a** - OAuth 1.0a authentication
- **js-yaml** - YAML configuration support
- **commander** - CLI framework
- And all development dependencies (TypeScript, ESLint, Jest, etc.)

### 3. Verify Installation

Check that dependencies are installed:

```bash
npm list --depth=0
```

### 4. Build the Project

Compile TypeScript to JavaScript:

```bash
npm run build
```

This creates the `dist/` directory with compiled JavaScript files.

### 5. Run Tests

Verify everything works:

```bash
npm test
```

## Configuration Setup

### Option 1: Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with your IETM server details:
```env
IETM_BASE_URL=https://your-ietm-server.com/qm
IETM_PROJECT_ID=_your_project_id
IETM_CONTEXT_ID=_your_context_id
IETM_CONSUMER_KEY=your_consumer_key
IETM_CONSUMER_SECRET=your_consumer_secret
IETM_ACCESS_TOKEN=your_access_token
IETM_ACCESS_TOKEN_SECRET=your_access_token_secret
```

### Option 2: Configuration File

1. Copy the example configuration:
```bash
cp config/ietm.config.example.json config/ietm.config.json
```

2. Edit `config/ietm.config.json` with your settings.

## Getting OAuth Credentials

To use the IETM API, you need OAuth 1.0a credentials:

1. Log in to your IETM server
2. Navigate to **Administration** → **Manage This Application Server**
3. Go to **OAuth** → **Consumers**
4. Click **Add Consumer**
5. Fill in the details:
   - Name: "Playwright Test Reporter"
   - Consumer Key: (auto-generated or custom)
   - Consumer Secret: (auto-generated)
6. Save and note down the credentials
7. Generate access tokens for your user account

## Development Workflow

### Daily Development

```bash
# 1. Pull latest changes (if using Git)
git pull

# 2. Install any new dependencies
npm install

# 3. Build the project
npm run build

# 4. Run tests
npm test

# 5. Start development with watch mode
npm run build:watch
```

### Code Quality Checks

```bash
# Check code style
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code
npm run format

# Check formatting without changes
npm run format:check
```

## Using in Another Project

Once you've built this package, you can use it in other Playwright projects:

### Method 1: npm link (Recommended for Development)

```bash
# In the ietm-playwright-client directory
npm link

# In your Playwright test project
npm link ietm-playwright-client
```

### Method 2: Install from File Path

```bash
# In your Playwright test project
npm install ../path/to/ietm-playwright-client
```

### Method 3: Install from Git Repository

```bash
# In your Playwright test project
npm install git+https://github.com/your-org/ietm-playwright-client.git
```

## Troubleshooting

### Installation Issues

**Problem**: `npm install` fails with permission errors

**Solution**: 
```bash
# Windows (Run as Administrator)
npm install

# Linux/Mac
sudo npm install -g npm
# Or fix npm permissions
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

**Problem**: TypeScript compilation errors

**Solution**:
```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

**Problem**: "Cannot find module" errors

**Solution**:
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Playwright Issues

**Problem**: Playwright browsers not installing

**Solution**:
```bash
# Install browsers manually
npx playwright install chromium firefox webkit
```

**Problem**: Playwright version mismatch

**Solution**:
```bash
# Update Playwright
npm install @playwright/test@latest
npx playwright install
```

### Build Issues

**Problem**: Build fails with TypeScript errors

**Solution**:
1. Check `tsconfig.json` is correct
2. Ensure all dependencies are installed
3. Check for syntax errors in `.ts` files
4. Run `npm run lint` to identify issues

**Problem**: "Cannot find name 'process'" errors

**Solution**:
```bash
# Install Node.js type definitions
npm install --save-dev @types/node
```

## System Requirements

### Minimum Requirements
- 2 GB RAM
- 1 GB free disk space
- Internet connection for IETM API access

### Recommended Requirements
- 4 GB RAM
- 2 GB free disk space
- Stable network connection

## Supported Platforms

- ✅ Windows 10/11
- ✅ macOS 10.15+
- ✅ Linux (Ubuntu 20.04+, Debian 11+, Fedora 36+)

## Version Compatibility

| IETM Playwright Client | Playwright | Node.js | IETM Server |
|------------------------|------------|---------|-------------|
| 1.x (in development)   | >= 1.40.0  | >= 16.0 | 7.x         |

## Next Steps

After installation:

1. ✅ Review [README.md](../README.md) for project overview
2. ✅ Check [Implementation Plan](../IETM-Playwright-Implementation-Plan.md) for development roadmap
3. ✅ Explore [Project Structure](../PROJECT_STRUCTURE.md) to understand the codebase
4. ✅ Review [examples](../examples) for usage patterns
5. ✅ Start implementing features following the prompts

## Uninstallation

To remove the development environment:

```bash
# Remove node_modules
rm -rf node_modules

# Remove build output
npm run clean

# Remove package-lock.json
rm package-lock.json
```

## Support

For installation issues:
- Check this guide first
- Review [Project Structure](../PROJECT_STRUCTURE.md)
- Check [Implementation Plan](../IETM-Playwright-Implementation-Plan.md)
- Review error messages carefully

## Development Environment Checklist

- [ ] Node.js >= 16.0.0 installed
- [ ] npm >= 8.0.0 installed
- [ ] Git installed (optional but recommended)
- [ ] Project dependencies installed (`npm install`)
- [ ] Project builds successfully (`npm run build`)
- [ ] Tests run successfully (`npm test`)
- [ ] Configuration file created (`.env` or `ietm.config.json`)
- [ ] OAuth credentials obtained from IETM server
- [ ] Code editor configured (VS Code recommended)

---

**Note**: This is a development project. You're building the package, not installing it from npm. The package doesn't exist on npm yet and won't until you publish it.