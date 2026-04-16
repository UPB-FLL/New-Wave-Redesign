import { useState, useEffect } from 'react';
import { MessageCircle, HelpCircle, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface SupportTicket {
  id: string;
  subject: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  updatedAt: string;
  description: string;
}

interface KnowledgeBase {
  id: string;
  title: string;
  category: string;
  content: string;
  helpful: number;
}

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'kb' | 'chat'>('tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (email) {
      fetchTickets();
    }
  }, [email]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle size={18} style={{ color: '#39CCCC' }} />;
      case 'in-progress':
        return <Clock size={18} style={{ color: '#FFA500' }} />;
      case 'resolved':
        return <CheckCircle size={18} style={{ color: '#5EBC67' }} />;
      default:
        return <MessageCircle size={18} style={{ color: '#999' }} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#FF4444';
      case 'high':
        return '#FF8800';
      case 'medium':
        return '#39CCCC';
      default:
        return '#5EBC67';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <div className="mb-12">
            <h1
              className="text-5xl font-bold mb-4"
              style={{ fontFamily: 'Staatliches, sans-serif', color: '#152232' }}
            >
              Customer Support
            </h1>
            <p style={{ color: 'rgba(21,34,50,0.6)' }}>
              View your support tickets, access our knowledge base, and connect with our team
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-4 mb-8 border-b border-gray-200">
            {[
              { id: 'tickets', label: 'My Tickets', icon: MessageCircle },
              { id: 'kb', label: 'Knowledge Base', icon: HelpCircle },
              { id: 'chat', label: 'Live Chat', icon: MessageCircle },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'tickets' | 'kb' | 'chat')}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-b-2'
                    : 'border-b-2 border-transparent'
                }`}
                style={{
                  color: activeTab === tab.id ? '#39CCCC' : 'rgba(21,34,50,0.6)',
                  borderColor: activeTab === tab.id ? '#39CCCC' : 'transparent',
                }}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tickets Tab */}
          {activeTab === 'tickets' && (
            <div>
              {!email ? (
                <div className="bg-gray-50 rounded-2xl p-8 text-center">
                  <div className="max-w-md mx-auto">
                    <h3 className="text-xl font-semibold mb-4" style={{ color: '#152232' }}>
                      View Your Support Tickets
                    </h3>
                    <p style={{ color: 'rgba(21,34,50,0.6)', marginBottom: '20px' }}>
                      Enter your email address to view your support tickets
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-cyan-400"
                      />
                      <button
                        onClick={fetchTickets}
                        disabled={!email || loading}
                        className="px-6 py-2.5 rounded-lg text-white font-medium transition-colors disabled:opacity-60"
                        style={{ background: '#39CCCC' }}
                        onMouseEnter={(e) => {
                          if (!loading) (e.currentTarget.style.background = '#2db8b8');
                        }}
                        onMouseLeave={(e) => {
                          if (!loading) (e.currentTarget.style.background = '#39CCCC');
                        }}
                      >
                        {loading ? 'Loading...' : 'View Tickets'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {tickets.length === 0 ? (
                    <div className="bg-gray-50 rounded-2xl p-8 text-center">
                      <p style={{ color: 'rgba(21,34,50,0.6)' }}>No support tickets found</p>
                    </div>
                  ) : (
                    tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="border rounded-2xl p-6 hover:shadow-lg transition-shadow"
                        style={{ borderColor: 'rgba(21,34,50,0.1)' }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1">
                            {getStatusIcon(ticket.status)}
                            <div>
                              <h4 className="font-semibold" style={{ color: '#152232' }}>
                                {ticket.subject}
                              </h4>
                              <p className="text-sm" style={{ color: 'rgba(21,34,50,0.6)' }}>
                                Ticket #{ticket.id}
                              </p>
                            </div>
                          </div>
                          <span
                            className="px-3 py-1 rounded-full text-sm font-medium text-white"
                            style={{ background: getPriorityColor(ticket.priority) }}
                          >
                            {ticket.priority}
                          </span>
                        </div>
                        <p
                          className="text-sm mb-3"
                          style={{ color: 'rgba(21,34,50,0.6)' }}
                        >
                          {ticket.description}
                        </p>
                        <div className="flex justify-between text-sm" style={{ color: 'rgba(21,34,50,0.5)' }}>
                          <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                          <span>Status: {ticket.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Knowledge Base Tab */}
          {activeTab === 'kb' && (
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <p style={{ color: 'rgba(21,34,50,0.6)' }}>
                Knowledge base content coming soon. Check back for helpful articles and guides.
              </p>
            </div>
          )}

          {/* Live Chat Tab */}
          {activeTab === 'chat' && (
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle size={32} style={{ color: '#39CCCC' }} />
                </div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: '#152232' }}>
                  Live Chat Support
                </h3>
                <p style={{ color: 'rgba(21,34,50,0.6)', marginBottom: '20px' }}>
                  Chat with our support team in real-time. Available 24/7 for urgent issues.
                </p>
                <button
                  className="px-6 py-3 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105"
                  style={{ background: '#39CCCC' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#2db8b8')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#39CCCC')}
                >
                  Start Live Chat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
