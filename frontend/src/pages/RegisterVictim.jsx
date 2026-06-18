import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

const RegisterVictim = () => {
  const [formData, setFormData] = useState({ full_name: '', email: '', password: '',cnic: '', role: 'victim' });
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      // const { data } = await api.post('/auth/register', formData);
      // login(data.user, data.token);
      // navigate('/victim-dashboard');
      await api.post('/auth/register', formData);
      navigate('/login');
    } catch (err) {
      // setError(err.response?.data?.message || 'Registration failed. Please try again.');
      setError(err.response?.data?.error || 'Registration failed...');
    }
  };

  return (
    <div className="container flex justify-center items-center py-6">
      <div className="card" style={{ maxWidth: '500px', width: '100%', marginTop: '3rem' }}>
        <h2 className="text-center text-primary mb-3">Register for Legal Help</h2>
        {error && <div className="error-msg text-center mb-2">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" name="full_name" className="form-input" value={formData.full_name} onChange={handleChange} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" name="email" className="form-input" value={formData.email} onChange={handleChange} required />
            </div>
            {/* <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input type="text" name="phone" className="form-input" value={formData.phone} onChange={handleChange} required />
            </div> */}
          </div>
          <div className="form-group">
  <label className="form-label">CNIC</label>
  <input 
    type="text" 
    name="cnic" 
    className="form-input" 
    value={formData.cnic} 
    onChange={handleChange} 
    required 
    placeholder="XXXXX-XXXXXXX-X"
  />
</div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" name="password" className="form-input" value={formData.password} onChange={handleChange} required minLength="6" />
          </div>
          <button type="submit" className="btn btn-secondary w-full mt-2">Create Account</button>
        </form>
        <p className="text-center mt-3 text-muted" style={{ fontSize: '0.875rem' }}>
          Already have an account? <Link to="/login" className="text-primary">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterVictim;
