# Security Best Practices

## Credential Management

### ✅ Current Security Implementation

**Single Source of Truth:**
- All credentials are stored **ONLY** in the `.env` file
- The `.env` file is listed in `.gitignore` and never committed to version control
- All code uses environment variables to access credentials

**Files Updated for Security:**
1. `config/ietm.config.json` - Uses `${IETM_USERNAME}` and `${IETM_PASSWORD}` placeholders
2. `examples/auth-example.ts` - Loads from `process.env`
3. `examples/debug-rootservices.ts` - Loads from `process.env`
4. `examples/service-discovery-example.ts` - Loads from `process.env`
5. `examples/ietm-client-example.ts` - Loads from `process.env`

### Environment Variables

**Required Variables in `.env`:**
```bash
IETM_BASE_URL=https://jazz.net/sandbox01-qm
IETM_JTS_URL=https://jazz.net/sandbox01-jts
IETM_USERNAME=your-username
IETM_PASSWORD=your-password
IETM_PROJECT_NAME=Your Project Name
```

**⚠️ CRITICAL:** Never commit the `.env` file with real credentials!

### Validation

All examples now include credential validation:
```typescript
if (!config.username || !config.password) {
  console.error('❌ Error: Missing credentials in .env file');
  console.error('Please set IETM_USERNAME and IETM_PASSWORD in .env file');
  process.exit(1);
}
```

## Git Security

### Files Protected by .gitignore

```gitignore
# Environment variables (contains credentials)
.env

# Logs (may contain sensitive data)
logs/
*.log

# Build output
dist/
node_modules/

# IDE settings
.vscode/
.idea/
```

### What Gets Committed

✅ **Safe to commit:**
- `.env.example` - Template without real credentials
- `config/ietm.config.example.json` - Example configuration
- Source code (`.ts` files) - Uses environment variables
- Documentation (`.md` files) - No hardcoded credentials

❌ **Never commit:**
- `.env` - Contains real credentials
- `config/ietm.config.json` - May contain sensitive data
- Log files - May contain authentication tokens
- Compiled output with embedded credentials

## Code Review Checklist

Before committing code, verify:

- [ ] No hardcoded usernames or passwords
- [ ] All credentials loaded from environment variables
- [ ] `.env` file not staged for commit
- [ ] No credentials in console.log statements
- [ ] No credentials in error messages
- [ ] Documentation uses placeholder values

## Example: Secure Configuration

### ❌ INSECURE (Don't do this)
```typescript
const config = {
  username: 'studera',
  password: 'Limon1imon123##',  // NEVER hardcode!
};
```

### ✅ SECURE (Do this)
```typescript
const config = {
  username: process.env.IETM_USERNAME || '',
  password: process.env.IETM_PASSWORD || '',
};

// Validate
if (!config.username || !config.password) {
  console.error('Missing credentials in .env file');
  process.exit(1);
}
```

## Sharing Code

### When Sharing with Team

1. **Share `.env.example`** - Template file
2. **Document setup** - How to create `.env` from template
3. **Never share `.env`** - Each developer creates their own
4. **Use separate accounts** - Each developer should have their own IETM credentials

### .env.example Template

```bash
# IETM Server Configuration
IETM_BASE_URL=https://your-ietm-server/qm
IETM_JTS_URL=https://your-ietm-server/jts

# Authentication (DO NOT commit real values!)
IETM_USERNAME=your-username
IETM_PASSWORD=your-password

# Project Configuration
IETM_PROJECT_NAME=Your Project Name
IETM_TEST_PLAN_ID=123
```

## CI/CD Security

### GitHub Actions / GitLab CI

Use secrets management:

```yaml
# .github/workflows/test.yml
jobs:
  test:
    steps:
      - name: Run tests
        env:
          IETM_USERNAME: ${{ secrets.IETM_USERNAME }}
          IETM_PASSWORD: ${{ secrets.IETM_PASSWORD }}
        run: npm test
```

**Never:**
- Store credentials in workflow files
- Echo credentials in logs
- Commit credentials to repository

## Credential Rotation

### When to Rotate Credentials

- Account lockout occurred
- Credential may have been exposed
- Team member leaves
- Regular security policy (e.g., every 90 days)

### How to Rotate

1. **Change password in IETM**
2. **Update `.env` file only**
   ```bash
   IETM_PASSWORD=new-password-here
   ```
3. **Test authentication**
   ```bash
   npm run build
   node dist/examples/auth-example.js
   ```
4. **No code changes needed** - All code uses environment variables

## Incident Response

### If Credentials Are Exposed

1. **Immediately change password** in IETM
2. **Update `.env` file** with new password
3. **Review git history** - Check if credentials were committed
4. **If committed to git:**
   - Use `git filter-branch` or BFG Repo-Cleaner to remove
   - Force push to remote
   - Notify team to re-clone repository
5. **Notify security team** if applicable

### Checking Git History

```bash
# Search for potential credential leaks
git log -p | grep -i "password"
git log -p | grep -i "IETM_PASSWORD"

# Check if .env was ever committed
git log --all --full-history -- .env
```

## Monitoring

### What to Monitor

- Failed authentication attempts
- Unusual access patterns
- Account lockouts
- Credential usage from unexpected locations

### Logging Best Practices

```typescript
// ✅ GOOD - No sensitive data
console.log('Authentication attempt for user:', username);
console.log('Authentication successful');

// ❌ BAD - Exposes credentials
console.log('Password:', password);  // NEVER!
console.log('Auth header:', authHeader);  // May contain credentials
```

## Summary

### Security Principles

1. **Single Source** - Credentials only in `.env`
2. **Never Commit** - `.env` in `.gitignore`
3. **Environment Variables** - All code uses `process.env`
4. **Validation** - Check credentials are loaded
5. **Rotation** - Easy to update in one place
6. **Monitoring** - Track authentication attempts

### Quick Reference

| Item | Location | Committed? |
|------|----------|------------|
| Real credentials | `.env` | ❌ NO |
| Credential template | `.env.example` | ✅ YES |
| Source code | `*.ts` files | ✅ YES |
| Config template | `config/*.example.json` | ✅ YES |
| Config with placeholders | `config/*.json` | ⚠️ MAYBE |
| Documentation | `docs/*.md` | ✅ YES |

---

**Last Updated:** 2026-03-25  
**Security Level:** Enhanced - Single source credential management