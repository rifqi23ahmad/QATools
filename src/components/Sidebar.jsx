import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toolGroups } from '../toolConfig';

function Sidebar() {
  const [isMinimized, setIsMinimized] = useState(
    localStorage.getItem('sidebarMinimized') === 'true'
  );
  const counterContainerRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', isMinimized);
  }, [isMinimized]);

  // --- PERBAIKAN DI SINI ---
  useEffect(() => {
    const container = counterContainerRef.current;
    if (!container) return; 

    let fallbackTimeout;

    if (isMinimized) {
      container.innerHTML = '';
      return; 
    }

    container.innerHTML = '';
    const iframe = document.createElement('iframe');
    
    // 1. Tambahkan tinggi iframe
    iframe.style.width = '100%';
    iframe.style.height = '150px'; // <-- DIUBAH DARI 105px
    iframe.style.border = '0';
    iframe.style.overflow = 'hidden';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('scrolling', 'no'); 

    // Konten srcdoc (tidak berubah dari sebelumnya)
    iframe.srcdoc = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width,initial-scale=1"/>
          <style>
            body { 
              margin: 0; 
              padding: 0.5rem 0 0 1rem; 
              display: flex; 
              flex-direction: column; 
              align-items: flex-start; 
              justify-content: flex-start; 
              background-color: #1a202c; 
              gap: 4px;
            }
            .counterapi {
              min-height: 28px !important;
            }
            .counterapi a, 
            .counterapi a:visited {
              text-decoration: none !important;
              pointer-events: none !important;
              cursor: default !important;
            }
          </style>
        </head>
        <body>
          
          <div 
            class="counterapi" 
            color="#a0aec0"
            iconColor="#4299e1"
            bg="transparent"
            ns="qah-tools-v1"
            label="views"
            abbreviate="true"
          ></div>

          <div 
            class="counterapi" 
            color="#a0aec0"
            iconColor="#48bb78"
            bg="transparent"
            ns="qah-tools-v1-visits"
            label="visits"
            abbreviate="true"
          ></div>

          <div 
            class="counterapi" 
            color="#a0aec0"
            iconColor="#ecc94b"
            bg="transparent"
            ns="qah-tools-v1-online"
            label="online"
            abbreviate="true"
          ></div>
          
          <script src="https://counterapi.com/c.js" async></script>
          
          <noscript>
            <div style="font-size:12px;padding:6px;text-align:left;color:#a0aec0;">
              Enable JavaScript to see the counter.
            </div>
          </noscript>
        </body>
      </html>
    `;

    container.appendChild(iframe);

    // Fallback dan error handling (Tidak berubah)
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
  }, [isMinimized]); 
  // --- AKHIR BLOK useEffect ---

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
              {group.tools.map(tool => {
                const isActive = location.pathname === tool.path;
                return (
                  <li
                    key={tool.id}
                    className="nav-item" 
                    title={tool.name} 
                  >
                    <div 
                      role="link"
                      tabIndex="0"
                      className={`nav-link-custom ${isActive ? 'active' : ''}`}
                      onClick={() => navigate(tool.path)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(tool.path)}
                    >
                      <i className={`fas ${tool.icon} fa-fw`} />
                      <span>{tool.name}</span>
                    </div>
                  </li>
                );
              })}
            </React.Fragment>
          ))}
        </ul>
      </nav>
      <div className="sidebar-footer">
        
        {/* --- PERBAIKAN DI SINI --- */}
        {!isMinimized && (
          <div
            ref={counterContainerRef}
            style={{
              flex: 1, 
              minHeight: '110px' // <-- DIUBAH DARI 105px
            }}
          />
        )}
        {/* --- AKHIR PERBAIKAN --- */}

        {/* Tombol Sidebar Toggle */}
        <button
          id="sidebar-toggle"
          title={isMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
          onClick={() => setIsMinimized(prev => !prev)}
          style={{
            transform: isMinimized ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
            marginLeft: isMinimized ? '0' : '0', 
            backgroundColor: 'var(--sidebar-active-bg)',
            color: 'var(--sidebar-text)',
            alignSelf: 'center' 
          }}
        >
          <i className="fas fa-chevron-left" />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;