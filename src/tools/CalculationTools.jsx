import React, { useState, useEffect, useRef } from 'react';
import ToolHeader from '../components/ToolHeader';
import AgeCalculator from './AgeCalculator';
import CharacterCounter from './CharacterCounter';
import PercentageCalculator from './PercentageCalculator';
import StandardCalculator from './StandardCalculator';

// --- PERUBAHAN DI SINI: Impor CSS Module ---
import styles from './CalculationTools.module.css';

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
  const [toolOrder, setToolOrder] = useState(() => {
    try {
      const savedOrder = localStorage.getItem(LS_KEY);
      if (savedOrder) {
        const parsedOrder = JSON.parse(savedOrder);
        const allKeys = Object.keys(toolInfoMap);
        if (parsedOrder.length === allKeys.length && parsedOrder.every(key => allKeys.includes(key))) {
          return parsedOrder;
        }
      }
    } catch (e) {
      console.error("Gagal mem-parse urutan tersimpan:", e);
    }
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
  };

  const handleDragOver = (e, id) => {
    e.preventDefault(); 
    if (id !== draggedItemId) {
      setDragOverItemId(id);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOverItemId(null);
  };

  const handleDrop = (e, dropId) => {
    e.preventDefault();
    if (draggedItemId === dropId) return; 

    const draggedIndex = toolOrder.indexOf(draggedItemId);
    const dropIndex = toolOrder.indexOf(dropId);

    const newOrder = [...toolOrder];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedItem);

    setToolOrder(newOrder);
    
    // Reset state DnD setelah drop
    setDraggedItemId(null);
    setDragOverItemId(null);
  };

  const handleDragEnd = (e) => {
    setDraggedItemId(null);
    setDragOverItemId(null);
  };

  return (
    <div>
      <ToolHeader 
        title="Kalkulasi"
        description="Kumpulan alat hitung untuk berbagai keperluan. (Anda bisa drag-and-drop kartu untuk mengubah urutan)"
      />

      <div className="grid grid-cols-1 lg-grid-cols-2" style={{ gap: '1.5rem', alignItems: 'stretch' }}>
        
        {toolOrder.map(id => {
          const tool = toolInfoMap[id];
          if (!tool) return null; 

          const isDragOver = dragOverItemId === tool.id;
          // Tentukan kelas secara dinamis
          const cardClasses = [
            'card',
            styles.draggableCard,
            isDragOver ? styles.dragOver : '',
            draggedItemId === tool.id ? styles.dragging : ''
          ].join(' ');

          return (
            <div 
              key={tool.id}
              draggable="true" 
              onDragStart={(e) => handleDragStart(e, tool.id)}
              onDragOver={(e) => handleDragOver(e, tool.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, tool.id)}
              onDragEnd={handleDragEnd}
              className={cardClasses} // Gunakan className dinamis
            >
              <h2 className={styles.calculationToolTitle}>
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