import { Resend } from 'resend';

interface SelectionItem {
  name: string;
  quantity: number;
  cost_per_unit: number;
}

interface QuoteFormData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  tier?: string;
  selections?: SelectionItem[];
  estimated_total?: number;
  message?: string;
}

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(unsafe: string): string {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email);
}

function sanitizeNumber(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, company, tier, selections, estimated_total, message }: QuoteFormData = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (name.length > 100) return res.status(400).json({ error: 'Name too long' });
  if (email.length > 254) return res.status(400).json({ error: 'Email too long' });
  if (phone && phone.length > 30) return res.status(400).json({ error: 'Phone number too long' });
  if (company && company.length > 200) return res.status(400).json({ error: 'Company name too long' });
  if (message && message.length > 5000) return res.status(400).json({ error: 'Message too long' });
  if (selections && selections.length > 50) return res.status(400).json({ error: 'Too many selections' });

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePhone = phone ? escapeHtml(phone) : '';
  const safeCompany = company ? escapeHtml(company) : '';
  const safeMessage = message ? escapeHtml(message) : '';
  const safeTotal = sanitizeNumber(estimated_total);

  const safeSelections = (selections || []).map((item) => ({
    name: escapeHtml(String(item.name ?? '')).substring(0, 200),
    quantity: sanitizeNumber(item.quantity),
    cost_per_unit: sanitizeNumber(item.cost_per_unit),
  }));

  try {
    const selectionsHtml = safeSelections.length > 0
      ? `
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="border-bottom: 2px solid #39CCCC;">
              <th style="text-align: left; padding: 10px; color: #152232; font-weight: bold;">Option</th>
              <th style="text-align: center; padding: 10px; color: #152232; font-weight: bold;">Quantity</th>
              <th style="text-align: right; padding: 10px; color: #152232; font-weight: bold;">Unit Cost</th>
              <th style="text-align: right; padding: 10px; color: #152232; font-weight: bold;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${safeSelections.map((item) => `
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 10px; color: #555;">${item.name}</td>
                <td style="text-align: center; padding: 10px; color: #555;">${item.quantity}</td>
                <td style="text-align: right; padding: 10px; color: #555;">$${item.cost_per_unit.toFixed(2)}</td>
                <td style="text-align: right; padding: 10px; color: #555; font-weight: bold;">$${(item.quantity * item.cost_per_unit).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${safeTotal > 0 ? `
          <div style="text-align: right; padding: 15px 0; border-top: 2px solid #39CCCC;">
            <p style="font-size: 18px; color: #152232; margin: 0;"><strong>First-Look Estimate: $${safeTotal.toFixed(2)}</strong></p>
            <p style="font-size: 12px; color: #999; margin: 5px 0 0 0;">*Final quote may vary based on specific requirements</p>
          </div>
        ` : ''}
      `
      : '';

    const adminEmailResult = await resend.emails.send({
      from: 'support@newwaveitfl.com',
      to: 'contact@newwaveitfl.com',
      subject: `Quote Request from ${safeName}${safeTotal > 0 ? ` - $${safeTotal.toFixed(2)}` : ''}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #152232; border-bottom: 2px solid #39CCCC; padding-bottom: 10px;">
            Quote Request from ${safeName}
          </h2>

          <div style="margin: 20px 0;">
            <p><strong>Name:</strong> ${safeName}</p>
            <p><strong>Email:</strong> ${safeEmail}</p>
            ${safePhone ? `<p><strong>Phone:</strong> ${safePhone}</p>` : ''}
            ${safeCompany ? `<p><strong>Company:</strong> ${safeCompany}</p>` : ''}
          </div>

          ${selectionsHtml}

          ${safeMessage ? `
            <div style="background-color: #f8fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Additional Details:</strong></p>
              <p style="white-space: pre-wrap; color: #555;">${safeMessage}</p>
            </div>
          ` : ''}

          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
            <p>This is an automated quote request from your website pricing page.</p>
            <p>Reply directly to ${safeEmail} to follow up with the customer.</p>
          </div>
        </div>
      `,
    });

    if (adminEmailResult.error) {
      console.error('Admin email error:', adminEmailResult.error);
      return res.status(500).json({ error: 'Failed to send quote request' });
    }

    const safeMessagePreview = safeMessage
      ? safeMessage.substring(0, 300) + (message && message.length > 300 ? '...' : '')
      : '';

    const userEmailResult = await resend.emails.send({
      from: 'support@newwaveitfl.com',
      to: email,
      subject: `Your Quote Request Received - New Wave IT`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #152232; border-bottom: 2px solid #39CCCC; padding-bottom: 10px;">
            Thank You, ${safeName}!
          </h2>

          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            We've received your quote request and will review it shortly.
          </p>

          ${safeTotal > 0 ? `
            <div style="background-color: rgba(57, 204, 204, 0.08); padding: 20px; border-radius: 8px; border: 2px solid rgba(57, 204, 204, 0.3); margin: 20px 0; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">YOUR FIRST-LOOK ESTIMATE</p>
              <p style="color: #39CCCC; font-size: 32px; font-weight: bold; margin: 0;">$${safeTotal.toFixed(2)}</p>
              <p style="color: #999; font-size: 11px; margin: 10px 0 0 0;">*Final quote may vary based on your specific requirements</p>
            </div>
          ` : ''}

          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            One of our specialists will prepare a customized quote and contact you within 24 business hours.
            ${safePhone ? `<br>We have your phone number and may reach out at ${safePhone}.` : ''}
          </p>

          ${safeSelections.length > 0 ? `
            <div style="background-color: #f8fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #666; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">Your Selections:</p>
              <ul style="color: #666; font-size: 14px; margin: 0; padding-left: 20px;">
                ${safeSelections.map((item) => `<li>${item.quantity} &times; ${item.name}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${safeMessagePreview ? `
            <div style="background-color: #f8fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #666; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">Your Details:</p>
              <p style="color: #666; font-size: 14px; white-space: pre-wrap; margin: 0;">${safeMessagePreview}</p>
            </div>
          ` : ''}

          <div style="background-color: rgba(57, 204, 204, 0.08); padding: 15px; border-radius: 8px; border: 1px solid rgba(57, 204, 204, 0.2); margin: 20px 0;">
            <p style="color: #152232; font-weight: bold; margin: 0 0 10px 0;">Need Immediate Assistance?</p>
            <p style="color: #555; margin: 0;">Call us anytime at <strong>(954) 555-0100</strong><br>We're available 24/7 for urgent matters.</p>
          </div>

          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
            <p>Best regards,<br><strong>New Wave IT Sales Team</strong></p>
            <p>newwaveitfl.com | (954) 555-0100</p>
          </div>
        </div>
      `,
    });

    if (userEmailResult.error) {
      console.error('User confirmation email error:', userEmailResult.error);
    }

    return res.status(200).json({
      success: true,
      message: 'Quote request submitted successfully',
      adminEmailId: adminEmailResult.data?.id,
    });
  } catch (error) {
    console.error('Quote request error:', error);
    return res.status(500).json({ error: 'Failed to process quote request' });
  }
}
