import { Link, useNavigate } from 'react-router-dom';
import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      try {
        const { data } = await api.get('/notifications/me');
        setNotifications(data.data || []);
      } catch {}
    };
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={{ 
      backgroundColor: 'rgba(10, 10, 10, 0.85)', 
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)', 
      padding: '0.85rem 0',
      position: 'sticky',
      top: 0,
      zIndex: 1100,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.4)'
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 1.5rem',
        boxSizing: 'border-box'
      }}>
        {/* LOGO */}
        <Link to="/" style={{ 
          color: '#ffffff', 
          fontSize: '1.45rem', 
          fontWeight: '900', 
          letterSpacing: '0.08em', 
          textTransform: 'uppercase',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          transition: 'opacity 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <span style={{ 
            fontSize: '1.6rem', 
            color: 'var(--primary)',
            textShadow: '0 0 12px rgba(214, 40, 40, 0.4)'
          }}>⚖</span> 
          <span>LeXora</span>
        </Link>

        {/* CENTER LINKS (Logged-out Landing Navigation) */}
        {!user && (
          <div style={{ 
            display: 'flex',
            gap: '2rem',
            alignItems: 'center',
            fontWeight: '600', 
            fontSize: '0.85rem',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            {['Features', 'How It Works', 'Testimonials'].map((link) => (
              <a key={link} href={`#${link.toLowerCase().replace(/\s+/g, '-')}`} style={{ 
                color: 'rgba(255, 255, 255, 0.6)', 
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                letterSpacing: '0.02em'
              }}
              onMouseEnter={(e) => e.target.style.color = '#ffffff'}
              onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.6)'}
              >
                {link}
              </a>
            ))}
            <Link to="/lawyer-listings" style={{ 
              color: 'var(--secondary)', 
              textDecoration: 'none',
              fontWeight: '700',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.textShadow = '0 0 8px rgba(247, 127, 0, 0.3)'}
            onMouseLeave={(e) => e.target.style.textShadow = 'none'}
            >
              Find a Lawyer
            </Link>
          </div>
        )}

        {/* RIGHT ACTION DASHBOARD CONTROLS */}
        <div style={{ 
          display: 'flex', 
          gap: '1.2rem', 
          alignItems: 'center',
          marginLeft: !user ? '0' : 'auto'
        }}>
          {user ? (
            <>
              {/* Context Actions per Role */}
              {user.role === 'victim' && (
                <>
                  <Link to="/victim-dashboard" style={{ 
                    color: 'rgba(255,255,255,0.85)', 
                    textDecoration: 'none', 
                    fontSize: '0.85rem', 
                    fontWeight: '600',
                    padding: '0.55rem 1.1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.03)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.08)'; e.target.style.borderColor = 'rgba(255,255,255,0.25)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.03)'; e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                  >Dashboard</Link>
                  <Link to="/post-case" className="btn btn-primary" style={{ 
                    padding: '0.55rem 1.3rem', 
                    fontSize: '0.85rem', 
                    fontWeight: '700',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(214, 40, 40, 0.2)'
                  }}>Post a Case</Link>
                </>
              )}
              {user.role === 'lawyer' && (
                <>
                  <Link to="/lawyer-dashboard" style={{ 
                    color: 'rgba(255,255,255,0.85)', 
                    textDecoration: 'none', 
                    fontSize: '0.85rem', 
                    fontWeight: '600',
                    padding: '0.55rem 1.1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.03)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.08)'; e.target.style.borderColor = 'rgba(255,255,255,0.25)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.03)'; e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                  >Dashboard</Link>
                  <Link to="/lawyer-listings" className="btn btn-primary" style={{ 
                    padding: '0.55rem 1.3rem', 
                    fontSize: '0.85rem', 
                    fontWeight: '700',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(214, 40, 40, 0.2)'
                  }}>Find Cases</Link>
                </>
              )}
              {user.role === 'admin' && (
                <Link to="/admin" style={{ 
                  color: 'var(--secondary)', 
                  textDecoration: 'none', 
                  fontSize: '0.85rem', 
                  fontWeight: '700',
                  padding: '0.55rem 1.3rem',
                  borderRadius: '8px',
                  border: '1px solid var(--secondary)',
                  background: 'rgba(247, 127, 0, 0.04)',
                  boxShadow: '0 4px 12px rgba(247, 127, 0, 0.08)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { e.target.style.background = 'rgba(247, 127, 0, 0.1)'; e.target.style.boxShadow = '0 4px 16px rgba(247, 127, 0, 0.2)'; }}
                onMouseLeave={(e) => { e.target.style.background = 'rgba(247, 127, 0, 0.04)'; e.target.style.boxShadow = '0 4px 12px rgba(247, 127, 0, 0.08)'; }}
                >Admin Panel</Link>
              )}

              {/* NOTIFICATION BELL MODULE */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => setShowNotif(!showNotif)}
                  style={{ 
                    background: showNotif ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.08)', 
                    borderRadius: '8px',
                    cursor: 'pointer', 
                    fontSize: '1.1rem', 
                    position: 'relative', 
                    color: '#ffffff',
                    width: '38px',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={(e) => e.target.style.background = showNotif ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}
                >
                  🔔
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: '-2px', right: '-2px',
                      backgroundColor: 'var(--primary)', color: 'white',
                      borderRadius: '50%', fontSize: '0.65rem',
                      width: '16px', height: '16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: '800',
                      boxShadow: '0 0 10px rgba(214,40,40,0.6)',
                      border: '2px solid #0a0a0a'
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* NOTIFICATIONS DROPDOWN MODAL */}
                {showNotif && (
                  <div style={{
                    position: 'absolute', right: 0, top: '140%',
                    width: '350px', backgroundColor: 'rgba(18, 18, 18, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px',
                    zIndex: 1200, maxHeight: '420px', overflowY: 'auto',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)'
                  }}>
                    <div style={{ 
                      padding: '1.1rem', 
                      borderBottom: '1px solid rgba(255,255,255,0.08)', 
                      fontWeight: '700', 
                      color: '#ffffff',
                      fontSize: '0.95rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <span style={{ 
                          fontSize: '0.75rem', 
                          backgroundColor: 'rgba(214, 40, 40, 0.15)',
                          color: 'var(--primary)', 
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: '700' 
                        }}>{unreadCount} Active</span>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2.5rem 1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textAlign: 'center' }}>
                        No notifications yet
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {notifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => handleMarkRead(n.id)}
                            style={{
                              padding: '1.1rem',
                              borderBottom: '1px solid rgba(255,255,255,0.05)',
                              backgroundColor: n.is_read ? 'transparent' : 'rgba(214, 40, 40, 0.03)',
                              borderLeft: n.is_read ? '3px solid transparent' : '3px solid var(--primary)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = n.is_read ? 'transparent' : 'rgba(214, 40, 40, 0.03)'}
                          >
                            <p style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: n.is_read ? '500' : '700', margin: '0 0 0.25rem 0', lineHeight: '1.3' }}>
                              {n.title}
                            </p>
                            {n.body && (
                              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 0.45rem 0', lineHeight: '1.45' }}>{n.body}</p>
                            )}
                            <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', margin: 0, fontWeight: '500' }}>
                              {new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PROFILE CONTROL AVATAR SECTION */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.85rem',
                borderLeft: '1px solid rgba(255, 255, 255, 0.12)', 
                paddingLeft: '1.2rem'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {user.role}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)', fontWeight: '600', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email.split('@')[0]}
                  </span>
                </div>
                <button 
                  onClick={handleLogout} 
                  style={{ 
                    background: 'transparent',
                    color: 'rgba(255, 255, 255, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { 
                    e.target.style.background = 'rgba(214, 40, 40, 0.1)'; 
                    e.target.style.color = 'var(--primary)';
                    e.target.style.borderColor = 'rgba(214, 40, 40, 0.3)';
                  }}
                  onMouseLeave={(e) => { 
                    e.target.style.background = 'transparent'; 
                    e.target.style.color = 'rgba(255, 255, 255, 0.45)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }}
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary" style={{ padding: '0.55rem 1.4rem', fontSize: '0.85rem', fontWeight: '700', borderRadius: '8px', textDecoration: 'none', boxShadow: '0 4px 12px rgba(214, 40, 40, 0.2)' }}>Sign In</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;