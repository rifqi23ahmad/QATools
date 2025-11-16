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
    const withoutSpaces = text.replace(/\s/g, '').length;
    
    return { withSpaces, withoutSpaces };
  }, [text]);

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

      {/* Gunakan class dari CSS Module */}
      <div className={styles.charCounterControls}>
        <label htmlFor="include-spaces-toggle" className="sync-scroll-toggle">
          <span>Hitung Spasi</span>
          <input 
            type="checkbox" 
            id="include-spaces-toggle"
            className="is-hidden" 
            checked={includeSpaces} 
            onChange={() => setIncludeSpaces(!includeSpaces)} 
          />
          <div className="switch"></div>
        </label>
      </div>

      <div className={styles.charCounterResult}>
        <span className={styles.charResultValue}>{displayCount}</span>
        <span className={styles.charResultLabel}>
          {includeSpaces ? 'Karakter (Termasuk Spasi)' : 'Karakter (Tanpa Spasi)'}
        </span>
      </div>
    </React.Fragment>
  );
}

export default CharacterCounter;