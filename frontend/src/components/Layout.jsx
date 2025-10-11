import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import './styles.css';

export default function Layout({ children }) {
  const { token, role, logout } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    if (!token) { setDisplayName(''); return; }
    (async () => {
      try {
        if (role === 'tenant') {
          const me = await api('/api/tenants/me', { token });
          setDisplayName(me?.name || 'Tenant'); setPhotoUrl(me?.photoUrl || '');
        } else if (role === 'landlord') {
          const me = await api('/api/landlords/me', { token });
          setDisplayName(me?.name || 'Landlord'); setPhotoUrl(me?.photoUrl || '');
        } else if (role === 'caretaker') {
          const me = await api('/api/landlords/caretakers/me', { token });
          setDisplayName(me?.name || 'Caretaker'); setPhotoUrl(me?.photoUrl || '');
        }
      } catch {
        setDisplayName('');
      }
    })();
  }, [token, role]);

  // Theme bootstrap and persistence
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved);
        document.documentElement.setAttribute('data-theme', saved);
      } else {
        // default: dark
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    } catch {}
  }, [theme]);

  const initials = (displayName || '').split(' ').map(s=>s[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
  const confirmAndLogout = () => {
    const ok = window.confirm('Are you sure you want to log out?');
    if (ok) logout();
  };
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return (
    <div className="container">
      <header className="header">
        <h1 className="brand" style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span aria-hidden style={{ display:'inline-flex' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 11l9-7 9 7" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 10v9a1 1 0 001 1h12a1 1 0 001-1v-9" stroke="var(--accent-2)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 20v-6h6v6" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          Rental Manager
        </h1>
        <nav className="nav" style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Link to="/">Home</Link>
          {token && role === 'tenant' && <Link to="/tenant">Tenant</Link>}
          {token && (role === 'landlord' || role === 'caretaker') && <Link to="/landlord">Manage</Link>}
          <button aria-label={theme==='dark'? 'Switch to light mode':'Switch to dark mode'} title={theme==='dark'? 'Switch to light mode':'Switch to dark mode'} className="btn classic" onClick={toggleTheme} style={{ padding:'6px 10px' }}>
            {theme === 'dark' ? (
              // Sun icon for switching to light mode
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="4" stroke="#0b132b" strokeWidth="1.6"/>
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" stroke="#0b132b" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            ) : (
              // Moon icon for switching to dark mode
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="#0b132b" strokeWidth="1.6"/>
              </svg>
            )}
          </button>
          {!token ? (
            <Link to="/signin">Sign In</Link>
          ) : (
            <>
              <Link to={role==='tenant'? '/tenant' : '/landlord'} state={{ openProfile:true }} className="profile-chip" title={displayName}>
                {photoUrl ? (
                  <img src={photoUrl} alt="avatar" className="avatar-mini" style={{ objectFit:'cover' }} onError={(e)=>{ e.currentTarget.style.display='none'; }} />
                ) : (
                  <div className="avatar-mini">{initials || 'U'}</div>
                )}
                <span className="profile-name">{displayName}</span>
              </Link>
              <button className="btn" onClick={confirmAndLogout}>Logout</button>
            </>
          )}
        </nav>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">© {new Date().getFullYear()} Rental Management System</footer>
    </div>
  );
}
