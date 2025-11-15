import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { toolGroups } from '../toolConfig';

function Sidebar() {
  const [isMinimized, setIsMinimized] = useState(
    localStorage.getItem('sidebarMinimized') === 'true'
  );
  const counterContainerRef = useRef(null);

  // Persist isMinimized ke localStorage
  useEffect(() => {
    localStorage.setItem('sidebarMinimized', isMinimized);
  }, [isMinimized]);

  // Inject GNRCounter — sekarang bereaksi terhadap isMinimized
  useEffect(() => {
    const container = counterContainerRef.current;
    const counterUrl = 'https://gnrcounter.com/counter.php?accId=f4cdd2f47d0878be22ec2c9252b1ea67';
    let fallbackTimeout;

    // Jika sidebar diminimize, jangan render counter — tapi tetap bersihkan
    if (!container || isMinimized) {
      if (container) container.innerHTML = '';
      return () => {
        if (container) container.innerHTML = '';
        clearTimeout(fallbackTimeout);
      };
    }

    // Bersihkan dulu
    container.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '180px';
    iframe.style.border = '0';
    iframe.style.overflow = 'hidden';
    iframe.setAttribute('aria-hidden', 'true');

    iframe.srcdoc = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width,initial-scale=1"/>
          <style>body{margin:0;padding:0;display:flex;align-items:center;justify-content:center;}</style>
        </head>
        <body>
          <div id="counter-root"></div>
          <script src="${counterUrl}"></script>
          <noscript>
            <div style="font-size:12px;padding:6px;text-align:center;">Enable JavaScript to see the counter.</div>
          </noscript>
        </body>
      </html>
    `;

    container.appendChild(iframe);

    fallbackTimeout = setTimeout(() => {
      if (container && container.childElementCount === 0) {
        container.innerHTML = '<div style="font-size:12px;text-align:center;">Counter gagal dimuat — cek adblock / CSP.</div>';
      }
    }, 2500);

    iframe.addEventListener('error', () => {
      clearTimeout(fallbackTimeout);
      if (container) container.innerHTML = '<div style="font-size:12px;text-align:center;">Counter gagal dimuat (blocked).</div>';
    });

    return () => {
      clearTimeout(fallbackTimeout);
      if (container) container.innerHTML = '';
    };
  }, [isMinimized]); // <-- efek dijalankan ulang saat isMinimized berubah

  return (
    <aside className={`sidebar ${isMinimized ? 'minimized' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-wrapper">
          <img 
            src="/qalogo.png" 
            alt="QaTools Logo" 
            className="sidebar-logo-open" 
          />
        </div>
        <img 
          src="/qasidebar.png" 
          alt="QaTools Icon" 
          className="sidebar-logo-minimized" 
        />
      </div>

      <nav className="sidebar-nav">
        <ul>
          {toolGroups.map(group => (
            <React.Fragment key={group.title}>
              <li className="nav-group-header"><span>{group.title}</span></li>
              {group.tools.map(tool => (
                <li
                  key={tool.id}
                  className="nav-item" 
                  title={tool.name}
                >
                  <NavLink 
                    to={tool.path}
                    className={({ isActive }) => isActive ? 'active' : ''} 
                  >
                    <i className={`fas ${tool.icon} fa-fw`} />
                    <span>{tool.name}</span>
                  </NavLink>
                </li>
              ))}
            </React.Fragment>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        {/* Render counter hanya jika tidak diminimize */}
        {!isMinimized && (
          <div
            ref={counterContainerRef}
            style={{
              flex: 1,
              textAlign: "center",
              pointerEvents: "none"
            }}
          />
        )}

        <button
          id="sidebar-toggle"
          title={isMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
          onClick={() => setIsMinimized(prev => !prev)}
          style={{
            transform: isMinimized ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease'
          }}
        >
          <i className="fas fa-chevron-left" />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
