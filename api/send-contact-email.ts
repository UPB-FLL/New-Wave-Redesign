import { Resend } from 'resend';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, company, message }: ContactFormData = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (name.length > 100) return res.status(400).json({ error: 'Name too long' });
  if (email.length > 254) return res.status(400).json({ error: 'Email too long' });
  if (message.length > 5000) return res.status(400).json({ error: 'Message too long' });
  if (phone && phone.length > 30) return res.status(400).json({ error: 'Phone number too long' });
  if (company && company.length > 200) return res.status(400).json({ error: 'Company name too long' });

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePhone = phone ? escapeHtml(phone) : '';
  const safeCompany = company ? escapeHtml(company) : '';
  const safeMessage = escapeHtml(message);

  try {
    const adminEmailResult = await resend.emails.send({
      from: 'support@newwaveitfl.com',
      to: 'contact@newwaveitfl.com',
      subject: `New Contact Form Submission from ${safeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #152232; border-bottom: 2px solid #39CCCC; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>

          <div style="margin: 20px 0;">
            <p><strong>Name:</strong> ${safeName}</p>
            <p><strong>Email:</strong> ${safeEmail}</p>
            ${safePhone ? `<p><strong>Phone:</strong> ${safePhone}</p>` : ''}
            ${safeCompany ? `<p><strong>Company:</strong> ${safeCompany}</p>` : ''}
          </div>

          <div style="background-color: #f8fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap; color: #555;">${safeMessage}</p>
          </div>

          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
            <p>This is an automated email from your website contact form.</p>
          </div>
        </div>
      `,
    });

    if (adminEmailResult.error) {
      console.error('Admin email error:', adminEmailResult.error);
      return res.status(500).json({ error: 'Failed to send notification email' });
    }

    const safeMessagePreview = safeMessage.substring(0, 200) + (message.length > 200 ? '...' : '');

    const userEmailResult = await resend.emails.send({
      from: 'support@newwaveitfl.com',
      to: email,
      subject: 'We Received Your Message - New Wave IT',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #152232; border-bottom: 2px solid #39CCCC; padding-bottom: 10px;">
            Thank You, ${safeName}!
          </h2>

          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            We've received your message and appreciate you reaching out to New Wave IT.
          </p>

          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            A member of our team will review your inquiry and get back to you within one business day.
            For urgent matters, feel free to call us directly at (954) 555-0100.
          </p>

          <div style="background-color: #f8fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #666; font-size: 14px;"><strong>Your Message Summary:</strong></p>
            <p style="color: #666; font-size: 14px; white-space: pre-wrap;">${safeMessagePreview}</p>
          </div>

          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
            <p>Best regards,<br><strong>New Wave IT Support Team</strong></p>
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
      message: 'Contact form submitted successfully',
      adminEmailId: adminEmailResult.data?.id,
    });
  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({ error: 'Failed to process contact form' });
  }
}
