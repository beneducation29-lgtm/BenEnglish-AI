// Explicit Vercel Function for the AI conversation endpoint.
// Keep this concrete route alongside the shared Express app so Vercel's
// filesystem router does not depend on catch-all route matching.
import app from '../../server';

export default function handler(req: any, res: any) {
  // Express registers the route with the full /api prefix.
  req.url = '/api/gemini/conversation';
  console.info('[api] conversation function invoked', req.method);
  return app(req, res);
}
