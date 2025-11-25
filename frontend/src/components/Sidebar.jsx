import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar({ title, items = [], active, onChange }) {
  // collapsed: keeps sidebar hidden when true
  // isOpen: when collapsed, opening shows the overlay drawer
  // Default to expanded in development so sidebar items are visible by default.
  // When running tests we still keep the sidebar expanded to avoid flakiness.
  const runningTests = (typeof process !== 'undefined' && process.env && (process.env.CI === 'true' || process.env.NODE_ENV === 'test'));
  const [collapsed, setCollapsed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const open = () => {
    if (collapsed) setIsOpen(true);
    else setCollapsed(true);
  };
  const close = () => setIsOpen(false);

  // When expanded (not collapsed), render inline sidebar as before.
  // When collapsed and not open, render only the small hamburger button.
  return (
    <>
      <aside className={`sidebar ${!collapsed ? 'expanded' : 'collapsed'}`} aria-label={title || 'Sidebar'}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px' }}>
          <button aria-label="Toggle sidebar" title={collapsed ? 'Open sidebar' : 'Collapse sidebar'} onClick={() => {
            if (collapsed) setIsOpen(true); else setCollapsed(true);
          }} className="btn classic" style={{ padding: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {/* hamburger */}
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <rect x="0" y="1" width="18" height="2" rx="1" fill="currentColor" />
              <rect x="0" y="6" width="18" height="2" rx="1" fill="currentColor" />
              <rect x="0" y="11" width="18" height="2" rx="1" fill="currentColor" />
            </svg>
            {!collapsed && <strong style={{ fontSize: 13 }}>{title}</strong>}
          </button>
        </div>

        {!collapsed && (
          <div className="sidebar-section">
            {items.map(it => {
              const content = (
                <>
                  {it.icon && <span className="dot" aria-hidden dangerouslySetInnerHTML={{ __html: it.icon }} />}
                  <span className="side-label">{it.label}</span>
                </>
              );

              if (it.to) {
                return (
                  <NavLink
                    key={it.id || it.to}
                    to={it.to}
                    title={it.label}
                    className={({ isActive }) => `side-item ${isActive ? 'active' : ''}`}
                    onClick={(e) => { if (typeof it.onClick === 'function') it.onClick(e); if (onChange) onChange(it.id); }}
                  >
                    {content}
                  </NavLink>
                );
              }

              return (
                <button
                  key={it.id}
                  title={it.label}
                  className={`side-item ${String(active) === String(it.id) ? 'active' : ''}`}
                  onClick={(e) => {
                    if (typeof it.onClick === 'function') it.onClick(e);
                    if (onChange) onChange(it.id);
                  }}
                >
                  {content}
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {/* Overlay drawer for collapsed -> open state */}
      {collapsed && isOpen && (
        <div className="sidebar-drawer" role="dialog" aria-label={title || 'Sidebar'} style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
          <div className="sidebar-backdrop" onClick={close} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
          <nav className="sidebar drawer" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 300, background: 'var(--surface, #fff)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', padding: 12, overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>{title}</strong>
              <button aria-label="Close sidebar" onClick={close} className="btn classic">Close</button>
            </div>

            <div className="sidebar-section">
              {items.map(it => {
                const content = (
                  <>
                    {it.icon && <span className="dot" aria-hidden dangerouslySetInnerHTML={{ __html: it.icon }} />}
                    <span className="side-label">{it.label}</span>
                  </>
                );

                const handleClick = (e) => {
                  if (typeof it.onClick === 'function') it.onClick(e);
                  if (onChange) onChange(it.id);
                  close();
                };

                if (it.to) {
                  return (
                    <NavLink key={it.id || it.to} to={it.to} title={it.label} className={({ isActive }) => `side-item ${isActive ? 'active' : ''}`} onClick={handleClick}>
                      {content}
                    </NavLink>
                  );
                }

                return (
                  <button key={it.id} title={it.label} className={`side-item ${String(active) === String(it.id) ? 'active' : ''}`} onClick={handleClick}>
                    {content}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
