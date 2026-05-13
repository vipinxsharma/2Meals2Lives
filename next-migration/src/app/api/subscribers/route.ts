// Example proxy route. The current production site does NOT use this — it
// calls Strapi directly with CORS. When we cut traffic to the Next.js app,
// the frontend stops needing CORS because all calls flow through this
// server-side proxy. This also gives us a place to add Resend triggering.

import { NextResponse } from 'next/server';
import { STRAPI_URL } from '@/lib/strapi';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_json' },
      { status: 400 },
    );
  }

  const data = body?.data || {};
  const email = String(data.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  // Forward to Strapi using the public POST (no admin token in browser).
  const res = await fetch(`${STRAPI_URL}/api/subscribers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: { email, source: data.source || 'next-proxy', website: data.website || '' },
    }),
  });

  if (!res.ok && res.status !== 200) {
    return NextResponse.json({ error: 'upstream', status: res.status }, { status: 502 });
  }

  // TODO when migrating fully: trigger Resend welcome email here using
  // process.env.RESEND_API_KEY. See docs/MONITORING.md for setup.

  return NextResponse.json({ ok: true });
}
