import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const VictimDashboard = () => {
  const { user } = useContext(AuthContext);
  const [cases, setCases] = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [payments, setPayments] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [casesRes, engRes, payRes, dispRes] = await Promise.all([
        api.get('/cases'),
        api.get('/engagements/me'),
        api.get('/payments/me'),
        api.get('/disputes/me'),
      ]);
      setCases(casesRes.data.data || []);
      setEngagements(engRes.data.data || []);
      setPayments(payRes.data.data || []);
      setDisputes(dispRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getEngagementForCase = (caseId) => engagements.find(e => e.case_id === caseId);
  const getPaymentForEngagement = (engId) => payments.find(p => p.engagement_id === engId);
  const getOpenDisputeForEngagement = (engId) => disputes.find(d => d.engagement_id === engId && d.status === 'open');
  const getResolvedDisputeForEngagement = (engId) => disputes.find(d => d.engagement_id === engId && (d.status === 'resolved' || d.status === 'dismissed'));

  const handleReleasePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to release payment to the lawyer?')) return;
    try {
      await api.patch(`/payments/${paymentId}/release`);
      alert('Payment released successfully!');
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to release payment.');
    }
  };

  const handleRaiseDispute = async (engagementId) => {
    const reason = window.prompt('Please describe the reason for dispute:');
    if (!reason) return;
    try {
      await api.post('/disputes', { engagement_id: engagementId, reason });
      alert('Dispute raised! Admin will review and resolve it.');
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to raise dispute.');
    }
  };

  const statusBorderColor = (status) => {
    if (status === 'open') return 'var(--primary)';
    if (status === 'in_progress') return 'var(--secondary)';
    if (status === 'completed') return 'var(--success)';
    return 'var(--border-color)';
  };

  // Payment ki escrow display value
  // - held_in_escrow  → original amount, "Locked in Escrow"
  // - refunded        → admin ne split kiya, refund_amount victim ka hissa
  // - released        → lawyer ko mil gaya
  const getEscrowDisplay = (payment) => {
    if (!payment) return null;
    if (payment.escrow_status === 'released') {
      return { label: '✅ Released', color: '#2ec4b6', amount: payment.amount };
    }
    if (payment.escrow_status === 'refunded') {
      // Admin ne dismiss kiya — refund_amount victim ka, baaki lawyer ko gaya
      const victimShare = Number(payment.refund_amount || 0);
      const lawyerShare = Number(payment.amount) - victimShare;
      return {
        label: `⚖️ Split by Admin`,
        color: 'var(--secondary)',
        amount: payment.amount,
        detail: `Lawyer: Rs. ${lawyerShare.toLocaleString()} | Your refund: Rs. ${victimShare.toLocaleString()}`,
      };
    }
    // held_in_escrow (default)
    return { label: '⏳ Locked in Escrow', color: 'var(--secondary)', amount: payment.amount };
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--primary)', margin: '0 0 0.4rem 0', letterSpacing: '-0.02em' }}>
            Welcome back!
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{user?.email}</p>
        </div>
        <Link to="/post-case" className="btn btn-secondary" style={{ padding: '0.75rem 1.75rem', fontWeight: '600', borderRadius: '8px' }}>
          + Post a New Case
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '3rem' }}>
        {[
          { label: 'Total Cases', value: cases.length, color: 'var(--primary)' },
          { label: 'Active Engagements', value: engagements.filter(e => e.status === 'active').length, color: '#2ec4b6' },
          { label: 'Open Cases', value: cases.filter(c => c.status === 'open').length, color: 'var(--secondary)' },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: 'var(--card-bg)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '14px',
            padding: '1.5rem',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: stat.color }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700', margin: '0 0 0.5rem 0' }}>
              {stat.label}
            </p>
            <p style={{ fontSize: '2.2rem', fontWeight: '800', color: stat.color, lineHeight: 1, margin: 0 }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Cases */}
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-light)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: '4px', height: '18px', background: 'var(--primary)', borderRadius: '2px', display: 'inline-block' }}></span>
          My Cases
        </h2>

        {loading ? (
          <div style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '4rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>Loading your cases...</p>
          </div>
        ) : cases.length === 0 ? (
          <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', padding: '4rem 2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>You haven't posted any cases yet.</p>
            <Link to="/post-case" className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontWeight: '600' }}>Create Your First Case</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cases.map((c) => {
              const engagement   = getEngagementForCase(c.id);
              const payment      = engagement ? getPaymentForEngagement(engagement.id) : null;
              const openDispute  = engagement ? getOpenDisputeForEngagement(engagement.id) : null;
              const resolvedDisp = engagement ? getResolvedDisputeForEngagement(engagement.id) : null;
              const escrowInfo   = getEscrowDisplay(payment);

              // Button visibility flags
              // 1. Normal completion: lawyer marked done, escrow still held, no dispute
              const showNormalRelease = engagement?.status === 'completed'
                && payment?.escrow_status === 'held_in_escrow'
                && !openDispute;

              // 2. Admin resolved in lawyer's favour (full release already done by backend)
              //    escrow_status = 'released' → no action needed

              // 3. Admin dismissed (split): escrow_status = 'refunded', show Release button
              //    so victim confirms they acknowledge (optional UX) — OR just show info.
              //    Per requirement: show refund amount in escrow badge, show Release button
              const showDisputeRelease = resolvedDisp?.status === 'dismissed'
                && payment?.escrow_status === 'refunded';

              return (
                <div key={c.id} style={{
                  background: 'var(--card-bg)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderLeft: `5px solid ${statusBorderColor(c.status)}`,
                  borderRadius: '12px',
                  padding: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1.5rem',
                  flexWrap: 'wrap',
                }}>

                  {/* ── Left Info ── */}
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-light)', margin: 0 }}>{c.title}</h3>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: '700', padding: '3px 10px',
                        borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.08em',
                        background: statusBorderColor(c.status) + '20',
                        color: statusBorderColor(c.status),
                        border: `1px solid ${statusBorderColor(c.status)}40`,
                      }}>
                        {c.status?.replace('_', ' ')}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{c.legal_domain?.toUpperCase()}</strong>
                      <span>•</span>
                      <span>{c.urgency_level?.toUpperCase()} urgency</span>
                      {c.city && <><span>•</span><span>📍 {c.city}</span></>}
                    </p>

                    {/* Escrow badge — shows amount + status, and split detail if dismissed */}
                    {escrowInfo && (
                      <div style={{ fontSize: '0.82rem', marginTop: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.75rem', borderRadius: '6px', display: 'inline-flex', flexDirection: 'column', gap: '0.2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Escrow:</span>
                          <strong style={{ color: 'var(--text-light)' }}>Rs. {Number(escrowInfo.amount).toLocaleString()}</strong>
                          <span>—</span>
                          <strong style={{ color: escrowInfo.color }}>{escrowInfo.label}</strong>
                        </div>
                        {/* Show split breakdown if admin dismissed */}
                        {escrowInfo.detail && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--secondary)', fontWeight: '600' }}>
                            {escrowInfo.detail}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Notice messages */}
                    {showNormalRelease && !resolvedDisp && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--secondary)', marginTop: '0.5rem', fontWeight: '600' }}>
                        ⚠️ Lawyer marked case complete — release payment or raise a dispute.
                      </p>
                    )}
                    {openDispute && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--error)', marginTop: '0.5rem', fontWeight: '600' }}>
                        🔴 Dispute raised — Admin is reviewing.
                      </p>
                    )}
                    {resolvedDisp?.status === 'resolved' && (
                      <p style={{ fontSize: '0.8rem', color: '#2ec4b6', marginTop: '0.5rem', fontWeight: '600' }}>
                        ✅ Admin resolved dispute in lawyer's favor — full payment released.
                      </p>
                    )}
                    {showDisputeRelease && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--secondary)', marginTop: '0.5rem', fontWeight: '600' }}>
                        ⚖️ Admin split the payment — see breakdown above. Your refund has been processed.
                      </p>
                    )}
                  </div>

                  {/* ── Right Buttons ── */}
                  <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>

                    {/* Open case — view proposals */}
                    {c.status === 'open' && (
                      <Link to={`/proposals?caseId=${c.id}`} className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: '600' }}>
                        View Proposals
                      </Link>
                    )}

                    {/* In progress — message + pay fee */}
                    {c.status === 'in_progress' && engagement && !openDispute && engagement?.status !== 'completed' && (
                      <>
                        <Link to={`/chat/${engagement.id}`} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: '600' }}>
                          💬 Message
                        </Link>
                        {!payment ? (
                          <Link to={`/payment/${engagement.id}`} className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: '600' }}>
                            💳 Pay Fee
                          </Link>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: '600', padding: '0.5rem 0.75rem', background: 'rgba(255,165,0,0.1)', border: '1px solid rgba(255,165,0,0.3)', borderRadius: '6px' }}>
                            ⏳ Payment Held in Escrow
                          </span>
                        )}
                      </>
                    )}

                    {/* SCENARIO A: Normal completion — lawyer marked done, no dispute yet */}
                    {showNormalRelease && !resolvedDisp && (
                      <>
                        <Link to={`/chat/${engagement.id}`} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: '600' }}>
                          💬 Message
                        </Link>
                        <button
                          onClick={() => handleReleasePayment(payment.id)}
                          className="btn"
                          style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: '600', background: 'var(--success)', color: 'white', border: 'none' }}>
                          ✅ Release Payment
                        </button>
                        <button
                          onClick={() => handleRaiseDispute(engagement.id)}
                          className="btn btn-outline"
                          style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: '600', borderColor: 'var(--error)', color: 'var(--error)' }}>
                          ⚠️ Dispute
                        </button>
                      </>
                    )}

                    {/* SCENARIO B: Dispute open — admin reviewing */}
                    {openDispute && engagement && (
                      <Link to={`/chat/${engagement.id}`} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', borderRadius: '6px' }}>
                        💬 Message
                      </Link>
                    )}

                    {/* SCENARIO C: Admin resolved in lawyer's favour — full amount released, nothing to do */}
                    {resolvedDisp?.status === 'resolved' && payment?.escrow_status === 'released' && (
                      <span style={{ fontSize: '0.85rem', color: '#2ec4b6', fontWeight: '600', alignSelf: 'center' }}>
                        ✅ Resolved
                      </span>
                    )}

                    {/* SCENARIO D: Admin dismissed (split) — show breakdown, no release button needed
                        Backend already processed the split, victim just sees the info */}
                    {showDisputeRelease && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: '600', alignSelf: 'center', padding: '0.5rem 0.75rem', background: 'rgba(247,127,0,0.1)', border: '1px solid rgba(247,127,0,0.2)', borderRadius: '6px' }}>
                        ⚖️ Refund Processed
                      </span>
                    )}

                    {/* Payment fully released — rate lawyer */}
                    {payment?.escrow_status === 'released' && resolvedDisp?.status !== 'resolved' && (
                      <>
                        <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: '600', alignSelf: 'center' }}>
                          ✅ Paid
                        </span>
                        <Link to={`/review/${engagement?.id}`} className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', borderRadius: '6px', borderColor: '#FFD700', color: '#FFD700' }}>
                          ⭐ Rate Lawyer
                        </Link>
                      </>
                    )}

                    {/* Closed / Cancelled */}
                    {(c.status === 'closed' || c.status === 'cancelled') && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Case Closed</span>
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

export default VictimDashboard;