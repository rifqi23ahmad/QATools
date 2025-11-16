import React, { useState, useEffect, useRef } from 'react';

// --- Algoritma Diff (LCS) dari file asli ---
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
// --- Akhir Algoritma Diff ---

// --- Komponen Sub: PdfPage (Rendering Canvas Kustom) ---
const PdfPage = ({ page, highlights }) => {
  const canvasRef = useRef(null);
  const [renderTask, setRenderTask] = useState(null);

  useEffect(() => {
    if (renderTask) { renderTask.cancel(); }
    if (page && canvasRef.current) {
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const task = page.render({ canvasContext: context, viewport: viewport });
      setRenderTask(task);
      task.promise.catch(err => {
        if (err.name !== 'RenderingCancelledException') {
          console.error("Gagal merender halaman PDF:", err);
        }
      });
    }
    
    return () => {
      if (renderTask) { renderTask.cancel(); }
    };
  }, [page]);

  if (!page) return null;
  const viewport = page.getViewport({ scale: 1.5 });

  return (
    <div className="pdf-page-wrapper" style={{ position: 'relative', width: viewport.width, height: viewport.height }}>
      <canvas ref={canvasRef} className="pdf-canvas" />
      <div className="highlight-layer">
        {highlights.map((h, i) => (
          <div 
            key={i}
            className={`highlight-area ${h.type}`}
            style={{
              position: 'absolute',
              left: h.x,
              top: h.y,
              width: h.width,
              height: h.height,
            }}
            title={h.text}
          />
        ))}
      </div>
    </div>
  );
};


function WordingCompare() {
  const [doc1, setDoc1] = useState({ name: 'Belum ada file', pages: [], tokens: [] });
  const [doc2, setDoc2] = useState({ name: 'Belum ada file', pages: [], tokens: [] });
  
  const [changeGroups, setChangeGroups] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [syncScroll, setSyncScroll] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('Pilih 2 file PDF untuk dibandingkan.');
  
  const viewer1Ref = useRef(null);
  const viewer2Ref = useRef(null);
  const isSyncingScroll = useRef(false);
  
  // --- Logika Scroll Sync Kustom ---
  const handleScroll = (sourceRef, targetRef) => {
    if (!syncScroll || isSyncingScroll.current) return;
    
    isSyncingScroll.current = true;
    const source = sourceRef.current;
    const target = targetRef.current;
    
    if (source && target) {
      const percentage = source.scrollTop / (source.scrollHeight - source.clientHeight);
      target.scrollTop = percentage * (target.scrollHeight - target.clientHeight);
    }
    
    setTimeout(() => { isSyncingScroll.current = false; }, 50); 
  };
  
  // --- Logika Memuat PDF Kustom (Perlu dipastikan versi 3.11.174 sudah dimuat di index.html) ---
  const loadPdf = async (file, setDocState) => {
    if (!file) return;
    setIsLoading(true);
    setChangeGroups([]);
    setDocState({ name: `Memuat ${file.name}...`, pages: [], tokens: [] });
    setStatusText(`Membaca ${file.name}...`);
    
    try {
      const fileData = await file.arrayBuffer();
      // Gunakan worker 3.11.174 yang sinkron
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      const pdf = await window.pdfjsLib.getDocument({ data: fileData }).promise;
      
      let allTokens = [];
      let pagePromises = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        pagePromises.push(pdf.getPage(pageNum));
      }
      const pages = await Promise.all(pagePromises); 
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const pageNum = i + 1;
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.5 });
        
        textContent.items.forEach(item => {
          if (item.str.trim()) {
            const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
            const x = tx[4];
            const y = tx[5] - item.height; 
            allTokens.push({ 
              str: item.str, pageNum, x, y, width: item.width, height: item.height 
            });
          }
        });
      }
      
      allTokens.sort((a, b) => {
          if (a.pageNum !== b.pageNum) return a.pageNum - b.pageNum;
          if (Math.abs(b.y - a.y) > 2) return a.y - b.y; 
          return a.x - b.x; 
      });

      setDocState({ name: file.name, pages: pages, tokens: allTokens });
      setStatusText(`Selesai memuat ${file.name}.`);
    } catch (err) {
      console.error("Error loading PDF tokens:", err);
      setDocState({ name: `Gagal memuat token: ${err.message}`, pages: [], tokens: [] });
      setStatusText(`Gagal memuat file: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e, fileNum) => {
    const file = e.target.files[0];
    if (fileNum === 1) {
      loadPdf(file, setDoc1);
    } else {
      loadPdf(file, setDoc2);
    }
  };

  // --- Logika Perbandingan dan Highlight (Digunakan oleh PdfPage) ---
  const handleCompare = () => {
    if (!doc1.tokens.length || !doc2.tokens.length) {
      return setStatusText('Harap muat kedua dokumen PDF dan tunggu proses ekstrak teks selesai.');
    }
    
    setStatusText('Membandingkan dokumen...');
    setIsLoading(true);

    const words1 = doc1.tokens.map(t => ({ word: t.str, token: t }));
    const words2 = doc2.tokens.map(t => ({ word: t.str, token: t }));
    
    const textSeq1 = words1.map(w => w.word);
    const textSeq2 = words2.map(w => w.word);
    
    const lcs = findLongestCommonSubsequence(textSeq1, textSeq2);

    let i = 0, j = 0, k = 0;
    const groups = [];
    let currentGroup = null;

    while (i < words1.length || j < words2.length) {
        const word1 = words1[i]?.word;
        const word2 = words2[j]?.word;
        const lcsWord = lcs[k];

        if (word1 === lcsWord && word2 === lcsWord) {
            if (currentGroup) { groups.push(currentGroup); currentGroup = null; }
            i++; j++; k++;
        } else {
            if (!currentGroup) currentGroup = { oldWords: [], newWords: [] };
            if (word1 !== lcsWord && words1[i]) { 
              currentGroup.oldWords.push(words1[i]); 
              i++; 
            }
            if (word2 !== lcsWord && words2[j]) { 
              currentGroup.newWords.push(words2[j]); 
              j++; 
            }
        }
    }
    if (currentGroup) groups.push(currentGroup);
    
    const finalGroups = groups.filter(g => g.oldWords.length > 0 || g.newWords.length > 0);
    setChangeGroups(finalGroups);
    setStatusText(`Perbandingan selesai. Ditemukan ${finalGroups.length} grup perbedaan.`);
    setIsLoading(false);
  };

  const getHighlightsForDoc = (docId) => {
    const highlights = [];
    changeGroups.forEach(group => {
      const words = (docId === 1) ? group.oldWords : group.newWords;
      const type = (docId === 1) ? 'removed' : 'added';
      const tokens = [...new Set(words.map(w => w.token))]; 
      
      tokens.forEach(token => {
          highlights.push({
            type: type,
            pageNum: token.pageNum,
            x: token.x,
            y: token.y,
            width: token.width,
            height: token.height,
            text: token.str
          });
      });
    });
    return highlights;
  };
  
  const highlights1 = getHighlightsForDoc(1);
  const highlights2 = getHighlightsForDoc(2);
  
  const filteredChangeGroups = changeGroups.filter(g => 
    (g.oldWords.map(w=>w.word).join(' ') + g.newWords.map(w=>w.word).join(' ')).toLowerCase().includes(searchFilter.toLowerCase())
  );
  
  const isCompareDisabled = isLoading || doc1.pages.length === 0 || doc2.pages.length === 0;

  return (
    <div className="adv-compare-container">
      <div className="adv-compare-toolbar">
        <div className="toolbar-title">{statusText}</div>
        <label className="sync-scroll-toggle" title="Toggle scroll synchronization">
          <span>Sync Scroll</span>
          <input type="checkbox" className="is-hidden" checked={syncScroll} onChange={() => setSyncScroll(!syncScroll)} />
          <div className="switch"></div>
        </label>
      </div>
      <div className="adv-compare-main">
        <div className="pdf-viewer-area">
          
          {/* Viewer 1: Menggunakan logika render kustom */}
          <div className="pdf-viewer-pane">
            <div 
              className="pdf-viewer-content" 
              ref={viewer1Ref} 
              onScroll={() => handleScroll(viewer1Ref, viewer2Ref)}
            >
              <label className="upload-prompt" style={{display: doc1.pages.length ? 'none' : 'flex'}}>
                 <i className="fas fa-file-pdf fa-4x"></i>
                 <h3>Dokumen Asli</h3>
                 <p>Drop file atau klik untuk memilih</p>
                 <input type="file" className="is-hidden" accept=".pdf" onChange={(e) => handleFileChange(e, 1)} />
              </label>
              {doc1.pages.map((page, i) => (
                <PdfPage key={i} page={page} highlights={highlights1.filter(h => h.pageNum === (i+1))} />
              ))}
            </div>
            <div className="pane-footer"><span className="file-name">{doc1.name}</span></div>
          </div>
          
          {/* Viewer 2: Menggunakan logika render kustom */}
          <div className="pdf-viewer-pane">
            <div 
              className="pdf-viewer-content" 
              ref={viewer2Ref}
              onScroll={() => handleScroll(viewer2Ref, viewer1Ref)}
            >
              <label className="upload-prompt" style={{display: doc2.pages.length ? 'none' : 'flex'}}>
                 <i className="fas fa-file-pdf fa-4x"></i>
                 <h3>Dokumen Revisi</h3>
                 <p>Drop file atau klik untuk memilih</p>
                 <input type="file" className="is-hidden" accept=".pdf" onChange={(e) => handleFileChange(e, 2)} />
              </label>
              {doc2.pages.map((page, i) => (
                <PdfPage key={i} page={page} highlights={highlights2.filter(h => h.pageNum === (i+1))} />
              ))}
            </div>
            <div className="pane-footer"><span className="file-name">{doc2.name}</span></div>
          </div>
          
        </div>
        
        {/* Sidebar Perubahan */}
        <div className="change-report-sidebar">
          <div className="sidebar-header">
            <h3>Laporan Perubahan ({filteredChangeGroups.length})</h3>
            <button id="compare-wording-btn" className="button primary" onClick={handleCompare} disabled={isCompareDisabled}>
              {isLoading ? 'Memproses...' : 'Bandingkan'}
            </button>
          </div>
          <div className="sidebar-search">
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Cari teks..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} />
          </div>
          <div className="sidebar-body" id="changes-list">
            {changeGroups.length === 0 && !isLoading && <p className="no-changes-yet">Muat dua dokumen lalu klik "Bandingkan".</p>}
            {filteredChangeGroups.map((group, i) => {
              const oldText = group.oldWords.map(w => w.word).join(' ').trim();
              const newText = group.newWords.map(w => w.word).join(' ').trim();
              const firstToken = (group.oldWords[0] || group.newWords[0])?.token;
              return (
                <div className="change-card" key={i}>
                  <div className="change-card-header"><span>Hal {firstToken ? firstToken.pageNum : 'N/A'}</span></div>
                  <div className="change-card-body">
                    {oldText && <div className="text-block old"><span>Dihapus</span><p><span className="highlight-word">{oldText}</span></p></div>}
                    {newText && <div className="text-block new"><span>Ditambah</span><p><span className="highlight-word">{newText}</span></p></div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WordingCompare;