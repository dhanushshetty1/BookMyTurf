import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { LogOut } from 'lucide-react';
import { type RootState } from '../../../store';
import { logout } from '../../../features/auth/authSlice';
import styles from './Navbar.module.css';

const Navbar: React.FC = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
  };

  if (isAuthenticated && user?.role === 'OWNER') {
    return null;
  }

  const navClasses = `${styles.navbar} ${isScrolled ? styles.navbarScrolled : ''}`;
  const getLinkClass = (path: string) => {
    const isActive = path === '/turfs'
      ? location.pathname === '/turfs' || location.pathname.startsWith('/turfs/')
      : location.pathname === path;
    return `${styles.link} ${isActive ? styles.activeLink : ''}`;
  };

  return (
    <nav className={navClasses}>
      <div className={styles.navContainer}>
        <Link to="/" className={styles.brand}>
          <span className={styles.logoMark}>
            <img src="/bookmyturf-logo.png" alt="BookMyTurf" className={styles.logoIcon} />
          </span>
          <span className={styles.brandCopy}>
            <span className={styles.logoText}>BookMyTurf</span>
            <span className={styles.tagline}>Sports turf booking</span>
          </span>
        </Link>
        <div className={styles.navLinks}>
          <Link to="/" className={getLinkClass('/')}>Home</Link>
          <Link to="/turfs" className={getLinkClass('/turfs')}>Turfs</Link>
          <Link to="/about" className={getLinkClass('/about')}>About</Link>
          
          {isAuthenticated ? (
            <div className={styles.authGroup}>
              {user?.role === 'OWNER' ? (
                <Link to="/owner" className={getLinkClass('/owner')}>Owner Panel</Link>
              ) : (
                <Link to="/dashboard" className={getLinkClass('/dashboard')}>Dashboard</Link>
              )}
              <button onClick={handleLogout} className={styles.logoutBtn} title="Logout">
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <div className={styles.authGroup}>
              <Link to="/login" className={getLinkClass('/login')}>Log In</Link>
              <Link to="/register" className={styles.signupBtn}>Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
