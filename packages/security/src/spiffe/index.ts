/**
 * @file SPIFFE Module
 * @description SPIFFE (Secure Production Identity Framework for Everyone) implementation
 */

export {
	buildWorkloadIdentity,
	convertSelectors,
	SpiffeClient,
	splitPEMCertificates,
} from './client';
