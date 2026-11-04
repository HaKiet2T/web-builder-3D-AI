import 'server-only';
import { Agent, request as httpsRequest } from 'node:https';

const httpsAgent = new Agent({ keepAlive: true, timeout: 30_000 });

export const supabaseFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init);
  const endpoint = new URL(request.url);
  if (endpoint.protocol !== 'https:') {
    throw new Error('Supabase requests must use HTTPS.');
  }

  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : Buffer.from(await request.arrayBuffer());
  const headers = Object.fromEntries(request.headers.entries());
  if (!headers['accept-encoding']) headers['accept-encoding'] = 'identity';
  if (body && !headers['content-length']) headers['content-length'] = String(body.length);

  return new Promise((resolve, reject) => {
    const clientRequest = httpsRequest(
      {
        hostname: endpoint.hostname,
        port: endpoint.port || 443,
        path: `${endpoint.pathname}${endpoint.search}`,
        method: request.method,
        agent: httpsAgent,
        headers,
        timeout: 15_000,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('error', reject);
        response.on('end', () => {
          const responseHeaders = new Headers();
          for (const [name, value] of Object.entries(response.headers)) {
            if (value === undefined) continue;
            for (const item of Array.isArray(value) ? value : [value]) {
              responseHeaders.append(name, String(item));
            }
          }

          const status = response.statusCode ?? 500;
          const responseBody = Buffer.concat(chunks);
          resolve(
            new Response(
              status === 204 || status === 304 || responseBody.length === 0
                ? null
                : responseBody,
              {
                status,
                statusText: response.statusMessage,
                headers: responseHeaders,
              },
            ),
          );
        });
      },
    );

    clientRequest.on('timeout', () => {
      clientRequest.destroy(new Error('Supabase request timed out.'));
    });
    clientRequest.on('error', reject);
    if (request.signal.aborted) {
      clientRequest.destroy(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }

    const abort = () => {
      clientRequest.destroy(new DOMException('The operation was aborted.', 'AbortError'));
    };
    request.signal.addEventListener('abort', abort, { once: true });
    clientRequest.on('close', () => request.signal.removeEventListener('abort', abort));
    clientRequest.end(body);
  });
};
