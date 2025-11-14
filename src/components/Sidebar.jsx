import React, { useState, useEffect } from 'react';

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
      // Catatan: Menambahkan SQLScriptGenerator manual yang juga ada di file Anda
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

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', isMinimized);
  }, [isMinimized]);

  return (
    <aside className={`sidebar ${isMinimized ? 'minimized' : ''}`}>
      <div className="sidebar-header">
        <img src="/qalogo.png" alt="QaTools Logo" className="sidebar-logo-open" />
        <img src="/qasidebar.png" alt="QaTools Icon" className="sidebar-logo-minimized" />
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
                  title={tool.name} // Tooltip untuk mode minimized
                >
                  <a href="#">
                    <i className={`fas ${tool.icon} fa-fw`}></i>
                    <span>{tool.name}</span>
                  </a>
                </li>
              ))}
            </React.Fragment>
          ))}
        </ul>
      </nav>
      <div className="sidebar-footer">
        {/* Anda bisa menambahkan counter di sini jika mau */}
        <button id="sidebar-toggle" title="Minimize Sidebar" onClick={() => setIsMinimized(!isMinimized)}>
          <i className="fas fa-chevron-left"></i>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;