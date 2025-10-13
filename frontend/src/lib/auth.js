import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [role, setRole] = useState(() => {
    const r = localStorage.getItem('role');
    return r ? String(r).toLowerCase() : null;
  });
  const [listeners, setListeners] = useState([]);

  useEffect(() => {
    if (token) localStorage.setItem('token', token); else localStorage.removeItem('token');
    if (role) localStorage.setItem('role', role); else localStorage.removeItem('role');
  }, [token, role]);

  const login = (t, r) => { setToken(t); setRole(r ? String(r).toLowerCase() : null); };
  const logout = () => { setToken(null); setRole(null); };

  // allow components to subscribe to auth errors like 401
  const onAuthError = (cb) => {
    setListeners(ls => [...ls, cb]);
    return () => setListeners(ls => ls.filter(x => x !== cb));
  };

  return (
    <AuthContext.Provider value={{ token, role, login, logout, onAuthError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
