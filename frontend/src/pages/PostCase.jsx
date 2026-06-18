import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

const PostCase = () => {
  const [formData, setFormData] = useState({ 
    title: '', 
    legal_domain: '', 
    description: '', 
    urgency_level: 'medium',
    city: '',
    province: '',
    budget_min: '',
    budget_max: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user?.role !== 'victim') { setError('Only victims can post cases.'); return; }
    try {
      setLoading(true);
      setError('');
      await api.post('/cases', {
        ...formData,
        budget_min: formData.budget_min ? Number(formData.budget_min) : null,
        budget_max: formData.budget_max ? Number(formData.budget_max) : null,
      });
      navigate('/victim-dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post the case.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-6 flex justify-center">
      <div className="card" style={{ maxWidth: '700px', width: '100%' }}>
        <h2 className="text-center text-primary mb-2">Post a Legal Case</h2>
        <p className="text-center text-muted mb-4">Provide details so verified lawyers can offer proposals</p>
        {error && <div className="error-msg text-center mb-4">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Case Title</label>
            <input type="text" name="title" className="form-input" value={formData.title} onChange={handleChange} required placeholder="E.g., Property Dispute in Lahore" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Legal Domain</label>
              <select name="legal_domain" className="form-input" value={formData.legal_domain} onChange={handleChange} required>
                <option value="">Select Category</option>
                <option value="criminal">Criminal</option>
                <option value="civil">Civil</option>
                <option value="family">Family/Divorce</option>
                <option value="corporate">Corporate</option>
                <option value="property">Property/Real Estate</option>
                <option value="labor">Labor</option>
                <option value="tax">Taxation</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Urgency Level</label>
              <select name="urgency_level" className="form-input" value={formData.urgency_level} onChange={handleChange} required>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">City</label>
              <input type="text" name="city" className="form-input" value={formData.city} onChange={handleChange} placeholder="E.g., Lahore" />
            </div>
            <div className="form-group">
              <label className="form-label">Province</label>
              <select name="province" className="form-input" value={formData.province} onChange={handleChange}>
                <option value="">Select Province</option>
                <option value="Punjab">Punjab</option>
                <option value="Sindh">Sindh</option>
                <option value="KPK">KPK</option>
                <option value="Balochistan">Balochistan</option>
                <option value="Islamabad">Islamabad</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Budget Min (PKR)</label>
              <input type="number" name="budget_min" className="form-input" value={formData.budget_min} onChange={handleChange} placeholder="Optional" />
            </div>
            <div className="form-group">
              <label className="form-label">Budget Max (PKR)</label>
              <input type="number" name="budget_max" className="form-input" value={formData.budget_max} onChange={handleChange} placeholder="Optional" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Detailed Description</label>
            <textarea name="description" className="form-input" style={{ minHeight: '150px', resize: 'vertical' }} value={formData.description} onChange={handleChange} required placeholder="Describe your situation in detail." />
          </div>
          <div className="flex justify-between items-center mt-4">
            <button type="button" onClick={() => navigate('/victim-dashboard')} className="btn btn-outline">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Posting...' : 'Submit Case'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostCase;