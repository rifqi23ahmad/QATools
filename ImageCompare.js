function initImageCompare() {
    const page = document.getElementById('ImageCompare');
    page.innerHTML = `
        <div class="tool-header">
            <h1>Image Compare</h1>
            <p>Klik kotak di bawah untuk memilih gambar aktif, lalu gunakan mouse untuk zoom dan geser.</p>
        </div>
        <div class="card">
            <div id="image-compare-status" style="padding: 1rem; background-color: #ebf8ff; color: #3182ce; border-radius: 6px; margin-bottom: 1.5rem; text-align: center;">Tempel (Ctrl+V) atau seret & jatuhkan gambar untuk memulai.</div>
            <div class="grid grid-cols-2">
                <div class="image-upload-box" id="image1-box" style="cursor: pointer;">
                    <h3>Gambar 1 (Dasar)</h3>
                    <div class="upload-area"><p>Tempel atau seret file</p></div>
                    <img id="image1-display" style="display:none; max-width: 100%; height: auto;">
                </div>
                <div class="image-upload-box" id="image2-box" style="cursor: pointer;">
                    <h3>Gambar 2 (Overlay)</h3>
                    <div class="upload-area"><p>Tempel atau seret file</p></div>
                    <img id="image2-display" style="display:none; max-width: 100%; height: auto;">
                </div>
            </div>
        </div>
        <div class="card is-hidden" id="comparison-section" style="margin-top: 1.5rem;">
            <div class="grid" style="grid-template-columns: 3fr 1fr; align-items: start;">
                <div class="image-comparison-view" style="overflow: hidden; cursor: grab;" tabindex="0">
                    <img id="comparison-image1" class="comparison-image">
                    <img id="comparison-image2" class="comparison-image">
                </div>
                <div class="controls-sidebar">
                    <h3>Kontrol</h3>
                    <div class="control-group" style="margin-top: 1rem;">
                        <label>Transparansi Gbr. Aktif: <span id="transparency-label">50%</span></label>
                        <input type="range" id="transparency-slider" min="0" max="100" value="50" class="slider">
                    </div>
                     <div class="control-group" style="margin-top: 1rem;">
                        <label>Zoom Gbr. Aktif: <span id="zoom-label">100%</span></label>
                    </div>
                    <hr>
                    <p style="font-size: 0.85rem; color: var(--text-secondary);">
                        <b>Klik kotak atas</b> untuk pilih gambar.<br>
                        <b>Drag</b> untuk geser.<br>
                        <b>Scroll</b> untuk zoom.<br>
                        <b>Tombol Panah</b> untuk geser presisi.
                    </p>
                    <hr>
                    <div class="flex" style="gap: 0.5rem;">
                        <button class="button secondary" id="reset-btn">Reset</button>
                        <button class="button" style="background-color: #e53e3e; color: white;" id="clear-all-btn">Hapus Semua</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const style = document.createElement('style');
    style.innerHTML = `
        .comparison-image {
            position: absolute; top: 50%; left: 50%;
            transform-origin: center center; max-width: none !important;
            transition: opacity 0.2s ease;
        }
        .image-upload-box.active-control {
            border-style: solid; border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.5);
        }
        .image-comparison-view:focus { outline: 2px solid var(--primary-color); }
    `;
    document.head.appendChild(style);

    const image1UploadBox = document.getElementById('image1-box');
    const image2UploadBox = document.getElementById('image2-box');
    const image1Display = document.getElementById('image1-display');
    const image2Display = document.getElementById('image2-display');
    const comparisonSection = document.getElementById('comparison-section');
    const comparisonImage1 = document.getElementById('comparison-image1');
    const comparisonImage2 = document.getElementById('comparison-image2');
    const comparisonView = page.querySelector('.image-comparison-view');
    const statusMessage = document.getElementById('image-compare-status');
    const transparencySlider = document.getElementById('transparency-slider');
    const transparencyLabel = document.getElementById('transparency-label');
    const zoomLabel = document.getElementById('zoom-label');
    const resetBtn = document.getElementById('reset-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');

    let image1Data = null, image2Data = null;
    let isDragging = false;
    let lastMouseX, lastMouseY; // Menggunakan metode delta untuk drag yang lebih stabil
    
    let activeImage = null;
    const transforms = {
        img1: { scale: 1, panX: 0, panY: 0, opacity: 1 },
        img2: { scale: 1, panX: 0, panY: 0, opacity: 0.5 }
    };

    const setActiveImage = (imgElement) => {
        if (!imgElement) return;
        activeImage = imgElement;
        
        image1UploadBox.classList.toggle('active-control', activeImage === comparisonImage1);
        image2UploadBox.classList.toggle('active-control', activeImage === comparisonImage2);
        
        const activeTransformKey = (activeImage === comparisonImage1) ? 'img1' : 'img2';
        const activeTransform = transforms[activeTransformKey];
        
        zoomLabel.textContent = `${Math.round(activeTransform.scale * 100)}%`;
        transparencySlider.value = activeTransform.opacity * 100;
        transparencyLabel.textContent = `${Math.round(activeTransform.opacity * 100)}%`;
        
        comparisonView.focus(); // Sangat penting untuk kontrol keyboard
    };
    
    const updateComparisonView = () => {
        if (image1Data && image2Data) {
            comparisonImage1.src = image1Data;
            comparisonImage2.src = image2Data;
            comparisonSection.classList.remove('is-hidden');
            statusMessage.textContent = 'Gambar siap! Gunakan kontrol untuk membandingkan.';
            resetTransforms(); 
            setActiveImage(comparisonImage2);
        } else {
            comparisonSection.classList.add('is-hidden');
        }
    };
    
    const loadImage = (file, imageNum) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target.result;
            if (imageNum === 1) {
                image1Data = result;
                image1Display.src = result;
                image1Display.style.display = 'block';
                image1UploadBox.classList.add('has-image');
            } else {
                image2Data = result;
                image2Display.src = result;
                image2Display.style.display = 'block';
                image2UploadBox.classList.add('has-image');
            }
            updateComparisonView();
        };
        reader.readAsDataURL(file);
    };

    document.addEventListener('paste', (e) => {
        if (!document.getElementById('ImageCompare').classList.contains('active')) return;
        const items = (e.clipboardData || window.clipboardData).items;
        for (const item of items) {
            if (item.type.includes('image')) {
                const blob = item.getAsFile();
                if (!image1Data) loadImage(blob, 1);
                else if (!image2Data) loadImage(blob, 2);
                break;
            }
        }
    });

    [image1UploadBox, image2UploadBox].forEach((box) => {
        box.addEventListener('dragover', (e) => { e.preventDefault(); box.style.borderColor = 'var(--primary-color)'; });
        box.addEventListener('dragleave', (e) => { e.target.style.borderColor = 'var(--card-border)'; });
        box.addEventListener('drop', (e) => {
            e.preventDefault();
            e.target.style.borderColor = 'var(--card-border)';
            const file = e.dataTransfer.files[0];
            if (file) loadImage(file, box.id === 'image1-box' ? 1 : 2);
        });
    });
    
    image1UploadBox.addEventListener('click', () => { if(image1Data) setActiveImage(comparisonImage1); });
    image2UploadBox.addEventListener('click', () => { if(image2Data) setActiveImage(comparisonImage2); });

    transparencySlider.addEventListener('input', (e) => {
        if (!activeImage) return;
        const activeTransformKey = (activeImage === comparisonImage1) ? 'img1' : 'img2';
        transforms[activeTransformKey].opacity = e.target.value / 100;
        applyTransforms();
    });

    function applyTransforms() {
        const t1 = transforms.img1;
        const t2 = transforms.img2;
        comparisonImage1.style.transform = `translate(calc(-50% + ${t1.panX}px), calc(-50% + ${t1.panY}px)) scale(${t1.scale})`;
        comparisonImage1.style.opacity = t1.opacity;
        comparisonImage2.style.transform = `translate(calc(-50% + ${t2.panX}px), calc(-50% + ${t2.panY}px)) scale(${t2.scale})`;
        comparisonImage2.style.opacity = t2.opacity;

        // Update UI labels juga di sini agar konsisten
        const activeKey = activeImage === comparisonImage1 ? 'img1' : 'img2';
        zoomLabel.textContent = `${Math.round(transforms[activeKey].scale * 100)}%`;
        transparencyLabel.textContent = `${Math.round(transforms[activeKey].opacity * 100)}%`;
    }

    comparisonView.addEventListener('wheel', (e) => {
        if (!activeImage) return;
        e.preventDefault();
        const activeKey = activeImage === comparisonImage1 ? 'img1' : 'img2';
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        transforms[activeKey].scale = Math.max(0.2, Math.min(5, transforms[activeKey].scale + delta));
        applyTransforms();
    });

    comparisonView.addEventListener('mousedown', (e) => {
        if (!activeImage) return;
        e.preventDefault();
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        comparisonView.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging || !activeImage) return;
        e.preventDefault();
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        const activeKey = activeImage === comparisonImage1 ? 'img1' : 'img2';
        transforms[activeKey].panX += dx;
        transforms[activeKey].panY += dy;
        applyTransforms();
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            comparisonView.style.cursor = 'grab';
        }
    });

    comparisonView.addEventListener('keydown', (e) => {
        if (!activeImage) return;
        const activeKey = activeImage === comparisonImage1 ? 'img1' : 'img2';
        const step = e.shiftKey ? 10 : 2;
        let moved = false;
        switch (e.key) {
            case 'ArrowUp': transforms[activeKey].panY -= step; moved = true; break;
            case 'ArrowDown': transforms[activeKey].panY += step; moved = true; break;
            case 'ArrowLeft': transforms[activeKey].panX -= step; moved = true; break;
            case 'ArrowRight': transforms[activeKey].panX += step; moved = true; break;
        }
        if (moved) {
            e.preventDefault();
            applyTransforms();
        }
    });
    
    const resetTransforms = () => {
        transforms.img1 = { scale: 1, panX: 0, panY: 0, opacity: 1 };
        transforms.img2 = { scale: 1, panX: 0, panY: 0, opacity: 0.5 };
        applyTransforms();
        if (activeImage) setActiveImage(activeImage);
    };
    
    resetBtn.addEventListener('click', resetTransforms);
    
    clearAllBtn.addEventListener('click', () => {
        image1Data = null; image2Data = null;
        image1Display.src = ''; image2Display.src = '';
        image1Display.style.display = 'none'; image2Display.style.display = 'none';
        image1UploadBox.classList.remove('has-image', 'active-control');
        image2UploadBox.classList.remove('has-image', 'active-control');
        statusMessage.textContent = 'Tempel (Ctrl+V) atau seret & jatuhkan gambar untuk memulai.';
        activeImage = null;
        resetBtn.click();
        updateComparisonView();
    });
}