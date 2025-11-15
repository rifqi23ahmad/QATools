import React, { useState } from 'react';
// HAPUS: import ToolHeader from '../components/ToolHeader';

// Helper untuk mendapatkan tanggal hari ini dalam format YYYY-MM-DD
const getToday = () => {
  return new Date().toISOString().split('T')[0];
};

function AgeCalculator() {
  const [dob, setDob] = useState('');
  const [calcDate, setCalcDate] = useState(getToday());
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const calculateAge = () => {
    if (!dob) {
      setError('Harap masukkan Tanggal Lahir.');
      setResult(null);
      return;
    }

    const dobDate = new Date(dob);
    const calculateAtDate = new Date(calcDate);

    if (dobDate > calculateAtDate) {
      setError('Tanggal Lahir tidak boleh lebih besar dari Tanggal Perhitungan.');
      setResult(null);
      return;
    }

    setError('');

    let years = calculateAtDate.getFullYear() - dobDate.getFullYear();
    let months = calculateAtDate.getMonth() - dobDate.getMonth();
    let days = calculateAtDate.getDate() - dobDate.getDate();

    // Koreksi jika hari negatif
    if (days < 0) {
      months--;
      // new Date(year, month, 0).getDate() -> mendapatkan hari terakhir di bulan SEBELUMNYA
      days += new Date(calculateAtDate.getFullYear(), calculateAtDate.getMonth(), 0).getDate();
    }

    // Koreksi jika bulan negatif
    if (months < 0) {
      years--;
      months += 12;
    }

    setResult({ years, months, days });
  };

  // HANYA KEMBALIKAN KONTEN KARTU (TANPA <ToolHeader> ATAU <div class="card">)
  return (
    <React.Fragment>
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '2rem', alignItems: 'center' }}>
        <div>
          <label htmlFor="dob" className="label">Tanggal Lahir</label>
          <input 
            type="date" 
            id="dob" 
            className="input"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            max={getToday()} // Tidak bisa memilih tanggal di masa depan
          />
        </div>
        <div>
          <label htmlFor="calcDate" className="label">Hitung Umur Pada Tanggal</label>
          <input 
            type="date" 
            id="calcDate" 
            className="input"
            value={calcDate}
            onChange={(e) => setCalcDate(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--danger-color)', marginTop: '1rem', textAlign: 'center' }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button 
          className="button primary" 
          style={{ padding: '0.8rem 2rem' }}
          onClick={calculateAge}
        >
          <i className="fas fa-calculator" style={{ marginRight: '0.75rem' }}></i>
          Hitung Umur
        </button>
      </div>

      {result && (
        <div className="age-calculator-results">
          <div className="age-result-box">
            <span className="age-result-value">{result.years}</span>
            <span className="age-result-label">Tahun</span>
          </div>
          <div className="age-result-box">
            <span className="age-result-value">{result.months}</span>
            <span className="age-result-label">Bulan</span>
          </div>
          <div className="age-result-box">
            <span className="age-result-value">{result.days}</span>
            <span className="age-result-label">Hari</span>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

export default AgeCalculator;