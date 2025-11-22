import React, { useState, useMemo } from 'react';
import styles from './CharacterCounter.module.css';

function CharacterCounter() {
  const [text, setText] = useState('');
  const [includeSpaces, setIncludeSpaces] = useState(false);

  const charCount = useMemo(() => {
    if (!text) {
      return { withSpaces: 0, withoutSpaces: 0 };
    }
    
    const withSpaces = text.length;
    // Menghapus semua spasi (space, tab, newline) untuk hitungan tanpa spasi
    const withoutSpaces = text.replace(/\s/g, '').length;
    
    return { withSpaces, withoutSpaces };
  }, [text]);

  // Logika display: 
  // Jika includeSpaces = true -> Tampilkan hitungan dengan spasi
  // Jika includeSpaces = false -> Tampilkan hitungan TANPA spasi
  const displayCount = includeSpaces ? charCount.withSpaces : charCount.withoutSpaces;

  return (
    <React.Fragment>
      <label htmlFor="char-input" className="label">Masukkan Teks Anda</label>
      <textarea 
        id="char-input"
        className="textarea textarea-editor"
        rows="4"
        placeholder="Ketik atau tempel teks di sini..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className={styles.charCounterControls}>
        {/* PERBAIKAN: Gunakan class dari styles module */}
        <label htmlFor="include-spaces-toggle" className={styles.charCounterToggle}>
          <span>Hitung Spasi</span>
          <input 
            type="checkbox" 
            id="include-spaces-toggle"
            className={styles.hiddenInput} // Ganti "is-hidden" dengan class module
            checked={includeSpaces} 
            onChange={() => setIncludeSpaces(!includeSpaces)} 
          />
          <div className={styles.switch}></div> {/* Class switch dari module */}
        </label>
      </div>

      <div className={styles.charCounterResult}>
        <span className={styles.charResultValue}>
            {new Intl.NumberFormat('id-ID').format(displayCount)}
        </span>
        <span className={styles.charResultLabel}>
          {includeSpaces ? 'Karakter (Termasuk Spasi)' : 'Karakter (Tanpa Spasi)'}
        </span>
      </div>
    </React.Fragment>
  );
}

export default CharacterCounter;