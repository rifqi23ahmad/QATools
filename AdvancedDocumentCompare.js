function initAdvancedCompare() {
    const page = document.getElementById('WordingCompare');
    page.innerHTML = `
      <div class="adv-compare-container">
        <div class="adv-compare-toolbar">
            <div class="toolbar-title">Compare text changes between two PDFs.</div>
            <label class="sync-scroll-toggle" title="Toggle scroll synchronization">
                <span>Sync Scroll</span>
                <input type="checkbox" id="scroll-sync-toggle" class="is-hidden" checked>
                <div class="switch"></div>
            </label>
        </div>
        <div class="adv-compare-main">
            <div class="pdf-viewer-area">
                <div class="pdf-viewer-pane">
                    <div class="pane-header"></div>
                    <div class="pdf-viewer-content" id="doc-viewer-1">
                        <div class="upload-prompt">
                             <i class="fas fa-file-pdf fa-4x"></i>
                             <h3>Original Document</h3>
                             <p>Drop file or click to select</p>
                        </div>
                        <div class="render-container" id="render-container-1"></div>
                    </div>
                    <div class="pane-footer"><span class="file-name" id="file-name-1">No file selected</span></div>
                </div>
                <div class="pdf-viewer-pane">
                     <div class="pane-header"></div>
                    <div class="pdf-viewer-content" id="doc-viewer-2">
                        <div class="upload-prompt">
                             <i class="fas fa-file-pdf fa-4x"></i>
                             <h3>Revised Document</h3>
                             <p>Drop file or click to select</p>
                        </div>
                        <div class="render-container" id="render-container-2"></div>
                    </div>
                    <div class="pane-footer"><span class="file-name" id="file-name-2">No file selected</span></div>
                </div>
            </div>
            <div class="change-report-sidebar">
                <div class="sidebar-header">
                    <h3 id="changes-header">Change report (0)</h3>
                    <button id="compare-wording-btn" class="button primary" style="padding: 0.5rem 1rem;">Bandingkan</button>
                </div>
                <div class="sidebar-search">
                    <i class="fas fa-search"></i>
                    <input type="text" id="search-changes-input" placeholder="Search text">
                </div>
                <div class="sidebar-body" id="changes-list">
                    <p class="no-changes-yet">Upload two documents and click "Bandingkan" to see the differences.</p>
                </div>
            </div>
        </div>
      </div>
      <input type="file" id="file-input-1" class="is-hidden" accept=".pdf">
      <input type="file" id="file-input-2" class="is-hidden" accept=".pdf">
    `;

    const compareBtn = page.querySelector('#compare-wording-btn');
    const changesList = page.querySelector('#changes-list');
    const scrollSyncToggle = page.querySelector('#scroll-sync-toggle');
    const searchInput = page.querySelector('#search-changes-input');
    
    const viewers = [
        { id: 1, pane: page.querySelector('.pdf-viewer-pane:nth-child(1)'), content: page.querySelector('#doc-viewer-1'), input: page.querySelector('#file-input-1'), renderContainer: page.querySelector('#render-container-1'), fileNameEl: page.querySelector('#file-name-1'), file: null, allTokens: null },
        { id: 2, pane: page.querySelector('.pdf-viewer-pane:nth-child(2)'), content: page.querySelector('#doc-viewer-2'), input: page.querySelector('#file-input-2'), renderContainer: page.querySelector('#render-container-2'), fileNameEl: page.querySelector('#file-name-2'), file: null, allTokens: null }
    ];

    let isSyncingScroll = false;
    function syncScroll(source, target) {
        if (!scrollSyncToggle.checked) return;
        if (!isSyncingScroll) {
            isSyncingScroll = true;
            target.scrollTop = source.scrollTop;
            setTimeout(() => { isSyncingScroll = false; }, 50);
        }
    }
    viewers[0].content.addEventListener('scroll', () => syncScroll(viewers[0].content, viewers[1].content));
    viewers[1].content.addEventListener('scroll', () => syncScroll(viewers[1].content, viewers[0].content));

    const handleFileSelect = async (viewer, file) => {
        if (!file) return;
        viewer.file = file;
        changesList.innerHTML = '<p class="no-changes-yet">Upload two documents and click "Bandingkan" to see the differences.</p>';
        page.querySelector('#changes-header').textContent = `Change report (0)`;
        viewer.renderContainer.innerHTML = '<div class="loader-spinner" style="margin: 2rem auto;"></div>';
        viewer.pane.querySelector('.upload-prompt').style.display = 'none';
        viewer.fileNameEl.textContent = file.name;
        
        try {
            viewer.allTokens = await processPdf(viewer);
        } catch(err) {
            console.error("File processing error:", err);
            viewer.renderContainer.innerHTML = `<p style="color:red; padding: 1rem;">Gagal memproses file: ${err.message}</p>`;
        }
        
        compareBtn.disabled = !(viewers[0].allTokens && viewers[1].allTokens);
    };
    
    async function processPdf(viewer) {
        const fileData = await viewer.file.arrayBuffer();
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;
        const pdf = await pdfjsLib.getDocument({ data: fileData }).promise;
        
        viewer.renderContainer.innerHTML = ''; 
        const allTokens = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 1.5 });
            
            const pageWrapper = document.createElement('div');
            pageWrapper.className = 'pdf-page-wrapper';
            const canvas = document.createElement('canvas');
            canvas.className = 'pdf-canvas';
            const highlightLayer = document.createElement('div');
            highlightLayer.className = 'highlight-layer';
            pageWrapper.append(canvas, highlightLayer);
            viewer.renderContainer.appendChild(pageWrapper);
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            highlightLayer.style.width = `${viewport.width}px`;
            highlightLayer.style.height = `${viewport.height}px`;

            const renderContext = { canvasContext: canvas.getContext('2d'), viewport: viewport };
            await page.render(renderContext).promise;

            textContent.items.forEach(item => {
                if (item.str.trim()) { allTokens.push({ ...item, pageNum, viewport }); }
            });
        }
        allTokens.sort((a, b) => {
            if (a.pageNum !== b.pageNum) return a.pageNum - b.pageNum;
            if (Math.abs(b.transform[5] - a.transform[5]) > 2) return b.transform[5] - a.transform[5];
            return a.transform[4] - b.transform[4];
        });
        return allTokens;
    };

    viewers.forEach(viewer => {
        viewer.content.addEventListener('click', () => viewer.input.click());
        viewer.input.addEventListener('change', (e) => handleFileSelect(viewer, e.target.files[0]));
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => { 
            viewer.content.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }); 
        });
        viewer.content.addEventListener('drop', (e) => handleFileSelect(viewer, e.dataTransfer.files[0]));
    });

    // --- FUNGSI ALGORITMA INTI YANG DITULIS ULANG TOTAL ---
    function findLongestCommonSubsequence(seq1, seq2) {
        const m = seq1.length, n = seq2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (seq1[i - 1] === seq2[j - 1]) {
                    dp[i][j] = 1 + dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        const lcs = [];
        let i = m, j = n;
        while (i > 0 && j > 0) {
            if (seq1[i - 1] === seq2[j - 1]) {
                lcs.unshift(seq1[i - 1]);
                i--; j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }
        return lcs;
    }

    compareBtn.addEventListener('click', () => {
        changesList.innerHTML = '<div class="loader-spinner" style="margin: 2rem auto;"></div>';
        page.querySelectorAll('.highlight-layer').forEach(layer => layer.innerHTML = '');

        const words1 = viewers[0].allTokens.flatMap(token => token.str.split(/\b/).filter(s => s.trim()).map(wordStr => ({ word: wordStr, token })));
        const words2 = viewers[1].allTokens.flatMap(token => token.str.split(/\b/).filter(s => s.trim()).map(wordStr => ({ word: wordStr, token })));
        
        const textSeq1 = words1.map(w => w.word);
        const textSeq2 = words2.map(w => w.word);

        const lcs = findLongestCommonSubsequence(textSeq1, textSeq2);
        const lcsSet = new Set(lcs); // Untuk pencarian cepat

        let i = 0, j = 0, k = 0;
        const changeGroups = [];
        let currentGroup = null;

        while (i < words1.length || j < words2.length) {
            const word1 = words1[i]?.word;
            const word2 = words2[j]?.word;
            const lcsWord = lcs[k];

            if (word1 === lcsWord && word2 === lcsWord) { // Sama (Jangkar)
                if (currentGroup) {
                    changeGroups.push(currentGroup);
                    currentGroup = null;
                }
                i++; j++; k++;
            } else { // Berbeda
                if (!currentGroup) currentGroup = { oldWords: [], newWords: [] };
                if (word1 !== lcsWord) {
                    if(words1[i]) currentGroup.oldWords.push(words1[i]);
                    i++;
                }
                if (word2 !== lcsWord) {
                    if(words2[j]) currentGroup.newWords.push(words2[j]);
                    j++;
                }
            }
        }
        if (currentGroup) changeGroups.push(currentGroup);
        
        const significantChangeGroups = changeGroups.filter(g => g.oldWords.length > 0 || g.newWords.length > 0);

        changesList.innerHTML = '';
        page.querySelector('#changes-header').textContent = `Change report (${significantChangeGroups.length})`;
        if (significantChangeGroups.length === 0) {
            changesList.innerHTML = '<p class="no-changes-yet">No differences found.</p>';
            return;
        }

        significantChangeGroups.forEach(group => {
            highlightTokens(group.oldWords.map(w => w.token), 'removed', 1);
            highlightTokens(group.newWords.map(w => w.token), 'added', 2);
            addChangeCard(group);
        });
    });

    function addChangeCard(group) {
        const card = document.createElement('div');
        card.className = 'change-card';
        
        const oldText = group.oldWords.map(w => w.word).join('').trim();
        const newText = group.newWords.map(w => w.word).join('').trim();

        const firstToken = (group.oldWords[0] || group.newWords[0])?.token;
        if (firstToken) {
            card.dataset.pageNum = firstToken.pageNum;
            if (group.oldWords.length > 0) card.dataset.oldTop = group.oldWords[0].token.transform[5];
            if (group.newWords.length > 0) card.dataset.newTop = group.newWords[0].token.transform[5];
        }

        const oldHtml = `<div class="text-block old"><span>Old</span><p><span class="highlight-word">${oldText}</span></p></div>`;
        const newHtml = `<div class="text-block new"><span>New</span><p><span class="highlight-word">${newText}</span></p></div>`;
        
        card.innerHTML = `
            <div class="change-card-header"><span>Page ${firstToken ? firstToken.pageNum : 'N/A'}</span></div>
            <div class="change-card-body">
                ${oldText ? oldHtml : ''}
                ${newText ? newHtml : ''}
            </div>
        `;
        changesList.appendChild(card);
    }
    
    function highlightTokens(tokens, type, viewerId) {
        if (!tokens || tokens.length === 0) return;
        const viewer = viewers.find(v => v.id === viewerId);
        if (!viewer) return;
        
        const uniqueTokens = [...new Set(tokens)];

        uniqueTokens.forEach(token => {
            const highlightLayer = viewer.renderContainer.querySelectorAll('.highlight-layer')[token.pageNum - 1];
            if (!highlightLayer) return;

            const tx = pdfjsLib.Util.transform(token.viewport.transform, token.transform);
            const x = tx[4];
            const y = tx[5] - token.height;
            
            const highlight = document.createElement('div');
            highlight.className = `highlight-area ${type}`;
            highlight.style.left = `${x}px`;
            highlight.style.top = `${y}px`;
            highlight.style.width = `${token.width}px`;
            highlight.style.height = `${token.height}px`;
            
            highlightLayer.appendChild(highlight);
        });
    }
    
    changesList.addEventListener('click', (e) => {
        const card = e.target.closest('.change-card');
        if (!card) return;
        const pageNum = parseInt(card.dataset.pageNum, 10);
        
        const scrollToHighlight = (viewer, topPos) => {
            const top = parseFloat(topPos);
            const targetPageElement = viewer.renderContainer.querySelectorAll('.pdf-page-wrapper')[pageNum - 1];
             if (targetPageElement) {
                const viewportHeight = viewer.content.clientHeight;
                const scrollPos = targetPageElement.offsetTop + (targetPageElement.clientHeight - top) - (viewportHeight / 4);
                viewer.content.scrollTo({ top: scrollPos, behavior: 'smooth' });
            }
        };

        if (card.dataset.oldTop) scrollToHighlight(viewers[0], card.dataset.oldTop);
        if (card.dataset.newTop) scrollToHighlight(viewers[1], card.dataset.newTop);
    });

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const cards = changesList.querySelectorAll('.change-card');
        cards.forEach(card => {
            card.style.display = card.textContent.toLowerCase().includes(searchTerm) ? '' : 'none';
        });
    });
}


