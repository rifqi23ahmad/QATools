import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
// IMPORT KOMPONEN BARU
import GlobalTimesheetManager from './components/GlobalTimesheetManager';

function App() {
  return (
    <div className={`app-layout`}> 
      {/* PASANG MANAGER DISINI */}
      <GlobalTimesheetManager />
      
      <Sidebar /> 
      
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default App;