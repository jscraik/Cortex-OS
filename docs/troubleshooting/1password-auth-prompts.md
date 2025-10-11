# Fixing 1Password CLI Authentication Prompts

**Problem**: 1Password CLI asks for authentication every few seconds

**Solution**: Set up persistent session authentication

## Quick Fix

Run the setup script:

```bash
chmod +x scripts/setup-1password-session.sh
./scripts/setup-1password-session.sh
```

## Manual Setup Options

### Option 1: Service Account Token (Recommended)

**Best for**: Development work, CI/CD pipelines, no interruptions

1. **Create Service Account**:
   - Go to https://start.1password.com/settings/serviceaccounts
   - Click "Create Service Account"
   - Name it "brAInwav Development"
   - Grant permissions: "Read Items in Vault" for "brAInwav Development" vault

2. **Save Token**:
   ```bash
   # Add to ~/.zshrc or ~/.bashrc
   export OP_SERVICE_ACCOUNT_TOKEN="your-token-here"
   
   # Reload shell
   source ~/.zshrc
   ```

3. **Verify**:
   ```bash
   op whoami
   # Should return: Service Account (brAInwav Development)
   ```

### Option 2: Interactive Session with Biometric

**Best for**: Occasional use, prefer Touch ID over service accounts

1. **Enable Biometric Unlock** (macOS only):
   ```bash
   op biometric set
   ```

2. **Sign In Once**:
   ```bash
   eval $(op signin)
   ```

3. **Persist Session** (add to `~/.zshrc`):
   ```bash
   # brAInwav 1Password auto-signin
   if ! op whoami &> /dev/null; then
       eval $(op signin --account your-account.1password.com)
   fi
   ```

### Option 3: Session Environment Variable

**Best for**: Single terminal session

1. **Sign In and Export**:
   ```bash
   eval $(op signin)
   
   # Session token is now in OP_SESSION_my environment variable
   echo $OP_SESSION_my  # Should show a token
   ```

2. **Session expires after 30 minutes of inactivity**

## Why This Fixes the Problem

### Before (causing auth prompts every few seconds)
- Every call to `op` command required authentication
- No session token in environment
- `is1PasswordAvailable()` called `op --version` repeatedly
- `fetch1PasswordItem()` called `op item get` without session token

### After (no auth prompts)
1. **Session Token Cached**: Environment variable `OP_SERVICE_ACCOUNT_TOKEN` or `OP_SESSION_my` persists
2. **Availability Check Cached**: Results cached for 1 hour instead of checking every time
3. **Commands Use Session**: All `op` commands automatically use the session token
4. **Timeouts Added**: Commands fail fast (5-10s) instead of hanging

## Verify Fix

```bash
# Should not prompt for auth
op whoami

# Should work without prompts
pnpm license-manager info

# Should show cached availability
pnpm license-manager doctor
```

## Troubleshooting

### Still Getting Prompts?

1. **Check session token**:
   ```bash
   echo $OP_SERVICE_ACCOUNT_TOKEN
   echo $OP_SESSION_my
   # One of these should have a value
   ```

2. **Check account access**:
   ```bash
   op account list
   op vault list
   ```

3. **Re-authenticate**:
   ```bash
   # Clear any cached sessions
   unset OP_SESSION_my
   
   # Sign in fresh
   eval $(op signin)
   ```

### Session Expired?

Service account tokens don't expire, but interactive sessions do:

```bash
# Check if signed in
op whoami || eval $(op signin)
```

### Using SSH Agent with 1Password?

If you're using 1Password for SSH keys, make sure SSH agent is configured:

```bash
# In ~/.ssh/config
Host *
    IdentityAgent "~/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock"
```

The 1Password app must be running for SSH agent to work, but CLI sessions are independent.

## Integration with brAInwav Workflow

The code changes ensure:
- ✅ 1Password availability check cached for 1 hour
- ✅ Session tokens used automatically if present
- ✅ Timeouts prevent hanging commands
- ✅ Graceful fallback if 1Password unavailable
- ✅ Cache cleared properly on `clearCache()`

All brAInwav error messages maintain branding: `[brAInwav] License loaded from 1Password CLI`
