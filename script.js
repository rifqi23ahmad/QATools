// Global tab switching function
function openTool(evt, toolName) {
    document.querySelectorAll(".tab-content").forEach(tc => tc.style.display = "none");
    document.querySelectorAll(".tab-link").forEach(tl => tl.classList.remove("active"));
    document.getElementById(toolName).style.display = "block";
    evt.currentTarget.classList.add("active");
}

// --- SQL Number Formatter Logic ---
function formatSqlNumbers() {
    const input = document.getElementById("sql-input").value;
    const numbers = input.match(/\d+/g);
    document.getElementById("sql-output").value = numbers ? numbers.map(num => `'${num}'`).join(',\n') : "";
}
function copySqlOutput() {
    const output = document.getElementById("sql-output");
    output.select();
    try {
        document.execCommand("copy");
        alert('Hasil disalin ke clipboard!');
    } catch (err) {
        alert('Gagal menyalin.');
    }
}

// This function will run once the entire page is loaded
document.addEventListener('DOMContentLoaded', () => {
    initImageCompare();
    initAdvancedCompare();
});


function initImageCompare() {
    const imageCompareTab = document.getElementById('ImageCompare');
    if (!imageCompareTab) return;

    const image1UploadBox = document.getElementById('image1-box');
    const image2UploadBox = document.getElementById('image2-box');
    const image1Display = document.getElementById('image1-display');
    const image2Display = document.getElementById('image2-display');
    const comparisonSection = imageCompareTab.querySelector('.comparison-section');
    const comparisonImage1 = document.getElementById('comparison-image1');
    const comparisonImage2 = document.getElementById('comparison-image2');
    const noImagePlaceholder = imageCompareTab.querySelector('.no-image-placeholder');
    const controlsSidebar = imageCompareTab.querySelector('.comparison-controls-sidebar');
    const image2TransparencySlider = document.getElementById('image2-transparency');
    const image2TransparencyLabel = controlsSidebar.querySelector('label[for="image2-transparency"] span');
    const enablePrecisionBtn = controlsSidebar.querySelector('.enable-precision-btn');
    const image1ScaleSlider = document.getElementById('image1-scale');
    const image1ScaleLabel = controlsSidebar.querySelector('label[for="image1-scale"] span');
    const image2ScaleSlider = document.getElementById('image2-scale');
    const image2ScaleLabel = controlsSidebar.querySelector('label[for="image2-scale"] span');
    const image1HorizontalSlider = document.getElementById('image1-horizontal');
    const image1VerticalSlider = document.getElementById('image1-vertical');
    const image2HorizontalSlider = document.getElementById('image2-horizontal');
    const image2VerticalSlider = document.getElementById('image2-vertical');
    const resetBtn = controlsSidebar.querySelector('.reset-btn');
    const clearAllBtn = controlsSidebar.querySelector('.clear-all-btn');
    const statusMessage = imageCompareTab.querySelector('.status-message span');

    let image1Data = null;
    let image2Data = null;
    let precisionModeEnabled = false;
    let transforms = { img1: { scale: 1, tx: 0, ty: 0 }, img2: { scale: 1, tx: 0, ty: 0 } };

    const updateComparisonView = () => {
        if (image1Data && image2Data) {
            comparisonImage1.src = image1Data;
            comparisonImage2.src = image2Data;
            comparisonImage1.classList.add('loaded');
            comparisonImage2.classList.add('loaded');
            comparisonSection.classList.add('active');
            noImagePlaceholder.style.display = 'none';
            statusMessage.textContent = 'Gambar siap! Gunakan kontrol di sebelah kanan untuk membandingkan.';
        } else {
            comparisonSection.classList.remove('active');
            noImagePlaceholder.style.display = 'flex';
            if (image1Data) statusMessage.textContent = 'Gambar 1 dimuat. Menunggu Gambar 2.';
            else if (image2Data) statusMessage.textContent = 'Gambar 2 dimuat. Menunggu Gambar 1.';
            else statusMessage.textContent = 'Siap membandingkan gambar - Klik di sini dan tekan Ctrl+V untuk menempelkan!';
        }
    };
    const loadImage = (file, imageNum) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (imageNum === 1) { image1Data = e.target.result; image1Display.src = image1Data; image1UploadBox.classList.add('has-image'); } 
            else { image2Data = e.target.result; image2Display.src = image2Data; image2UploadBox.classList.add('has-image'); }
            updateComparisonView();
        };
        reader.readAsDataURL(file);
    };
    const applyTransforms = () => {
        const baseTransform = 'translate(-50%, -50%)';
        if (precisionModeEnabled) {
            comparisonImage1.style.transform = `${baseTransform} translateX(${transforms.img1.tx}px) translateY(${transforms.img1.ty}px) scale(${transforms.img1.scale})`;
            comparisonImage2.style.transform = `${baseTransform} translateX(${transforms.img2.tx}px) translateY(${transforms.img2.ty}px) scale(${transforms.img2.scale})`;
        } else {
            comparisonImage1.style.transform = baseTransform;
            comparisonImage2.style.transform = baseTransform;
        }
    };
    document.addEventListener('paste', (e) => {
        if (document.getElementById('ImageCompare').style.display !== 'block') return;
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.type.includes('image')) {
                const blob = item.getAsFile();
                if (!image1Data) loadImage(blob, 1);
                else if (!image2Data) loadImage(blob, 2);
                break;
            }
        }
    });
    [image1UploadBox, image2UploadBox].forEach((box, index) => {
        const imageNum = index + 1;
        box.addEventListener('dragover', (e) => { e.preventDefault(); box.classList.add('drag-over'); });
        box.addEventListener('dragleave', () => { box.classList.remove('drag-over'); });
        box.addEventListener('drop', (e) => {
            e.preventDefault();
            box.classList.remove('drag-over');
            if (e.dataTransfer.files.length && e.dataTransfer.files[0].type.startsWith('image')) {
                loadImage(e.dataTransfer.files[0], imageNum);
            }
        });
    });
    image2TransparencySlider.addEventListener('input', (e) => {
        image2TransparencyLabel.textContent = `${e.target.value}%`;
        comparisonImage2.style.opacity = e.target.value / 100;
    });
    enablePrecisionBtn.addEventListener('click', () => {
        precisionModeEnabled = !precisionModeEnabled;
        controlsSidebar.classList.toggle('precision-mode-active', precisionModeEnabled);
        enablePrecisionBtn.textContent = precisionModeEnabled ? 'Aktif' : 'Nonaktif';
        enablePrecisionBtn.classList.toggle('enabled', precisionModeEnabled);
        applyTransforms();
    });
    image1ScaleSlider.addEventListener('input', (e) => { transforms.img1.scale = e.target.value / 100; image1ScaleLabel.textContent = `${e.target.value}%`; applyTransforms(); });
    image2ScaleSlider.addEventListener('input', (e) => { transforms.img2.scale = e.target.value / 100; image2ScaleLabel.textContent = `${e.target.value}%`; applyTransforms(); });
    image1HorizontalSlider.addEventListener('input', (e) => { transforms.img1.tx = e.target.value; applyTransforms(); });
    image1VerticalSlider.addEventListener('input', (e) => { transforms.img1.ty = e.target.value; applyTransforms(); });
    image2HorizontalSlider.addEventListener('input', (e) => { transforms.img2.tx = e.target.value; applyTransforms(); });
    image2VerticalSlider.addEventListener('input', (e) => { transforms.img2.ty = e.target.value; applyTransforms(); });
    resetBtn.addEventListener('click', () => {
        image1ScaleSlider.value = 100; image2ScaleSlider.value = 100;
        image1HorizontalSlider.value = 0; image1VerticalSlider.value = 0;
        image2HorizontalSlider.value = 0; image2VerticalSlider.value = 0;
        image2TransparencySlider.value = 44;
        image1ScaleLabel.textContent = '100%'; image2ScaleLabel.textContent = '100%';
        image2TransparencyLabel.textContent = '44%';
        transforms = { img1: { scale: 1, tx: 0, ty: 0 }, img2: { scale: 1, tx: 0, ty: 0 } };
        comparisonImage2.style.opacity = 0.44;
        applyTransforms();
    });
    clearAllBtn.addEventListener('click', () => {
        image1Data = null; image2Data = null;
        image1Display.src = ''; image2Display.src = '';
        comparisonImage1.src = ''; comparisonImage2.src = '';
        comparisonImage1.classList.remove('loaded'); comparisonImage2.classList.remove('loaded');
        image1UploadBox.classList.remove('has-image'); image2UploadBox.classList.remove('has-image');
        updateComparisonView();
        resetBtn.click();
    });
}


function initAdvancedCompare() {
    const advCompareTab = document.getElementById('WordingCompare');
    if (!advCompareTab) return;
    
    const compareBtn = advCompareTab.querySelector('#compare-wording-btn');
    const changesList = advCompareTab.querySelector('#changes-list');
    const scrollSyncToggle = advCompareTab.querySelector('#scroll-sync-toggle');
    
    const viewers = [
        { id: 1, wrapper: advCompareTab.querySelector('#pdf-viewer-1'), input: advCompareTab.querySelector('#file-input-1'), renderContainer: advCompareTab.querySelector('#render-container-1'), file: null, textContent: null, diffs: null },
        { id: 2, wrapper: advCompareTab.querySelector('#pdf-viewer-2'), input: advCompareTab.querySelector('#file-input-2'), renderContainer: advCompareTab.querySelector('#render-container-2'), file: null, textContent: null, diffs: null }
    ];

    let isSyncing = false;

    const handleFileSelect = async (viewer, file) => {
        if (!file) return;
        viewer.file = file;
        viewer.renderContainer.innerHTML = '<p class="upload-prompt">Memuat...</p>';
        viewer.wrapper.classList.add('has-content');
        changesList.innerHTML = '<p class="no-changes-yet">Unggah dokumen kedua untuk memulai perbandingan.</p>';
        
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
        pre.className = 'text-file-view';
        pre.textContent = text;
        viewer.renderContainer.innerHTML = '';
        viewer.renderContainer.appendChild(pre);
        viewer.textContent = { text: text, items: [] }; // Store text content
    };

    const processPdf = (viewer) => {
        return new Promise((resolve, reject) => {
            if (typeof pdfjsLib === 'undefined') {
                viewer.renderContainer.innerHTML = '<p class="upload-prompt" style="color:red;">Pustaka PDF.js tidak dimuat.</p>';
                return reject(new Error("PDF.js not loaded"));
            }
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;
                    const pdf = await pdfjsLib.getDocument({ data: e.target.result }).promise;
                    viewer.renderContainer.innerHTML = '';
                    let fullText = '';
                    let allTextItems = [];

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const viewport = page.getViewport({ scale: 1.5 });
                        
                        const pageContainer = document.createElement('div');
                        pageContainer.className = 'page-container';
                        pageContainer.style.width = `${viewport.width}px`;
                        pageContainer.style.height = `${viewport.height}px`;

                        const canvas = document.createElement('canvas');
                        const textLayer = document.createElement('div');
                        textLayer.className = 'textLayer';
                        
                        pageContainer.appendChild(canvas);
                        pageContainer.appendChild(textLayer);
                        viewer.renderContainer.appendChild(pageContainer);

                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        
                        await page.render({ canvasContext: context, viewport: viewport }).promise;

                        const textContent = await page.getTextContent();
                        pdfjsLib.renderTextLayer({ textContent, container: textLayer, viewport, textDivs: [] });

                        fullText += textContent.items.map(item => item.str).join(' ') + '\n';
                        allTextItems.push(...textContent.items.map(item => ({ ...item, pageNum: i })));
                    }
                    viewer.textContent = { text: fullText, items: allTextItems };
                    resolve();
                } catch (err) {
                    viewer.renderContainer.innerHTML = `<p class="upload-prompt" style="color:red;">Gagal merender PDF: ${err.message}</p>`;
                    reject(err);
                }
            };
            reader.readAsArrayBuffer(viewer.file);
        });
    };
    
    viewers.forEach(viewer => {
        viewer.wrapper.addEventListener('click', (e) => { if (e.target.closest('.upload-prompt')) viewer.input.click(); });
        viewer.input.addEventListener('change', () => handleFileSelect(viewer, viewer.input.files[0]));
        viewer.wrapper.addEventListener('dragover', (e) => { e.preventDefault(); viewer.wrapper.classList.add('drag-over'); });
        viewer.wrapper.addEventListener('dragleave', () => viewer.wrapper.classList.remove('drag-over'));
        viewer.wrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            viewer.wrapper.classList.remove('drag-over');
            if (e.dataTransfer.files.length) handleFileSelect(viewer, e.dataTransfer.files[0]);
        });
        viewer.wrapper.addEventListener('scroll', () => {
            if (isSyncing || !scrollSyncToggle.checked) return;
            isSyncing = true;
            const otherViewer = viewers.find(v => v.id !== viewer.id);
            otherViewer.wrapper.scrollTop = viewer.wrapper.scrollTop;
            setTimeout(() => { isSyncing = false; }, 50);
        });
    });

    compareBtn.addEventListener('click', () => {
        if (!viewers[0].textContent || !viewers[1].textContent) return;
        changesList.innerHTML = '<p class="no-changes-yet">Menganalisis perbedaan...</p>';
        
        const dmp = new diff_match_patch();
        const diffs = dmp.diff_main(viewers[0].textContent.text, viewers[1].textContent.text);
        dmp.diff_cleanupSemantic(diffs);

        viewers[0].diffs = diffs;
        viewers[1].diffs = diffs;

        populateChangesSidebar(diffs);
        highlightDifferences();
    });

    function populateChangesSidebar(diffs) {
        changesList.innerHTML = '';
        let changeIdCounter = 0;
        for (let i = 0; i < diffs.length; i++) {
            if (diffs[i][0] === 0) continue;

            const changeItem = document.createElement('div');
            changeItem.className = 'change-item';
            let headerText = '', delText = '', insText = '';

            if (diffs[i][0] === -1 && (i + 1 < diffs.length && diffs[i+1][0] === 1)) {
                headerText = `DIGANTI`; delText = diffs[i][1]; insText = diffs[i+1][1]; i++;
            } else if (diffs[i][0] === -1) {
                headerText = `DIHAPUS`; delText = diffs[i][1];
            } else if (diffs[i][0] === 1) {
                headerText = `DITAMBAH`; insText = diffs[i][1];
            }
            
            changeIdCounter++;
            changeItem.dataset.changeId = changeIdCounter;
            changeItem.innerHTML = `<div class="change-item-header">${changeIdCounter}. ${headerText}</div>`;
            if (delText) changeItem.innerHTML += `<del>${delText.trim()}</del>`;
            if (insText) changeItem.innerHTML += `<ins>${insText.trim()}</ins>`;
            
            changeItem.addEventListener('click', (e) => {
                document.querySelectorAll('.change-item.active').forEach(item => item.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                const targetHighlight = document.querySelector(`.highlight-id-${changeIdCounter}`);
                if (targetHighlight) {
                    targetHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
            changesList.appendChild(changeItem);
        }
        if (changesList.innerHTML === '') {
            changesList.innerHTML = '<p class="no-changes-yet">Tidak ada perbedaan yang ditemukan.</p>';
        }
    }

    function highlightDifferences() {
        viewers.forEach(viewer => {
            const isPdf = viewer.file.type === 'application/pdf';
            const renderEl = isPdf ? viewer.renderContainer.querySelector('.textLayer') : viewer.renderContainer.querySelector('pre');
            if (!renderEl || !viewer.diffs) return;

            const dmp = new diff_match_patch();
            const html = dmp.diff_prettyHtml(viewer.diffs).replace(/&para;/g, '');

            if(isPdf) {
                const textDivs = Array.from(viewer.renderContainer.querySelectorAll('.textLayer > span'));
                let currentTextIndex = 0;
                let tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                
                const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
                let node;
                while(node = walker.nextNode()) {
                     if(currentTextIndex >= textDivs.length) break;
                     const text = node.nodeValue;
                     const parentTag = node.parentElement.tagName;

                     if(parentTag === 'DEL' && viewer.id === 1) {
                         textDivs[currentTextIndex].classList.add('highlight-del');
                     } else if(parentTag === 'INS' && viewer.id === 2) {
                         textDivs[currentTextIndex].classList.add('highlight-ins');
                     }
                     currentTextIndex++;
                }
            } else {
                 let html = '';
                 viewer.diffs.forEach(([op, text]) => {
                    const escapedText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    if(op === 0) html += escapedText;
                    else if(op === -1 && viewer.id === 1) html += `<span class="highlight-del">${escapedText}</span>`;
                    else if(op === 1 && viewer.id === 2) html += `<span class="highlight-ins">${escapedText}</span>`;
                    else html += escapedText;
                });
                renderEl.innerHTML = html;
            }
        });
    }
}