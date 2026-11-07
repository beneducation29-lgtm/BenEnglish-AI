// Route all /api/* requests through the existing Express API handlers.
// Vercel catch-all functions may forward either the full path or the path
// relative to /api. Normalize both forms before Express route matching.
import app from '../server';

export default function handler(req: any, res: any) {
  const incomingUrl = req.url || '/';
  if (incomingUrl !== '/api' && !incomingUrl.startsWith('/api/')) {
    req.url = incomingUrl.startsWith('/') ? `/api${incomingUrl}` : `/api/${incomingUrl}`;
  }

  console.info('[api] Express request', req.method, req.url);
  return app(req, res);
}
