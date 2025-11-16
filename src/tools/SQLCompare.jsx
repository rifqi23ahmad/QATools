import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReusableAceEditor from '../components/ReusableAceEditor'; // Diperlukan untuk editor
import CompareResultView from '../components/CompareResultView.jsx';
import compareStyles from './CompareView.module.css';

// Helper untuk membersihkan dan menormalkan SQL sebelum diff.
function normalizeSql(sql) {
    if (!sql) return '';
    // ... (fungsi normalizeSql tidak berubah) ...
    let cleaned = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    cleaned = cleaned.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/; /g, ';\n').replace(/, /g, ',\n');
    cleaned = cleaned.replace(/FROM|WHERE|JOIN|SELECT|INSERT|UPDATE|DELETE|SET|VALUES|AND|OR|GROUP BY|ORDER BY/gi, '\n$& ');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
}

// --- FUNGSI MINIFY SQL (Tidak berubah) ---
function minifySql(sql) {
    if (!sql) return '';
    return sql.replace(/--.*$/gm, '') // Hapus komentar single-line
              .replace(/\/\*[\s\S]*?\*\//g, '') // Hapus komentar multi-line
              .replace(/[\r\n\t]/g, ' ') // Ganti newline/tab dengan spasi
              .replace(/\s+/g, ' ') // Ganti spasi berlebih
              .trim();
}

// --- Helper Parser (Tidak berubah) ---
function parseSqlValues(valueStr) {
  // ... (fungsi parseSqlValues tidak berubah) ...
  const values = []; let currentVal = ''; let inString = false; let pLevel = 0; let strDelim = '';
  for (let i = 0; i < valueStr.length; i++) {
    const char = valueStr[i];
    if (inString) {
      if (char === strDelim) { if (i + 1 < valueStr.length && valueStr[i+1] === strDelim) { currentVal += char + char; i++; } else { inString = false; currentVal += char; } }
      else { currentVal += char; }
    } else {
      if (char === "'" || char === '"') { inString = true; strDelim = char; currentVal += char; } 
      else if (char === '(') { pLevel++; currentVal += char; } 
      else if (char === ')') { pLevel--; currentVal += char; } 
      else if (char === ',' && pLevel === 0) { values.push(currentVal.trim()); currentVal = ''; } 
      else { currentVal += char; }
    }
  }
  values.push(currentVal.trim());
  return values.map(v => v.trim()).filter(v => v);
}

// --- FUNGSI BEAUTIFY SQL (Tidak berubah) ---
function beautifySql(sql) {
    // ... (fungsi beautifySql tidak berubah) ...
    if (!sql) return '';
    let cleaned = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    cleaned = cleaned.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
    const insertMatch = cleaned.match(/^(INSERT INTO\s+.*?\s*\()([\s\S]+?)(\)\s*VALUES\s*\()([\s\S]+?)(\)\s*;?)$/i);
    if (insertMatch) {
        try {
            const intro = insertMatch[1];
            let cols = insertMatch[2];
            const mid = insertMatch[3];
            let vals = insertMatch[4];
            const end = insertMatch[5];
            const formattedCols = cols.split(',')
                                     .map(c => c.trim())
                                     .filter(c => c)
                                     .join(',\n  ');
            const parsedVals = parseSqlValues(vals);
            const formattedVals = parsedVals.join(',\n  ');
            cleaned = `${intro}\n  ${formattedCols}\n${mid}\n  ${formattedVals}\n${end}`;
            return cleaned.replace(/\s*\n\s*/g, '\n').trim();
        } catch (e) {
           console.warn("Gagal parsing INSERT, menggunakan fallback formatter:", e);
        }
    }
    cleaned = cleaned.replace(/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|VALUES|SET|LEFT JOIN|RIGHT JOIN|INNER JOIN|ON|UPDATE|INSERT INTO|DELETE FROM)\b/gi, '\n$&');
    cleaned = cleaned.replace(/, /g, ',\n  ');
    cleaned = cleaned.replace(/\b(AND|OR)\b/gi, '\n  $&');
    cleaned = cleaned.replace(/\s*\n\s*/g, '\n').trim();
    return cleaned;
}

// --- Helper untuk Diff (Sama seperti JSONCompare) ---
const escapeHtml = (text) => text ? text.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

// --- PERUBAHAN 2: Update createLineHtml untuk menggunakan CSS Modules ---
const createLineHtml = (pane, lineNumber, content, type, isPreformatted = false) => {
  const finalContent = isPreformatted ? content : escapeHtml(content);
  // Gunakan kelas dari CSS Module
  const typeClass = compareStyles[type] || ''; 
  return `<div class="${compareStyles.diffLine} ${typeClass}" id="diff-${pane}-line-${lineNumber}">` +
         `<div class="${compareStyles.lineNumber}">${lineNumber}</div>` +
         `<div class="${compareStyles.lineContent}">${finalContent || '&nbsp;'}</div>` +
         `</div>`;
};
// --- Akhir Helper Diff ---


function SqlCompare() {
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  
  const [outputLeft, setOutputLeft] = useState('');
  const [outputRight, setOutputRight] = useState('');
  const [summary, setSummary] = useState([]);
  const [showResults, setShowResults] = useState(false);
  
  // --- STATE DAN REF UNTUK SYNC SCROLL (Tidak berubah) ---
  const [isSyncing, setIsSyncing] = useState(false);
  const input1EditorRef = useRef(null);
  const input2EditorRef = useRef(null);
  const isScrollUpdatingRef = useRef(false);
  // --- AKHIR STATE SYNC SCROLL ---

  const handleNormalize = () => {
    setInput1(beautifySql(input1));
    setInput2(beautifySql(input2));
  };

  const handleMinify = () => {
    setInput1(minifySql(input1));
    setInput2(minifySql(input2));
  };

  // --- LOGIKA SCROLL SYNC UTAMA (Tidak berubah) ---
  const handleScrollSync = useCallback((sourceRef, targetRef) => {
    if (!isSyncing || isScrollUpdatingRef.current) return;

    const sourceEditor = sourceRef.current?.editor;
    const targetEditor = targetRef.current?.editor;

    if (sourceEditor && targetEditor) {
      isScrollUpdatingRef.current = true; 
      const scrollTop = sourceEditor.session.getScrollTop();
      const scrollLeft = sourceEditor.session.getScrollLeft();
      targetEditor.session.setScrollTop(scrollTop);
      targetEditor.session.setScrollLeft(scrollLeft);
      setTimeout(() => { isScrollUpdatingRef.current = false; }, 50); 
    }
  }, [isSyncing]);

  // --- useEffect untuk Memasang Listener Scroll (Tidak berubah) ---
  useEffect(() => {
    const editor1 = input1EditorRef.current?.editor;
    const editor2 = input2EditorRef.current?.editor;

    if (!editor1 || !editor2) return;
    
    if (!isSyncing) {
        isScrollUpdatingRef.current = false;
        return; // Jangan pasang listener jika sync tidak aktif
    }
    
    const sync1To2 = () => handleScrollSync(input1EditorRef, input2EditorRef);
    const sync2To1 = () => handleScrollSync(input2EditorRef, input1EditorRef);
    
    editor1.session.on('changeScrollTop', sync1To2);
    editor1.session.on('changeScrollLeft', sync1To2);
    editor2.session.on('changeScrollTop', sync2To1);
    editor2.session.on('changeScrollLeft', sync2To1);
    
    sync1To2(); // Jalankan sync satu kali saat diaktifkan

    // Cleanup: Hapus listener
    return () => {
        editor1.session.off('changeScrollTop', sync1To2);
        editor1.session.off('changeScrollLeft', sync1To2);
        editor2.session.off('changeScrollTop', sync2To1);
        editor2.session.off('changeScrollLeft', sync2To1);
    };
  }, [isSyncing, handleScrollSync]); 
  // --- AKHIR LOGIKA SCROLL SYNC ---

  const handleCompare = () => {
    if (!input1 || !input2) {
      alert('Error: Harap masukkan kedua script SQL.');
      return;
    }
    
    // Gunakan versi beauty untuk perbandingan yang lebih mudah dibaca
    const str1 = beautifySql(input1);
    const str2 = beautifySql(input2);
    
    if (typeof diff_match_patch === 'undefined') {
      alert('Error: Pustaka diff_match_patch tidak dimuat.');
      return;
    }
    
    // --- Logika Diff (Sama seperti sebelumnya) ---
    const dmp = new diff_match_patch();
    const lineDiffs = dmp.diff_linesToChars_(str1, str2);
    const diffs = dmp.diff_main(lineDiffs.chars1, lineDiffs.chars2, false);
    dmp.diff_charsToLines_(diffs, lineDiffs.lineArray);
    
    let htmlLeft = '', htmlRight = '';
    let lineNumLeft = 1, lineNumRight = 1;
    let changes = [];

    for (let i = 0; i < diffs.length; i++) {
        const [op, data] = diffs[i];
        const lines = data.split('\n').filter(l => l);
        const nextDiff = (i + 1 < diffs.length) ? diffs[i+1] : null;

        if (op === -1 && nextDiff && nextDiff[0] === 1) {
            const data2 = nextDiff[1];
            const lines2 = data2.split('\n').filter(l => l);
            if (lines.length === 1 && lines2.length === 1) {
                const wordDiffs = dmp.diff_main(lines[0], lines2[0]);
                dmp.diff_cleanupSemantic(wordDiffs);
                
                // --- PERUBAHAN 3: Gunakan compareStyles.highlight ---
                const leftContent = wordDiffs.map(([op, text]) => op !== 1 ? `<span class="${op === -1 ? compareStyles.highlight : ''}">${escapeHtml(text)}</span>` : '').join('');
                const rightContent = wordDiffs.map(([op, text]) => op !== -1 ? `<span class="${op === 1 ? compareStyles.highlight : ''}">${escapeHtml(text)}</span>` : '').join('');
                
                changes.push({ type: 'changed', lineLeft: lineNumLeft, lineRight: lineNumRight, text: lines[0] });
                htmlLeft += createLineHtml('left', lineNumLeft++, leftContent, 'changed', true);
                htmlRight += createLineHtml('right', lineNumRight++, rightContent, 'changed', true);
                i++; 
                continue;
            }
        }
        
        if (op === 0) { lines.forEach(line => { htmlLeft += createLineHtml('left', lineNumLeft++, line, 'context'); htmlRight += createLineHtml('right', lineNumRight++, line, 'context'); }); }
        else if (op === -1) { lines.forEach(line => { changes.push({ type: 'removed', lineLeft: lineNumLeft, lineRight: lineNumRight, text: line }); htmlLeft += createLineHtml('left', lineNumLeft++, line, 'removed'); htmlRight += createLineHtml('right', lineNumRight++, '&nbsp;', 'placeholder'); }); }
        else if (op === 1) { lines.forEach(line => { changes.push({ type: 'added', lineLeft: lineNumLeft, lineRight: lineNumRight, text: line }); htmlRight += createLineHtml('right', lineNumRight++, line, 'added'); htmlLeft += createLineHtml('left', lineNumLeft++, '&nbsp;', 'placeholder'); }); }
    }
    // --- Akhir Logika Diff ---
    
    setOutputLeft(htmlLeft);
    setOutputRight(htmlRight);
    setSummary(changes);
    setShowResults(true);
  };

  // Handler untuk meng-highlight dan scroll
  const handleSummaryClick = (lineLeft, lineRight) => {
    const targetLeft = document.getElementById(`diff-left-line-${lineLeft}`);
    const targetRight = document.getElementById(`diff-right-line-${lineRight}`);
    const highlightElement = (element) => {
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // --- PERUBAHAN 4: Gunakan compareStyles.lineHighlighted ---
        element.classList.add(compareStyles.lineHighlighted);
        setTimeout(() => { element.classList.remove(compareStyles.lineHighlighted); }, 2500);
      }
    };
    highlightElement(targetLeft);
    highlightElement(targetRight);
  };

  return (
    // ID "SqlCompare" tidak lagi diperlukan untuk styling
    <div> 
      <div className="tool-header">
        <h1>SQL Compare</h1>
        <p>Bandingkan dua script SQL (Normalisasi dilakukan sebelum perbandingan).</p>
      </div>
      
      {/* --- Layout Input Model JSON Formatter (Tidak berubah) --- */}
      <div className="card">
        <div className="grid" style={{ gridTemplateColumns: '1fr 220px 1fr', alignItems: 'start', gap: '1rem' }}>
          
          {/* Kolom 1: Input Kiri */}
          <div>
            <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Script SQL Asli</h3>
            <ReusableAceEditor
              ref={input1EditorRef} // <-- Tambahkan ref
              mode="sql"
              theme="textmate"
              onChange={setInput1}
              value={input1}
              height="40vh"
              width="100%"
              name="sql-compare-input1"
              wrapEnabled={true} 
              setOptions={{ useWorker: false }}
            />
          </div>
          
          {/* Kolom 2: Kontrol Tengah */}
          <div className="controls flex flex-col" style={{ gap: '0.75rem', paddingTop: '2.5rem' }}>
            <button id="sql-compare-btn" className="button primary" onClick={handleCompare}>
              Bandingkan
            </button>
            <button className="button secondary" onClick={handleNormalize}>
              SQL Beauty
            </button>
            <button className="button secondary" onClick={handleMinify}>
              SQL Minify
            </button>
            {/* --- TOMBOL SYNC SCROLL BARU --- */}
            <button 
              className={`button ${isSyncing ? 'primary' : 'secondary'}`} 
              onClick={() => setIsSyncing(s => !s)}
            >
              <i className={`fas ${isSyncing ? 'fa-link' : 'fa-unlink'}`} style={{ marginRight: '0.5rem' }}></i>
              Scroll Sync
            </button>
            {/* --- AKHIR TOMBOL SYNC SCROLL --- */}
          </div>
          
          {/* Kolom 3: Input Kanan */}
          <div>
            <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Script SQL Revisi</h3>
            <ReusableAceEditor
              ref={input2EditorRef} // <-- Tambahkan ref
              mode="sql"
              theme="textmate"
              onChange={setInput2}
              value={input2}
              height="40vh"
              width="100%"
              name="sql-compare-input2"
              wrapEnabled={true} 
              setOptions={{ useWorker: false }}
            />
          </div>
        </div>
      </div>
      {/* --- Akhir Layout Input --- */}


      {/* --- PERUBAHAN 5: Ganti rendering manual dengan CompareResultView --- */}
      {showResults && (
        <CompareResultView
          outputLeft={outputLeft}
          outputRight={outputRight}
          summary={summary}
          onSummaryClick={handleSummaryClick}
          titleLeft="SQL Asli"
          titleRight="SQL Revisi"
        />
      )}
    </div>
  );
}

export default SqlCompare;