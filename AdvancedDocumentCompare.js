function initAdvancedCompare() {
    const page = document.getElementById('WordingCompare');
    page.innerHTML = `
        <div class="tool-header">
            <h1>Advanced Document Compare</h1>
            <p>Bandingkan konten teks dari file PDF atau TXT dan lihat perbedaannya.</p>
        </div>
        <div class="compare-layout">
            <div class="document-pane-wrapper">
                <div class="document-pane" id="doc-viewer-1">
                    <div class="upload-prompt">
                        <i class="fas fa-file-pdf fa-3x"></i>
                        <h3>Dokumen Asli</h3>
                        <p>Jatuhkan file atau klik untuk memilih</p>
                    </div>
                    <div class="render-container" id="render-container-1"></div>
                </div>
                <input type="file" id="file-input-1" class="is-hidden" accept=".pdf,.txt">
            </div>
            <div class="document-pane-wrapper">
                 <div class="document-pane" id="doc-viewer-2">
                    <div class="upload-prompt">
                        <i class="fas fa-file-pdf fa-3x"></i>
                        <h3>Dokumen Revisi</h3>
                        <p>Jatuhkan file atau klik untuk memilih</p>
                    </div>
                    <div class="render-container" id="render-container-2"></div>
                </div>
                <input type="file" id="file-input-2" class="is-hidden" accept=".pdf,.txt">
            </div>
            <div class="sidebar-changes">
                <div class="sidebar-header">
                    <h4>Ringkasan Perubahan</h4>
                    <button id="compare-wording-btn" class="button primary small-btn" disabled>Bandingkan</button>
                </div>
                <div id="changes-list" class="sidebar-body">
                    <p class="no-changes-yet">Unggah dua dokumen untuk melihat perubahan.</p>
                </div>
                <div class="sidebar-footer">
                    <button class="button success" style="width: 100%;"><i class="fas fa-download" style="margin-right: 0.5rem;"></i> Download Laporan</button>
                </div>
            </div>
        </div>
    `;

    const compareBtn = page.querySelector('#compare-wording-btn');
    const changesList = page.querySelector('#changes-list');
    
    const viewers = [
        { id: 1, wrapper: page.querySelector('#doc-viewer-1'), input: page.querySelector('#file-input-1'), renderContainer: page.querySelector('#render-container-1'), file: null, lines: null },
        { id: 2, wrapper: page.querySelector('#doc-viewer-2'), input: page.querySelector('#file-input-2'), renderContainer: page.querySelector('#render-container-2'), file: null, lines: null }
    ];

    const handleFileSelect = async (viewer, file) => {
        if (!file) return;
        viewer.file = file;
        viewer.renderContainer.innerHTML = '<div class="loader-spinner" style="margin: 2rem auto;"></div>';
        viewer.wrapper.querySelector('.upload-prompt').style.display = 'none';
        
        try {
            const extension = file.name.split('.').pop().toLowerCase();
            if (extension === 'pdf') {
                viewer.lines = await processPdf(viewer);
            } else {
                // Untuk file teks, kita buat struktur data yang mirip
                const text = await file.text();
                viewer.lines = text.split('\n').map(line => ({ text: line, items: [] }));
                displayTextFile(viewer, text);
            }
        } catch(err) {
            viewer.renderContainer.innerHTML = `<p style="color:red; padding: 1rem;">Gagal memproses file: ${err.message}</p>`;
        }
        
        compareBtn.disabled = !(viewers[0].lines && viewers[1].lines);
    };

    function displayTextFile(viewer, text) {
        const pre = document.createElement('pre');
        pre.className = 'text-file-content';
        pre.textContent = text;
        viewer.renderContainer.innerHTML = '';
        viewer.renderContainer.appendChild(pre);
    }

    const processPdf = async (viewer) => {
        const reader = new FileReader();
        const fileData = await new Promise(resolve => {
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsArrayBuffer(viewer.file);
        });

        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;
        const pdf = await pdfjsLib.getDocument({ data: fileData }).promise;
        viewer.renderContainer.innerHTML = ''; 
        const allTextItems = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const pageData = await pdf.getPage(i);
            const textContent = await pageData.getTextContent();
            const viewport = pageData.getViewport({ scale: 1.5 });
            
            textContent.items.forEach(item => {
                allTextItems.push({ ...item, pageNum: i, viewport });
            });
            
            const pageWrapper = document.createElement('div');
            pageWrapper.className = 'pdf-page-wrapper';
            const canvas = document.createElement('canvas');
            const highlightLayer = document.createElement('div');
            highlightLayer.className = 'highlight-layer';
            pageWrapper.append(canvas, highlightLayer);
            viewer.renderContainer.appendChild(pageWrapper);
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            highlightLayer.style.width = `${viewport.width}px`;
            highlightLayer.style.height = `${viewport.height}px`;
            
            await pageData.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        }
        return groupTextItemsIntoLines(allTextItems);
    };

    function groupTextItemsIntoLines(items) {
        if (!items.length) return [];
        items.sort((a, b) => a.pageNum - b.pageNum || a.transform[5] - b.transform[5] || a.transform[4] - b.transform[4]);
        const lines = [];
        let currentLine = { text: '', items: [] };
        let lastY = items[0].transform[5];
        let lastPage = items[0].pageNum;

        for (const item of items) {
            // Jika pindah halaman atau ada perbedaan Y yang signifikan, anggap baris baru
            if (item.pageNum !== lastPage || Math.abs(item.transform[5] - lastY) > 5) {
                if (currentLine.items.length) lines.push(currentLine);
                currentLine = { text: item.str, items: [item] };
            } else {
                currentLine.text += ' ' + item.str;
                currentLine.items.push(item);
            }
            lastY = item.transform[5];
            lastPage = item.pageNum;
        }
        lines.push(currentLine); // Dorong baris terakhir
        return lines;
    }
    
    viewers.forEach(viewer => {
        viewer.wrapper.addEventListener('click', () => viewer.input.click());
        viewer.input.addEventListener('change', () => handleFileSelect(viewer, viewer.input.files[0]));
        // ... (drag and drop listeners)
    });

    compareBtn.addEventListener('click', () => {
        changesList.innerHTML = '<div class="loader-spinner" style="margin: 2rem auto;"></div>';
        page.querySelectorAll('.highlight-layer').forEach(layer => layer.innerHTML = '');

        const dmp = new diff_match_patch();
        const text1 = viewers[0].lines.map(l => l.text).join('\n');
        const text2 = viewers[1].lines.map(l => l.text).join('\n');
        
        const lineDiffs = dmp.diff_linesToChars_(text1, text2);
        const diffs = dmp.diff_main(lineDiffs.chars1, lineDiffs.chars2, false);
        dmp.diff_charsToLines_(diffs, lineDiffs.lineArray);
        
        populateChanges(diffs);
    });
    
    function populateChanges(diffs) {
        changesList.innerHTML = '';
        if (diffs.filter(d => d[0] !== 0).length === 0) {
             changesList.innerHTML = '<p class="no-changes-yet" style="padding: 1rem;">Tidak ada perbedaan ditemukan.</p>';
             return;
        }

        let lineIdx1 = 0, lineIdx2 = 0;

        for (const [op, data] of diffs) {
            const lines = data.trimEnd().split('\n');
            if (lines.length === 1 && lines[0] === '') continue;

            if (op === 0) {
                lineIdx1 += lines.length;
                lineIdx2 += lines.length;
            } else if (op === -1) { // Deletion
                addChangeCard('Deletion', data, '');
                highlightLines(viewers[0], lineIdx1, lines.length, 'removed');
                lineIdx1 += lines.length;
            } else if (op === 1) { // Insertion
                addChangeCard('Addition', '', data);
                highlightLines(viewers[1], lineIdx2, lines.length, 'added');
                lineIdx2 += lines.length;
            }
        }
    }

    function addChangeCard(header, oldText, newText) {
        const card = document.createElement('div');
        card.className = 'change-card';
        let oldHtml = oldText ? `<div class="change-line old"><span>Old</span><p>${oldText.trim()}</p></div>` : '';
        let newHtml = newText ? `<div class="change-line new"><span>New</span><p>${newText.trim()}</p></div>` : '';
        card.innerHTML = `<div class="change-header">${header}</div>${oldHtml}${newHtml}`;
        changesList.appendChild(card);
    }

    function highlightLines(viewer, startLineIndex, numLines, type) {
        for(let i = 0; i < numLines; i++) {
            const line = viewer.lines[startLineIndex + i];
            if (!line || !line.items.length) continue;

            const pageNum = line.items[0].pageNum;
            const highlightLayer = viewer.renderContainer.querySelectorAll('.highlight-layer')[pageNum - 1];

            if (highlightLayer) {
                const rect = getBoundingBoxForLine(line.items);
                const highlight = document.createElement('div');
                highlight.className = `highlight-area ${type}`;
                highlight.style.left = `${rect.x}px`;
                highlight.style.top = `${rect.y}px`;
                highlight.style.width = `${rect.width}px`;
                highlight.style.height = `${rect.height}px`;
                highlightLayer.appendChild(highlight);
            }
        }
    }

    function getBoundingBoxForLine(items) {
        const firstItem = items[0];
        const lastItem = items[items.length - 1];
        const viewport = firstItem.viewport;

        const p1 = pdfjsLib.Util.transform(viewport.transform, firstItem.transform);
        const p2 = pdfjsLib.Util.transform(viewport.transform, lastItem.transform);

        const x = p1[4];
        const y = p1[5] - firstItem.height; // Adjust for baseline
        const width = (p2[4] - p1[4]) + lastItem.width;
        const height = Math.max(...items.map(it => it.height));
        
        return { x, y, width, height };
    }
}