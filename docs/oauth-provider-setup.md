# OAuth Provider Configuration Guide

This guide explains how to configure OAuth provider credentials for Cortex-OS.

## Prerequisites

Before setting up OAuth providers, you need to:

1. Register your application with each OAuth provider
2. Configure callback URLs in the provider's developer console
3. Obtain client ID and client secret for each provider

## Callback URLs

All OAuth providers should use the following callback URLs:

**Development:**
```
http://localhost:3000/api/auth/callback/github
http://localhost:3000/api/auth/callback/google
http://localhost:3000/api/auth/callback/discord
```

**Production:**
```
https://your-domain.com/api/auth/callback/github
https://your-domain.com/api/auth/callback/google
https://your-domain.com/api/auth/callback/discord
```

## GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: Cortex-OS
   - **Homepage URL**: Your application URL
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github` (dev) or production URL
4. After creation, copy the **Client ID** and generate a **Client Secret**

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Configure the OAuth consent screen:
   - User type: External
   - App name: Cortex-OS
   - User support email: Your email
   - Developer contact: Your email
6. Add scopes:
   - `openid`
   - `profile`
   - `email`
7. Add test users (if using external user type)
8. Create OAuth client ID:
   - Application type: Web application
   - Name: Cortex-OS Web
   - Authorized redirect URIs: Add callback URL
9. Copy the Client ID and Client Secret

## Discord OAuth Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Fill in application details:
   - **Name**: Cortex-OS
   - **Description**: Your application description
4. In the OAuth2 section:
   - Add redirect URI: Callback URL
   - Enable OAuth2
5. Copy the Client ID and generate a Client Secret

## Environment Variables

Add the following to your `.env` file:

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
```

## Security Best Practices

1. **Never commit secrets**: Add `.env` to `.gitignore`
2. **Use environment-specific configurations**: Different credentials for dev/staging/prod
3. **Rotate secrets regularly**: Update client secrets periodically
4. **Use HTTPS in production**: All OAuth callbacks must use HTTPS
5. **Verify redirect URIs**: Ensure only authorized domains are allowed

## Troubleshooting

### Common Issues

1. **Redirect URI Mismatch**
   - Ensure callback URLs match exactly in provider settings
   - Check for trailing slashes

2. **Invalid Client ID/Secret**
   - Verify credentials are correct
   - Check if OAuth app is properly configured

3. **CORS Issues**
   - Ensure frontend domain is allowed in OAuth settings
   - Check CORS middleware configuration

### Testing OAuth Flow

```bash
# Test GitHub OAuth
curl http://localhost:3000/api/auth/signin/github

# Test Google OAuth
curl http://localhost:3000/api/auth/signin/google

# Test Discord OAuth
curl http://localhost:3000/api/auth/signin/discord
```

## Additional Providers

To add more OAuth providers:

1. Update the auth configuration in `backend/src/auth/index.ts`
2. Add provider to socialProviders object
3. Follow provider-specific setup instructions
4. Add environment variables
5. Update frontend OAuth buttons

## Support

For issues with OAuth configuration:
1. Check provider documentation
2. Review console errors
3. Verify environment variables
4. Test with different providers