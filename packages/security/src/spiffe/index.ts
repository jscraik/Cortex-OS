/**
 * @file SPIFFE Module
 * @description SPIFFE (Secure Production Identity Framework for Everyone) implementation
 */

export {
  SpiffeClient,
  buildWorkloadIdentity,
  convertSelectors,
  splitPEMCertificates,
} from './client';
