import React, { useState } from 'react';
import ReusableAceEditor from '../components/ReusableAceEditor';
import compareStyles from './CompareView.module.css'; 
import styles from './JSONCompare.module.css'; 
import CompareResultView from '../components/CompareResultView.jsx'; // <-- PERBAIKAN: Tambahkan .jsx

function JsonCompare() {
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  
  const [outputLeft, setOutputLeft] = useState('');
  const [outputRight, setOutputRight] = useState('');
  const [summary, setSummary] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const escapeHtml = (text) => text ? text.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

  // createLineHtml logic tetap di sini
  const createLineHtml = (pane, lineNumber, content, type, isPreformatted = false) => {
    const finalContent = isPreformatted ? content : escapeHtml(content);
    const typeClass = compareStyles[type] || ''; 
    return `<div class="${compareStyles.diffLine} ${typeClass}" id="diff-${pane}-line-${lineNumber}">` +
           `<div class="${compareStyles.lineNumber}">${lineNumber}</div>` +
           `<div class="${compareStyles.lineContent}">${finalContent || '&nbsp;'}</div>` +
           `</div>`;
  };

  const handleCompare = () => {
    let json1, json2;
    try { json1 = JSON.parse(input1); } catch (e) { alert(`Error pada JSON Asli: ${e.message}`); return; }
    try { json2 = JSON.parse(input2); } catch (e) { alert(`Error pada JSON Revisi: ${e.message}`); return; }

    const str1 = JSON.stringify(json1, null, 2);
    const str2 = JSON.stringify(json2, null, 2);
    setInput1(str1);
    setInput2(str2);

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
        
        const lines = data.split('\n');
        if (lines.length > 0 && lines[lines.length - 1] === '') {
            lines.pop(); 
        }
        
        const nextDiff = (i + 1 < diffs.length) ? diffs[i+1] : null;

        if (op === -1 && nextDiff && nextDiff[0] === 1) {
            const data2 = nextDiff[1];
            const lines2 = data2.split('\n');
            if (lines2.length > 0 && lines2[lines2.length - 1] === '') {
                lines2.pop();
            }

            if (lines.length === 1 && lines2.length === 1) {
                const wordDiffs = dmp.diff_main(lines[0], lines2[0]);
                dmp.diff_cleanupSemantic(wordDiffs);
                const leftContent = wordDiffs.map(([op, text]) => op !== 1 ? `<span class="${op === -1 ? compareStyles.highlight : ''}">${escapeHtml(text)}</span>` : '').join('');
                const rightContent = wordDiffs.map(([op, text]) => op !== -1 ? `<span class="${op === 1 ? compareStyles.highlight : ''}">${escapeHtml(text)}</span>` : '').join('');
                
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

  // handleSummaryClick logic tetap di sini
  const handleSummaryClick = (lineLeft, lineRight) => {
    const targetLeft = document.getElementById(`diff-left-line-${lineLeft}`);
    const targetRight = document.getElementById(`diff-right-line-${lineRight}`);

    const highlightElement = (element) => {
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add(compareStyles.lineHighlighted);
        setTimeout(() => {
          element.classList.remove(compareStyles.lineHighlighted);
        }, 2500);
      }
    };

    highlightElement(targetLeft);
    highlightElement(targetRight);
  };

  return (
    <div> 
      <div className="tool-header">
        <h1>JSON Compare</h1>
        <p>Bandingkan dua objek JSON untuk menemukan perbedaan properti dan nilai secara visual.</p>
      </div>
      <div className="card">
        <div className="grid grid-cols-2">
          <div>
            <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>JSON Asli</h3>
            <ReusableAceEditor
              className={styles.textareaEditor} 
              mode="json"
              theme="textmate"
              onChange={setInput1}
              value={input1}
              height="25vh"
              width="100%"
              name="json-compare-input1"
              placeholder="Tempel JSON pertama..."
              wrapEnabled={true}
            />
          </div>
          <div>
            <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>JSON Revisi</h3>
            <ReusableAceEditor
              className={styles.textareaEditor}
              mode="json"
              theme="textmate"
              onChange={setInput2}
              value={input2}
              height="25vh"
              width="100%"
              name="json-compare-input2"
              placeholder="Tempel JSON kedua..."
              wrapEnabled={true}
            />
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button id="json-compare-btn" className="button primary" onClick={handleCompare}>
            Bandingkan Perbedaan
          </button>
        </div>
      </div>

      {/* --- RENDER KOMPONEN BARU --- */}
      {showResults && (
        <CompareResultView
          outputLeft={outputLeft}
          outputRight={outputRight}
          summary={summary}
          onSummaryClick={handleSummaryClick}
          titleLeft="JSON Asli"
          titleRight="JSON Revisi"
        />
      )}
    </div>
  );
}

export default JsonCompare;