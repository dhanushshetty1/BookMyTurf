import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { loginSuccess } from '../../features/auth/authSlice';
import { authService } from '../../services/authService';
import styles from './Login.module.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await authService.login({ email, password });
      dispatch(loginSuccess(data));
      
      if (data.role === 'OWNER') {
        navigate('/owner');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container} data-theme="light">
      <section className={styles.authShell}>
        <div className={styles.formPanel}>
          <div className={styles.card}>
            <div className={styles.header}>
              <h2 className={styles.title}>Log in to your account</h2>
              <p className={styles.subtitle}>Enter your details to continue booking sports turfs.</p>
            </div>
            
            {error && <div className={styles.errorAlert}>{error}</div>}

            <form onSubmit={handleLogin} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="email">Email address</label>
                <div className={styles.fieldShell}>
                  <Mail size={18} aria-hidden="true" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>
              
              <div className={styles.inputGroup}>
                <label htmlFor="password">Password</label>
                <div className={styles.fieldShell}>
                  <Lock size={18} aria-hidden="true" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>
              
              <button 
                 type="submit" 
                 className={styles.submitButton}
                 disabled={isLoading}
              >
                <span>{isLoading ? 'Logging in...' : 'Log In'}</span>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </form>

            <p className={styles.helperText}>
              Don't have an account? <Link to="/register" className={styles.helperLink}>Sign up</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Login;
