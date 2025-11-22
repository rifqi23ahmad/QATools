import React, { useState, useEffect, useCallback } from 'react';
import ToolHeader from '../components/ToolHeader';
import ReusableAceEditor from '../components/ReusableAceEditor';
import styles from './ColumnToComma.module.css';

function ColumnToComma() {
  const [columnInput, setColumnInput] = useState('');
  const [listOutput, setListOutput] = useState('');
  
  // --- Configuration State ---
  const [delimiter, setDelimiter] = useState(',');
  const [customDelimiter, setCustomDelimiter] = useState(';');
  const [quoteType, setQuoteType] = useState('none'); 
  const [sortMode, setSortMode] = useState('none'); // none, asc, desc
  
  // --- New Features State ---
  const [isUnique, setIsUnique] = useState(false);             // Remove duplicates
  const [isLowercase, setIsLowercase] = useState(false);       // Lowercase list
  const [isReversed, setIsReversed] = useState(false);         // Reverse list
  const [removeExtraSpaces, setRemoveExtraSpaces] = useState(true); // Remove extra spaces
  const [removeAllWhitespace, setRemoveAllWhitespace] = useState(false); // Remove all whitespace
  const [removeParagraphBreaks, setRemoveParagraphBreaks] = useState(true); // Remove Paragraph Breaks (Empty lines)

  // Melacak input mana yang terakhir diedit
  const [lastEdited, setLastEdited] = useState('column'); 

  // --- LOGIC CORE ---
  const processConversion = useCallback(() => {
    let sourceText = lastEdited === 'column' ? columnInput : listOutput;
    if (typeof sourceText !== 'string') return;

    // 1. Tentukan separator awal
    const activeDelimiter = delimiter === 'custom' ? customDelimiter : delimiter;
    // Jika input column: split by newline. Jika list: split by delimiter.
    const splitRegex = lastEdited === 'column' ? /\r?\n/ : activeDelimiter;

    let items = sourceText.split(splitRegex);

    // 2. Lowercase (Fitur Baru)
    if (isLowercase) {
        items = items.map(i => i.toLowerCase());
    }

    // 3. Whitespace Handling
    if (removeAllWhitespace) {
        // Hapus SEMUA spasi
        items = items.map(i => i.replace(/\s/g, ''));
    } else if (removeExtraSpaces) {
        // Hapus spasi berlebih (di tengah) dan trim
        items = items.map(i => i.replace(/\s+/g, ' ').trim());
    } else {
        // Minimal trim kiri kanan agar rapi
        items = items.map(i => i.trim());
    }

    // 4. Hapus Paragraph Breaks (Baris Kosong)
    if (removeParagraphBreaks) {
        items = items.filter(i => i !== '');
    }

    // 5. Hapus Duplikat
    if (isUnique) {
        items = [...new Set(items)];
    }

    // 6. Sorting
    if (sortMode === 'asc') items.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (sortMode === 'desc') items.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

    // 7. Reverse List (Fitur Baru)
    // Dilakukan setelah sort agar bisa membalikkan hasil sort atau membalikkan input asli
    if (isReversed) {
        items.reverse();
    }

    // 8. Clean Quotes dari input lama (jika List -> Column)
    if (lastEdited === 'list') {
       items = items.map(i => i.replace(/^['"]|['"]$/g, ''));
    }

    // 9. Add Quotes (Hanya Column -> List)
    if (lastEdited === 'column') {
      if (quoteType === 'single') items = items.map(i => `'${i}'`);
      if (quoteType === 'double') items = items.map(i => `"${i}"`);
    }

    // 10. Join Output
    if (lastEdited === 'column') {
      // Column -> List
      setListOutput(items.join(activeDelimiter + (activeDelimiter.trim() ? ' ' : ''))); 
    } else {
      // List -> Column
      setColumnInput(items.join('\n'));
    }

  }, [
    columnInput, listOutput, lastEdited, 
    delimiter, customDelimiter, quoteType, sortMode, 
    isUnique, isLowercase, isReversed, removeExtraSpaces, removeAllWhitespace, removeParagraphBreaks
  ]);

  // Trigger proses saat opsi berubah
  useEffect(() => {
    processConversion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delimiter, customDelimiter, quoteType, sortMode, isUnique, isLowercase, isReversed, removeExtraSpaces, removeAllWhitespace, removeParagraphBreaks]);

  // Handler Input Manual (Debounced manual trigger via useEffect di bawah)
  const handleColumnChange = (val) => {
    setColumnInput(val);
    setLastEdited('column');
  };

  const handleListChange = (val) => {
    setListOutput(val);
    setLastEdited('list');
  };

  // Debounce effect untuk trigger konversi saat mengetik
  useEffect(() => {
    const timer = setTimeout(() => {
      processConversion();
    }, 300);
    return () => clearTimeout(timer);
  }, [columnInput, listOutput, lastEdited]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const clearAll = () => {
    setColumnInput('');
    setListOutput('');
  };

  return (
    <div>
      <ToolHeader 
        title="Column to Comma Separated List" 
        description="Konversi kolom data ke format array/SQL dan sebaliknya dengan opsi lengkap." 
      />

      <div className={styles.container}>
        {/* --- PANEL KONTROL --- */}
        <div className={styles.controls}>
          
          {/* Baris Atas: Dropdowns */}
          <div className={styles.mainSettings}>
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Delimiter</label>
              <div className="flex" style={{ gap: '0.5rem' }}>
                <select 
                  className="select" 
                  value={delimiter} 
                  onChange={(e) => setDelimiter(e.target.value)}
                  style={{ minWidth: '120px' }}
                >
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="|">Pipe (|)</option>
                  <option value=" ">Space ( )</option>
                  <option value="custom">Custom</option>
                </select>
                {delimiter === 'custom' && (
                  <input 
                    type="text" 
                    className="input" 
                    value={customDelimiter} 
                    onChange={(e) => setCustomDelimiter(e.target.value)}
                    style={{ width: '60px', textAlign: 'center' }}
                  />
                )}
              </div>
            </div>

            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Quote Items</label>
              <select className="select" value={quoteType} onChange={(e) => setQuoteType(e.target.value)}>
                <option value="none">None</option>
                <option value="single">Single Quote (')</option>
                <option value="double">Double Quote (")</option>
              </select>
            </div>

            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Sort Order</label>
              <select className="select" value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
                <option value="none">Original</option>
                <option value="asc">A - Z (Ascending)</option>
                <option value="desc">Z - A (Descending)</option>
              </select>
            </div>
            
            <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
               <button className="button secondary" onClick={clearAll} style={{color: '#e53e3e', borderColor: '#fed7d7', background: '#fff5f5'}}>
                  <i className="fas fa-trash-alt" style={{marginRight:'6px'}}></i> Reset
               </button>
            </div>
          </div>

          {/* Baris Bawah: Checkboxes (Fitur Baru Ditambahkan) */}
          <div>
            <label className={styles.controlLabel} style={{marginBottom:'0.75rem', display:'block'}}>Opsi Pemrosesan</label>
            <div className={styles.optionsGrid}>
              
              {/* 1. Remove Duplicates */}
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={isUnique} onChange={(e) => setIsUnique(e.target.checked)} />
                <span>Remove Duplicates</span>
              </label>

              {/* 2. Lowercase List (BARU) */}
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={isLowercase} onChange={(e) => setIsLowercase(e.target.checked)} />
                <span>Lowercase List</span>
              </label>

              {/* 3. Reverse List (BARU) */}
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={isReversed} onChange={(e) => setIsReversed(e.target.checked)} />
                <span>Reverse List</span>
              </label>

              {/* 4. Remove Paragraph Breaks (BARU - menggantikan logika implisit) */}
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={removeParagraphBreaks} onChange={(e) => setRemoveParagraphBreaks(e.target.checked)} />
                <span>Remove Paragraph Breaks</span>
              </label>

              {/* 5. Remove Extra Spaces (Diperbarui) */}
              <label className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  checked={removeExtraSpaces} 
                  onChange={(e) => {
                    setRemoveExtraSpaces(e.target.checked);
                    if(e.target.checked) setRemoveAllWhitespace(false); // Mutually exclusive
                  }} 
                />
                <span>Remove Extra Spaces</span>
              </label>

              {/* 6. Remove All Whitespace (BARU) */}
              <label className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  checked={removeAllWhitespace} 
                  onChange={(e) => {
                    setRemoveAllWhitespace(e.target.checked);
                    if(e.target.checked) setRemoveExtraSpaces(false); // Mutually exclusive
                  }} 
                />
                <span>Remove All Whitespace</span>
              </label>

            </div>
          </div>
        </div>

        {/* --- EDITOR AREA --- */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
            
            {/* LEFT: COLUMN INPUT */}
            <div>
              <div className={styles.actionHeader}>
                <label className="label">📂 Column Data (Input)</label>
                <button className="button text-only" onClick={() => copyToClipboard(columnInput)} style={{fontSize: '0.8rem'}}>
                  <i className="fas fa-copy"></i> Copy
                </button>
              </div>
              <ReusableAceEditor
                mode="text"
                theme="textmate"
                value={columnInput}
                onChange={handleColumnChange}
                name="column-input"
                height="400px"
                placeholder={`Tempel data kolom di sini...\nContoh:\nApple\nBanana\nCherry`}
                width="100%"
                showGutter={true}
                wrapEnabled={true}
              />
              <div className={styles.stats}>
                {columnInput.split(/\r?\n/).filter(x => x).length} items
              </div>
            </div>

            {/* RIGHT: LIST OUTPUT */}
            <div>
              <div className={styles.actionHeader}>
                <label className="label">📝 Delimited List (Output)</label>
                <button className="button text-only" onClick={() => copyToClipboard(listOutput)} style={{fontSize: '0.8rem'}}>
                  <i className="fas fa-copy"></i> Copy
                </button>
              </div>
              <ReusableAceEditor
                mode="text"
                theme="textmate"
                value={listOutput}
                onChange={handleListChange}
                name="list-output"
                height="400px"
                placeholder={`Hasil akan muncul di sini...\nContoh: Apple, Banana, Cherry`}
                width="100%"
                showGutter={false}
                wrapEnabled={true}
              />
              <div className={styles.stats}>
                {listOutput.length} characters
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default ColumnToComma;