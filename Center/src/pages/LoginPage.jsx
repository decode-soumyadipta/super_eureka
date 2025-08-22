import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // Store token and user data
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        
        // Navigate to main dashboard
        navigate('/');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen w-full flex items-center justify-center bg-gray-900'>
      <div className='fixed inset-0 z-0'>
        <div className='absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-80' />
        <div className='absolute inset-0 backdrop-blur-sm' />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className='relative z-10 w-full max-w-md mx-auto px-4'
      >
        <div className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-2xl rounded-2xl p-8 border border-gray-700'>
          <div className='text-center mb-8'>
            <h2 className='text-3xl font-bold text-gray-100 mb-2'>E-Waste Management</h2>
            <p className='text-gray-400'>Sign in to your account</p>
          </div>

          {error && (
            <div className='mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4'>
              <div className='flex items-center'>
                <AlertCircle className='w-5 h-5 text-red-400 mr-2' />
                <span className='text-red-300'>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className='space-y-6'>
            <div>
              <label htmlFor='email' className='block text-sm font-medium text-gray-300 mb-2'>
                Email Address
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <Mail className='h-5 w-5 text-gray-400' />
                </div>
                <input
                  id='email'
                  name='email'
                  type='email'
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className='block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  placeholder='Enter your email'
                />
              </div>
            </div>

            <div>
              <label htmlFor='password' className='block text-sm font-medium text-gray-300 mb-2'>
                Password
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <Lock className='h-5 w-5 text-gray-400' />
                </div>
                <input
                  id='password'
                  name='password'
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className='block w-full pl-10 pr-12 py-3 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  placeholder='Enter your password'
                />
                <button
                  type='button'
                  className='absolute inset-y-0 right-0 pr-3 flex items-center'
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className='h-5 w-5 text-gray-400 hover:text-gray-300' />
                  ) : (
                    <Eye className='h-5 w-5 text-gray-400 hover:text-gray-300' />
                  )}
                </button>
              </div>
            </div>

            <button
              type='submit'
              disabled={loading}
              className='w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {loading ? (
                <div className='flex items-center'>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className='mt-6 text-center'>
            <p className='text-sm text-gray-400'>
              Admin login: admin@repaircenter.com / admin123
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;