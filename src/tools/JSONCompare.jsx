import React, { useState } from 'react';

function JsonCompare() {
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  
  // State untuk menyimpan hasil
  const [outputLeft, setOutputLeft] = useState('');
  const [outputRight, setOutputRight] = useState('');
  const [summary, setSummary] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const escapeHtml = (text) => text ? text.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

  const createLineHtml = (pane, lineNumber, content, type, isPreformatted = false) => {
    const finalContent = isPreformatted ? content : escapeHtml(content);
    return `<div class="diff-line ${type}" id="diff-${pane}-line-${lineNumber}">` +
           `<div class="line-number">${lineNumber}</div>` +
           `<div class="line-content">${finalContent || '&nbsp;'}</div>` +
           `</div>`;
  };

  const handleCompare = () => {
    let json1, json2;
    try { json1 = JSON.parse(input1); } catch (e) { alert(`Error pada JSON Asli: ${e.message}`); return; }
    try { json2 = JSON.parse(input2); } catch (e) { alert(`Error pada JSON Revisi: ${e.message}`); return; }

    // Format kedua JSON (auto-beauty)
    const str1 = JSON.stringify(json1, null, 2);
    const str2 = JSON.stringify(json2, null, 2);

    // --- PERBAIKAN DI SINI ---
    // Perbarui state textarea dengan versi yang sudah di-beautify
    setInput1(str1);
    setInput2(str2);
    // --- AKHIR PERBAIKAN ---

    // Pastikan 'diff_match_patch' sudah dimuat dari index.html
    if (typeof diff_match_patch === 'undefined') {
      alert('Error: Pustaka diff_match_patch tidak dimuat.');
      return;
    }
    
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
                const leftContent = wordDiffs.map(([op, text]) => op !== 1 ? `<span class="${op === -1 ? 'highlight' : ''}">${escapeHtml(text)}</span>` : '').join('');
                const rightContent = wordDiffs.map(([op, text]) => op !== -1 ? `<span class="${op === 1 ? 'highlight' : ''}">${escapeHtml(text)}</span>` : '').join('');
                
                changes.push({ type: 'changed', lineLeft: lineNumLeft, lineRight: lineNumRight, text: lines[0] });
                htmlLeft += createLineHtml('left', lineNumLeft++, leftContent, 'changed', true);
                htmlRight += createLineHtml('right', lineNumRight++, rightContent, 'changed', true);
                i++; 
                continue;
            }
        }
        
        if (op === 0) {
            lines.forEach(line => {
                htmlLeft += createLineHtml('left', lineNumLeft++, line, 'context');
                htmlRight += createLineHtml('right', lineNumRight++, line, 'context');
            });
        } else if (op === -1) {
            lines.forEach(line => {
                changes.push({ type: 'removed', lineLeft: lineNumLeft, lineRight: lineNumRight, text: line });
                htmlLeft += createLineHtml('left', lineNumLeft++, line, 'removed');
                htmlRight += createLineHtml('right', lineNumRight++, '&nbsp;', 'placeholder');
            });
        } else if (op === 1) {
             lines.forEach(line => {
                changes.push({ type: 'added', lineLeft: lineNumLeft, lineRight: lineNumRight, text: line });
                htmlRight += createLineHtml('right', lineNumRight++, line, 'added');
                htmlLeft += createLineHtml('left', lineNumLeft++, '&nbsp;', 'placeholder');
            });
        }
    }
    
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
        element.classList.add('line-highlighted');
        setTimeout(() => {
          element.classList.remove('line-highlighted');
        }, 2500);
      }
    };

    highlightElement(targetLeft);
    highlightElement(targetRight);
  };

  return (
    <div id="JsonCompare"> 
      <div className="tool-header">
        <h1>JSON Compare</h1>
        <p>Bandingkan dua objek JSON untuk menemukan perbedaan properti dan nilai secara visual.</p>
      </div>
      <div className="card">
        <div className="grid grid-cols-2">
          <div>
            <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>JSON Asli (Kiri)</h3>
            <textarea 
              id="json-compare-input1" 
              className="textarea textarea-editor" 
              style={{ height: '25vh' }} 
              placeholder="Tempel JSON pertama..."
              value={input1}
              onChange={(e) => setInput1(e.target.value)}
            />
          </div>
          <div>
            <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>JSON Revisi (Kanan)</h3>
            <textarea 
              id="json-compare-input2" 
              className="textarea textarea-editor" 
              style={{ height: '25vh' }} 
              placeholder="Tempel JSON kedua..."
              value={input2}
              onChange={(e) => setInput2(e.target.value)}
            />
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button id="json-compare-btn" className="button primary" onClick={handleCompare}>
            Bandingkan Perbedaan
          </button>
        </div>
      </div>

      {/* Bagian Hasil - Tampil jika showResults adalah true */}
      {showResults && (
        <div id="compare-results-section" style={{ marginTop: '2rem' }}>
          <div className="diff-layout">
            <div className="diff-view">
              <div className="diff-pane">
                <div className="diff-pane-header">JSON Asli</div>
                <pre 
                  id="json-compare-output-left" 
                  className="diff-output"
                  dangerouslySetInnerHTML={{ __html: outputLeft }}
                />
              </div>
              <div className="diff-pane">
                <div className="diff-pane-header">JSON Revisi</div>
                <pre 
                  id="json-compare-output-right" 
                  className="diff-output"
                  dangerouslySetInnerHTML={{ __html: outputRight }}
                />
              </div>
            </div>
            <div className="diff-summary-sidebar">
              <h3 id="summary-header">Ditemukan {summary.length} perbedaan</h3>
              <div id="summary-list" className="summary-list">
                {summary.map((c, index) => {
                  const cleanText = escapeHtml(c.text.trim().substring(0, 50));
                  const lineDisplay = c.type === 'added' ? c.lineRight : c.lineLeft;
                  return (
                    <div 
                      key={index}
                      className={`summary-list-item item-${c.type} clickable-summary`} 
                      onClick={() => handleSummaryClick(c.lineLeft, c.lineRight)}
                    >
                      <strong>{c.type.charAt(0).toUpperCase() + c.type.slice(1)}</strong> pada baris {lineDisplay}
                      <code>...{cleanText}...</code>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JsonCompare;