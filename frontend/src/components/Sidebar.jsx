import React from 'react';

export default function Sidebar({ title, items = [], active, onChange }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-title">{title}</div>
        {items.map(it => (
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
        ))}
      </div>
    </aside>
  );
}
