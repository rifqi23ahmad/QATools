import React, { useState, useEffect, useRef } from 'react';

// Daftar semua tool Anda, diambil dari index.html
const toolGroups = [
  {
    title: 'JSON Tools',
    tools: [
      { id: 'JsonFormatter', name: 'JSON Formatter', icon: 'fa-code' },
      { id: 'JsonCompare', name: 'JSON Compare', icon: 'fa-exchange-alt' },
      { id: 'JsonValueExtractor', name: 'JSON Value Extractor', icon: 'fa-search-dollar' },
    ]
  },
  {
    title: 'SQL & Data Tools',
    tools: [
      { id: 'DataCompare', name: 'Data Compare', icon: 'fa-table-list' },
      { id: 'SqlFormatter', name: 'SQL Formatter', icon: 'fa-database' },
      { id: 'SqlInjector', name: 'SQL Injector', icon: 'fa-syringe' },
      { id: 'SqlScriptGeneratorOtomatis', name: 'SQL Gen (Otomatis)', icon: 'fa-magic' },
      { id: 'ArchiveFileFinder', name: 'Archive Finder', icon: 'fa-file-archive' },
      { id: 'ApiRequestor', name: 'API Requestor', icon: 'fa-paper-plane' },
      { id: 'SqlScriptGenerator', name: 'SQL Gen (Manual)', icon: 'fa-file-code' },
    ]
  },
  {
    title: 'File & Document Tools',
    tools: [
      { id: 'FileSplitter', name: 'File Splitter', icon: 'fa-file-zipper' },
      { id: 'WordingCompare', name: 'Doc Compare', icon: 'fa-file-alt' },
      { id: 'ImageCompare', name: 'Image Compare', icon: 'fa-images' },
      { id: 'DummyImageGenerator', name: 'Dummy File Gen', icon: 'fa-file-image' },
      { id: 'BranchDataProcessor', name: 'Branch Data Processor', icon: 'fa-file-excel' },
    ]
  }
];

function Sidebar({ activeTool, setActiveTool }) {
  const [isMinimized, setIsMinimized] = useState(
    localStorage.getItem('sidebarMinimized') === 'true'
  );
  const counterContainerRef = useRef(null);

  // Persist isMinimized ke localStorage
  useEffect(() => {
    localStorage.setItem('sidebarMinimized', isMinimized);
  }, [isMinimized]);

  // Inject GNRCounter using an iframe for robustness
  useEffect(() => {
    const container = counterContainerRef.current;
    const counterUrl = 'https://gnrcounter.com/counter.php?accId=f4cdd2f47d0878be22ec2c9252b1ea67';

    if (!container) {
      console.warn('[Sidebar] counter container not found');
      return;
    }

    // Clear any previous content
    container.innerHTML = '';

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '180px'; // /* --- PERBAIKAN 1: Diberi tinggi lebih agar tidak terpotong --- */
    iframe.style.border = '0';
    iframe.style.overflow = 'hidden';
    iframe.setAttribute('aria-hidden', 'true');
    // srcdoc memuat HTML kecil yang memanggil script counter
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

    // Append iframe
    container.appendChild(iframe);

    // Fallback (tidak berubah)
    const fallbackTimeout = setTimeout(() => {
      if (container && container.childElementCount === 0) {
        container.innerHTML = '<div style="font-size:12px;text-align:center;">Counter gagal dimuat — cek adblock / CSP.</div>';
      }
    }, 2500);

    iframe.addEventListener('error', () => {
      clearTimeout(fallbackTimeout);
      container.innerHTML = '<div style="font-size:12px;text-align:center;">Counter gagal dimuat (blocked).</div>';
    });

    // Cleanup
    return () => {
      clearTimeout(fallbackTimeout);
      if (container) container.innerHTML = '';
    };
  }, []); // jalankan sekali saat mount

  // Prevent default on anchor clicks to avoid page jump/refresh
  const handleNavClick = (e, toolId) => {
    e.preventDefault();
    setActiveTool(toolId);
  };

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
                  className={`nav-item ${activeTool === tool.id ? 'active' : ''}`}
                  onClick={() => setActiveTool(tool.id)}
                  title={tool.name}
                >
                  <a href="#" onClick={(e) => handleNavClick(e, tool.id)}>
                    <i className={`fas ${tool.icon} fa-fw`} />
                    <span>{tool.name}</span>
                  </a>
                </li>
              ))}
            </React.Fragment>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        {/* Counter container untuk GNRCounter */}
        <div
          ref={counterContainerRef}
          style={{
            flex: 1, /* --- PERBAIKAN 2: Mengganti 'width: 100%' --- */
            textAlign: "center",
            /* --- PERBAIKAN 3: Menghapus 'marginBottom: "10px"' --- */
            pointerEvents: "none"
          }}
        />

        <button
          id="sidebar-toggle"
          title={isMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
          onClick={() => setIsMinimized(!isMinimized)}
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