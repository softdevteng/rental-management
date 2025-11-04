import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar({ title, items = [], active, onChange }) {
  return (
    <aside className="sidebar" aria-label={title || 'Sidebar'}>
      <div className="sidebar-section">
        <div className="sidebar-title">{title}</div>
        {items.map(it => {
          // If item provides a `to` prop, render a NavLink so routing and active state work
          if (it.to) {
            return (
              <NavLink
                key={it.id || it.to}
                to={it.to}
                className={({ isActive }) => `side-item ${isActive ? 'active' : ''}`}
                onClick={(e) => { if (typeof it.onClick === 'function') it.onClick(e); if (onChange) onChange(it.id); }}
              >
                {it.icon && <span className="dot" aria-hidden dangerouslySetInnerHTML={{ __html: it.icon }} />}
                {it.label}
              </NavLink>
            );
          }

          return (
            <button
              key={it.id}
              className={`side-item ${String(active) === String(it.id) ? 'active' : ''}`}
              onClick={(e) => {
                if (typeof it.onClick === 'function') it.onClick(e);
                if (onChange) onChange(it.id);
              }}
            >
              {it.icon && <span className="dot" aria-hidden dangerouslySetInnerHTML={{ __html: it.icon }} />}
              {it.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
