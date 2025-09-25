function initImageCompare() {
    const page = document.getElementById('ImageCompare');
    page.innerHTML = `
        <div class="tool-header">
            <h1>Image Compare</h1>
            <p>Bandingkan dua gambar secara visual dengan overlay transparan dan mode presisi.</p>
        </div>
        <div class="card">
            <div id="image-compare-status" style="padding: 1rem; background-color: #ebf8ff; color: #3182ce; border-radius: 6px; margin-bottom: 1.5rem; text-align: center;">Tempel (Ctrl+V) atau seret & jatuhkan gambar untuk memulai.</div>
            <div class="grid grid-cols-2">
                <div class="image-upload-box" id="image1-box">
                    <h3>Gambar 1</h3>
                    <div class="upload-area"><p>Tempel atau seret file</p></div>
                    <img id="image1-display" style="display:none;">
                </div>
                <div class="image-upload-box" id="image2-box">
                    <h3>Gambar 2</h3>
                    <div class="upload-area"><p>Tempel atau seret file</p></div>
                    <img id="image2-display" style="display:none;">
                </div>
            </div>
        </div>
        <div class="card is-hidden" id="comparison-section" style="margin-top: 1.5rem;">
            <div class="grid" style="grid-template-columns: 3fr 1fr; align-items: start;">
                <div class="image-comparison-view">
                    <img id="comparison-image1"><img id="comparison-image2">
                </div>
                <div class="controls-sidebar">
                    <h3>Kontrol</h3>
                    <div class="control-group" style="margin-top: 1rem;">
                        <label>Transparansi Gbr. 2: <span id="transparency-label">44%</span></label>
                        <input type="range" id="image2-transparency" min="0" max="100" value="44" class="slider">
                    </div>
                    <div class="control-group" style="margin-top: 1rem;">
                        <label><input type="checkbox" id="enable-precision-btn"> Mode Presisi</label>
                    </div>
                    <div id="precision-controls" class="is-hidden">
                        <hr>
                        <div class="control-group">
                            <label>Skala Gbr. 1: <span id="scale1-label">100%</span></label>
                            <input type="range" id="image1-scale" min="10" max="400" value="100" class="slider">
                        </div>
                         <div class="control-group">
                            <label>Skala Gbr. 2: <span id="scale2-label">100%</span></label>
                            <input type="range" id="image2-scale" min="10" max="400" value="100" class="slider">
                        </div>
                    </div>
                    <hr>
                    <div class="flex" style="gap: 0.5rem;">
                        <button class="button secondary" id="reset-btn">Reset</button>
                        <button class="button" style="background-color: #e53e3e; color: white;" id="clear-all-btn">Hapus Semua</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const image1UploadBox = document.getElementById('image1-box');
    const image2UploadBox = document.getElementById('image2-box');
    const image1Display = document.getElementById('image1-display');
    const image2Display = document.getElementById('image2-display');
    const comparisonSection = document.getElementById('comparison-section');
    const comparisonImage1 = document.getElementById('comparison-image1');
    const comparisonImage2 = document.getElementById('comparison-image2');
    const statusMessage = document.getElementById('image-compare-status');
    const transparencySlider = document.getElementById('image2-transparency');
    const transparencyLabel = document.getElementById('transparency-label');
    const precisionBtn = document.getElementById('enable-precision-btn');
    const precisionControls = document.getElementById('precision-controls');
    const scale1Slider = document.getElementById('image1-scale');
    const scale1Label = document.getElementById('scale1-label');
    const scale2Slider = document.getElementById('image2-scale');
    const scale2Label = document.getElementById('scale2-label');
    const resetBtn = document.getElementById('reset-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');

    let image1Data = null;
    let image2Data = null;

    const updateComparisonView = () => {
        if (image1Data && image2Data) {
            comparisonImage1.src = image1Data;
            comparisonImage2.src = image2Data;
            comparisonSection.classList.remove('is-hidden');
            statusMessage.textContent = 'Gambar siap! Gunakan kontrol untuk membandingkan.';
        } else {
            comparisonSection.classList.add('is-hidden');
        }
    };

    const loadImage = (file, imageNum) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (imageNum === 1) {
                image1Data = e.target.result;
                image1Display.src = image1Data;
                image1UploadBox.classList.add('has-image');
            } else {
                image2Data = e.target.result;
                image2Display.src = image2Data;
                image2UploadBox.classList.add('has-image');
            }
            updateComparisonView();
        };
        reader.readAsDataURL(file);
    };

    document.addEventListener('paste', (e) => {
        if (document.getElementById('ImageCompare').classList.contains('active')) {
            const items = (e.clipboardData || window.clipboardData).items;
            for (const item of items) {
                if (item.type.includes('image')) {
                    const blob = item.getAsFile();
                    if (!image1Data) loadImage(blob, 1);
                    else if (!image2Data) loadImage(blob, 2);
                    break;
                }
            }
        }
    });

    [image1UploadBox, image2UploadBox].forEach((box, index) => {
        box.addEventListener('click', () => { /* allows pasting by clicking first */ });
        box.addEventListener('dragover', (e) => { e.preventDefault(); box.style.borderColor = 'var(--primary-color)'; });
        box.addEventListener('dragleave', () => { box.style.borderColor = 'var(--card-border)'; });
        box.addEventListener('drop', (e) => {
            e.preventDefault();
            box.style.borderColor = 'var(--card-border)';
            if (e.dataTransfer.files.length) {
                loadImage(e.dataTransfer.files[0], index + 1);
            }
        });
    });

    transparencySlider.addEventListener('input', (e) => {
        comparisonImage2.style.opacity = e.target.value / 100;
        transparencyLabel.textContent = `${e.target.value}%`;
    });

    precisionBtn.addEventListener('change', () => {
        precisionControls.classList.toggle('is-hidden');
    });

    function applyTransforms() {
        comparisonImage1.style.transform = `translate(-50%, -50%) scale(${scale1Slider.value / 100})`;
        comparisonImage2.style.transform = `translate(-50%, -50%) scale(${scale2Slider.value / 100})`;
    }

    scale1Slider.addEventListener('input', (e) => {
        scale1Label.textContent = `${e.target.value}%`;
        if (precisionBtn.checked) applyTransforms();
    });
    
    scale2Slider.addEventListener('input', (e) => {
        scale2Label.textContent = `${e.target.value}%`;
        if (precisionBtn.checked) applyTransforms();
    });

    resetBtn.addEventListener('click', () => {
        transparencySlider.value = 44;
        transparencyLabel.textContent = '44%';
        comparisonImage2.style.opacity = 0.44;
        precisionBtn.checked = false;
        precisionControls.classList.add('is-hidden');
        scale1Slider.value = 100;
        scale2Slider.value = 100;
        scale1Label.textContent = '100%';
        scale2Label.textContent = '100%';
        applyTransforms();
    });
    
    clearAllBtn.addEventListener('click', () => {
        image1Data = null;
        image2Data = null;
        image1Display.src = '';
        image2Display.src = '';
        image1UploadBox.classList.remove('has-image');
        image2UploadBox.classList.remove('has-image');
        statusMessage.textContent = 'Tempel (Ctrl+V) atau seret & jatuhkan gambar untuk memulai.';
        resetBtn.click();
        updateComparisonView();
    });
}