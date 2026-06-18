const Footer = () => {
  return (
    <footer style={{ backgroundColor: '#000000', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', padding: '3rem 0', marginTop: 'auto' }}>
      <div className="container grid grid-cols-4 gap-6">
        <div style={{ gridColumn: 'span 2' }}>
          <h3 style={{ color: 'var(--text-light)', fontSize: '1.25rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span style={{ color: 'var(--primary)' }}>⚖</span> LeXora
          </h3>
          <p style={{ fontSize: '0.875rem', maxWidth: '80%' }}>
            Empowering victims and relentless legal fighters across the nation with a transparent, battle-tested marketplace. Your fight for justice starts and ends here.
          </p>
        </div>
        <div>
          <h4 style={{ color: 'var(--text-light)', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.9rem' }}>Quick Links</h4>
          <ul style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><a href="/" style={{ transition: 'color 0.2s' }}>Home</a></li>
            <li><a href="/lawyer-listings">Find a Lawyer</a></li>
            <li><a href="/login">Sign In / Register</a></li>
          </ul>
        </div>
        <div>
          <h4 style={{ color: 'var(--text-light)', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.9rem' }}>Contact</h4>
          <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Email: support@lexora.pk</p>
          <p style={{ fontSize: '0.875rem' }}>Phone: +92 300 0000000</p>
        </div>
      </div>
      <div className="container" style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem' }}>
        &copy; {new Date().getFullYear()} LeXora. All rights reserved. Justice will be served.
      </div>
    </footer>
  );
};

export default Footer;
