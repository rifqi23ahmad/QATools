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
        navigator.clipboard.writeText(output.value).then(() => {
            alert('Hasil disalin ke clipboard!');
        });
    } catch (err) {
        alert('Gagal menyalin.');
    }
}

// This function will run once the entire page is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all tools
    openTool({ currentTarget: document.querySelector('.tab-link.active') }, 'JsonFormatter');
    initJsonFormatter(); 
    initJsonCompare(); 
    initImageCompare();
    initAdvancedCompare();
    initApiTester(); // Initialize the new API Tester tool
});

// --- JSON Formatter Logic ---
function initJsonFormatter() {
    const inputArea = document.getElementById('json-input');
    const outputArea = document.getElementById('json-output');
    const inputLineNumbers = document.getElementById('input-line-numbers');
    const outputLineNumbers = document.getElementById('output-line-numbers');
    
    const formatBtn = document.getElementById('json-format-btn');
    const minifyBtn = document.getElementById('json-minify-btn');
    const validateBtn = document.getElementById('json-validate-btn');
    const copyBtn = document.getElementById('json-copy-btn');
    const indentSelect = document.getElementById('json-indent-select');
    const uploadBtn = document.getElementById('json-upload-btn');
    const fileInput = document.getElementById('json-file-input');
    const downloadBtn = document.getElementById('json-download-btn');

    if (!inputArea) return; // Exit if elements are not on the page

    const updateLineNumbers = (textArea, lineNumbersContainer) => {
        const lineCount = textArea.value.split('\n').length;
        lineNumbersContainer.innerHTML = Array.from({ length: lineCount }, (_, i) => `<span>${i + 1}</span>`).join('');
    };
    
    const syncScroll = (source, target) => {
        target.scrollTop = source.scrollTop;
    };
    
    inputArea.addEventListener('input', () => updateLineNumbers(inputArea, inputLineNumbers));
    inputArea.addEventListener('scroll', () => syncScroll(inputArea, inputLineNumbers));
    outputArea.addEventListener('scroll', () => syncScroll(outputArea, outputLineNumbers));


    function highlightJsonSyntax(jsonString) {
        if (!jsonString) return '';
        jsonString = jsonString.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return jsonString.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                cls = /:$/.test(match) ? 'json-key' : 'json-string';
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return `<span class="${cls}">${match}</span>`;
        });
    }

    const processJson = (action) => {
        const jsonString = inputArea.value.trim();
        if (!jsonString) {
            outputArea.innerHTML = '<span class="json-error">Error: Input JSON kosong.</span>';
            return;
        }

        try {
            const jsonObj = JSON.parse(jsonString);
            let formattedJson;

            if (action === 'format' || action === 'minify') {
                const indentValue = (action === 'minify') ? '' : (indentSelect.value === 'tab' ? '\t' : parseInt(indentSelect.value, 10));
                formattedJson = JSON.stringify(jsonObj, null, indentValue);
                outputArea.innerHTML = highlightJsonSyntax(formattedJson);
                const lineCount = formattedJson.split('\n').length;
                outputLineNumbers.innerHTML = Array.from({ length: lineCount }, (_, i) => `<span>${i + 1}</span>`).join('');
            } else if (action === 'validate') {
                outputArea.innerHTML = '<span style="color: green; font-weight: bold;">JSON valid!</span>';
                outputLineNumbers.innerHTML = '<span>1</span>';
            }
        } catch (e) {
            outputArea.innerHTML = `<span class="json-error">Error: JSON tidak valid.\n${e.message}</span>`;
            outputLineNumbers.innerHTML = '<span>1</span>';
        }
        updateLineNumbers(inputArea, inputLineNumbers);
    };

    formatBtn.addEventListener('click', () => processJson('format'));
    minifyBtn.addEventListener('click', () => processJson('minify'));
    validateBtn.addEventListener('click', () => processJson('validate'));
    copyBtn.addEventListener('click', () => navigator.clipboard.writeText(outputArea.textContent).then(() => alert('Hasil disalin!'), () => alert('Gagal menyalin.')));
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                inputArea.value = e.target.result;
                processJson('format');
            };
            reader.readAsText(file);
        }
    });
    downloadBtn.addEventListener('click', () => {
        const content = outputArea.textContent;
        if (!content || outputArea.querySelector('.json-error')) {
            alert('Tidak ada konten valid untuk diunduh.');
            return;
        }
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'formatted.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    updateLineNumbers(inputArea, inputLineNumbers);
}


// --- JSON Compare Logic ---
function initJsonCompare() {
    const input1 = document.getElementById('json-compare-input1');
    const input2 = document.getElementById('json-compare-input2');
    const compareBtn = document.getElementById('json-compare-btn');
    const outputLeft = document.getElementById('json-compare-output-left');
    const outputRight = document.getElementById('json-compare-output-right');
    const headerLeft = document.getElementById('diff-header-left');
    const headerRight = document.getElementById('diff-header-right');

    if (!input1) return; // Exit if elements are not on the page

    const escapeHtml = (text) => text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const createLineHtml = (lineNumber, content, type, highlightWords = '') => {
        let finalContent = highlightWords || escapeHtml(content || '');
        return `<div class="diff-line ${type}">` +
               `<div class="diff-line-number">${lineNumber}</div>` +
               `<div class="diff-line-content">${finalContent || '&nbsp;'}</div>` +
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
            const lines = data.split('\n').filter(Boolean);

            if (op === 0) { // Unchanged
                lines.forEach(line => {
                    htmlLeft += createLineHtml(lineNumLeft++, line, 'context');
                    htmlRight += createLineHtml(lineNumRight++, line, 'context');
                });
            } else if (op === -1) { // Deletion
                let nextOp = (i + 1 < diffs.length) ? diffs[i+1][0] : 0;
                let nextData = (nextOp === 1) ? diffs[i+1][1] : '';
                
                if (nextOp === 1 && lines.length === nextData.split('\n').filter(Boolean).length) {
                    const nextLines = nextData.split('\n').filter(Boolean);
                    for(let j=0; j < lines.length; j++) {
                        const wordDiffs = dmp.diff_main(lines[j], nextLines[j]);
                        let lineHtmlLeft = '', lineHtmlRight = '';
                        wordDiffs.forEach(([wordOp, wordData]) => {
                            const escapedWord = escapeHtml(wordData);
                            if (wordOp === 0) {
                                lineHtmlLeft += escapedWord;
                                lineHtmlRight += escapedWord;
                            } else if (wordOp === -1) {
                                lineHtmlLeft += `<span class="highlight-word">${escapedWord}</span>`;
                            } else if (wordOp === 1) {
                                lineHtmlRight += `<span class="highlight-word">${escapedWord}</span>`;
                            }
                        });
                        htmlLeft += createLineHtml(lineNumLeft++, '', 'removed', lineHtmlLeft);
                        htmlRight += createLineHtml(lineNumRight++, '', 'added', lineHtmlRight);
                        removals++; additions++;
                    }
                    i++; // Skip the next diff as it has been processed
                } else {
                    lines.forEach(line => {
                        htmlLeft += createLineHtml(lineNumLeft++, line, 'removed');
                        htmlRight += createLineHtml('&nbsp;', '&nbsp;', 'placeholder');
                        removals++;
                    });
                }
            } else if (op === 1) { // Insertion
                lines.forEach(line => {
                    htmlRight += createLineHtml(lineNumRight++, line, 'added');
                    htmlLeft += createLineHtml('&nbsp;', '&nbsp;', 'placeholder');
                    additions++;
                });
            }
        }

        outputLeft.innerHTML = htmlLeft;
        outputRight.innerHTML = htmlRight;
        headerLeft.innerHTML = removals > 0 ? `<span class="removals">- ${removals} removals</span>` : 'JSON Asli';
        headerRight.innerHTML = additions > 0 ? `<span class="additions">+ ${additions} additions</span>` : 'JSON Revisi';
    });
}


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
                    else if(op === -1 && viewer.id === 1) html += `<button class="highlight-del">${escapedText}</button>`;
                    else if(op === 1 && viewer.id === 2) html += `<button class="highlight-ins">${escapedText}</button>`;
                    else html += escapedText;
                });
                renderEl.innerHTML = html;
            }
        });
    }
}


// --- API Tester Logic ---
function initApiTester() {
    const apiTesterTab = document.getElementById('ApiTester');
    if (!apiTesterTab) return; 

    const apiForm = document.getElementById('api-form');
    const methodSelect = document.getElementById('method');
    const urlInput = document.getElementById('url');
    const sendBtn = document.getElementById('send-btn');
    const sendText = document.getElementById('send-text');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    const addHeaderBtn = document.getElementById('add-header-btn');
    const headersContainer = document.getElementById('headers-container');
    const requestBodyTextarea = document.getElementById('request-body');
    const beautifyReqBtn = document.getElementById('beautify-req-btn');
    const reqTabHeaders = document.getElementById('tab-headers-req');
    const reqTabBody = document.getElementById('tab-body-req');
    const reqContentHeaders = document.getElementById('content-headers-req');
    const reqContentBody = document.getElementById('content-body-req');

    const responseSection = document.getElementById('response-section');
    const responseStatus = document.getElementById('response-status');
    const responseTime = document.getElementById('response-time');
    const responseBodyCode = document.getElementById('response-body');
    const responseHeadersCode = document.getElementById('response-headers');
    const beautifyResBtn = document.getElementById('beautify-res-btn');
    const copyResBtn = document.getElementById('copy-res-btn');
    const resTabBody = document.getElementById('tab-body-res');
    const resTabHeaders = document.getElementById('tab-headers-res');
    const resContentBody = document.getElementById('content-body-res');
    const resContentHeaders = document.getElementById('content-headers-res');
    
    // History Elements
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // Gemini Modal Elements
    const geminiModal = document.getElementById('gemini-modal');
    const showGeminiModalBtn = document.getElementById('show-gemini-modal-btn');
    const closeGeminiModalBtn = document.getElementById('close-gemini-modal-btn');
    const geminiLoading = document.getElementById('gemini-loading');
    const geminiResult = document.getElementById('gemini-result');
    const geminiPromptOptions = document.getElementById('gemini-prompt-options');

    const STORAGE_KEY_PREFIX = 'api-tester-history-';

    // --- History Functions ---
    const loadHistory = () => {
        historyList.innerHTML = '';
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(STORAGE_KEY_PREFIX)) {
                const historyKey = key.replace(STORAGE_KEY_PREFIX, '');
                const { method } = JSON.parse(localStorage.getItem(key));
                const item = document.createElement('button');
                item.className = 'w-full text-left p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm truncate';
                item.dataset.historyKey = historyKey;
                item.innerHTML = `<span class="font-bold text-xs ${getMethodColor(method)}">${method}</span> <span class="text-gray-300">${historyKey}</span>`;
                item.addEventListener('click', () => loadRequestFromHistory(historyKey));
                historyList.appendChild(item);
            }
        });
    };

    const saveRequestToHistory = (key, data) => {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, JSON.stringify(data));
        loadHistory();
    };
    
    const loadRequestFromHistory = (key) => {
        const data = JSON.parse(localStorage.getItem(`${STORAGE_KEY_PREFIX}${key}`));
        if (data) {
            methodSelect.value = data.method;
            urlInput.value = data.url;
            requestBodyTextarea.value = data.body;
            headersContainer.innerHTML = '';
            if (data.headers && data.headers.length > 0) {
                data.headers.forEach(h => addHeader(h.key, h.value));
            } else {
                addHeader(); // Add one empty header if none are saved
            }
            toggleRequestBody();
        }
    };

    const clearHistory = () => {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(STORAGE_KEY_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
        loadHistory();
    };

    const getMethodColor = (method) => {
        switch(method.toUpperCase()) {
            case 'GET': return 'text-blue-400';
            case 'POST': return 'text-green-400';
            case 'PUT': return 'text-yellow-400';
            case 'PATCH': return 'text-orange-400';
            case 'DELETE': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };
    
    // --- Core Functions ---
    const addHeader = (key = '', value = '') => {
        const headerDiv = document.createElement('div');
        headerDiv.classList.add('flex', 'items-center', 'gap-2');
        headerDiv.innerHTML = `<input type="text" placeholder="Key" class="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 header-key" value="${key}"><input type="text" placeholder="Value" class="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 header-value" value="${value}"><button type="button" class="text-gray-400 hover:text-red-500" onclick="this.parentElement.remove()"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg></button>`;
        headersContainer.appendChild(headerDiv);
    };
    
    addHeader();

    const toggleRequestBody = () => {
        const method = methodSelect.value;
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            reqContentBody.classList.remove('hidden');
            reqTabBody.disabled = false;
        } else {
            reqContentBody.classList.add('hidden');
            if (reqTabBody.classList.contains('api-tab-active')) {
                reqTabBody.classList.remove('api-tab-active');
                reqContentBody.classList.add('hidden');
                reqTabHeaders.classList.add('api-tab-active');
                reqContentHeaders.classList.remove('hidden');
            }
            reqTabBody.disabled = true;
        }
    };

    const parseCurlCommand = (curlString) => {
        try {
            const cleanedCurl = curlString.replace(/\\\n/g, ' ').replace(/\s{2,}/g, ' ');
            const urlMatch = cleanedCurl.match(/curl\s+(?:--[^ \t]+[ \t]+)*'([^']*)'|curl\s+(?:--[^ \t]+[ \t]+)*"([^"]*)"|curl\s+([^\s\-][^ \t]*)/);
            if (!urlMatch) throw new Error("Could not find a valid URL.");
            const url = urlMatch[1] || urlMatch[2] || urlMatch[3];
            let method = 'GET';
            const methodMatch = cleanedCurl.match(/-X\s+([A-Z]+)|--request\s+([A-Z]+)/);
            if (methodMatch) method = methodMatch[1] || methodMatch[2];
            else if (cleanedCurl.includes('--data-raw') || cleanedCurl.includes('-d ') || cleanedCurl.includes('--data ')) method = 'POST';
            const headers = [];
            const headerRegex = /-H\s+'([^']*)'|-H\s+"([^"]*)"/g;
            let headerMatch;
            while ((headerMatch = headerRegex.exec(cleanedCurl)) !== null) {
                const headerStr = headerMatch[1] || headerMatch[2];
                const separatorIndex = headerStr.indexOf(':');
                if (separatorIndex !== -1) {
                    const key = headerStr.substring(0, separatorIndex).trim();
                    const value = headerStr.substring(separatorIndex + 1).trim();
                    headers.push({ key, value });
                }
            }
            let body = '';
            const bodyMatch = cleanedCurl.match(/--data-raw\s+'([^']*)'|--data-raw\s+"([^"]*)"/);
            if (bodyMatch) body = bodyMatch[1] || bodyMatch[2];
            return { url, method, headers, body };
        } catch (error) {
            console.error("cURL parsing failed:", error);
            return null;
        }
    };

    const handleCurlPaste = (e) => {
        const pastedData = (e.clipboardData || window.clipboardData).getData('text');
        if (pastedData.trim().startsWith('curl')) {
            e.preventDefault();
            const parsedData = parseCurlCommand(pastedData);
            if (parsedData) {
                urlInput.value = parsedData.url;
                methodSelect.value = parsedData.method.toUpperCase();
                headersContainer.innerHTML = '';
                if (parsedData.headers.length > 0) parsedData.headers.forEach(h => addHeader(h.key, h.value));
                else addHeader();
                requestBodyTextarea.value = parsedData.body;
                toggleRequestBody();
            }
        }
    };

    const beautifyJSON = (element) => {
        const isTextArea = element.tagName === 'TEXTAREA';
        const currentText = isTextArea ? element.value : element.textContent;
        if (!currentText.trim()) return;
        try {
            const jsonObj = JSON.parse(currentText);
            const beautifulJson = JSON.stringify(jsonObj, null, 2);
            if (isTextArea) element.value = beautifulJson;
            else element.textContent = beautifulJson;
        } catch (error) {
            console.warn("Content is not valid JSON, cannot beautify.", error.message);
        }
    };

    const copyToClipboard = (text, button) => {
        const originalText = button.textContent;
        navigator.clipboard.writeText(text).then(() => {
            button.textContent = 'Copied!';
            setTimeout(() => { button.textContent = originalText; }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            button.textContent = 'Failed!';
            setTimeout(() => { button.textContent = originalText; }, 2000);
        });
    };

    // --- Gemini AI Functions ---
    const callGeminiAPI = async (prompt) => {
        geminiPromptOptions.classList.add('hidden');
        geminiLoading.classList.remove('hidden');
        geminiResult.innerHTML = '';

        const apiKey = ""; // API key is handled by the environment
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }]
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                 const errorBody = await response.text();
                 throw new Error(`API call failed with status: ${response.status}. Body: ${errorBody}`);
            }

            const result = await response.json();
            
            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content.parts) {
                const text = result.candidates[0].content.parts[0].text;
                let html = text
                    .replace(/```javascript\n/g, '<pre><code class="language-javascript">')
                    .replace(/```\n/g, '</code></pre>')
                    .replace(/```/g, '`')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/^(#+)\s*(.*)/gm, (match, hashes, content) => `<h${hashes.length}>${content}</h${hashes.length}>`)
                    .replace(/\n/g, '<br>');

                geminiResult.innerHTML = html;
            } else {
                geminiResult.innerHTML = `<p class="text-yellow-400">Received an unexpected response format from Gemini.</p><pre>${JSON.stringify(result, null, 2)}</pre>`;
            }
        } catch (error) {
            geminiResult.innerHTML = `<p class="text-red-400">Error: ${error.message}</p><p class="text-gray-400 mt-2">Note: The Gemini API call might be blocked due to CORS. Try using a local web server.</p>`;
        } finally {
            geminiLoading.classList.add('hidden');
        }
    };

    const handleGeminiPrompt = (e) => {
        const button = e.target.closest('.gemini-prompt-btn');
        if (!button) return;

        const promptType = button.dataset.promptType;
        const status = responseStatus.textContent;
        const headers = responseHeadersCode.textContent;
        const body = responseBodyCode.textContent;

        let prompt = `Analisis respons API berikut dan berikan wawasan dalam Bahasa Indonesia.
Respons Status: ${status}
Respons Headers:
${headers}
Respons Body:
${body}

---
`;

        if (promptType === 'explain') {
            prompt += "Tugas: Jelaskan apa arti respons ini dalam bahasa Indonesia yang sederhana dan jelas. Jelaskan informasi penting di dalam body respons.";
        } else if (promptType === 'issues') {
            prompt += "Tugas: Identifikasi potensi masalah dalam respons ini. Ini bisa berupa status error (4xx, 5xx), masalah keamanan (seperti info sensitif di header), atau peluang perbaikan. Jika tidak ada masalah, sebutkan bahwa respons terlihat baik. Berikan jawaban dalam bahasa Indonesia.";
        } else if (promptType === 'code') {
            prompt += "Tugas: Buatkan contoh kode JavaScript modern menggunakan 'async/await' dan 'fetch' untuk menangani respons ini. Kode harus memeriksa apakah respons OK, melakukan parse JSON jika relevan, dan mencatat data atau error ke konsol. Berikan penjelasan kode dalam bahasa Indonesia.";
        }

        callGeminiAPI(prompt);
    };


    // --- Event Listeners ---
    urlInput.addEventListener('paste', handleCurlPaste);
    addHeaderBtn.addEventListener('click', () => addHeader());
    methodSelect.addEventListener('change', toggleRequestBody);

    beautifyReqBtn.addEventListener('click', () => beautifyJSON(requestBodyTextarea));
    beautifyResBtn.addEventListener('click', () => beautifyJSON(responseBodyCode));
    copyResBtn.addEventListener('click', () => copyToClipboard(responseBodyCode.textContent, copyResBtn));
    clearHistoryBtn.addEventListener('click', clearHistory);

    showGeminiModalBtn.addEventListener('click', () => {
        geminiModal.style.display = 'flex';
        geminiResult.innerHTML = '';
        geminiLoading.classList.add('hidden');
        geminiPromptOptions.classList.remove('hidden');
    });
    closeGeminiModalBtn.addEventListener('click', () => {
        geminiModal.style.display = 'none';
    });
    document.querySelectorAll('.gemini-prompt-btn').forEach(btn => {
        btn.addEventListener('click', handleGeminiPrompt);
    });

    reqTabHeaders.addEventListener('click', () => { reqTabHeaders.classList.add('api-tab-active'); reqTabBody.classList.remove('api-tab-active'); reqContentHeaders.classList.remove('hidden'); reqContentBody.classList.add('hidden'); });
    reqTabBody.addEventListener('click', () => { if (!reqTabBody.disabled) { reqTabBody.classList.add('api-tab-active'); reqTabHeaders.classList.remove('api-tab-active'); reqContentBody.classList.remove('hidden'); reqContentHeaders.classList.add('hidden'); } });
    resTabBody.addEventListener('click', () => { resTabBody.classList.add('api-tab-active'); resTabHeaders.classList.remove('api-tab-active'); resContentBody.classList.remove('hidden'); resContentHeaders.classList.add('hidden'); });
    resTabHeaders.addEventListener('click', () => { resTabHeaders.classList.add('api-tab-active'); resTabBody.classList.remove('api-tab-active'); resContentHeaders.classList.remove('hidden'); resContentBody.classList.add('hidden'); });

    apiForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        sendText.textContent = 'Sending...';
        loadingSpinner.classList.remove('hidden');
        sendBtn.disabled = true;
        responseSection.classList.add('hidden');
        
        const url = urlInput.value;
        const method = methodSelect.value;
        const requestBody = requestBodyTextarea.value;
        const startTime = performance.now();
        
        const headers = [];
        document.querySelectorAll('.header-key').forEach((keyInput, index) => { 
            if (keyInput.value) {
                headers.push({
                    key: keyInput.value,
                    value: document.querySelectorAll('.header-value')[index].value
                });
            }
        });

        const fetchHeaders = new Headers();
        headers.forEach(h => fetchHeaders.append(h.key, h.value));

        const options = { method, headers: fetchHeaders, mode: 'cors' };
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            if (!fetchHeaders.has('Content-Type') && requestBody.trim().startsWith('{')) {
                fetchHeaders.append('Content-Type', 'application/json');
            }
            options.body = requestBody;
        }

        try {
            const response = await fetch(url, options);
            const endTime = performance.now();
            responseSection.classList.remove('hidden');
            responseTime.textContent = `${Math.round(endTime - startTime)} ms`;
            
            if (response.status >= 200 && response.status < 300) {
                responseStatus.className = 'font-semibold text-green-400';
                
                // Save to history on success
                const path = new URL(url).pathname;
                const key = path.split('/').filter(Boolean).pop() || 'request';
                const historyData = { method, url, headers, body: requestBody };
                saveRequestToHistory(key, historyData);

            } else if (response.status >= 400) {
                responseStatus.className = 'font-semibold text-red-400';
            } else {
                responseStatus.className = 'font-semibold text-yellow-400';
            }
            responseStatus.textContent = `Status: ${response.status} ${response.statusText}`;
            
            let headersStr = '';
            for (const [key, value] of response.headers.entries()) {
                headersStr += `${key}: ${value}\n`;
            }
            responseHeadersCode.textContent = headersStr;
            
            const contentType = response.headers.get('content-type');
            const bodyText = await response.text();
            
            if (contentType && contentType.includes('application/json') && bodyText) {
                responseBodyCode.textContent = bodyText;
                beautifyJSON(responseBodyCode);
            } else {
                responseBodyCode.textContent = bodyText;
            }
        } catch (error) {
            responseSection.classList.remove('hidden');
            responseStatus.textContent = 'Error';
            responseStatus.className = 'font-semibold text-red-500';
            responseTime.textContent = '';
            responseBodyCode.textContent = `Request failed. This might be a CORS issue.\n\nError: ${error.message}`;
            responseHeadersCode.textContent = 'Gagal mengambil header.';
        } finally {
            sendText.textContent = 'Send';
            loadingSpinner.classList.add('hidden');
            sendBtn.disabled = false;
        }
    });
    
    // Initial setup
    toggleRequestBody();
    loadHistory();
}