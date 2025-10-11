import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import './styles.css';

export default function Layout({ children }) {
  const { token, role, logout } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

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

  const initials = (displayName || '').split(' ').map(s=>s[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
  const confirmAndLogout = () => {
    const ok = window.confirm('Are you sure you want to log out?');
    if (ok) logout();
  };
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
