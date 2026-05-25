import { type NextRequest, NextResponse } from 'next/server';

function backendOrigin(): string {
  const raw = process.env.BACKEND_URL || 'http://localhost:8000';
  return raw.startsWith('http') ? raw : `https://${raw}`;
}

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> },
) {
  const segments = (await params).proxy;
  const target = `${backendOrigin()}/${segments.join('/')}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete('host');

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    (init as any).duplex = 'half';
    init.body = req.body;
  }

  const upstream = await fetch(target, init);

  // Node's fetch() auto-decompresses gzip/br bodies, so forwarding the
  // original content-encoding and content-length headers would tell the
  // browser the body is still compressed (and the wrong size). Strip them
  // so the browser reads the decompressed stream until EOF.
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');
  responseHeaders.delete('transfer-encoding');

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE };
