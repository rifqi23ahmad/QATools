import React, { useState, useEffect, useRef } from 'react';

function ImageCompare() {
  const [image1Data, setImage1Data] = useState(null);
  const [image2Data, setImage2Data] = useState(null);
  const [activeImageKey, setActiveImageKey] = useState(null); // 'img1' or 'img2'
  const [transforms, setTransforms] = useState({
    img1: { scale: 1, panX: 0, panY: 0, opacity: 1 },
    img2: { scale: 1, panX: 0, panY: 0, opacity: 0.5 }
  });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [statusMessage, setStatusMessage] = useState('Tempel (Ctrl+V) atau seret & jatuhkan gambar untuk memulai.');

  const comparisonViewRef = useRef(null);

  // Fungsi untuk memuat gambar
  const loadImage = (file, imageNum) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target.result;
      if (imageNum === 1) setImage1Data(result);
      else setImage2Data(result);
      
      // Reset transforms dan set gambar 2 sebagai aktif
      resetTransforms();
      setActiveImageKey('img2');
      setStatusMessage('Gambar siap! Gunakan kontrol untuk membandingkan.');
    };
    reader.readAsDataURL(file);
  };

  // --- Event Handlers untuk Upload ---

  const handlePaste = (e) => {
        
    const items = (e.clipboardData || window.clipboardData).items;
    for (const item of items) {
      if (item.type.includes('image')) {
        const blob = item.getAsFile();
        if (!image1Data) loadImage(blob, 1);
        else if (!image2Data) loadImage(blob, 2);
        break;
      }
    }
  };

  const handleDrop = (e, imageNum) => {
    e.preventDefault();
    e.target.style.borderColor = 'var(--card-border)';
    const file = e.dataTransfer.files[0];
    if (file) loadImage(file, imageNum);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.target.style.borderColor = 'var(--primary-color)';
  };

  // --- Effect untuk Event Listeners Global ---

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    
    const handleMouseMove = (e) => {
      if (!isDragging || !activeImageKey) return;
      e.preventDefault();
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      
      setLastMousePos({ x: e.clientX, y: e.clientY });
      setTransforms(prev => ({
        ...prev,
        [activeImageKey]: {
          ...prev[activeImageKey],
          panX: prev[activeImageKey].panX + dx,
          panY: prev[activeImageKey].panY + dy,
        }
      }));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (comparisonViewRef.current) comparisonViewRef.current.style.cursor = 'grab';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('paste', handlePaste);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, activeImageKey, lastMousePos]);

  // --- Kontrol Transformasi ---

  const applyTransforms = (key, newTransform) => {
    setTransforms(prev => ({
      ...prev,
      [key]: newTransform
    }));
  };

  const handleWheel = (e) => {
    if (!activeImageKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const t = transforms[activeImageKey];
    applyTransforms(activeImageKey, {
      ...t,
      scale: Math.max(0.2, Math.min(5, t.scale + delta))
    });
  };

  const handleMouseDown = (e) => {
    if (!activeImageKey) return;
    e.preventDefault();
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    e.target.style.cursor = 'grabbing';
  };

  const handleKeyDown = (e) => {
    if (!activeImageKey) return;
    const t = transforms[activeImageKey];
    const step = e.shiftKey ? 10 : 2;
    let newTransform = { ...t };
    
    switch (e.key) {
      case 'ArrowUp': newTransform.panY -= step; break;
      case 'ArrowDown': newTransform.panY += step; break;
      case 'ArrowLeft': newTransform.panX -= step; break;
      case 'ArrowRight': newTransform.panX += step; break;
      default: return; // Jangan cegah tombol lain
    }
    e.preventDefault();
    applyTransforms(activeImageKey, newTransform);
  };
  
  const handleSlider = (e) => {
    if (!activeImageKey) return;
    const t = transforms[activeImageKey];
    applyTransforms(activeImageKey, {
      ...t,
      opacity: e.target.value / 100
    });
  };

  const resetTransforms = () => {
    setTransforms({
      img1: { scale: 1, panX: 0, panY: 0, opacity: 1 },
      img2: { scale: 1, panX: 0, panY: 0, opacity: 0.5 }
    });
  };

  const clearAll = () => {
    setImage1Data(null);
    setImage2Data(null);
    setActiveImageKey(null);
    resetTransforms();
    setStatusMessage('Tempel (Ctrl+V) atau seret & jatuhkan gambar untuk memulai.');
  };

  // --- Helper Render ---
  const t1 = transforms.img1;
  const t2 = transforms.img2;
  const activeTransform = activeImageKey ? transforms[activeImageKey] : {};
  const showComparison = image1Data && image2Data;

  return (
    <div>
      <div className="tool-header">
        <h1>Image Compare</h1>
        <p>Klik kotak di bawah untuk memilih gambar aktif, lalu gunakan mouse untuk zoom dan geser.</p>
      </div>
      <div className="card">
        <div id="image-compare-status" style={{ padding: '1rem', backgroundColor: '#ebf8ff', color: '#3182ce', borderRadius: '6px', marginBottom: '1.5rem', textAlign: 'center' }}>
          {statusMessage}
        </div>
        <div className="grid grid-cols-2">
          {/* Box 1 */}
          <div 
            id="image1-box" 
            className={`image-upload-box ${activeImageKey === 'img1' ? 'active-control' : ''}`}
            onClick={() => { if(image1Data) setActiveImageKey('img1') }}
            onDrop={(e) => handleDrop(e, 1)}
            onDragOver={handleDragOver}
            onDragLeave={(e) => e.target.style.borderColor = 'var(--card-border)'}
          >
            <h3>Gambar 1 (Dasar)</h3>
            <div className="upload-area" style={{ display: image1Data ? 'none' : 'block' }}><p>Tempel atau seret file</p></div>
            {image1Data && <img src={image1Data} style={{ maxWidth: '100%', height: 'auto', maxHeight: 250 }} />}
          </div>
          {/* Box 2 */}
          <div 
            id="image2-box" 
            className={`image-upload-box ${activeImageKey === 'img2' ? 'active-control' : ''}`}
            onClick={() => { if(image2Data) setActiveImageKey('img2') }}
            onDrop={(e) => handleDrop(e, 2)}
            onDragOver={handleDragOver}
            onDragLeave={(e) => e.target.style.borderColor = 'var(--card-border)'}
          >
            <h3>Gambar 2 (Overlay)</h3>
            <div className="upload-area" style={{ display: image2Data ? 'none' : 'block' }}><p>Tempel atau seret file</p></div>
            {image2Data && <img src={image2Data} style={{ maxWidth: '100%', height: 'auto', maxHeight: 250 }} />}
          </div>
        </div>
      </div>
      
      {showComparison && (
        <div className="card" id="comparison-section" style={{ marginTop: '1.5rem' }}>
          <div className="grid" style={{ gridTemplateColumns: '3fr 1fr', alignItems: 'start' }}>
            <div 
              className="image-comparison-view" 
              style={{ overflow: 'hidden', cursor: 'grab' }} 
              tabIndex="0"
              ref={comparisonViewRef}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onKeyDown={handleKeyDown}
            >
              <img 
                id="comparison-image1" 
                className="comparison-image" 
                src={image1Data}
                style={{
                  transform: `translate(calc(-50% + ${t1.panX}px), calc(-50% + ${t1.panY}px)) scale(${t1.scale})`,
                  opacity: t1.opacity
                }}
              />
              <img 
                id="comparison-image2" 
                className="comparison-image" 
                src={image2Data}
                style={{
                  transform: `translate(calc(-50% + ${t2.panX}px), calc(-50% + ${t2.panY}px)) scale(${t2.scale})`,
                  opacity: t2.opacity
                }}
              />
            </div>
            <div className="controls-sidebar">
              <h3>Kontrol</h3>
              <div className="control-group" style={{ marginTop: '1rem' }}>
                <label>Transparansi Gbr. Aktif: <span id="transparency-label">{Math.round((activeTransform.opacity || 0) * 100)}%</span></label>
                <input 
                  type="range" 
                  id="transparency-slider" 
                  min="0" max="100" 
                  value={(activeTransform.opacity || 0) * 100}
                  onChange={handleSlider}
                  className="slider" 
                />
              </div>
               <div className="control-group" style={{ marginTop: '1rem' }}>
                <label>Zoom Gbr. Aktif: <span id="zoom-label">{Math.round((activeTransform.scale || 0) * 100)}%</span></label>
              </div>
              <hr />
              <p style={{ fontSize: '0.85rem' }}>
                <b>Klik kotak atas</b> untuk pilih gambar.<br />
                <b>Drag</b> untuk geser.<br />
                <b>Scroll</b> untuk zoom.<br />
                <b>Tombol Panah</b> untuk geser presisi.
              </p>
              <hr />
              <div className="flex" style={{ gap: '0.5rem' }}>
                <button className="button secondary" id="reset-btn" onClick={resetTransforms}>Reset</button>
                <button className="button" style={{ backgroundColor: '#e53e3e', color: 'white' }} id="clear-all-btn" onClick={clearAll}>Hapus Semua</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageCompare;