import { type ValidationResult, type ValidationError, type ValidationWarning } from '../types.js';

export function validateSecurity(manifest: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (typeof manifest !== 'object' || manifest === null) {
    return {
      valid: false,
      errors: [{ path: 'root', message: 'Manifest must be an object', code: 'invalid_type' }],
      warnings: [],
    };
  }

  const m = manifest as any;

  if (m.scopes && Array.isArray(m.scopes)) {
    const dangerousScopes = ['system:exec', 'network:admin', 'files:write-system'];
    for (const scope of m.scopes) {
      if (dangerousScopes.includes(scope)) {
        warnings.push({
          path: 'scopes',
          message: `Dangerous scope detected: ${scope}`,
          suggestion: 'Ensure this scope is absolutely necessary and well-documented',
        });
      }
    }
  }

  if (m.transports) {
    ['sse', 'streamableHttp'].forEach((transport) => {
      if (m.transports[transport]?.url && !m.transports[transport].url.startsWith('https://')) {
        errors.push({
          path: `transports.${transport}.url`,
          message: `${transport} transport must use HTTPS in production`,
          code: 'insecure_transport',
        });
      }
    });
  }

  const openSourceLicenses = ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'ISC'];
  if (m.license && !openSourceLicenses.includes(m.license)) {
    warnings.push({
      path: 'license',
      message: 'Non-standard or proprietary license detected',
      suggestion: 'Consider using a standard open-source license for better adoption',
    });
  }

  if (!m.security?.sigstoreBundle) {
    warnings.push({
      path: 'security.sigstoreBundle',
      message: 'No Sigstore bundle provided',
      suggestion: 'Add cryptographic attestation for supply chain security',
    });
  }

  if (!m.security?.sbom) {
    warnings.push({
      path: 'security.sbom',
      message: 'No SBOM (Software Bill of Materials) provided',
      suggestion: 'Include SBOM for dependency transparency',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export default validateSecurity;
