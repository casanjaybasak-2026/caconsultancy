import type { Env } from './env';
import { json } from './http';
import { isLegacyRoute } from './routes';
import { handleOrder, handleVerify, handleWebhook, handleEnquiry } from './booking';
import { handleManage } from './manage';

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
          case '/api/enquiry': return await handleEnquiry(req, env);
        }
      } catch (err) {
        console.error('api error', url.pathname, err);
        return json({ error: 'Something went wrong. Please try again.' }, 500);
      }
      return json({ error: 'Not found' }, 404);
    }

    if (url.pathname === '/manage' || url.pathname.startsWith('/manage/')) {
      if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });
      return handleManage(req, env);
    }

    if (isLegacyRoute(url.pathname)) {
      const res = await env.ASSETS.fetch(new Request(new URL('/app', url), req));
      return new Response(res.body, { status: 200, headers: res.headers });
    }

    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
