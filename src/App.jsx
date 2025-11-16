import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';

function App() {
  // Semua logika Dark Mode telah dihapus

  return (
    // Class 'dark-mode' dihapus dari div utama
    <div className={`app-layout`}> 
      {/* Props isDarkMode dan toggleTheme dihapus */}
      <Sidebar /> 
      
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default App;