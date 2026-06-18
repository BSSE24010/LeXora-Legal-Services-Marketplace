import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="landing-page flex flex-col items-center w-full">
      
      {/* HERO SECTION */}
      <section className="hero-section w-full" style={{ padding: '8rem 0 6rem 0', textAlign: 'center', backgroundImage: 'radial-gradient(circle at center, #1a0505 0%, #050505 70%)' }}>
        <div className="container flex flex-col items-center">
          
          <div style={{ 
            backgroundColor: 'rgba(139, 0, 0, 0.1)', 
            border: '1px solid rgba(139, 0, 0, 0.3)', 
            color: 'var(--primary)', 
            padding: '0.5rem 1rem', 
            borderRadius: '999px',
            fontSize: '0.85rem',
            fontWeight: '600',
            letterSpacing: '0.1em',
            marginBottom: '2rem'
          }}>
            THE TRANSPARENT LEGAL MARKETPLACE
          </div>
          
          <h1 style={{ fontSize: '4.5rem', fontWeight: '900', marginBottom: '1.5rem', color: 'var(--text-light)', lineHeight: '1.1', letterSpacing: '-0.03em', maxWidth: '800px' }}>
            Your Fight for Justice <br/>Starts <span className="text-primary" style={{ textShadow: '0 0 20px rgba(139, 0, 0, 0.5)' }}>Here.</span>
          </h1>
          
          <div style={{
            borderLeft: '4px solid var(--primary)',
            padding: '1rem 0 1rem 1.5rem',
            marginBottom: '3rem',
            textAlign: 'left',
            maxWidth: '600px'
          }}>
            <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: '400' }}>
              "Empowering victims with direct access to verified legal professionals. No hidden fees, no obscured processes—just clear, decisive action."
            </p>
          </div>
          
          <div className="flex gap-4 justify-center">
            <Link to="/lawyer-listings" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.125rem' }}>
              Find a Lawyer <span style={{ marginLeft: '0.5rem' }}>→</span>
            </Link>
            <Link to="/register/lawyer" className="btn btn-outline" style={{ padding: '1rem 2.5rem', fontSize: '1.125rem', borderColor: 'var(--text-muted)', color: 'var(--text-light)' }}>
              Offer Legal Help
            </Link>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="w-full" style={{ backgroundColor: '#0a0a0a', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '3rem 0' }}>
        <div className="container grid grid-cols-3 gap-6 text-center">
          <div>
            <h2 style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--text-light)', marginBottom: '0.5rem' }}>500+</h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Verified Lawyers</p>
          </div>
          <div style={{ borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--text-light)', marginBottom: '0.5rem' }}>10,000+</h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Happy Clients</p>
          </div>
          <div>
            <h2 style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--text-light)', marginBottom: '0.5rem' }}>98%</h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Success Rate</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SPACING BLOCK */}
      <section id="how-it-works" className="w-full" style={{ padding: '6rem 0', backgroundColor: 'var(--bg-color)' }}>
        <div className="container">
          <h2 className="text-center" style={{ fontSize: '2.5rem', color: 'var(--text-light)', marginBottom: '4rem', fontWeight: '800' }}>Platform Mechanism</h2>
          <div className="grid grid-cols-3 gap-8 text-center">
            <div className="card" style={{ borderColor: 'transparent', backgroundColor: '#0b0b0b' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>FILE</div>
              <h3 style={{ color: 'var(--text-light)', fontSize: '1.5rem', marginBottom: '1rem' }}>1. Post a Case</h3>
              <p className="text-muted">Anonymously submit details about your legal situation securely onto our encrypted ledger.</p>
            </div>
            <div className="card" style={{ borderColor: 'rgba(139, 0, 0, 0.2)', backgroundColor: '#110a0a', boxShadow: '0 0 20px rgba(139,0,0,0.1)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>BID</div>
              <h3 style={{ color: 'var(--text-light)', fontSize: '1.5rem', marginBottom: '1rem' }}>2. Receive Proposals</h3>
              <p className="text-muted">Verified, specialized lawyers review your brief and submit customized strategic proposals.</p>
            </div>
            <div className="card" style={{ borderColor: 'transparent', backgroundColor: '#0b0b0b' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>FIGHT</div>
              <h3 style={{ color: 'var(--text-light)', fontSize: '1.5rem', marginBottom: '1rem' }}>3. Secure Justice</h3>
              <p className="text-muted">Accept the optimal proposal, communicate through encrypted chat, and deposit escrow.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
