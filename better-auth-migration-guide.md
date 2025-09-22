# Better Auth Migration Guide

## Overview

This guide explains how to migrate from the legacy authentication system to Better Auth in Cortex-OS. Better Auth provides enhanced security, more authentication methods, and better developer experience.

## Pre-Migration Checklist

### 1. Backup Existing Data
```bash
# Backup your existing database
cp apps/cortex-webui/backend/data/cortex.db apps/cortex-webui/backend/data/cortex.db.backup

# Export existing users (if needed)
sqlite3 apps/cortex-webui/backend/data/cortex.db ".dump users" > users_backup.sql
```

### 2. Environment Configuration
Ensure you have the required environment variables set:

```bash
# Required for Better Auth
BETTER_AUTH_SECRET=your_better_auth_secret_minimum_32_characters
BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
COOKIE_DOMAIN=localhost
RP_ID=localhost
ORIGIN=http://localhost:3001

# Optional OAuth providers
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Migration Steps

### Step 1: Database Schema Migration

Better Auth uses a standardized schema. Run the migration:

```bash
# The migration will be handled automatically by Better Auth
# The tables will be created on first run
```

### Step 2: User Data Migration

Create a migration script to transfer existing users:

```typescript
// scripts/migrate-users.ts
import Database from 'better-sqlite3';
import { hash } from 'bcryptjs';

// Source database (legacy)
const sourceDb = new Database('./data/cortex.db.backup');
// Target database (Better Auth)
const targetDb = new Database('./data/cortex.db');

// Enable foreign keys
targetDb.pragma('foreign_keys = ON');

// Migrate users
const users = sourceDb.prepare('SELECT * FROM users').all();
const insertUser = targetDb.prepare(`
  INSERT INTO user (id, email, name, password_hash, email_verified, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

for (const user of users) {
  // Generate UUID for Better Auth
  const userId = crypto.randomUUID();

  insertUser.run(
    userId,
    user.email,
    user.name,
    user.password_hash, // Already hashed
    user.email_verified || false,
    Math.floor(Date.now() / 1000), // Unix timestamp
    Math.floor(Date.now() / 1000)
  );

  console.log(`Migrated user: ${user.email}`);
}

console.log('Migration completed!');
```

### Step 3: Frontend Migration

1. **Update Auth Context**
   - The new `AuthContext` provides the same interface with additional features
   - No changes needed if you were using the `useAuth` hook

2. **Component Updates**
   - Login/Register forms now include OAuth options
   - Added new pages: Forgot Password, Reset Password, Profile

### Step 4: API Endpoint Updates

Better Auth provides standardized endpoints:

```
# Authentication
POST /api/auth/signin/email
POST /api/auth/signup/email
POST /api/auth/signout

# OAuth
GET  /api/auth/oauth/github
GET  /api/auth/oauth/google
GET  /api/auth/oauth/discord

# Session management
GET  /api/auth/session
POST /api/auth/session

# Password reset
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

## Post-Migration Tasks

### 1. Verify Migration

```bash
# Check if users were migrated correctly
sqlite3 apps/cortex-webui/backend/data/cortex.db "SELECT COUNT(*) FROM users;"

# Check sessions table
sqlite3 apps/cortex-webui/backend/data/cortex.db ".tables"
```

### 2. Test Authentication Flows

1. **Email/Password Login**
   - Try logging in with existing credentials
   - Verify session creation

2. **Registration**
   - Test new user registration
   - Verify email verification flow (if enabled)

3. **OAuth Integration**
   - Test social login (if configured)
   - Verify account linking

4. **Password Reset**
   - Test forgot password flow
   - Verify reset token functionality

### 3. Security Verification

1. **Rate Limiting**
   - Verify rate limiting is working on auth endpoints
   - Check logs for rate limit hits

2. **Session Security**
   - Verify secure cookies in production
   - Check CSRF protection

3. **OAuth Security**
   - Verify state parameter validation
   - Check redirect URI validation

## Feature Comparison

| Feature | Legacy System | Better Auth |
|---------|--------------|-------------|
| Email/Password | ✅ | ✅ |
| OAuth Providers | Limited | 35+ Providers |
| Password Reset | Basic | Enhanced |
| 2FA | ❌ | ✅ |
| Passkeys/WebAuthn | ❌ | ✅ |
| Magic Links | ❌ | ✅ |
| Rate Limiting | Basic | Advanced |
| Session Management | Basic | Enhanced |
| TypeScript Support | Partial | Full |

## Troubleshooting

### Common Issues

1. **Database Migration Errors**
   ```bash
   # Ensure database directory exists
   mkdir -p apps/cortex-webui/backend/data

   # Check file permissions
   chmod 755 apps/cortex-webui/backend/data
   ```

2. **Session Issues**
   - Clear browser cookies
   - Verify `COOKIE_DOMAIN` setting
   - Check HTTPS/HTTP settings

3. **OAuth Callback Issues**
   - Verify redirect URIs in OAuth provider settings
   - Check `FRONTEND_URL` and `BASE_URL` configuration
   - Ensure CORS is properly configured

### Debug Mode

Enable debug logging for Better Auth:

```typescript
// In apps/cortex-webui/backend/src/auth/index.ts
export const auth = betterAuth({
  // ... existing config
  advanced: {
    // ... existing config
    debug: process.env.NODE_ENV === 'development',
  },
});
```

## Rollback Plan

If you need to roll back:

1. **Stop the server**
2. **Restore the backup**
   ```bash
   cp apps/cortex-webui/backend/data/cortex.db.backup apps/cortex-webui/backend/data/cortex.db
   ```
3. **Revert code changes**
   ```bash
   git checkout HEAD -- apps/cortex-webui/backend/src/auth/
   git checkout HEAD -- apps/cortex-webui/frontend/src/
   ```
4. **Restart the server**

## Support

For issues during migration:
1. Check Better Auth documentation: https://better-auth.com
2. Review Cortex-OS authentication examples
3. Check existing issues in the repository

## Security Best Practices

1. **Production Environment**
   - Use strong `BETTER_AUTH_SECRET` (32+ characters)
   - Enable HTTPS
   - Set secure cookie attributes
   - Enable email verification

2. **OAuth Configuration**
   - Use environment variables for credentials
   - Configure proper redirect URIs
   - Enable PKCE for mobile apps

3. **Database Security**
   - Regular backups
   - Encrypt sensitive data at rest
   - Monitor for suspicious activity

## Next Steps

After migration:
1. Explore additional Better Auth features
2. Set up monitoring for auth events
3. Implement advanced security features
4. Add more OAuth providers as needed

## Conclusion

Better Auth provides a more secure, flexible, and maintainable authentication system. The migration preserves existing user data while adding new capabilities and improving security.