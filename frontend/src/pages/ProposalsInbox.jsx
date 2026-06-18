import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const ProposalsInbox = () => {
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get('caseId');
  const [proposals, setProposals] = useState([]);
  const [caseDetails, setCaseDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!caseId) {
      navigate('/victim-dashboard');
      return;
    }
    
    const fetchProposals = async () => {
      try {
        const [proposalRes, caseRes] = await Promise.all([
          api.get(`/proposals/case/${caseId}`),
          api.get(`/cases/${caseId}`)
        ]);
        setProposals(proposalRes.data.data || []);
        setCaseDetails(caseRes.data.data);
      } catch (err) {
        console.error('Failed to fetch proposals', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProposals();
  }, [caseId, navigate]);

  const handleAccept = async (proposalId) => {
    try {
      await api.patch(`/proposals/${proposalId}/accept`);
      navigate('/victim-dashboard');
    } catch (err) {
      alert('Failed to accept proposal.');
    }
  };

  const handleDecline = async (proposalId) => {
    try {
      await api.patch(`/proposals/${proposalId}/decline`);
      setProposals(proposals.filter(p => p.id !== proposalId));
    } catch (err) {
      alert('Failed to decline proposal.');
    }
  };

  return (
    <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: '#ffffff', padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Back Button */}
        <div style={{ marginBottom: '1.5rem' }}>
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
        </div>

        {/* Case Title Headline Section */}
        {caseDetails && (
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '2rem', marginBottom: '3rem' }}>
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: '800', 
              margin: '0 0 0.5rem 0',
              textTransform: 'capitalize',
              background: 'linear-gradient(135deg, #d62828 0%, #ffffff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {caseDetails.title}
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', margin: 0, fontSize: '0.95rem' }}>
              Review the proposals submitted by verified lawyers for your case.
            </p>
          </div>
        )}

        {/* Dynamic States Loading / Empty / Data */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'rgba(255,255,255,0.4)', fontSize: '1rem' }}>
            Loading proposals...
          </div>
        ) : proposals.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '5rem 2rem', 
            color: 'rgba(255,255,255,0.4)', 
            border: '1px dashed rgba(255,255,255,0.1)', 
            borderRadius: '16px'
          }}>
            <h3 style={{ color: '#ffffff', fontSize: '1.3rem', fontWeight: '700', margin: '0 0 0.5rem 0' }}>No Proposals Yet</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.4)', margin: 0, fontSize: '0.9rem' }}>
              Lawyers are still reviewing your case. Check back later.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {proposals.map(proposal => (
              <div 
                key={proposal.id} 
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '16px',
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                }}
              >
                {/* Header Sub-Row Inside Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                  
                  {/* Lawyer Identity Avatar Block */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      width: '46px', 
                      height: '46px', 
                      borderRadius: '50%', 
                      backgroundColor: 'rgba(214, 40, 40, 0.1)', 
                      border: '1px solid rgba(214, 40, 40, 0.2)',
                      color: 'var(--primary, #d62828)', 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      fontWeight: '700',
                      fontSize: '1.1rem',
                      textTransform: 'uppercase'
                    }}>
                      {proposal.lawyer_profiles?.full_name?.charAt(0) || 'L'}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '0 0 0.25rem 0', color: '#ffffff' }}>
                        {proposal.lawyer_profiles?.full_name || 'Lawyer'}
                      </h3>
                      <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
                        Fee: <strong style={{ color: '#2ec4b6' }}>Rs. {proposal.proposed_fee}</strong> <span style={{ margin: '0 0.4rem' }}>|</span> Timeline: <strong style={{ color: '#ffffff' }}>{proposal.estimated_timeline}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions Right Buttons System */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    
                    {/* ACCEPT BUTTON */}
                    <button 
                      onClick={() => handleAccept(proposal.id)} 
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#050505',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.65rem 1.5rem',
                        fontSize: '0.85rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                      onMouseLeave={(e) => e.target.style.opacity = '1'}
                    >
                      ACCEPT
                    </button>

                    {/* DECLINE BUTTON */}
                    <button 
                      onClick={() => handleDecline(proposal.id)} 
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #d62828',
                        borderRadius: '8px',
                        color: '#d62828',
                        padding: '0.65rem 1.5rem',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = 'rgba(214, 40, 40, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                      }}
                    >
                      DECLINE
                    </button>

                  </div>
                </div>

                {/* Cover Note Body Content Block */}
                {proposal.cover_note && (
                  <div style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.02)', 
                    padding: '1.25rem', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(255, 255, 255, 0.03)',
                    marginTop: '0.25rem'
                  }}>
                    <p style={{ 
                      whiteSpace: 'pre-line', 
                      fontSize: '0.9rem', 
                      color: 'rgba(255, 255, 255, 0.65)', 
                      lineHeight: '1.5', 
                      margin: 0 
                    }}>
                      {proposal.cover_note}
                    </p>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProposalsInbox;