import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const LawyerDashboard = () => {
  const { user } = useContext(AuthContext);
  const [engagements, setEngagements] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [engRes, payRes] = await Promise.all([
          api.get('/engagements/me'),
          api.get('/payments/me'),
        ]);
        setEngagements(engRes.data.data || []);
        setPayments(payRes.data.data || []);
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleMarkComplete = async (engagementId) => {
    try {
      await api.patch(`/engagements/${engagementId}/complete`);
      alert('Case marked as complete! Victim will be notified to release payment.');
      const { data } = await api.get('/engagements/me');
      setEngagements(data.data || []);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark complete.');
    }
  };

  const getPaymentForEngagement = (engagementId) => {
    return payments.find(p => p.engagement_id === engagementId);
  };

  const totalEarnings = payments
    .filter(p => p.escrow_status === 'released')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const pendingEscrow = payments
    .filter(p => p.escrow_status === 'held_in_escrow')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div className="container" style={{ padding: '2.5rem 1rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header Section */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ 
            width: '65px', 
            height: '65px', 
            borderRadius: '50%', 
            backgroundColor: 'var(--primary)', 
            color: 'white', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            fontSize: '1.6rem', 
            fontWeight: '800',
            boxShadow: '0 4px 15px rgba(214, 40, 40, 0.25)'
          }}>
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--text-light)', margin: '0 0 0.3rem 0', letterSpacing: '-0.02em' }}>
              Advocate Dashboard
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>{user?.email}</span> 
              <span style={{ color: '#2ec4b6', background: 'rgba(46, 196, 182, 0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>Verified ✅</span>
            </p>
          </div>
        </div>
        <Link to="/lawyer-listings" className="btn btn-secondary" style={{ 
          padding: '0.75rem 1.75rem', 
          fontWeight: '600', 
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(214, 40, 40, 0.2)',
          transition: 'all 0.2s ease'
        }}>
          Find New Cases
        </Link>
      </div>

      {/* Stats Cards Section - FIXED Row Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '1.25rem', 
        marginBottom: '3rem' 
      }}>
        {[
          { label: 'Active Clients', value: engagements.filter(e => e.status === 'active').length, color: 'var(--primary)' },
          { label: 'In Escrow', value: `Rs. ${pendingEscrow.toLocaleString()}`, color: 'var(--secondary)' },
          { label: 'Total Earned', value: `Rs. ${totalEarnings.toLocaleString()}`, color: '#2ec4b6' },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: 'var(--card-bg)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '14px',
            padding: '1.5rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: stat.color, opacity: 0.7 }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700', marginBottom: '0.75rem', margin: '0 0 0.5rem 0' }}>
              {stat.label}
            </p>
            <p style={{ fontSize: '2.2rem', fontWeight: '800', color: stat.color, lineHeight: 1, margin: 0 }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Active Engagements Section */}
      <div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-light)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: '4px', height: '18px', background: 'var(--primary)', borderRadius: '2px' }}></span>
          My Active Engagements
        </h2>

        {loading ? (
          <div style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '4rem', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Loading active engagements...</p>
          </div>
        ) : engagements.length === 0 ? (
          <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '14px', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '1.05rem' }}>No active clients right now.</p>
            <Link to="/lawyer-listings" className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontWeight: '600', borderRadius: '8px' }}>Browse Available Cases</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {engagements.map((eng) => {
              const payment = getPaymentForEngagement(eng.id);
              const isCompleted = eng.status === 'completed';
              
              return (
                <div key={eng.id} style={{
                  background: 'var(--card-bg)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderLeft: `5px solid ${isCompleted ? '#2ec4b6' : 'var(--primary)'}`,
                  borderRadius: '12px',
                  padding: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1.5rem',
                  flexWrap: 'wrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  <div style={{ flex: '1', minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.20rem', fontWeight: '700', color: 'var(--text-light)', margin: 0, letterSpacing: '-0.01em' }}>
                        Case: {eng.cases?.title || 'N/A'}
                      </h3>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: '700', padding: '3px 10px',
                        borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.08em',
                        background: isCompleted ? 'rgba(46,196,182,0.15)' : 'rgba(214,40,40,0.15)',
                        color: isCompleted ? '#2ec4b6' : 'var(--primary)',
                        border: `1px solid ${isCompleted ? '#2ec4b6' : 'var(--primary)'}33`,
                      }}>
                        {eng.status}
                      </span>
                    </div>

                    {payment && (
                      <div style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Case Value:</span>
                        <strong style={{ color: 'var(--text-light)' }}>Rs. {Number(payment.amount).toLocaleString()}</strong>
                        <span>—</span>
                        <strong style={{ color: payment.escrow_status === 'released' ? '#2ec4b6' : 'var(--secondary)' }}>
                          {payment.escrow_status === 'released' ? '✅ Released to Account' : '⏳ Held in Escrow'}
                        </strong>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Link to={`/chat/${eng.id}`} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: '600' }}>
                      💬 Message
                    </Link>

                    {eng.status === 'active' && (
                      <button
                        onClick={() => handleMarkComplete(eng.id)}
                        className="btn btn-outline"
                        style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: '600', borderColor: '#2ec4b6', color: '#2ec4b6' }}>
                        ✅ Mark Complete
                      </button>
                    )}

                    {isCompleted && payment?.escrow_status === 'held_in_escrow' && (
                      <span style={{ 
                        fontSize: '0.85rem', 
                        color: 'var(--secondary)', 
                        fontWeight: '600',
                        background: 'rgba(247, 127, 0, 0.1)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(247, 127, 0, 0.2)'
                      }}>
                        ⏳ Awaiting client approval
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LawyerDashboard;