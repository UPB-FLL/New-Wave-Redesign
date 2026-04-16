interface TicketQuery {
  email: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email }: TicketQuery = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Get Superops API credentials from environment
    const superopsApiKey = process.env.SUPEROPS_API_KEY;
    const superopsBaseUrl = process.env.SUPEROPS_BASE_URL || 'https://api.superops.ai/v1';

    if (!superopsApiKey) {
      return res.status(500).json({ error: 'Superops API not configured' });
    }

    // Fetch tickets from Superops API
    const response = await fetch(`${superopsBaseUrl}/tickets`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${superopsApiKey}`,
        'Content-Type': 'application/json',
        'X-Customer-Email': email,
      },
    });

    if (!response.ok) {
      console.error('Superops API error:', response.statusText);
      return res.status(response.status).json({
        error: 'Failed to fetch tickets from support system',
        tickets: []
      });
    }

    const data = await response.json();

    // Transform Superops data to our format
    const tickets = (data.tickets || []).map((ticket: any) => ({
      id: ticket.id,
      subject: ticket.title || ticket.subject,
      status: ticket.status?.toLowerCase() || 'open',
      priority: ticket.priority?.toLowerCase() || 'medium',
      createdAt: ticket.created_at || new Date().toISOString(),
      updatedAt: ticket.updated_at || new Date().toISOString(),
      description: ticket.description || '',
    }));

    return res.status(200).json({
      success: true,
      tickets,
      count: tickets.length
    });
  } catch (error) {
    console.error('Support tickets error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve support tickets',
      tickets: []
    });
  }
}
