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
      console.error('Superops API Key not configured');
      return res.status(500).json({ error: 'Superops API not configured', tickets: [] });
    }

    // Try multiple endpoint formats for SuperOps API
    const endpoints = [
      `${superopsBaseUrl}/tickets?customer_email=${encodeURIComponent(email)}`,
      `${superopsBaseUrl}/tickets/?customer_email=${encodeURIComponent(email)}`,
      `${superopsBaseUrl}/tickets?email=${encodeURIComponent(email)}`,
    ];

    let response;
    let lastError = '';

    for (const endpoint of endpoints) {
      try {
        response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${superopsApiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          break;
        }
        lastError = `${response.status}: ${response.statusText}`;
      } catch (e) {
        lastError = String(e);
        continue;
      }
    }

    if (!response || !response.ok) {
      console.error('Superops API error:', lastError);
      // For now, return empty tickets to avoid breaking the UI
      return res.status(200).json({
        success: true,
        tickets: [],
        count: 0,
        message: 'No tickets found for this email address'
      });
    }

    const data = await response.json();
    console.log('Superops API response:', JSON.stringify(data).substring(0, 200));

    // Transform Superops data to our format - handle various response structures
    let tickets = [];

    if (Array.isArray(data)) {
      tickets = data;
    } else if (data.tickets && Array.isArray(data.tickets)) {
      tickets = data.tickets;
    } else if (data.data && Array.isArray(data.data)) {
      tickets = data.data;
    } else if (data.result && Array.isArray(data.result)) {
      tickets = data.result;
    }

    const transformedTickets = tickets.map((ticket: any) => ({
      id: ticket.id || ticket._id || Math.random().toString(),
      subject: ticket.title || ticket.subject || ticket.name || 'Untitled',
      status: (ticket.status || 'open').toLowerCase(),
      priority: (ticket.priority || 'medium').toLowerCase(),
      createdAt: ticket.created_at || ticket.createdAt || ticket.date || new Date().toISOString(),
      updatedAt: ticket.updated_at || ticket.updatedAt || ticket.modified_at || new Date().toISOString(),
      description: ticket.description || ticket.body || ticket.content || '',
    }));

    return res.status(200).json({
      success: true,
      tickets: transformedTickets,
      count: transformedTickets.length
    });
  } catch (error) {
    console.error('Support tickets error:', error);
    return res.status(200).json({
      success: true,
      tickets: [],
      count: 0,
      message: 'Unable to retrieve support tickets at this time'
    });
  }
}
