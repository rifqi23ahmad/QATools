function initJsonCompare() {
    const page = document.getElementById('JsonCompare');
    page.innerHTML = `
        <div class="tool-header">
            <h1>JSON Compare</h1>
            <p>Bandingkan dua objek JSON dan temukan perbedaannya secara visual.</p>
        </div>
        <div class="card">
            <div class="grid grid-cols-2">
                <div>
                    <h3 style="font-weight: 600; margin-bottom: 0.5rem;">JSON Asli</h3>
                    <textarea id="json-compare-input1" class="textarea textarea-editor" style="height: 25vh;" placeholder="Tempel JSON pertama..."></textarea>
                </div>
                <div>
                    <h3 style="font-weight: 600; margin-bottom: 0.5rem;">JSON Revisi</h3>
                    <textarea id="json-compare-input2" class="textarea textarea-editor" style="height: 25vh;" placeholder="Tempel JSON kedua..."></textarea>
                </div>
            </div>
            <div style="text-align: center; margin-top: 1.5rem;">
                <button id="json-compare-btn" class="button primary">Bandingkan Perbedaan</button>
            </div>
            <hr style="margin: 2rem 0; border-color: var(--card-border);">
            <div class="grid grid-cols-2">
                <div class="result-panel">
                    <div class="result-header" id="diff-header-left">Perbedaan (Asli)</div>
                    <pre id="json-compare-output-left" class="diff-output"></pre>
                </div>
                <div class="result-panel">
                    <div class="result-header" id="diff-header-right">Perbedaan (Revisi)</div>
                    <pre id="json-compare-output-right" class="diff-output"></pre>
                </div>
            </div>
        </div>
    `;

    const input1 = document.getElementById('json-compare-input1');
    const input2 = document.getElementById('json-compare-input2');
    const compareBtn = document.getElementById('json-compare-btn');
    const outputLeft = document.getElementById('json-compare-output-left');
    const outputRight = document.getElementById('json-compare-output-right');
    const headerLeft = document.getElementById('diff-header-left');
    const headerRight = document.getElementById('diff-header-right');

    if (!input1) return;

    const escapeHtml = (text) => text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const createLineHtml = (lineNumber, content, type, highlightWords = '') => {
        let finalContent = highlightWords || escapeHtml(content || '');
        return `<div class="diff-line ${type}">` +
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
        let removals = 0, additions = 0;

        for (let i = 0; i < diffs.length; i++) {
            const [op, data] = diffs[i];
            const lines = data.split('\n').filter(line => line);

            if (op === 0) { // Unchanged
                lines.forEach(line => {
                    htmlLeft += createLineHtml(lineNumLeft++, line, 'context');
                    htmlRight += createLineHtml(lineNumRight++, line, 'context');
                });
            } else if (op === -1) { // Deletion
                lines.forEach(line => {
                    htmlLeft += createLineHtml(lineNumLeft++, line, 'removed');
                    removals++;
                });
            } else if (op === 1) { // Insertion
                lines.forEach(line => {
                    htmlRight += createLineHtml(lineNumRight++, line, 'added');
                    additions++;
                });
            }
        }
        
        // Pad the shorter column to align lines
        const leftLines = htmlLeft.split('</div>').length - 1;
        const rightLines = htmlRight.split('</div>').length - 1;
        
        if (leftLines > rightLines) {
            for(let i = 0; i < leftLines - rightLines; i++) {
                htmlRight += createLineHtml('&nbsp;', '', 'placeholder');
            }
        } else if (rightLines > leftLines) {
             for(let i = 0; i < rightLines - leftLines; i++) {
                htmlLeft += createLineHtml('&nbsp;', '', 'placeholder');
            }
        }

        outputLeft.innerHTML = htmlLeft;
        outputRight.innerHTML = htmlRight;
        headerLeft.innerHTML = removals > 0 ? `<span style="color: #c0392b;">- ${removals} removals</span>` : 'JSON Asli';
        headerRight.innerHTML = additions > 0 ? `<span style="color: #27ae60;">+ ${additions} additions</span>` : 'JSON Revisi';
    });
}