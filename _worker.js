// Cloudflare Worker entrypoint (Worker + static assets, single deployment).
//
// This file is required because "Workers & Pages" deployed this project as a
// plain static-assets Worker, which has no runtime — hence the dashboard
// warning "Variables cannot be added to a Worker that only has static assets."
// Adding this file gives the Worker actual code to run, which is what lets
// you attach environment variables/secrets, and is also what makes the
// /api/quote endpoint work at all under this deployment type.
//
// Required environment variable (Settings -> Variables and secrets -> add as
// a Secret once this file is deployed and the warning disappears):
//   RESEND_API_KEY        — your Resend API key
// Optional:
//   QUOTE_RECIPIENT_EMAIL — where quote requests should land
//                            (defaults to hello@prontocleaning.co.ke)

const MAX_TOTAL_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8MB combined cap per submission

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function labelize(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function handleQuote(request, env) {
  try {
    const formData = await request.formData();

    const fields = {};
    const attachments = [];
    let totalAttachmentBytes = 0;
    let skippedAttachments = false;

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        if (!value.size) continue;
        if (totalAttachmentBytes + value.size > MAX_TOTAL_ATTACHMENT_BYTES) {
          skippedAttachments = true;
          continue;
        }
        const buffer = await value.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        attachments.push({ filename: value.name, content: btoa(binary) });
        totalAttachmentBytes += value.size;
      } else {
        fields[key] = value;
      }
    }

    if (!fields.name || !fields.email || !fields.phone) {
      return Response.json({ ok: false, error: 'Please fill in your name, email, and phone number.' }, { status: 400 });
    }

    const rows = Object.entries(fields)
      .map(([key, val]) => `
        <tr>
          <td style="padding:6px 12px;font-weight:600;color:#162A2C;white-space:nowrap;vertical-align:top;">${escapeHtml(labelize(key))}</td>
          <td style="padding:6px 12px;color:#333;">${escapeHtml(val) || '—'}</td>
        </tr>`)
      .join('');

    const html = `
      <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;">
        <h2 style="color:#5E6C5B;">New Quote Request — ProntoCleaning Solutions</h2>
        <table style="border-collapse:collapse;">${rows}</table>
        ${skippedAttachments ? '<p style="color:#b3261e;">Note: one or more attached photos were too large and were not included. Ask the customer to send them separately if needed.</p>' : ''}
      </div>`;

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ProntoCleaning Website <quotes@prontocleaning.co.ke>',
        to: [env.QUOTE_RECIPIENT_EMAIL || 'hello@prontocleaning.co.ke'],
        reply_to: fields.email,
        subject: `New quote request from ${fields.name}`,
        html,
        attachments: attachments.length ? attachments : undefined,
      }),
    });

    if (!resendResp.ok) {
      const detail = await resendResp.text().catch(() => '');
      return Response.json({ ok: false, error: 'Email service rejected the request.', detail }, { status: 502 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: err.message || 'Unexpected server error.' }, { status: 500 });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/quote' && request.method === 'POST') {
      return handleQuote(request, env);
    }

    // Everything else: fall through to the static site files.
    return env.ASSETS.fetch(request);
  },
};
