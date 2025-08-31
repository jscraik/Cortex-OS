import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { Verifier } from '@pact-foundation/pact';
import { resolve } from 'path';
import { start } from '../src/server';

let close: any;

describe('Provider verification', () => {
  beforeAll(async () => {
    const app = await start(3456);
    close = async () => app.close();
  });
  afterAll(async () => {
    if (close) await close();
  });

  it('verifies against Pact Broker or local pacts', async () => {
    const brokerUrl = process.env.PACT_BROKER_URL;
    const brokerToken = process.env.PACT_BROKER_TOKEN;
    const providerVersion = process.env.GIT_SHA || 'dev';

    const opts: any = {
      providerBaseUrl: 'http://localhost:3456',
      publishVerificationResult: Boolean(brokerUrl),
      providerVersion,
    };

    if (brokerUrl) {
      opts.pactBrokerUrl = brokerUrl;
      if (brokerToken) opts.pactBrokerToken = brokerToken;
      opts.consumerVersionSelectors = [{ tag: process.env.PACT_TAGS || 'main', latest: true }];
    } else {
      opts.pactUrls = [resolve(__dirname, '..', 'pacts')];
    }

    const verifier = new Verifier(opts);
    await expect(verifier.verifyProvider()).resolves.toBeDefined();
  });
});
