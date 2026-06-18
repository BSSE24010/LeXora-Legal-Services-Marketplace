import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

const Chat = () => {
  const { engagementId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data } = await api.get(`/messages/engagement/${engagementId}`);
        setMessages(data.data || []);
        scrollToBottom();
      } catch (err) {
        console.error('Failed to load chat history', err);
      }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [engagementId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const { data } = await api.post(`/messages/engagement/${engagementId}`, {
        content: newMessage,
      });
      setMessages(prev => [...prev, data.data]);
      setNewMessage('');
      scrollToBottom();
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 80px)',
      padding: '2rem 1.5rem',
      maxWidth: '1000px',
      margin: '0 auto',
      width: '100%',
      backgroundColor: '#050505'
    }}>
      {/* Header Panel */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1.25rem', 
        marginBottom: '2rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        paddingBottom: '1.25rem'
      }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{
            backgroundColor: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            color: 'rgba(255, 255, 255, 0.7)',
            padding: '0.5rem 1.25rem',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = '#ffffff';
            e.target.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            e.target.style.color = 'rgba(255, 255, 255, 0.7)';
          }}
        >
          ← BACK
        </button>
        <h1 style={{ 
          margin: 0, 
          fontSize: '1.75rem', 
          fontWeight: '800',
          background: 'linear-gradient(135deg, #d62828 0%, #ffffff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Secure Communication
        </h1>
      </div>

      {/* Modern Main Chat Container Box */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#111111',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '16px',
        overflow: 'hidden',
        minHeight: 0,
        boxShadow: '0 10px 40px rgba(0,0,0,0.4)'
      }}>
        
        {/* Scrollable Messages Interface Window */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          backgroundColor: '#0a0a0a',
        }}>
          {messages.length === 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'rgba(255, 255, 255, 0.3)',
              fontSize: '0.95rem',
              fontStyle: 'italic',
              letterSpacing: '0.02em'
            }}>
              Encrypted session active. Start the conversation...
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div key={msg.id} style={{
                  alignSelf: isMine ? 'flex-end' : 'flex-start',
                  maxWidth: '70%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMine ? 'flex-end' : 'flex-start'
                }}>
                  <div style={{
                    backgroundColor: isMine ? '#d62828' : '#1a1a1a',
                    color: '#ffffff',
                    padding: '0.85rem 1.25rem',
                    borderRadius: isMine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    fontSize: '0.925rem',
                    lineHeight: '1.5',
                    border: isMine ? 'none' : '1px solid rgba(255, 255, 255, 0.04)',
                    wordBreak: 'break-word',
                    boxShadow: isMine ? '0 4px 15px rgba(214, 40, 40, 0.15)' : 'none'
                  }}>
                    {msg.content}
                  </div>
                  <div style={{
                    fontSize: '0.7rem',
                    color: 'rgba(255, 255, 255, 0.35)',
                    marginTop: '0.35rem',
                    paddingInline: '0.4rem',
                    fontWeight: '500'
                  }}>
                    {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Interactive Controls Panel */}
        <div style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: '#111111',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          flexShrink: 0,
        }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input
              type="text"
              style={{ 
                flex: 1,
                backgroundColor: '#161616',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                color: '#ffffff',
                padding: '0.85rem 1.25rem',
                fontSize: '0.92rem',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
              placeholder="Type your message securely..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              style={{ 
                whiteSpace: 'nowrap',
                backgroundColor: newMessage.trim() ? '#d62828' : 'rgba(214, 40, 40, 0.2)',
                color: newMessage.trim() ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                border: 'none',
                borderRadius: '10px',
                padding: '0.85rem 1.75rem',
                fontSize: '0.9rem',
                fontWeight: '700',
                cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if(newMessage.trim()) e.target.style.backgroundColor = '#b52020';
              }}
              onMouseLeave={(e) => {
                if(newMessage.trim()) e.target.style.backgroundColor = '#d62828';
              }}
            >
              SEND →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;