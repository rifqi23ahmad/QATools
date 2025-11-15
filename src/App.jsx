import React from 'react';
import { Outlet } from 'react-router-dom'; // <-- Impor Outlet
import Sidebar from './components/Sidebar';

// Hapus semua impor tool, state, dan fungsi renderTool

function App() {
  return (
    <div className="app-layout">
      {/* Sidebar tidak lagi memerlukan props activeTool atau setActiveTool */}
      <Sidebar />
      
      {/* PERUBAHAN DI SINI */}
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Outlet adalah placeholder di mana React Router akan 
          merender komponen rute yang cocok (tool Anda).
        */}
        <Outlet />
      </main>
    </div>
  );
}

export default App;