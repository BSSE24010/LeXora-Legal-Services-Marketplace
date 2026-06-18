import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      // Adjust path if your backend auth route is different
      // const { data } = await api.post('/auth/login', formData);
      // login(data.user, data.access_token);
      const { data } = await api.post('/auth/login', formData);
      login(data.data.user, data.data.access_token);
      
if (data.data.user.role === 'lawyer') navigate('/lawyer-dashboard');
else if (data.data.user.role === 'victim') navigate('/victim-dashboard');
      else navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="container flex justify-center items-center py-6">
      <div className="card" style={{ maxWidth: '400px', width: '100%', marginTop: '3rem' }}>
        <h2 className="text-center text-primary mb-3">Login to LeXora</h2>
        {error && <div className="error-msg text-center mb-2">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input 
              type="email" 
              name="email" 
              className="form-input" 
              value={formData.email} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              name="password" 
              className="form-input" 
              value={formData.password} 
              onChange={handleChange} 
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary w-full mt-2">Login</button>
        </form>
        <p className="text-center mt-3 text-muted" style={{ fontSize: '0.875rem' }}>
          Don't have an account? <Link to="/register/victim" className="text-secondary">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
