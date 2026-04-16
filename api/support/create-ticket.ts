interface CreateTicketRequest {
  email: string;
  subject: string;
  description: string;
  priority?: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, subject, description, priority = 'medium' }: CreateTicketRequest = req.body;

  // Validation
  if (!email || !subject || !description) {
    return res.status(400).json({ error: 'Missing required fields: email, subject, description' });
  }

  try {
    const superopsApiKey = process.env.SUPEROPS_API_KEY;
    const superopsBaseUrl = process.env.SUPEROPS_BASE_URL || 'https://api.superops.ai/v1';

    if (!superopsApiKey) {
      return res.status(500).json({ error: 'Superops API not configured' });
    }

    // Create ticket in Superops
    const response = await fetch(`${superopsBaseUrl}/tickets`, {
      method: 'POST',
      headers: {
        'Authorization': `${superopsApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        title: subject,
        description: description,
        customer_email: email,
        email: email,
        priority: priority.toLowerCase(),
        status: 'open',
      }),
    });

    if (!response.ok) {
      console.error('Superops API error:', response.status, response.statusText);
      return res.status(response.status).json({
        error: 'Failed to create support ticket',
        details: `HTTP ${response.status}`
      });
    }

    const data = await response.json();

    return res.status(200).json({
      success: true,
      message: 'Support ticket created successfully',
      ticketId: data.id || data._id,
      ticket: {
        id: data.id || data._id,
        subject: data.title || subject,
        status: data.status || 'open',
        priority: data.priority || priority,
        createdAt: data.created_at || data.createdAt || new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    return res.status(500).json({
      error: 'Failed to create support ticket',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
