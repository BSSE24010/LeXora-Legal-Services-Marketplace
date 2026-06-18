import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const SubmitReview = () => {
  const { engagementId } = useParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { setError('Please select a rating'); return; }
    try {
      setLoading(true);
      setError('');
      await api.post('/reviews', {
        engagement_id: engagementId,
        rating,
        comment,
      });
      alert('Review submitted successfully!');
      navigate('/victim-dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit review.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8 flex justify-center">
      <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
        <h2 className="text-center text-primary mb-2">Rate Your Lawyer</h2>
        <p className="text-center text-muted mb-6" style={{ fontSize: '0.875rem' }}>
          Your feedback helps other victims find the right legal help.
        </p>

        {error && <div className="error-msg text-center mb-4">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* STARS */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                style={{
                  fontSize: '2.5rem',
                  cursor: 'pointer',
                  color: star <= (hover || rating) ? '#FFD700' : 'var(--border-color)',
                  transition: 'color 0.15s',
                }}>
                ★
              </span>
            ))}
          </div>
          <p className="text-center text-muted mb-4" style={{ fontSize: '0.875rem' }}>
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent!'}
          </p>

          <div className="form-group">
            <label className="form-label">Comment (Optional)</label>
            <textarea
              className="form-input"
              style={{ minHeight: '120px', resize: 'vertical' }}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this lawyer..."
            />
          </div>

          <div className="flex justify-between items-center mt-4">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitReview;