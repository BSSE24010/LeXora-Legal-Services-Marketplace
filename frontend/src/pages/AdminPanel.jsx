import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AdminPanel = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total_users: 0, total_cases: 0, total_revenue_released: 0 });
  const [pendingCredentials, setPendingCredentials] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return; }
    const fetchData = async () => {
      try {
        const [statsRes, credsRes, disputesRes] = await Promise.all([
          api.get('/admin/analytics'),
          api.get('/admin/credentials/pending'),
          api.get('/admin/disputes'),
        ]);
        setStats(statsRes.data.data);
        setPendingCredentials(credsRes.data.data);
        setDisputes(disputesRes.data.data);
      } catch (err) {
        console.error('Failed to fetch admin data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, navigate]);

  const handleVerify = async (credId, status) => {
    try {
      await api.patch(`/admin/credentials/${credId}/verify`, { verification_status: status });
      setPendingCredentials(prev => prev.filter(c => c.id !== credId));
      alert(`Credential ${status === 'approved' ? 'approved! Lawyer is now active.' : 'rejected.'}`);
    } catch (err) {
      alert('Failed to update credential.');
    }
  };

  // dispute object mein ab payment field bhi hai (backend se enriched)
  const handleResolveDispute = async (disputeId, status, escrowAmount) => {
    if (status === 'resolved') {
      const admin_notes = window.prompt(
        `Total escrow: Rs. ${Number(escrowAmount).toLocaleString()}\n\nResolution note (full amount will go to lawyer):`
      );
      if (!admin_notes) return;
      try {
        await api.patch(`/admin/disputes/${disputeId}/resolve`, {
          status,
          admin_notes,
        });
        setDisputes(prev => prev.map(d => d.id === disputeId ? { ...d, status } : d));
        alert(`Dispute resolved! Rs. ${Number(escrowAmount).toLocaleString()} released to lawyer.`);
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to resolve dispute.');
      }
    } else {
      // Dismiss — escrowAmount already known, admin sirf lawyer ka hissa enter kare
      const lawyer_amount = window.prompt(
        `Total escrow: Rs. ${Number(escrowAmount).toLocaleString()}\n\nHow much should lawyer receive? (Enter 0 for full refund to victim):`
      );
      if (lawyer_amount === null) return;

      const lawyerAmt = Number(lawyer_amount);
      if (lawyerAmt < 0 || lawyerAmt > Number(escrowAmount)) {
        alert(`Amount must be between 0 and Rs. ${Number(escrowAmount).toLocaleString()}`);
        return;
      }

      const victimRefund = Number(escrowAmount) - lawyerAmt;
      const admin_notes = window.prompt(
        `Lawyer gets: Rs. ${lawyerAmt.toLocaleString()}\nVictim refund: Rs. ${victimRefund.toLocaleString()}\n\nAdd dismissal note:`
      );
      if (!admin_notes) return;

      try {
        await api.patch(`/admin/disputes/${disputeId}/resolve`, {
          status: 'dismissed',
          admin_notes,
          lawyer_amount: lawyerAmt,
        });
        setDisputes(prev => prev.map(d => d.id === disputeId ? { ...d, status: 'dismissed' } : d));
        alert(`Done! Lawyer: Rs. ${lawyerAmt.toLocaleString()}, Victim refund: Rs. ${victimRefund.toLocaleString()}`);
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to dismiss dispute.');
      }
    }
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--text-light)', margin: '0 0 0.4rem 0', letterSpacing: '-0.02em' }}>
          LeXora Admin Control Panel
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Logged in as:</span>
          <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{user?.email}</span>
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'Total Users', value: stats.total_users, color: 'var(--primary)' },
          { label: 'Total Cases', value: stats.total_cases, color: 'var(--secondary)' },
          { label: 'Revenue Released', value: `Rs. ${stats.total_revenue_released?.toLocaleString()}`, color: '#2ec4b6' },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: 'var(--card-bg)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '14px',
            padding: '1.75rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: stat.color, opacity: 0.8 }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700', margin: '0 0 0.75rem 0' }}>
              {stat.label}
            </p>
            <p style={{ fontSize: '2.4rem', fontWeight: '800', color: stat.color, lineHeight: 1, margin: 0 }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>

        {/* Pending Verifications */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', padding: '1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-light)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '4px', height: '18px', background: 'var(--primary)', borderRadius: '2px' }}></span>
            Pending Verifications
          </h2>

          {loading ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Loading...</p>
          ) : pendingCredentials.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.05)' }}>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>No lawyers pending verification.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {pendingCredentials.map(cred => (
                <div key={cred.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px', padding: '1.25rem' }}>
                  <p style={{ fontSize: '1.05rem', color: 'var(--text-light)', margin: '0 0 0.3rem 0', fontWeight: '700' }}>
                    {cred.lawyer_profiles?.full_name || 'Lawyer'}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
                    Document Type: <span style={{ color: 'var(--text-light)', fontWeight: '600' }}>{cred.document_type?.toUpperCase()}</span>
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <a
                      href={cred.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline"
                      style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                      📄 View Document
                    </a>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleVerify(cred.id, 'approved')}
                        className="btn btn-primary"
                        style={{ fontSize: '0.8rem', padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: '600' }}>
                        Approve
                      </button>
                      <button
                        onClick={() => handleVerify(cred.id, 'rejected')}
                        className="btn btn-outline"
                        style={{ fontSize: '0.8rem', padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: '600', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Disputes Queue */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', padding: '1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-light)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '4px', height: '18px', background: 'var(--secondary)', borderRadius: '2px' }}></span>
            Disputes Queue
          </h2>

          {loading ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Loading...</p>
          ) : disputes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.05)' }}>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>No disputes reported.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {disputes.map(dispute => {
                const isOpen = dispute.status === 'open';
                // Backend ab payment object directly dispute ke saath bhejta hai
                const escrowAmount = dispute.payment?.amount || 0;

                return (
                  <div key={dispute.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px', padding: '1.25rem' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        backgroundColor: isOpen ? 'rgba(214,40,40,0.15)' : 'rgba(46,196,182,0.15)',
                        color: isOpen ? 'var(--primary)' : '#2ec4b6',
                        border: `1px solid ${isOpen ? 'var(--primary)' : '#2ec4b6'}33`,
                        fontWeight: '700',
                      }}>
                        {dispute.status}
                      </span>

                      {/* Escrow amount badge — always visible */}
                      {escrowAmount > 0 && (
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(247,127,0,0.12)',
                          color: 'var(--secondary)',
                          border: '1px solid rgba(247,127,0,0.25)',
                          fontWeight: '700',
                        }}>
                          Escrow: Rs. {Number(escrowAmount).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '0.95rem', color: 'var(--text-light)', margin: '0 0 0.5rem 0', lineHeight: '1.5' }}>
                      <strong style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Reason:</strong> {dispute.reason}
                    </p>

                    {dispute.admin_notes && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.8rem', borderRadius: '6px', borderLeft: '3px solid #2ec4b6', marginBottom: '0.75rem' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                          <strong style={{ color: '#2ec4b6' }}>Admin Note:</strong> {dispute.admin_notes}
                        </p>
                      </div>
                    )}

                    {isOpen && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleResolveDispute(dispute.id, 'resolved', escrowAmount)}
                          className="btn btn-primary"
                          style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: '600', flex: '1', minWidth: '160px' }}>
                          ✅ Resolve (Pay Lawyer)
                        </button>
                        <button
                          onClick={() => handleResolveDispute(dispute.id, 'dismissed', escrowAmount)}
                          className="btn btn-outline"
                          style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: '600', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                          ⚖️ Dismiss (Set Split)
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminPanel;