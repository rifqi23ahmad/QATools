import React, { useState, useEffect, useRef } from 'react';
import ToolHeader from '../components/ToolHeader';
import AgeCalculator from './AgeCalculator';
import CharacterCounter from './CharacterCounter';
import StandardCalculator from './StandardCalculator';
import PercentageCalculator from './PercentageCalculator';

// Objek untuk memetakan ID ke informasi & komponen
const toolInfoMap = {
  age: { 
    id: 'age', 
    title: 'Kalkulator Umur', 
    icon: 'fa-calendar-days', 
    component: <AgeCalculator /> 
  },
  percentage: { 
    id: 'percentage', 
    title: 'Kalkulator Persentase', 
    icon: 'fa-percent', 
    component: <PercentageCalculator /> 
  },
  standard: { 
    id: 'standard', 
    title: 'Kalkulator Biasa', 
    icon: 'fa-calculator', 
    component: <StandardCalculator /> 
  },
  character: { 
    id: 'character', 
    title: 'Penghitung Karakter', 
    icon: 'fa-font', 
    component: <CharacterCounter /> 
  }
};

const LS_KEY = 'calcToolOrder';

function CalculationTools() {
  // 1. State untuk Urutan Tool
  // Membaca dari localStorage saat pertama kali load
  const [toolOrder, setToolOrder] = useState(() => {
    try {
      const savedOrder = localStorage.getItem(LS_KEY);
      if (savedOrder) {
        const parsedOrder = JSON.parse(savedOrder);
        // Validasi jika tool di masa depan berubah
        const allKeys = Object.keys(toolInfoMap);
        if (parsedOrder.length === allKeys.length && parsedOrder.every(key => allKeys.includes(key))) {
          return parsedOrder;
        }
      }
    } catch (e) {
      console.error("Gagal mem-parse urutan tersimpan:", e);
    }
    // Urutan default jika tidak ada simpanan
    return ['age', 'percentage', 'standard', 'character'];
  });

  // 2. State untuk proses Drag-and-Drop
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [dragOverItemId, setDragOverItemId] = useState(null);

  // 3. Simpan ke localStorage setiap kali urutan berubah
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(toolOrder));
  }, [toolOrder]);

  // --- Event Handlers untuk Drag-and-Drop ---

  const handleDragStart = (e, id) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Tambahkan style 'dragging' ke elemen
    e.currentTarget.classList.add('dragging');
  };

  const handleDragOver = (e, id) => {
    e.preventDefault(); // Diperlukan agar event onDrop bisa terpicu
    if (id !== draggedItemId) {
      setDragOverItemId(id);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = (e) => {
    // Hanya hapus highlight jika kita meninggalkan elemen target
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOverItemId(null);
  };

  const handleDrop = (e, dropId) => {
    e.preventDefault();
    if (draggedItemId === dropId) return; // Tidak drop di tempat yang sama

    const draggedIndex = toolOrder.indexOf(draggedItemId);
    const dropIndex = toolOrder.indexOf(dropId);

    const newOrder = [...toolOrder];
    // Ambil item yang di-drag
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    // Masukkan ke posisi drop
    newOrder.splice(dropIndex, 0, draggedItem);

    setToolOrder(newOrder);
  };

  const handleDragEnd = (e) => {
    // Hapus semua state & style DnD
    setDraggedItemId(null);
    setDragOverItemId(null);
    e.currentTarget.classList.remove('dragging');
  };

  return (
    <div>
      <ToolHeader 
        title="Kalkulasi"
        description="Kumpulan alat hitung untuk berbagai keperluan. (Anda bisa drag-and-drop kartu untuk mengubah urutan)"
      />

      <div className="grid grid-cols-1 lg-grid-cols-2" style={{ gap: '1.5rem', alignItems: 'stretch' }}>
        
        {/* Render kartu kalkulator berdasarkan state 'toolOrder' */}
        {toolOrder.map(id => {
          const tool = toolInfoMap[id];
          if (!tool) return null; // Jika ada id yang tidak valid

          // Tentukan apakah card ini adalah target drop
          const isDragOver = dragOverItemId === tool.id;

          return (
            <div 
              key={tool.id}
              draggable="true" // Aktifkan drag
              onDragStart={(e) => handleDragStart(e, tool.id)}
              onDragOver={(e) => handleDragOver(e, tool.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, tool.id)}
              onDragEnd={handleDragEnd}
              className={`card draggable-card ${isDragOver ? 'drag-over' : ''}`}
            >
              <h2 className="calculation-tool-title">
                <i className={`fas ${tool.icon}`} style={{ marginRight: '0.75rem' }}></i>
                {tool.title}
              </h2>
              <div className="calculation-tool-content">
                {tool.component}
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}

export default CalculationTools;