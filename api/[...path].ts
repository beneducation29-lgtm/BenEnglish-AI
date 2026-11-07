// Route all /api/* requests through the existing Express API handlers.
// Vercel invokes this exported handler per request; server.ts only starts
// its local listener outside the Vercel runtime.
import app from '../server';

export default app;
