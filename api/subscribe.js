export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, source } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    const STRAPI = process.env.NEXT_PUBLIC_STRAPI_URL;
    const TOKEN = process.env.STRAPI_TOKEN;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM = process.env.RESEND_FROM_EMAIL;

    const strapiRes = await fetch(`${STRAPI}/api/subscribers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          email,
          source: source || "join-tab",
        },
      }),
    });

    if (!strapiRes.ok) {
      const text = await strapiRes.text();
      console.error("Strapi error:", text);
      return res.status(500).json({ error: "Subscriber save failed" });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: email,
        subject: "You're part of the movement.",
        html: `
          <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#1c1a14">
            <h1 style="font-size:28px;font-weight:400;margin-bottom:8px;color:#1c1a14">
              #2Hands2Meals2Lives1Movement
            </h1>
            <p style="font-size:16px;color:#78716c;margin-bottom:32px;font-style:italic">
              Two hands. Two meals. Two lives. One movement.
            </p>
            <p style="font-size:16px;line-height:1.7">
              You're in. No newsletter noise. Just real dispatches from the road.
            </p>
            <p style="font-size:16px;line-height:1.7;margin-top:16px">
              Next time you're at a conference with a buffet — ask for two containers.
              Fill them. Walk outside. Find two people who need them.
            </p>
            <p style="font-size:16px;color:#d4a017;margin-top:32px;font-weight:700">
              #2Hands2Meals2Lives1Movement
            </p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const text = await emailRes.text();
      console.error("Resend error:", text);
      return res.status(500).json({ error: "Email send failed" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Subscribe error:", err);
    return res.status(500).json({ error: "Failed" });
  }
}
