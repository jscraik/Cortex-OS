/**
 * @file A2A Gateway - Zero Trust Agent-to-Agent Communication Gateway
 * @description Central enforcement point for all A2A communications following brAInwav zero-trust principles
 */

export { RequestEnvelope, SignedEnvelopeValidator } from './envelope.js';
export { A2AGateway, A2AGatewayConfig } from './gateway.js';
export { A2AGatewayMiddleware } from './middleware.js';
export * from './types.js';
