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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, company, tier, selections, estimated_total, message }: QuoteFormData = req.body;

  // Validation
  if (!name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const selectionsHtml = selections && selections.length > 0
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
            ${selections.map((item) => `
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 10px; color: #555;">${item.name}</td>
                <td style="text-align: center; padding: 10px; color: #555;">${item.quantity}</td>
                <td style="text-align: right; padding: 10px; color: #555;">$${item.cost_per_unit.toFixed(2)}</td>
                <td style="text-align: right; padding: 10px; color: #555; font-weight: bold;">$${(item.quantity * item.cost_per_unit).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${estimated_total ? `
          <div style="text-align: right; padding: 15px 0; border-top: 2px solid #39CCCC;">
            <p style="font-size: 18px; color: #152232; margin: 0;"><strong>First-Look Estimate: $${estimated_total.toFixed(2)}</strong></p>
            <p style="font-size: 12px; color: #999; margin: 5px 0 0 0;">*Final quote may vary based on specific requirements</p>
          </div>
        ` : ''}
      `
      : '';

    // Send email to admin
    const adminEmailResult = await resend.emails.send({
      from: 'support@newwaveitfl.com',
      to: 'contact@newwaveitfl.com',
      subject: `Quote Request from ${name}${estimated_total ? ` - $${estimated_total.toFixed(2)}` : ''}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #152232; border-bottom: 2px solid #39CCCC; padding-bottom: 10px;">
            Quote Request from ${name}
          </h2>

          <div style="margin: 20px 0;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
            ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
          </div>

          ${selectionsHtml}

          ${message ? `
            <div style="background-color: #f8fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Additional Details:</strong></p>
              <p style="white-space: pre-wrap; color: #555;">${message}</p>
            </div>
          ` : ''}

          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
            <p>This is an automated quote request from your website pricing page.</p>
            <p>Reply directly to ${email} to follow up with the customer.</p>
          </div>
        </div>
      `,
    });

    if (adminEmailResult.error) {
      console.error('Admin email error:', adminEmailResult.error);
      return res.status(500).json({ error: 'Failed to send quote request' });
    }

    // Send confirmation email to user
    const userEmailResult = await resend.emails.send({
      from: 'support@newwaveitfl.com',
      to: email,
      subject: `Your Quote Request Received - New Wave IT`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #152232; border-bottom: 2px solid #39CCCC; padding-bottom: 10px;">
            Thank You, ${name}!
          </h2>

          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            We've received your quote request and will review it shortly.
          </p>

          ${estimated_total ? `
            <div style="background-color: rgba(57, 204, 204, 0.08); padding: 20px; border-radius: 8px; border: 2px solid rgba(57, 204, 204, 0.3); margin: 20px 0; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">YOUR FIRST-LOOK ESTIMATE</p>
              <p style="color: #39CCCC; font-size: 32px; font-weight: bold; margin: 0;">$${estimated_total.toFixed(2)}</p>
              <p style="color: #999; font-size: 11px; margin: 10px 0 0 0;">*Final quote may vary based on your specific requirements</p>
            </div>
          ` : ''}

          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            One of our specialists will prepare a customized quote and contact you within 24 business hours.
            ${phone ? `<br>We have your phone number and may reach out at ${phone}.` : ''}
          </p>

          ${selections && selections.length > 0 ? `
            <div style="background-color: #f8fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #666; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">Your Selections:</p>
              <ul style="color: #666; font-size: 14px; margin: 0; padding-left: 20px;">
                ${selections.map((item) => `
                  <li>${item.quantity} × ${item.name}</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}

          ${message ? `
            <div style="background-color: #f8fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #666; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">Your Details:</p>
              <p style="color: #666; font-size: 14px; white-space: pre-wrap; margin: 0;">${message.substring(0, 300)}${message.length > 300 ? '...' : ''}</p>
            </div>
          ` : ''}

          <div style="background-color: rgba(57, 204, 204, 0.08); padding: 15px; border-radius: 8px; border: 1px solid rgba(57, 204, 204, 0.2); margin: 20px 0;">
            <p style="color: #152232; font-weight: bold; margin: 0 0 10px 0;">Need Immediate Assistance?</p>
            <p style="color: #555; margin: 0;">Call us anytime at <strong>(954) 555-0100</strong><br>We're available 24/7 for urgent matters.</p>
          </div>

          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
            <p>Best regards,<br><strong>New Wave IT Sales Team</strong></p>
            <p>
              newwaveitfl.com | (954) 555-0100
            </p>
          </div>
        </div>
      `,
    });

    if (userEmailResult.error) {
      console.error('User confirmation email error:', userEmailResult.error);
      // Don't fail the request if confirmation email fails - the admin notification went through
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
