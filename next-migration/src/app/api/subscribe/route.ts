// app/api/subscribe/route.ts
//
// POST handler: persists email to Strapi /api/subscribers then sends a
// welcome email via Resend. Server-side only — STRAPI_TOKEN and
// RESEND_API_KEY never reach the browser bundle.
//
// Required env vars (set in Vercel for this app, NOT on the static deploy):
//   NEXT_PUBLIC_STRAPI_URL  - e.g. https://cms.2hands2meals2lives1movement.org
//   STRAPI_TOKEN            - Strapi API token with subscribers.create
//   RESEND_API_KEY          - Resend API key, domain-restricted
//   RESEND_FROM_EMAIL       - verified sender on 2hands2meals2lives1movement.org
//
// This route only serves traffic when the Next.js app is deployed (separate
// Vercel project pointed at next-migration/). The production static frontend
// at the repo root continues to POST directly to Strapi /api/subscribers
// without email.
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Construct lazily inside the handler — the Resend SDK throws on
// `new Resend()` when RESEND_API_KEY is missing, which would crash the
// `next build` "Collecting page data" phase. Building must succeed even
// when env vars are not yet wired in Vercel.
function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  return new Resend(key);
}

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const FROM   = process.env.RESEND_FROM_EMAIL;
  const STRAPI = process.env.NEXT_PUBLIC_STRAPI_URL;
  const TOKEN  = process.env.STRAPI_TOKEN;

  const { email, source } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
  if (!FROM || !STRAPI || !TOKEN) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  try {
    // 1. Save to Strapi
    await fetch(`${STRAPI}/api/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ data: { email, source: source || 'join-tab' } }),
    });

    // 2. Send welcome email via Resend
    await getResend().emails.send({
      from: FROM,
      to: email,
      subject: 'You\'re part of the movement.',
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#1c1a14">
          <h1 style="font-size:28px;font-weight:400;margin-bottom:8px;color:#1c1a14">
            #2Hands2Meals2Lives1Movement
          </h1>
          <p style="font-size:16px;color:#78716c;margin-bottom:32px;font-style:italic">
            Two hands. Two meals. Two lives. One movement.
          </p>
          <p style="font-size:16px;line-height:1.7">
            You're in. That's the whole thing. No newsletter cadence. No sales funnel.
            Just dispatches from the road when something real happens worth sharing.
          </p>
          <p style="font-size:16px;line-height:1.7;margin-top:16px">
            Next time you're at a conference with a buffet — ask for two containers.
            Fill them. Walk outside. Find two people who need them.
          </p>
          <p style="font-size:16px;line-height:1.7;margin-top:16px">
            Then post a photo. Use the hashtag. Build the chain of receipts.
          </p>
          <p style="font-size:16px;color:#d4a017;margin-top:32px;font-weight:700">
            #2Hands2Meals2Lives1Movement
          </p>
          <p style="font-size:14px;color:#a8a29e;margin-top:48px">
            — Glenn Freezman, Chief Evangelist<br>
            <a href="https://2hands2meals2lives1movement.org" style="color:#d4a017">
              2hands2meals2lives1movement.org
            </a>
          </p>
          <hr style="border:none;border-top:1px solid #f5f1ea;margin:32px 0">
          <p style="font-size:12px;color:#a8a29e">
            You signed up at 2hands2meals2lives1movement.org.
            <a href="#" style="color:#a8a29e">Unsubscribe</a>
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
