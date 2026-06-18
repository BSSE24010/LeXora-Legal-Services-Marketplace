import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

const RegisterLawyer = () => {
  const [step, setStep] = useState(1);
  const [registeredToken, setRegisteredToken] = useState(null);
  const [formData, setFormData] = useState({ 
    full_name: '', 
    email: '', 
    password: '', 
    bar_council_no: '',
    years_experience: '',
    fee_min: '',
    fee_max: '',
    role: 'lawyer',
    specializations: [],
  });
  const [credential, setCredential] = useState({
    document_type: 'bar_license',
    file: null,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const { data } = await api.post('/auth/register', {
        ...formData,
        years_experience: Number(formData.years_experience),
        fee_min: Number(formData.fee_min),
        fee_max: Number(formData.fee_max),
      });
      setRegisteredToken(data.data.access_token);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialUpload = async (e) => {
    e.preventDefault();
    if (!credential.file) { setError('Please select a file'); return; }
    try {
      setLoading(true);
      setError('');

      const formDataUpload = new FormData();
      formDataUpload.append('file', credential.file);
      formDataUpload.append('document_type', credential.document_type);

      await api.post('/lawyers/credentials', formDataUpload, {
        headers: {
          Authorization: `Bearer ${registeredToken}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload credential.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex justify-center items-center py-6">
      <div className="card" style={{ maxWidth: '600px', width: '100%', marginTop: '3rem' }}>
        
        {/* Progress Steps */}
        <div className="flex justify-center gap-4 mb-6">
          {[1,2,3].map(s => (
            <div key={s} style={{
              width: '32px', height: '32px', borderRadius: '50%',
              backgroundColor: step >= s ? 'var(--primary)' : 'var(--border-color)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold', fontSize: '0.875rem'
            }}>{s}</div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <>
            <h2 className="text-center text-primary mb-3">Join as a Lawyer</h2>
            <p className="text-center text-muted mb-4" style={{ fontSize: '0.875rem' }}>
              Step 1: Basic Information
            </p>
            {error && <div className="error-msg text-center mb-2">{error}</div>}
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" name="full_name" className="form-input"
                  value={formData.full_name} onChange={handleChange} required
                  placeholder="Advocate Ali Hassan"/>
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" name="email" className="form-input"
                  value={formData.email} onChange={handleChange} required
                  placeholder="ali@example.com"/>
              </div>
              <div className="form-group">
                <label className="form-label">Bar Council Number</label>
                <input type="text" name="bar_council_no" className="form-input"
                  value={formData.bar_council_no} onChange={handleChange} required
                  placeholder="PBC-LHR-2020-1234"/>
              </div>
              <div className="form-group">
                <label className="form-label">Specialization</label>
                <select className="form-input"
                  onChange={(e) => setFormData({...formData, specializations: [e.target.value]})} required>
                  <option value="">Select area of law</option>
                  <option value="criminal">Criminal</option>
                  <option value="civil">Civil</option>
                  <option value="family">Family</option>
                  <option value="corporate">Corporate</option>
                  <option value="property">Property</option>
                  <option value="labor">Labor</option>
                  <option value="tax">Tax</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Years of Experience</label>
                  <input type="number" name="years_experience" className="form-input"
                    value={formData.years_experience} onChange={handleChange} required min="0"
                    placeholder="5"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Fee Min (PKR)</label>
                  <input type="number" name="fee_min" className="form-input"
                    value={formData.fee_min} onChange={handleChange} required
                    placeholder="5000"/>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Fee Max (PKR)</label>
                <input type="number" name="fee_max" className="form-input"
                  value={formData.fee_max} onChange={handleChange} required
                  placeholder="50000"/>
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input type="password" name="password" className="form-input"
                  value={formData.password} onChange={handleChange} required minLength="6"
                  placeholder="Min 6 characters"/>
              </div>
              <button type="submit" className="btn btn-primary w-full mt-2" disabled={loading}>
                {loading ? 'Registering...' : 'Next: Upload Credentials →'}
              </button>
            </form>
          </>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <>
            <h2 className="text-center text-primary mb-3">Upload Credentials</h2>
            <p className="text-center text-muted mb-4" style={{ fontSize: '0.875rem' }}>
              Step 2: Upload your legal documents for admin verification
            </p>
            {error && <div className="error-msg text-center mb-2">{error}</div>}
            <form onSubmit={handleCredentialUpload}>
              <div className="form-group">
                <label className="form-label">Document Type</label>
                <select className="form-input"
                  value={credential.document_type}
                  onChange={(e) => setCredential({...credential, document_type: e.target.value})}>
                  <option value="bar_license">Bar Council License</option>
                  <option value="cnic">CNIC</option>
                  <option value="law_degree">Law Degree</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Upload Document</label>
                <input type="file" className="form-input"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setCredential({...credential, file: e.target.files[0]})}
                  required/>
                <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  Accepted: PDF, JPG, PNG (Max 10MB)
                </p>
              </div>
              <button type="submit" className="btn btn-primary w-full mt-2" disabled={loading}>
                {loading ? 'Uploading...' : 'Submit for Verification'}
              </button>
            </form>
          </>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="text-center py-4">
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
            <h2 className="text-primary mb-3">Application Submitted!</h2>
            <p className="text-muted mb-2">Your credentials have been submitted for admin review.</p>
            <p className="text-muted mb-4">You will be able to login once your account is <strong>approved by admin</strong>.</p>
            <Link to="/login" className="btn btn-primary">Go to Login</Link>
          </div>
        )}

        {step < 3 && (
          <p className="text-center mt-3 text-muted" style={{ fontSize: '0.875rem' }}>
            Already have an account? <Link to="/login" className="text-secondary">Login here</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default RegisterLawyer;