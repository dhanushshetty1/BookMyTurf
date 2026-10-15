import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Building2, Lock, Mail, Phone, User, Users } from 'lucide-react';
import { loginSuccess } from '../../features/auth/authSlice';
import { authService } from '../../services/authService';
import styles from '../Login/Login.module.css';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('USER');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await authService.register({ name, email, password, phone, role });
      dispatch(loginSuccess(data));
      
      if (data.role === 'OWNER') {
        navigate('/owner');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setError(err.response.data.errors.map((e: any) => e.message).join(', '));
      } else {
        setError(err.response?.data?.message || 'Registration failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container} data-theme="light">
      <section className={styles.authShell}>
        <div className={styles.formPanel}>
          <div className={`${styles.card} ${styles.registerCard}`}>
            <div className={styles.header}>
              <span className={styles.formBadge}>Create account</span>
              <h2 className={styles.title}>Start with BookMyTurf</h2>
              <p className={styles.subtitle}>Tell us who you are so we can set up the right experience.</p>
            </div>
            
            {error && <div className={styles.errorAlert}>{error}</div>}

            <form onSubmit={handleRegister} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="name">Full name</label>
                <div className={styles.fieldShell}>
                  <User size={18} aria-hidden="true" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    required
                  />
                </div>
              </div>

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
                <label htmlFor="phone">Phone number</label>
                <div className={styles.fieldShell}>
                  <Phone size={18} aria-hidden="true" />
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
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
                    placeholder="Create a password"
                    required
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>I am joining as</label>
                <div className={styles.roleGrid} role="radiogroup" aria-label="Account type">
                  <button
                    type="button"
                    className={`${styles.roleOption} ${role === 'USER' ? styles.roleOptionActive : ''}`}
                    onClick={() => setRole('USER')}
                    aria-pressed={role === 'USER'}
                  >
                    <Users size={18} aria-hidden="true" />
                    <span>
                      <strong>Player</strong>
                      <small>Book available slots</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.roleOption} ${role === 'OWNER' ? styles.roleOptionActive : ''}`}
                    onClick={() => setRole('OWNER')}
                    aria-pressed={role === 'OWNER'}
                  >
                    <Building2 size={18} aria-hidden="true" />
                    <span>
                      <strong>Turf owner</strong>
                      <small>List and manage venues</small>
                    </span>
                  </button>
                </div>
              </div>
              
              <button 
                 type="submit" 
                 className={styles.submitButton}
                 disabled={isLoading}
              >
                <span>{isLoading ? 'Creating account...' : 'Create Account'}</span>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </form>

            <p className={styles.helperText}>
              Already have an account? <Link to="/login" className={styles.helperLink}>Log in</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Register;
