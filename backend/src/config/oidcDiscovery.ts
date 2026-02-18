/**
 * OIDC Discovery Helper
 * Fetches and caches OpenID Connect configuration from the discovery endpoint
 */

interface OIDCConfiguration {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
}

let cachedConfig: OIDCConfiguration | null = null;

/**
 * Fetches the OIDC configuration from the .well-known/openid-configuration endpoint
 * @param issuer The OIDC issuer URL (e.g., https://adfs.alsiraat.vic.edu.au/adfs)
 * @returns The OIDC configuration
 */
export async function fetchOIDCConfiguration(issuer: string): Promise<OIDCConfiguration> {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    // Construct the well-known URL
    const discoveryUrl = `${issuer}/.well-known/openid-configuration`;
    
    console.log(`[OIDC Discovery] Fetching configuration from: ${discoveryUrl}`);
    
    const response = await fetch(discoveryUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch OIDC configuration: ${response.status} ${response.statusText}`);
    }
    
    const config = await response.json() as OIDCConfiguration;
    
    // Validate required fields
    if (!config.authorization_endpoint || !config.token_endpoint || !config.userinfo_endpoint) {
      throw new Error('Invalid OIDC configuration: missing required endpoints');
    }
    
    // Cache the configuration
    cachedConfig = config;
    
    console.log(`[OIDC Discovery] Configuration loaded successfully`);
    console.log(`  - Authorization Endpoint: ${config.authorization_endpoint}`);
    console.log(`  - Token Endpoint: ${config.token_endpoint}`);
    console.log(`  - Userinfo Endpoint: ${config.userinfo_endpoint}`);
    
    return config;
  } catch (error) {
    console.error('[OIDC Discovery] Failed to fetch configuration:', error);
    throw error;
  }
}

/**
 * Gets the cached OIDC configuration or throws an error if not initialized
 */
export function getOIDCConfiguration(): OIDCConfiguration {
  if (!cachedConfig) {
    throw new Error('OIDC configuration not initialized. Call fetchOIDCConfiguration first.');
  }
  return cachedConfig;
}

/**
 * Clears the cached configuration (useful for testing)
 */
export function clearOIDCConfigurationCache(): void {
  cachedConfig = null;
}
