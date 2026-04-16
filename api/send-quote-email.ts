import { Resend } from 'resend';

interface QuoteFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  tier: string;
  message: string;
}

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, company, tier, message }: QuoteFormData = req.body;

  // Validation
  if (!name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Send email to admin
    const adminEmailResult = await resend.emails.send({
      from: 'support@newwaveitfl.com',
      to: 'contact@newwaveitfl.com',
      subject: `Quote Request from ${name} - ${tier}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #152232; border-bottom: 2px solid #39CCCC; padding-bottom: 10px;">
            Quote Request - ${tier}
          </h2>

          <div style="margin: 20px 0;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
            ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
            <p><strong>Pricing Tier:</strong> ${tier}</p>
          </div>

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
      subject: `Quote Request Received - ${tier} - New Wave IT`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #152232; border-bottom: 2px solid #39CCCC; padding-bottom: 10px;">
            Thank You, ${name}!
          </h2>

          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            We've received your quote request for the <strong>${tier}</strong> plan and will review it shortly.
          </p>

          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            One of our specialists will prepare a customized quote and contact you within 24 business hours.
            ${phone ? `<br>We have your phone number and may reach out at ${phone}.` : ''}
          </p>

          <div style="background-color: #f8fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #666; font-size: 14px;"><strong>Selected Plan:</strong> ${tier}</p>
            ${message ? `<p style="color: #666; font-size: 14px;"><strong>Your Details:</strong></p>
            <p style="color: #666; font-size: 14px; white-space: pre-wrap;">${message.substring(0, 200)}${message.length > 200 ? '...' : ''}</p>` : ''}
          </div>

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
