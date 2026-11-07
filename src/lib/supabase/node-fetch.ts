import 'server-only';

export const supabaseFetch: typeof fetch = async (input, init) => {
  const endpoint = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  if (endpoint.protocol !== 'https:') {
    throw new Error('Supabase requests must use HTTPS.');
  }

  // Use the runtime transport for pooling and transparent compression. A
  // custom https.request transport forced identity encoding, making catalog
  // JSON responses much larger and slower to transfer.
  return fetch(input, init);
};
