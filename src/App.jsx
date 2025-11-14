import React, { useState } from 'react';
import Sidebar from './components/Sidebar';

// 1. Impor SEMUA 15 tool
import SqlFormatter from './tools/SQLNumberFormatter';
import JsonValueExtractor from './tools/JSONValueExtractor';
import DataCompare from './tools/DataCompare';
import JsonCompare from './tools/JSONCompare';
import BranchDataProcessor from './tools/BranchDataProcessor';
import ApiRequestor from './tools/ApiRequestor';
import FileSplitter from './tools/FileSplitter';
import SqlInjector from './tools/SqlInjector';
import JsonFormatter from './tools/JSONFormatter';
import ArchiveFileFinder from './tools/ArchiveFileFinder';
import ImageCompare from './tools/ImageCompare';
import DummyImageGenerator from './tools/DummyImageGenerator';
import WordingCompare from './tools/WordingCompare';
import SqlScriptGeneratorOtomatis from './tools/SqlScriptGeneratorOtomatis';
import SqlScriptGenerator from './tools/SQLScriptGenerator'; // <-- TAMBAHKAN INI

// 2. Perbarui "peta" komponen Anda
const toolComponents = {
  // JSON Tools
  JsonFormatter: <JsonFormatter />,
  JsonCompare: <JsonCompare />,
  JsonValueExtractor: <JsonValueExtractor />,
  
  // SQL & Data Tools
  DataCompare: <DataCompare />,
  SqlFormatter: <SqlFormatter />,
  SqlInjector: <SqlInjector />,
  SqlScriptGeneratorOtomatis: <SqlScriptGeneratorOtomatis />,
  ArchiveFileFinder: <ArchiveFileFinder />,
  ApiRequestor: <ApiRequestor />,
  
  // File & Document Tools
  FileSplitter: <FileSplitter />,
  WordingCompare: <WordingCompare />,
  ImageCompare: <ImageCompare />,
  DummyImageGenerator: <DummyImageGenerator />,
  BranchDataProcessor: <BranchDataProcessor />,

  // Tool terakhir yang Anda berikan (nama di index.html tidak ada, tapi filenya ada)
  // Saya akan beri nama 'SqlScriptGenerator'
  SqlScriptGenerator: <SqlScriptGenerator />, // <-- TAMBAHKAN INI
};

// ... sisa file App.jsx ...
function App() {
  // Set default ke tool pertama dalam daftar
  const [activeTool, setActiveTool] = useState('JsonFormatter'); 

  const renderTool = () => {
    // Berikan fallback jika 'activeTool' tidak ada di peta
    // (Ini terjadi karena 'SqlScriptGenerator' tidak ada di nav asli)
    return toolComponents[activeTool] || <div>Tool '{activeTool}' tidak ditemukan.</div>;
  };

  return (
    <div className="app-layout">
      <Sidebar 
        activeTool={activeTool}
        setActiveTool={setActiveTool} 
      />
      <main className="main-content">
        {renderTool()}
      </main>
    </div>
  );
}

export default App;