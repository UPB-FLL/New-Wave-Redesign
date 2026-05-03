import { Resend } from 'resend';

interface SupportTicketData {
  name: string;
  email: string;
  subject: string;
  description: string;
}

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, subject, description }: SupportTicketData = req.body;

  // Validation
  if (!name || !email || !subject) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Send ticket to support email
    const ticketEmailResult = await resend.emails.send({
      from: 'support@newwaveitfl.com',
      to: 'support@newwaveitfl.com',
      subject: `[Support Ticket] ${subject}`,
      replyTo: email,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #152232; border-bottom: 2px solid #39CCCC; padding-bottom: 10px;">
            New Support Ticket Submitted
          </h2>

          <div style="margin: 20px 0;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
          </div>

          <div style="background-color: #f8fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Description:</strong></p>
            <p style="white-space: pre-wrap; color: #555;">${description || 'No additional details provided'}</p>
          </div>

          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
            <p>This is an automated email from your website support ticket form.</p>
            <p>Reply to this email to respond to the customer directly.</p>
          </div>
        </div>
      `,
    });

    if (ticketEmailResult.error) {
      console.error('Ticket email error:', ticketEmailResult.error);
      return res.status(500).json({ error: 'Failed to submit support ticket' });
    }

    // Send confirmation email to user
    const confirmationEmailResult = await resend.emails.send({
      from: 'support@newwaveitfl.com',
      to: email,
      subject: 'Your Support Ticket Has Been Received - New Wave IT',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #152232; border-bottom: 2px solid #39CCCC; padding-bottom: 10px;">
            Support Ticket Received
          </h2>

          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Thank you for submitting a support ticket, ${name}!
          </p>

          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            We've received your support request and our team will begin investigating your issue right away.
            You can expect a response within 4 business hours for critical issues or 1 business day for standard requests.
          </p>

          <div style="background-color: #f8fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #666; font-size: 14px;"><strong>Ticket Summary:</strong></p>
            <p style="color: #666; font-size: 14px;"><strong>Subject:</strong> ${subject}</p>
            ${description ? `<p style="color: #666; font-size: 14px; white-space: pre-wrap;"><strong>Description:</strong> ${description.substring(0, 300)}${description.length > 300 ? '...' : ''}</p>` : ''}
          </div>

          <div style="background-color: #e8f5f4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #39CCCC;">
            <p style="color: #152232; font-size: 14px; margin: 0;">
              <strong>Need Immediate Help?</strong> Call us at (954) 555-0100 for urgent support.
            </p>
          </div>

          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
            <p>Best regards,<br><strong>New Wave IT Support Team</strong></p>
            <p>
              newwaveitfl.com | (954) 555-0100
            </p>
          </div>
        </div>
      `,
    });

    if (confirmationEmailResult.error) {
      console.error('Confirmation email error:', confirmationEmailResult.error);
      // Don't fail the request if confirmation email fails - the support notification went through
    }

    return res.status(200).json({
      success: true,
      message: 'Support ticket submitted successfully',
      ticketEmailId: ticketEmailResult.data?.id,
    });
  } catch (error) {
    console.error('Support ticket error:', error);
    return res.status(500).json({ error: 'Failed to submit support ticket' });
  }
}
