import React, { useState, useMemo } from 'react';

function PercentageCalculator() {
  const [percent, setPercent] = useState('');
  const [value, setValue] = useState('');

  const result = useMemo(() => {
    const p = parseFloat(percent);
    const v = parseFloat(value);
    
    if (isNaN(p) || isNaN(v)) {
      return null;
    }
    
    return (p / 100) * v;
  }, [percent, value]);

  return (
    <React.Fragment>
      <div className="flex flex-col" style={{ gap: '1rem' }}>
        <div>
          <label htmlFor="percent-input" className="label">Persentase (%)</label>
          <input 
            type="number"
            id="percent-input"
            className="input"
            placeholder="Contoh: 2"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="value-input" className="label">Dari Nilai</label>
          <input 
            type="number"
            id="value-input"
            className="input"
            placeholder="Contoh: 10000"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      </div>

      {result !== null && (
        <div className="percentage-result-box">
          <span className="percentage-result-label">Hasil:</span>
          <span className="percentage-result-value">
            {/* Format angka agar lebih mudah dibaca */}
            {new Intl.NumberFormat('id-ID').format(result)}
          </span>
        </div>
      )}
    </React.Fragment>
  );
}

export default PercentageCalculator;