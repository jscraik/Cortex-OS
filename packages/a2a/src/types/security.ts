/**
 * @file A2A Security Types
 * @description Authentication, authorization, and security scheme definitions
 * Split from external-types.ts for better maintainability
 */

// --8<-- [start:SecurityScheme]
/**
 * Union type representing all possible security schemes
 */
export type SecurityScheme =
  | APIKeySecurityScheme
  | HTTPAuthSecurityScheme
  | OAuth2SecurityScheme
  | OpenIdConnectSecurityScheme
  | MutualTLSSecurityScheme;

/**
 * Base properties common to all security schemes
 */
export interface SecuritySchemeBase {
  /** The type of security scheme */
  type: string;
  /** Optional description of the security scheme */
  description?: string;
}

/**
 * API Key authentication security scheme
 */
export interface APIKeySecurityScheme extends SecuritySchemeBase {
  type: 'apiKey';
  /** Location of the API key */
  in: 'query' | 'header' | 'cookie';
  /** Name of the API key parameter */
  name: string;
  /** Optional description */
  description?: string;
}

/**
 * HTTP authentication security scheme
 */
export interface HTTPAuthSecurityScheme extends SecuritySchemeBase {
  type: 'http';
  /** HTTP authentication scheme name */
  scheme: 'basic' | 'bearer' | 'digest' | string;
  /** Optional bearer token format */
  bearerFormat?: string;
  /** Optional description */
  description?: string;
}

/**
 * Mutual TLS security scheme
 */
export interface MutualTLSSecurityScheme extends SecuritySchemeBase {
  type: 'mutualTLS';
  /** Optional description */
  description?: string;
}

/**
 * OAuth 2.0 security scheme
 */
export interface OAuth2SecurityScheme extends SecuritySchemeBase {
  type: 'oauth2';
  /** OAuth 2.0 flow configurations */
  flows: OAuthFlows;
  /** Optional description */
  description?: string;
}

/**
 * OpenID Connect security scheme
 */
export interface OpenIdConnectSecurityScheme extends SecuritySchemeBase {
  type: 'openIdConnect';
  /** OpenID Connect discovery URL */
  openIdConnectUrl: string;
  /** Optional description */
  description?: string;
}

// --8<-- [start:OAuthFlows]
/**
 * OAuth 2.0 flow configurations
 */
export interface OAuthFlows {
  /** Authorization code flow */
  authorizationCode?: AuthorizationCodeOAuthFlow;
  /** Implicit flow */
  implicit?: ImplicitOAuthFlow;
  /** Password flow */
  password?: PasswordOAuthFlow;
  /** Client credentials flow */
  clientCredentials?: ClientCredentialsOAuthFlow;
}

/**
 * Authorization code OAuth flow
 */
export interface AuthorizationCodeOAuthFlow {
  /** Authorization URL */
  authorizationUrl: string;
  /** Token URL */
  tokenUrl: string;
  /** Optional refresh URL */
  refreshUrl?: string;
  /** Available scopes */
  scopes: Record<string, string>;
}

/**
 * Client credentials OAuth flow
 */
export interface ClientCredentialsOAuthFlow {
  /** Token URL */
  tokenUrl: string;
  /** Optional refresh URL */
  refreshUrl?: string;
  /** Available scopes */
  scopes: Record<string, string>;
}

/**
 * Implicit OAuth flow
 */
export interface ImplicitOAuthFlow {
  /** Authorization URL */
  authorizationUrl: string;
  /** Optional refresh URL */
  refreshUrl?: string;
  /** Available scopes */
  scopes: Record<string, string>;
}

/**
 * Password OAuth flow
 */
export interface PasswordOAuthFlow {
  /** Token URL */
  tokenUrl: string;
  /** Optional refresh URL */
  refreshUrl?: string;
  /** Available scopes */
  scopes: Record<string, string>;
}
// --8<-- [end:OAuthFlows]