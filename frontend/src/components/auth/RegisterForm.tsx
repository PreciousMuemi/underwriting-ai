import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const RegisterForm: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await register(formData.name, formData.email, formData.password);
      if (result.success) {
        // Registration successful — navigate to login or home
        navigate('/login');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-2xl mb-4">Register</h2>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      <div className="mb-4">
        <label htmlFor="name" className="block mb-1">Name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="email" className="block mb-1">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="password" className="block mb-1">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="confirmPassword" className="block mb-1">Confirm Password</label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
          required
        />
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
};

export default RegisterForm;
