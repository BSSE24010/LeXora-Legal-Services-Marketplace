import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

const LawyerListings = () => {
  const { user } = useContext(AuthContext);
  const isLawyer = user?.role === 'lawyer';
  
  const [lawyers, setLawyers] = useState([]);
  const [cases, setCases] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLawyer) {
      // Lawyer ke liye open cases fetch karo
      const fetchCases = async () => {
        try {
          const { data } = await api.get('/cases');
          setCases(data.data || []);
        } catch (err) {
          console.error('Failed to fetch cases', err);
        } finally {
          setLoading(false);
        }
      };
      fetchCases();
    } else {
      // Victim/public ke liye lawyers fetch karo
      const fetchLawyers = async () => {
        try {
          const { data } = await api.get('/lawyers');
          setLawyers(data.data || []);
        } catch (err) {
          console.error('Failed to fetch lawyers', err);
        } finally {
          setLoading(false);
        }
      };
      fetchLawyers();
    }
  }, [isLawyer]);

  // Lawyers filter (Exact original logic)
  const filteredLawyers = lawyers.filter(l => 
    l.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.specializations?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Cases filter (Exact original logic)
  const filteredCases = cases.filter(c =>
    c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.legal_domain?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ==========================================
  // 1. LAWYER VIEW — Available Cases Layout
  // ==========================================
  if (isLawyer) {
    return (
      <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: '#ffffff', padding: '3rem 1.5rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Header Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: '800', margin: '0 0 0.5rem 0', background: 'linear-gradient(135deg, #ffffff 0%, #a3a3a3 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Available Open Cases</h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.5)', margin: 0, fontSize: '0.95rem' }}>Review active legal requirements posted by clients.</p>
            </div>
            <input
              type="text"
              placeholder="Search by title or domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', maxWidth: '320px', padding: '0.75rem 1.2rem', backgroundColor: '#111', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', color: '#ffffff', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>

          {loading ? (
            <div style={{ textCenter: 'center', padding: '4rem 0', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>Loading active cases...</div>
          ) : filteredCases.length === 0 ? (
            <div style={{ textCenter: 'center', padding: '4rem 0', color: 'rgba(255,255,255,0.4)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', textAlign: 'center' }}>No open cases available at the moment.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredCases.map(c => (
                <div key={c.id} style={{ backgroundColor: '#111111', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', transition: 'all 0.2s' }}>
                  <div style={{ flex: '1', minWidth: '280px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ffffff', margin: '0 0 0.75rem 0' }}>{c.title}</h3>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.825rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
                      <span>Domain: <strong style={{ color: 'var(--secondary, #f77f00)' }}>{c.legal_domain?.toUpperCase()}</strong></span>
                      <span>Urgency: <strong style={{ color: c.urgency_level === 'critical' ? 'var(--primary, #d62828)' : '#ffffff' }}>{c.urgency_level?.toUpperCase()}</strong></span>
                      {c.city && <span>City: <strong style={{ color: '#fff' }}>{c.city}</strong></span>}
                      {c.budget_max && <span>Budget: <strong style={{ color: '#2ec4b6' }}>Rs. {c.budget_min} - {c.budget_max}</strong></span>}
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: 0, maxWidth: '750px', lineHeight: '1.4' }}>
                      {c.description?.substring(0, 140)}...
                    </p>
                  </div>
                  <Link 
                    to={`/submit-proposal/${c.id}`} 
                    className="btn btn-primary"
                    style={{ whiteSpace: 'nowrap', padding: '0.65rem 1.5rem', fontSize: '0.85rem', fontWeight: '700', borderRadius: '8px', textDecoration: 'none' }}
                  >
                    Submit Proposal
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. VICTIM/PUBLIC VIEW — Legal Directory
  // ==========================================
  return (
    <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: '#ffffff', padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '3rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '800', margin: '0 0 0.5rem 0', background: 'linear-gradient(135deg, #ffffff 0%, #a3a3a3 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Trusted Legal Professionals
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', margin: 0, fontSize: '0.95rem' }}>
              Connect with verified legal experts across Pakistan.
            </p>
          </div>
          <input
            type="text"
            placeholder="Search by name or specialization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', maxWidth: '320px', padding: '0.75rem 1.2rem', backgroundColor: '#111', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', color: '#ffffff', outline: 'none', fontSize: '0.9rem' }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'rgba(255,255,255,0.4)' }}>Loading legal directory...</div>
        ) : filteredLawyers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'rgba(255,255,255,0.4)', fontSize: '1rem' }}>
            No legal professionals found matching your search criteria.
          </div>
        ) : (
          /* Cards Grid System */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
            {filteredLawyers.map(lawyer => (
              <div 
                key={lawyer.id} 
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '16px',
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                }}
              >
                <div>
                  {/* Top Avatar & Basic Specs Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(247, 127, 0, 0.1)',
                      border: '1px solid rgba(247, 127, 0, 0.2)',
                      color: 'var(--secondary, #f77f00)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '1.1rem',
                      textTransform: 'uppercase'
                    }}>
                      {lawyer.full_name ? lawyer.full_name.charAt(0) : 'L'}
                    </div>

                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '0 0 0.3rem 0', color: '#ffffff' }}>
                        {lawyer.full_name}
                      </h3>
                      <span style={{
                        fontSize: '0.72rem',
                        backgroundColor: 'rgba(214, 40, 40, 0.12)',
                        color: 'var(--primary, #d62828)',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        display: 'inline-block'
                      }}>
                        {lawyer.specializations?.[0] || 'GENERAL'}
                      </span>
                    </div>
                  </div>

                  {/* Info Meta Body Block */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Experience</span>
                      <span style={{ fontWeight: '600', color: '#ffffff' }}>{lawyer.years_experience || 0} Years</span>
                    </div>
                    {lawyer.fee_min && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Retainer Fee</span>
                        <span style={{ fontWeight: '700', color: '#2ec4b6' }}>
                          Rs. {lawyer.fee_min} - {lawyer.fee_max}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Styled Div Wrapper — Click aple nahi hai lekin color smoothly hover pr change hoga */}
                <div 
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--primary, #d62828)',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    cursor: 'default',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box',
                    marginTop: '0.5rem',
                    userSelect: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--primary, #d62828)';
                    e.target.style.boxShadow = '0 4px 12px rgba(214, 40, 40, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  View Full Profile
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LawyerListings;