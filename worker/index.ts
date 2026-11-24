import type { Env } from './env';
import { isLegacyRoute } from './routes';
import { json } from './http';
import { handleOrder, handleVerify, handleWebhook } from './booking';

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname.startsWith('/api/')) {
      if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
      try {
        switch (url.pathname) {
          case '/api/booking/order': return await handleOrder(req, env);
          case '/api/booking/verify': return await handleVerify(req, env);
          case '/api/booking/webhook': return await handleWebhook(req, env);
        }
      } catch (err) {
        console.error('api error', url.pathname, err);
        return json({ error: 'Something went wrong. Please try again.' }, 500);
      }
      return json({ error: 'Not found' }, 404);
    }

    if (isLegacyRoute(url.pathname)) {
      const res = await env.ASSETS.fetch(new Request(new URL('/app', url), req));
      return new Response(res.body, { status: 200, headers: res.headers });
    }

    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
