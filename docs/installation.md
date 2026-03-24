# Installation Guide

## Prerequisites

Before installing the IETM Playwright Client, ensure you have:

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **Playwright** >= 1.40.0
- Access to an **IBM Engineering Test Management** server (version 7.x or later)
- OAuth credentials for IETM API access

## Installation Steps

### 1. Install the Package

```bash
npm install ietm-playwright-client --save-dev
```

Or with yarn:

```bash
yarn add -D ietm-playwright-client
```

### 2. Install Playwright (if not already installed)

```bash
npm install @playwright/test --save-dev
npx playwright install
```

### 3. Verify Installation

```bash
npm list ietm-playwright-client
```

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

## Next Steps

- [Configuration Guide](./configuration.md) - Set up your configuration
- [Quick Start](../README.md#quick-start) - Get started quickly
- [Examples](../examples) - See working examples

## Troubleshooting

### Installation Issues

**Problem**: `npm install` fails with permission errors

**Solution**: 
```bash
# Use sudo (Linux/Mac)
sudo npm install -g npm

# Or fix npm permissions
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

**Problem**: Playwright browsers not installing

**Solution**:
```bash
# Install browsers manually
npx playwright install chromium firefox webkit
```

### Dependency Conflicts

If you encounter dependency conflicts:

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
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
| 1.x                    | >= 1.40.0  | >= 16.0 | 7.x         |

## Uninstallation

To remove the package:

```bash
npm uninstall ietm-playwright-client
```

## Support

For installation issues:
- Check [Troubleshooting Guide](./troubleshooting.md)
- Open an issue on [GitHub](https://github.com/your-org/ietm-playwright-client/issues)