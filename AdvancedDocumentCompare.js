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
                    viewer.renderContainer.innerHTML = '';
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const pageData = await pdf.getPage(i);
                        const textContent = await pageData.getTextContent();
                        fullText += textContent.items.map(item => item.str).join(' ') + '\n';
                        
                        // Render canvas (visual representation)
                        const viewport = pageData.getViewport({ scale: 1.5 });
                        const canvas = document.createElement('canvas');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        canvas.style.maxWidth = '100%';
                        canvas.style.marginBottom = '10px';
                        await pageData.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                        viewer.renderContainer.appendChild(canvas);
                    }
                    viewer.textContent = { text: fullText };
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
        
        const dmp = new diff_match_patch();
        const diffs = dmp.diff_main(viewers[0].textContent.text, viewers[1].textContent.text);
        dmp.diff_cleanupSemantic(diffs);

        populateChangesSidebar(diffs);
    });
    
    function populateChangesSidebar(diffs) {
        changesList.innerHTML = '';
        const filtered = diffs.filter(d => d[0] !== 0);
        if(filtered.length === 0){
             changesList.innerHTML = '<p class="no-changes-yet">Tidak ada perbedaan ditemukan.</p>';
             return;
        }
        filtered.forEach(diff => {
            const item = document.createElement('div');
            item.className = 'change-item';
            const [op, text] = diff;
            if(op === -1) item.innerHTML = `<del>${text.trim()}</del>`;
            if(op === 1) item.innerHTML = `<ins>${text.trim()}</ins>`;
            changesList.appendChild(item);
        });
    }
}