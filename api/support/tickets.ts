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
      return res.status(500).json({ error: 'Superops API not configured', tickets: [] });
    }

    // Fetch tickets from Superops API with customer email filter
    const response = await fetch(`${superopsBaseUrl}/tickets?customer_email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Authorization': `${superopsApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Superops API error:', response.status, response.statusText);
      // Return empty tickets array on error to maintain UX
      return res.status(200).json({
        success: false,
        tickets: [],
        count: 0,
        error: 'No tickets found or API error'
      });
    }

    const data = await response.json();

    // Transform Superops data to our format
    const tickets = (Array.isArray(data) ? data : data.tickets || []).map((ticket: any) => ({
      id: ticket.id || ticket._id,
      subject: ticket.title || ticket.subject || 'Untitled',
      status: (ticket.status || 'open').toLowerCase(),
      priority: (ticket.priority || 'medium').toLowerCase(),
      createdAt: ticket.created_at || ticket.createdAt || new Date().toISOString(),
      updatedAt: ticket.updated_at || ticket.updatedAt || new Date().toISOString(),
      description: ticket.description || '',
    }));

    return res.status(200).json({
      success: true,
      tickets,
      count: tickets.length
    });
  } catch (error) {
    console.error('Support tickets error:', error);
    return res.status(200).json({
      success: false,
      tickets: [],
      count: 0,
      error: 'Failed to retrieve support tickets'
    });
  }
}
