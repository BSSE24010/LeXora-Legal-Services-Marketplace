import { useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

const SubmitProposal = () => {
  const { caseId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    proposed_fee: '',
    estimated_timeline: '',
    cover_note: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await api.post('/proposals', {
        case_id: caseId,
        proposed_fee: Number(formData.proposed_fee),
        estimated_timeline: formData.estimated_timeline,
        cover_note: formData.cover_note,
      });
      navigate('/lawyer-dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit proposal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-6 flex justify-center">
      <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
        <h2 className="text-center text-primary mb-2">Submit Proposal</h2>
        <p className="text-center text-muted mb-4">Submit your proposal for this case</p>
        {error && <div className="error-msg text-center mb-4">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Proposed Fee (PKR)</label>
              <input type="number" name="proposed_fee" className="form-input"
                value={formData.proposed_fee} onChange={handleChange} required
                placeholder="e.g. 25000"/>
            </div>
            <div className="form-group">
              <label className="form-label">Estimated Timeline</label>
              <select name="estimated_timeline" className="form-input"
                value={formData.estimated_timeline} onChange={handleChange} required>
                <option value="">Select Timeline</option>
                <option value="1 week">1 Week</option>
                <option value="2 weeks">2 Weeks</option>
                <option value="1 month">1 Month</option>
                <option value="2 months">2 Months</option>
                <option value="3 months">3 Months</option>
                <option value="6 months">6 Months</option>
                <option value="1 year">1 Year</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Cover Note</label>
            <textarea name="cover_note" className="form-input"
              style={{ minHeight: '150px', resize: 'vertical' }}
              value={formData.cover_note} onChange={handleChange}
              placeholder="Explain why you are the best fit for this case..."/>
          </div>
          <div className="flex justify-between items-center mt-4">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-outline">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitProposal;