import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const Payment = () => {
  const { engagementId } = useParams();
  const [proposedFee, setProposedFee] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEngagement = async () => {
      try {
        const { data } = await api.get(`/engagements/${engagementId}`);
        const fee = data.data?.proposals?.proposed_fee;
        if (fee) setProposedFee(Number(fee));
      } catch (err) {
        console.error('Failed to fetch engagement', err);
      } finally {
        setFetching(false);
      }
    };
    fetchEngagement();
  }, [engagementId]);

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!proposedFee) { alert('Could not load payment amount.'); return; }
    setLoading(true);
    try {
      await api.post('/payments', {
        engagement_id: engagementId,
        amount: proposedFee,
        payment_method: paymentMethod,
      });
      alert('Payment successfully deposited to escrow!');
      navigate('/victim-dashboard');
    } catch (err) {
      alert(err.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="container py-8 flex justify-center">
        <p className="text-muted">Loading payment details...</p>
      </div>
    );
  }

  return (
    <div className="container py-8 flex justify-center items-center">
      <div className="card" style={{ maxWidth: '500px', width: '100%' }}>

        {/* Header */}
        <div className="text-center mb-6">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
          <h2 className="text-primary">Secure Escrow Payment</h2>
          <p className="text-muted mt-2">
            Funds are safely held in escrow and released only upon successful completion.
          </p>
        </div>

        {/* Fee Box */}
        {proposedFee && (
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            background: 'rgba(139,0,0,0.08)',
            border: '1px solid rgba(139,0,0,0.25)',
            borderRadius: '10px',
            textAlign: 'center',
          }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Agreed Fee from Accepted Proposal
            </p>
            <p style={{ color: 'var(--primary)', fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>
              Rs. {proposedFee.toLocaleString()}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              You must pay exactly this amount
            </p>
          </div>
        )}

        <form onSubmit={handlePayment}>

          {/* Amount — readonly */}
          <div className="form-group">
            <label className="form-label">Payment Amount (PKR)</label>
            <input
              type="text"
              className="form-input"
              value={proposedFee ? `Rs. ${proposedFee.toLocaleString()}` : 'Loading...'}
              readOnly
              style={{ opacity: 0.7, cursor: 'not-allowed', backgroundColor: 'rgba(255,255,255,0.03)' }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              Fixed as per your accepted proposal — cannot be changed
            </p>
          </div>

          {/* Payment Method */}
          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select
              className="form-input"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              required>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Credit/Debit Card</option>
              <option value="easypaisa">EasyPaisa</option>
              <option value="jazzcash">JazzCash</option>
            </select>
          </div>

          {/* Card Details */}
          <div className="form-group">
            <label className="form-label">Card / Account Number</label>
            <input type="text" className="form-input" placeholder="XXXX XXXX XXXX XXXX" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input type="text" className="form-input" placeholder="MM/YY" required />
            </div>
            <div className="form-group">
              <label className="form-label">CVC</label>
              <input type="password" className="form-input" placeholder="123" required />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full mt-4"
            disabled={loading || !proposedFee}
            style={{ padding: '0.75rem', fontWeight: '600', fontSize: '1rem' }}>
            {loading ? 'Processing...' : `Pay Rs. ${proposedFee?.toLocaleString() || '0'} to Escrow`}
          </button>

          <div className="mt-4 text-center">
            <p style={{ fontSize: '0.75rem' }} className="text-muted">
              🔒 Funds held securely in escrow. Released only when you approve completion.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Payment;