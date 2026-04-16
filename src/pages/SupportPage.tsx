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
  const [activeTab, setActiveTab] = useState<'tickets' | 'kb' | 'chat' | 'wave'>('tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [loggedInEmail, setLoggedInEmail] = useState('');
  const [connectionCode, setConnectionCode] = useState('');
  const [remoteCode, setRemoteCode] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');

  const fetchTickets = async (emailToFetch?: string) => {
    setLoading(true);
    setError(null);
    try {
      const emailValue = emailToFetch || email;
      if (!emailValue) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTickets(data.tickets || []);
        setLoggedInEmail(emailValue);
        if (data.count === 0) {
          setError(null);
        }
      } else {
        setTickets([]);
        setError(data.error || 'Failed to fetch tickets. Please check your email and try again.');
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      setTickets([]);
      setError('Unable to connect to support system. Please try again later.');
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

  const handleWaveSupportConnect = async () => {
    if (!connectionCode || !remoteCode) {
      return;
    }

    setConnectionStatus('connecting');
    try {
      // Simulate connection - in production, this would connect to Splashtop API
      await new Promise(resolve => setTimeout(resolve, 2000));
      setConnectionStatus('connected');
      setTimeout(() => setConnectionStatus('idle'), 3000);
    } catch (error) {
      setConnectionStatus('error');
      setTimeout(() => setConnectionStatus('idle'), 3000);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <div className="pt-20 flex-1">
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
          <div className="flex gap-4 mb-8 border-b border-gray-200 overflow-x-auto">
            {[
              { id: 'tickets', label: 'My Tickets', icon: MessageCircle },
              { id: 'kb', label: 'Knowledge Base', icon: HelpCircle },
              { id: 'chat', label: 'Live Chat', icon: MessageCircle },
              { id: 'wave', label: 'Wave Support', icon: MessageCircle },
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
              {!loggedInEmail ? (
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
                        onKeyPress={(e) => e.key === 'Enter' && fetchTickets()}
                        placeholder="your@email.com"
                        className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:border-cyan-400"
                      />
                      <button
                        onClick={() => fetchTickets()}
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
                    {error && (
                      <p style={{ color: '#FF4444', marginTop: '12px', fontSize: '14px' }}>
                        {error}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <p style={{ color: 'rgba(21,34,50,0.6)' }}>
                      Logged in as: <strong>{loggedInEmail}</strong>
                    </p>
                    <button
                      onClick={() => {
                        setEmail('');
                        setLoggedInEmail('');
                        setTickets([]);
                        setError(null);
                      }}
                      className="text-sm px-3 py-1 rounded-lg transition-colors"
                      style={{
                        color: '#39CCCC',
                        border: '1px solid #39CCCC'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(57,204,204,0.1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      Logout
                    </button>
                  </div>

                  {error && (
                    <div className="bg-red-50 rounded-2xl p-4 text-center">
                      <p style={{ color: '#FF4444' }}>{error}</p>
                      <button
                        onClick={() => fetchTickets()}
                        className="mt-3 text-sm px-4 py-2 rounded-lg transition-colors"
                        style={{
                          color: '#39CCCC',
                          border: '1px solid #39CCCC'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(57,204,204,0.1)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {tickets.length === 0 && !error ? (
                    <div className="bg-gray-50 rounded-2xl p-8 text-center">
                      <p style={{ color: 'rgba(21,34,50,0.6)' }}>No support tickets found for this email</p>
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

          {/* Wave Support (Remote Access) Tab */}
          {activeTab === 'wave' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-br rounded-2xl p-8 shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(57,204,204,0.1) 0%, rgba(94,188,103,0.1) 100%)' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#39CCCC" strokeWidth="2">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                      <path d="M12 6v6l4 2.4"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold" style={{ color: '#152232' }}>Wave Support</h3>
                    <p className="text-sm" style={{ color: 'rgba(21,34,50,0.6)' }}>Remote access support</p>
                  </div>
                </div>

                <p style={{ color: 'rgba(21,34,50,0.65)', marginBottom: '24px', lineHeight: 1.6 }}>
                  Allow our support team to securely access your device to provide faster, more effective support. Your connection is encrypted and secure.
                </p>

                <div className="space-y-5">
                  {/* Connection Code */}
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#152232' }}>
                      Connection Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={connectionCode}
                        onChange={(e) => setConnectionCode(e.target.value.toUpperCase())}
                        placeholder="e.g., ABC-123-456"
                        maxLength={11}
                        className="flex-1 px-4 py-3 rounded-lg border-2 font-mono text-center text-lg tracking-widest outline-none transition-colors"
                        style={{
                          borderColor: connectionCode ? '#39CCCC' : 'rgba(21,34,50,0.1)',
                          color: '#152232'
                        }}
                      />
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: 'rgba(21,34,50,0.5)' }}>
                      Found in your support ticket or provided by our support team
                    </p>
                  </div>

                  {/* Remote Code */}
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#152232' }}>
                      Remote Access Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={remoteCode}
                        onChange={(e) => setRemoteCode(e.target.value.toUpperCase())}
                        placeholder="e.g., XYZ-789-012"
                        maxLength={11}
                        className="flex-1 px-4 py-3 rounded-lg border-2 font-mono text-center text-lg tracking-widest outline-none transition-colors"
                        style={{
                          borderColor: remoteCode ? '#5EBC67' : 'rgba(21,34,50,0.1)',
                          color: '#152232'
                        }}
                      />
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: 'rgba(21,34,50,0.5)' }}>
                      Generated when initiating remote support
                    </p>
                  </div>

                  {/* Connection Status */}
                  {connectionStatus !== 'idle' && (
                    <div
                      className="p-4 rounded-lg flex items-center gap-3"
                      style={{
                        background:
                          connectionStatus === 'connected'
                            ? 'rgba(94,188,103,0.1)'
                            : connectionStatus === 'connecting'
                            ? 'rgba(57,204,204,0.1)'
                            : 'rgba(255,68,68,0.1)',
                      }}
                    >
                      {connectionStatus === 'connected' ? (
                        <>
                          <CheckCircle size={20} style={{ color: '#5EBC67' }} />
                          <span style={{ color: '#5EBC67' }}>Connected successfully!</span>
                        </>
                      ) : connectionStatus === 'connecting' ? (
                        <>
                          <Clock size={20} style={{ color: '#39CCCC' }} />
                          <span style={{ color: '#39CCCC' }}>Establishing connection...</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={20} style={{ color: '#FF4444' }} />
                          <span style={{ color: '#FF4444' }}>Connection failed. Please check your codes.</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Connect Button */}
                  <button
                    onClick={handleWaveSupportConnect}
                    disabled={!connectionCode || !remoteCode || connectionStatus === 'connecting'}
                    className="w-full py-4 rounded-lg text-white font-semibold text-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-105"
                    style={{
                      background: connectionStatus === 'connected' ? '#5EBC67' : '#39CCCC',
                      boxShadow: `0 4px 16px ${connectionStatus === 'connected' ? 'rgba(94,188,103,0.3)' : 'rgba(57,204,204,0.3)'}`,
                    }}
                    onMouseEnter={(e) => {
                      if (!connectionCode || !remoteCode || connectionStatus === 'connecting') return;
                      e.currentTarget.style.background = connectionStatus === 'connected' ? '#4da856' : '#2db8b8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = connectionStatus === 'connected' ? '#5EBC67' : '#39CCCC';
                    }}
                  >
                    {connectionStatus === 'connecting' ? 'Connecting...' : connectionStatus === 'connected' ? 'Connected ✓' : 'Start Wave Support'}
                  </button>
                </div>

                {/* Security Info */}
                <div className="mt-8 p-4 rounded-lg" style={{ background: 'rgba(21,34,50,0.02)', border: '1px solid rgba(21,34,50,0.06)' }}>
                  <p className="text-sm" style={{ color: 'rgba(21,34,50,0.6)' }}>
                    <strong>Security Note:</strong> Your connection is encrypted with industry-standard security protocols. Support team members can only access what you authorize. You can end the session at any time.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
