import React, { useEffect, useRef, useState } from 'react';

// A button that opens a dropdown menu. Items are { label, onSelect, disabled }
// or { label, items: [...] } for a submenu, or { separator: true }.
// Closes on outside click, Escape or after a selection. Up/Down move focus,
// Right/Enter open a submenu and Left closes it.
export default function Menu({ label, items, disabled, className = '', align = 'left' }) {
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState(null);
  const root = useRef(null);
  const button = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => {
      if (!root.current.contains(event.target)) close(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  // Focus the first item when the menu opens.
  useEffect(() => {
    if (open) root.current.querySelector('[role="menu"] [role="menuitem"]:not(:disabled)')?.focus();
  }, [open]);

  function close(returnFocus = true) {
    setOpen(false);
    setSubmenu(null);
    if (returnFocus) button.current?.focus();
  }

  function select(item) {
    close();
    item.onSelect();
  }

  function onKeyDown(event) {
    const list = event.target.closest('[role="menu"]');
    if (!list) return;
    const entries = [...list.querySelectorAll(':scope > li > [role="menuitem"]:not(:disabled)')];
    const index = entries.indexOf(event.target);
    if (event.key === 'Escape') {
      event.preventDefault();
      if (list.dataset.sub) {
        setSubmenu(null);
        list.parentElement.querySelector('[role="menuitem"]')?.focus();
      } else close();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      entries[(index + step + entries.length) % entries.length]?.focus();
    } else if (event.key === 'ArrowLeft' && list.dataset.sub) {
      event.preventDefault();
      setSubmenu(null);
      list.parentElement.querySelector('[role="menuitem"]')?.focus();
    } else if (event.key === 'Tab') {
      close(false);
    }
  }

  function openSubmenu(index, focus) {
    setSubmenu(index);
    if (focus) {
      requestAnimationFrame(() =>
        root.current?.querySelector(`[data-sub="${index}"] [role="menuitem"]:not(:disabled)`)?.focus()
      );
    }
  }

  function renderItems(list, parent) {
    return list.map((item, index) => {
      if (item.separator) return <li key={`sep-${index}`} role="separator" className="menu-separator" />;
      if (item.items) {
        const expanded = parent === undefined && submenu === index;
        return (
          <li
            key={item.label}
            className="menu-has-sub"
            onMouseEnter={() => setSubmenu(index)}
            onMouseLeave={() => setSubmenu(null)}
          >
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={expanded}
              disabled={item.disabled}
              onClick={() => (expanded ? setSubmenu(null) : openSubmenu(index, true))}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  openSubmenu(index, true);
                }
              }}
            >
              <span>{item.label}</span>
              <span aria-hidden="true" className="menu-chevron">›</span>
            </button>
            {expanded && (
              <ul role="menu" aria-label={item.label} className="menu-list menu-sub" data-sub={index}>
                {renderItems(item.items, index)}
              </ul>
            )}
          </li>
        );
      }
      return (
        <li key={item.label}>
          <button type="button" role="menuitem" disabled={item.disabled} onClick={() => select(item)}>
            {item.label}
          </button>
        </li>
      );
    });
  }

  return (
    <div className={`menu ${className}`} ref={root} onKeyDown={onKeyDown}>
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {label} <span aria-hidden="true" className="menu-caret">▾</span>
      </button>
      {open && (
        <ul role="menu" aria-label={typeof label === 'string' ? label : undefined} className={`menu-list menu-${align}`}>
          {renderItems(items)}
        </ul>
      )}
    </div>
  );
}
