import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { supabaseFetch } from '../src/lib/supabase/node-fetch.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('Supabase transport', () => {
  it('uses the runtime fetch transport so responses can be compressed and pooled', async () => {
    const response = new Response('ok');
    const requestInit = { method: 'GET' };
    let receivedInit: RequestInit | undefined;
    globalThis.fetch = async (_input, init) => {
      receivedInit = init;
      return response;
    };

    const result = await supabaseFetch('https://project.supabase.co/rest/v1/products', requestInit);

    assert.equal(result, response);
    assert.equal(receivedInit, requestInit);
  });

  it('rejects insecure Supabase endpoints before making a request', async () => {
    await assert.rejects(() => supabaseFetch('http://project.supabase.co/rest/v1/products'), /HTTPS/);
  });
});
