function initAdvancedCompare() {
    const page = document.getElementById('WordingCompare');
    page.innerHTML = `
        <div class="tool-header">
            <h1>Advanced Document Compare</h1>
            <p>Bandingkan konten teks dari file PDF atau TXT dan lihat perbedaannya.</p>
        </div>
        <div class="grid" style="grid-template-columns: 5fr 5fr 3fr; align-items: start; height: 75vh;">
            <div class="pdf-viewer-wrapper" id="pdf-viewer-1">
                <div class="upload-prompt"><h3>Dokumen Asli</h3><p>Jatuhkan file atau klik</p></div>
                <div class="render-container" id="render-container-1"></div>
            </div>
            <div class="pdf-viewer-wrapper" id="pdf-viewer-2">
                <div class="upload-prompt"><h3>Dokumen Revisi</h3><p>Jatuhkan file atau klik</p></div>
                <div class="render-container" id="render-container-2"></div>
            </div>
            <div class="card changes-sidebar">
                <h3 style="font-weight: 600;">Daftar Perubahan</h3>
                <div class="control" style="margin: 1rem 0;">
                    <label class="checkbox"><input type="checkbox" id="scroll-sync-toggle" checked> Sync Scroll</label>
                </div>
                <div id="changes-list" style="flex-grow: 1; overflow-y: auto;">
                    <p class="no-changes-yet">Unggah dua dokumen untuk melihat perubahan.</p>
                </div>
                <button id="compare-wording-btn" class="button primary" style="margin-top: 1rem;" disabled>Bandingkan</button>
            </div>
        </div>
        <input type="file" id="file-input-1" class="is-hidden" accept=".pdf,.txt">
        <input type="file" id="file-input-2" class="is-hidden" accept=".pdf,.txt">
    `;

    const compareBtn = page.querySelector('#compare-wording-btn');
    const changesList = page.querySelector('#changes-list');
    const scrollSyncToggle = page.querySelector('#scroll-sync-toggle');
    
    const viewers = [
        { id: 1, wrapper: page.querySelector('#pdf-viewer-1'), input: page.querySelector('#file-input-1'), renderContainer: page.querySelector('#render-container-1'), file: null, textContent: null, diffs: null },
        { id: 2, wrapper: page.querySelector('#pdf-viewer-2'), input: page.querySelector('#file-input-2'), renderContainer: page.querySelector('#render-container-2'), file: null, textContent: null, diffs: null }
    ];

    let isSyncing = false;

    const handleFileSelect = async (viewer, file) => {
        if (!file) return;
        viewer.file = file;
        viewer.renderContainer.innerHTML = '<p>Memuat...</p>';
        viewer.wrapper.querySelector('.upload-prompt').style.display = 'none';
        
        const extension = file.name.split('.').pop().toLowerCase();
        if (extension === 'pdf') {
            await processPdf(viewer);
        } else {
            await processTextFile(viewer);
        }
        compareBtn.disabled = !(viewers[0].file && viewers[1].file);
    };

    const processTextFile = async (viewer) => {
        const text = await viewer.file.text();
        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.textAlign = 'left';
        pre.textContent = text;
        viewer.renderContainer.innerHTML = '';
        viewer.renderContainer.appendChild(pre);
        viewer.textContent = { text };
    };

    const processPdf = (viewer) => {
        return new Promise((resolve, reject) => {
            if (typeof pdfjsLib === 'undefined') {
                viewer.renderContainer.innerHTML = '<p style="color:red;">Error: PDF.js library not loaded.</p>';
                return reject();
            }
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;
                    const pdf = await pdfjsLib.getDocument({ data: e.target.result }).promise;
                    viewer.renderContainer.innerHTML = ''; // Clear previous content
                    let fullText = '';
                    let allItems = [];

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const pageData = await pdf.getPage(i);
                        const textContent = await pageData.getTextContent();
                        
                        fullText += textContent.items.map(item => item.str).join(' ') + '\n';
                        
                        const pageWrapper = document.createElement('div');
                        pageWrapper.style.position = 'relative';
                        pageWrapper.dataset.pageNumber = i;
                        
                        const canvas = document.createElement('canvas');
                        canvas.style.maxWidth = '100%';
                        canvas.style.marginBottom = '10px';
                        
                        const highlightLayer = document.createElement('div');
                        highlightLayer.style.position = 'absolute';
                        highlightLayer.style.left = '0';
                        highlightLayer.style.top = '0';

                        pageWrapper.append(canvas, highlightLayer);
                        viewer.renderContainer.appendChild(pageWrapper);

                        const viewport = pageData.getViewport({ scale: 1.5 });
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        
                        await pageData.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                        
                        textContent.items.forEach(item => allItems.push({ ...item, pageNum: i, viewport: viewport }));
                    }
                    viewer.textContent = { text: fullText, items: allItems };
                    resolve();
                } catch (err) {
                    viewer.renderContainer.innerHTML = `<p style="color:red;">Gagal merender PDF: ${err.message}</p>`;
                    reject(err);
                }
            };
            reader.readAsArrayBuffer(viewer.file);
        });
    };
    
    viewers.forEach(viewer => {
        viewer.wrapper.addEventListener('click', () => viewer.input.click());
        viewer.input.addEventListener('change', () => handleFileSelect(viewer, viewer.input.files[0]));
        viewer.wrapper.addEventListener('dragover', (e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary-color)'; });
        viewer.wrapper.addEventListener('dragleave', (e) => e.currentTarget.style.borderColor = 'var(--card-border)');
        viewer.wrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = 'var(--card-border)';
            if (e.dataTransfer.files.length) handleFileSelect(viewer, e.dataTransfer.files[0]);
        });
        viewer.wrapper.addEventListener('scroll', () => {
            if (isSyncing || !scrollSyncToggle.checked) return;
            isSyncing = true;
            const otherViewer = viewers.find(v => v.id !== viewer.id);
            otherViewer.wrapper.scrollTop = viewer.wrapper.scrollTop;
            setTimeout(() => isSyncing = false, 50);
        });
    });

    compareBtn.addEventListener('click', () => {
        if (!viewers[0].textContent || !viewers[1].textContent) return;
        changesList.innerHTML = '<p class="no-changes-yet">Menganalisis...</p>';
        page.querySelectorAll('.render-container .highlight-layer').forEach(layer => layer.innerHTML = '');

        const dmp = new diff_match_patch();
        const diffs = dmp.diff_main(viewers[0].textContent.text, viewers[1].textContent.text);
        dmp.diff_cleanupSemantic(diffs);

        populateChangesSidebarAndHighlights(diffs);
    });
    
    function populateChangesSidebarAndHighlights(diffs) {
        changesList.innerHTML = '';
        const filtered = diffs.filter(d => d[0] !== 0);
        if(filtered.length === 0){
             changesList.innerHTML = '<p class="no-changes-yet">Tidak ada perbedaan ditemukan.</p>';
             return;
        }

        let text1_idx = 0;
        let text2_idx = 0;

        filtered.forEach(diff => {
            const [op, text] = diff;
            const item = document.createElement('div');
            item.className = 'change-item';

            if (op === -1) { // Deletion
                item.innerHTML = `<del>${text.trim()}</del>`;
                highlightInViewer(viewers[0], text1_idx, text.length, 'removed');
                text1_idx += text.length;
            } else if (op === 1) { // Insertion
                item.innerHTML = `<ins>${text.trim()}</ins>`;
                highlightInViewer(viewers[1], text2_idx, text.length, 'added');
                text2_idx += text.length;
            }
             changesList.appendChild(item);
        });
    }

    function highlightInViewer(viewer, startIndex, length, type) {
        const endIndex = startIndex + length;
        let currentIndex = 0;

        for (const item of viewer.textContent.items) {
            const itemEndIndex = currentIndex + item.str.length + 1; // +1 for space
            if (currentIndex >= endIndex) break;
            if (itemEndIndex > startIndex) {
                const highlightLayer = viewer.renderContainer.querySelector(`div[data-page-number='${item.pageNum}'] .highlight-layer`);
                if (highlightLayer) {
                    const rect = getBoundingBox(item, item.viewport);
                    const highlight = document.createElement('div');
                    highlight.style.position = 'absolute';
                    highlight.style.left = `${rect.x}px`;
                    highlight.style.top = `${rect.y}px`;
                    highlight.style.width = `${rect.width}px`;
                    highlight.style.height = `${rect.height}px`;
                    highlight.style.backgroundColor = type === 'removed' ? 'red' : 'green';
                    highlight.style.opacity = '0.4';
                    highlight.style.transform = `rotate(${rect.angle}deg)`;
                    highlight.style.transformOrigin = 'top left';
                    highlightLayer.appendChild(highlight);
                }
            }
            currentIndex = itemEndIndex;
        }
    }
    
    // --- PERBAIKAN: Fungsi kalkulasi posisi highlight yang lebih presisi ---
    function getBoundingBox(item, viewport) {
        const [a, b, c, d, e, f] = item.transform;
        
        // Menghitung sudut rotasi dari matriks transformasi
        const angle = Math.atan2(b, a) * (180 / Math.PI);
        
        // Mengaplikasikan transformasi viewport ke titik awal teks
        const tx = pdfjsLib.Util.transform(viewport.transform, [a, b, c, d, e, f]);
        
        // Kalkulasi tinggi dan lebar setelah diskalakan
        const height = Math.sqrt(b * b + d * d) * viewport.scale;
        const width = item.width * viewport.scale;

        // Titik tx[4] dan tx[5] adalah titik awal (pojok kiri bawah) dari teks setelah transformasi
        // Kita perlu menyesuaikannya untuk rotasi
        let x = tx[4];
        let y = tx[5];

        if (angle > -5 && angle < 5) { // Teks horizontal
             y = tx[5] - height;
        } else if (angle > 85 && angle < 95) { // Teks vertikal (diputar 90 derajat)
            x = tx[4] - height;
        }
        
        return { x: x, y: y, width: width, height: height, angle: angle };
    }
}