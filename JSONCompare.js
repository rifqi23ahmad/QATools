function initJsonCompare() {
    const page = document.getElementById('JsonCompare');
    page.innerHTML = `
        <div class="tool-header">
            <h1>JSON Compare</h1>
            <p>Bandingkan dua objek JSON untuk menemukan perbedaan properti dan nilai secara visual.</p>
        </div>
        <div class="card">
            <div class="grid grid-cols-2">
                <div>
                    <h3 style="font-weight: 600; margin-bottom: 0.5rem;">JSON Asli (Kiri)</h3>
                    <textarea id="json-compare-input1" class="textarea textarea-editor" style="height: 25vh;" placeholder="Tempel JSON pertama..."></textarea>
                </div>
                <div>
                    <h3 style="font-weight: 600; margin-bottom: 0.5rem;">JSON Revisi (Kanan)</h3>
                    <textarea id="json-compare-input2" class="textarea textarea-editor" style="height: 25vh;" placeholder="Tempel JSON kedua..."></textarea>
                </div>
            </div>
            <div style="text-align: center; margin-top: 1.5rem;">
                <button id="json-compare-btn" class="button primary">Bandingkan Perbedaan</button>
            </div>
        </div>

        <div id="compare-results-section" class="is-hidden" style="margin-top: 2rem;">
            <div class="diff-layout">
                <div class="diff-view">
                    <div class="diff-pane">
                        <div class="diff-pane-header">JSON Asli</div>
                        <pre id="json-compare-output-left" class="diff-output"></pre>
                    </div>
                    <div class="diff-pane">
                        <div class="diff-pane-header">JSON Revisi</div>
                        <pre id="json-compare-output-right" class="diff-output"></pre>
                    </div>
                </div>
                <div class="diff-summary-sidebar">
                    <h3 id="summary-header">Ringkasan Perubahan</h3>
                    <div id="summary-list" class="summary-list"></div>
                </div>
            </div>
        </div>
    `;

    const input1 = page.querySelector('#json-compare-input1');
    const input2 = page.querySelector('#json-compare-input2');
    const compareBtn = page.querySelector('#json-compare-btn');
    const resultsSection = page.querySelector('#compare-results-section');
    const outputLeft = page.querySelector('#json-compare-output-left');
    const outputRight = page.querySelector('#json-compare-output-right');
    const summaryHeader = page.querySelector('#summary-header');
    const summaryList = page.querySelector('#summary-list');

    const escapeHtml = (text) => text ? text.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

    // --- FUNGSI BARU: Menambahkan ID unik untuk target scroll ---
    const createLineHtml = (pane, lineNumber, content, type, isPreformatted = false) => {
        const finalContent = isPreformatted ? content : escapeHtml(content);
        return `<div class="diff-line ${type}" id="diff-${pane}-line-${lineNumber}">` +
               `<div class="line-number">${lineNumber}</div>` +
               `<div class="line-content">${finalContent || '&nbsp;'}</div>` +
               `</div>`;
    };

    compareBtn.addEventListener('click', () => {
        let json1, json2;
        try { json1 = JSON.parse(input1.value); } catch (e) { alert(`Error pada JSON Asli: ${e.message}`); return; }
        try { json2 = JSON.parse(input2.value); } catch (e) { alert(`Error pada JSON Revisi: ${e.message}`); return; }

        const str1 = JSON.stringify(json1, null, 2);
        const str2 = JSON.stringify(json2, null, 2);

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
                    
                    htmlLeft += createLineHtml('left', lineNumLeft++, leftContent, 'changed', true);
                    htmlRight += createLineHtml('right', lineNumRight++, rightContent, 'changed', true);
                    changes.push({ type: 'changed', line: lineNumLeft-1, pane: 'left', text: lines[0] });
                    i++; continue;
                }
            }
            
            if (op === 0) {
                lines.forEach(line => {
                    htmlLeft += createLineHtml('left', lineNumLeft++, line, 'context');
                    htmlRight += createLineHtml('right', lineNumRight++, line, 'context');
                });
            } else if (op === -1) {
                lines.forEach(line => {
                    htmlLeft += createLineHtml('left', lineNumLeft++, line, 'removed');
                    htmlRight += createLineHtml('right', lineNumRight++, '&nbsp;', 'placeholder');
                });
                changes.push({ type: 'removed', line: lineNumLeft-1, pane: 'left', text: lines[0] });
            } else if (op === 1) {
                lines.forEach(line => {
                    htmlRight += createLineHtml('right', lineNumRight++, line, 'added');
                    htmlLeft += createLineHtml('left', lineNumLeft++, '&nbsp;', 'placeholder');
                });
                changes.push({ type: 'added', line: lineNumRight-1, pane: 'right', text: lines[0] });
            }
        }
        
        outputLeft.innerHTML = htmlLeft;
        outputRight.innerHTML = htmlRight;

        summaryHeader.textContent = `Ditemukan ${changes.length} perbedaan`;
        summaryList.innerHTML = changes.map(c => {
            const cleanText = escapeHtml(c.text.trim().substring(0, 50));
            return `<div class="summary-list-item item-${c.type} clickable-summary" data-line="${c.line}" data-pane="${c.pane}">
                        <strong>${c.type.charAt(0).toUpperCase() + c.type.slice(1)}</strong> on line ${c.line}
                        <code>...${cleanText}...</code>
                    </div>`;
        }).join('');

        resultsSection.classList.remove('is-hidden');
    });

    // --- FUNGSI BARU: Event listener untuk klik pada ringkasan ---
    summaryList.addEventListener('click', (e) => {
        const summaryItem = e.target.closest('.clickable-summary');
        if (!summaryItem) return;

        const line = summaryItem.dataset.line;
        const pane = summaryItem.dataset.pane;
        const targetElement = page.querySelector(`#diff-${pane}-line-${line}`);

        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetElement.classList.add('line-highlighted');
            setTimeout(() => {
                targetElement.classList.remove('line-highlighted');
            }, 2500);
        }
    });
}