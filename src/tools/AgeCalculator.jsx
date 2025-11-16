import React, { useState } from 'react';

// Helper untuk mendapatkan tanggal hari ini dalam format YYYY-MM-DD
const getToday = () => {
  return new Date().toISOString().split('T')[0];
};

// --- FUNGSI BARU (FIX TIMEZONE) ---
// Mengonversi objek Date ke string YYYY-MM-DD menggunakan waktu lokal
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
// --- AKHIR FUNGSI BARU ---

// --- Style Sederhana untuk Tombol Tab Mode ---
const tabStyle = {
  padding: '0.5rem 1rem',
  border: '1px solid var(--card-border)',
  background: '#f7fafc',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontWeight: 500,
  borderBottom: 'none',
  marginBottom: '-1px',
};

const activeTabStyle = {
  ...tabStyle,
  background: 'var(--card-bg)',
  color: 'var(--primary-color)',
  borderBottom: '1px solid var(--card-bg)',
  fontWeight: 600,
};
// --- Akhir Style Tab ---


function AgeCalculator() {
  // State untuk mode: 'age' (Hitung Umur) atau 'period' (Hitung Masa Aktif)
  const [mode, setMode] = useState('age');

  // --- State untuk Mode Hitung Umur ---
  const [dob, setDob] = useState('');
  const [calcDate, setCalcDate] = useState(getToday());
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // --- State untuk Mode Hitung Masa Aktif ---
  const [startDate, setStartDate] = useState(getToday());
  const [duration, setDuration] = useState(1);
  const [unit, setUnit] = useState('years');
  const [periodResult, setPeriodResult] = useState(null); // Menjadi objek
  const [periodError, setPeriodError] = useState('');


  // --- Logika untuk Mode Hitung Umur ---
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

    if (days < 0) {
      months--;
      days += new Date(calculateAtDate.getFullYear(), calculateAtDate.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    
    // --- PERUBAHAN DI SINI: Kalkulasi 'totalDays' dihapus ---
    setResult({ years, months, days });
    // --- AKHIR PERUBAHAN ---
  };


  // --- Logika untuk Mode Hitung Masa Aktif ---
  const calculatePeriod = () => {
    const durationNum = parseInt(duration, 10);
    if (!startDate || !durationNum || durationNum <= 0) {
      setPeriodError('Harap masukkan Tanggal Mulai dan Durasi yang valid (> 0).');
      setPeriodResult(null);
      return;
    }
    
    setPeriodError('');
    // Gunakan T12:00:00 untuk menghindari masalah pindah hari saat DST
    let date = new Date(startDate + 'T12:00:00'); 
    const originalStartDate = new Date(startDate + 'T12:00:00');

    // Tambahkan durasi
    if (unit === 'days') {
      date.setDate(date.getDate() + durationNum);
    } else if (unit === 'months') {
      date.setMonth(date.getMonth() + durationNum);
    } else if (unit === 'years') {
      date.setFullYear(date.getFullYear() + durationNum);
    }
    
    // 1. Hitung total hari (durasi)
    const diffTimeDuration = date.getTime() - originalStartDate.getTime();
    const totalDays = Math.floor(diffTimeDuration / (1000 * 60 * 60 * 24));

    // 2. Hitung sisa hari (countdown) dari HARI INI
    const today = new Date(getToday() + 'T12:00:00');
    let countdown = 0;
    
    // Hanya hitung jika tanggal berakhir belum lewat
    if (date.getTime() >= today.getTime()) {
        const diffTimeCountdown = date.getTime() - today.getTime();
        // +1 untuk perhitungan inklusif (hari ini dihitung)
        countdown = Math.floor(diffTimeCountdown / (1000 * 60 * 60 * 24)) + 1;
    }

    // 3. Simpan hasil sebagai objek
    setPeriodResult({
      endDate: formatLocalDate(date),
      totalDays: totalDays,
      countdownDays: countdown // countdown adalah 0 jika sudah lewat
    });
  };

  // Render UI
  return (
    <React.Fragment>
      {/* --- Tombol Tab untuk Ganti Mode --- */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--card-border)', marginBottom: '1.5rem' }}>
        <button 
          style={mode === 'age' ? activeTabStyle : tabStyle}
          onClick={() => setMode('age')}
        >
          <i className="fas fa-birthday-cake" style={{ marginRight: '0.5rem' }}></i>
          Hitung Umur
        </button>
        <button 
          style={mode === 'period' ? activeTabStyle : tabStyle}
          onClick={() => setMode('period')}
        >
          <i className="fas fa-calendar-check" style={{ marginRight: '0.5rem' }}></i>
          Hitung Masa Aktif
        </button>
      </div>

      {/* --- Konten Dinamis Berdasarkan Mode --- */}
      
      {/* Tampilan Mode: Hitung Umur (Existing) */}
      {mode === 'age' && (
        <div id="age-calc-content">
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '2rem', alignItems: 'center' }}>
            <div>
              <label htmlFor="dob" className="label">Tanggal Lahir</label>
              <input 
                type="date" 
                id="dob" 
                className="input"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={getToday()}
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

          {/* --- PERUBAHAN DI SINI: Wrapper <React.Fragment> dan Box "Total Hari" Dihapus --- */}
          {result && (
              <div 
                className="age-calculator-results" 
                style={{ gridTemplateColumns: 'repeat(3, 1fr)' }} 
              >
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
          {/* --- AKHIR PERUBAHAN --- */}

        </div>
      )}
      
      {/* Tampilan Mode: Hitung Masa Aktif (Tidak Berubah) */}
      {mode === 'period' && (
        <div id="period-calc-content">
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '1.5rem', alignItems: 'flex-end' }}>
            <div>
              <label htmlFor="start-date" className="label">Tanggal Mulai</label>
              <input 
                type="date" 
                id="start-date" 
                className="input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="duration-value" className="label">Durasi</label>
              <input 
                type="number" 
                id="duration-value" 
                className="input"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="duration-unit" className="label">Satuan</label>
              <select 
                id="duration-unit" 
                className="select"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                <option value="days">Hari</option>
                <option value="months">Bulan</option>
                <option value="years">Tahun</option>
              </select>
            </div>
          </div>

          {periodError && (
            <div style={{ color: 'var(--danger-color)', marginTop: '1rem', textAlign: 'center' }}>
              {periodError}
            </div>
          )}

          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button 
              className="button primary" 
              style={{ padding: '0.8rem 2rem' }}
              onClick={calculatePeriod}
            >
              <i className="fas fa-calendar-alt" style={{ marginRight: '0.75rem' }}></i>
              Hitung Tanggal Berakhir
            </button>
          </div>

          {periodResult && (
            <React.Fragment>
              <div className="age-result-box" style={{ marginTop: '1.5rem', textAlign: 'center', backgroundColor: '#ebf8ff' }}>
                <span className="age-result-label" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  TANGGAL BERAKHIR (JATUH TEMPO)
                </span>
                <div 
                  className="age-result-value" 
                  style={{ 
                    fontSize: '2.5rem', 
                    color: 'var(--primary-color)', 
                    marginTop: '0.5rem', 
                    lineHeight: 1.2,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'baseline',
                    gap: '0.75rem',
                    flexWrap: 'wrap'
                  }}
                >
                  <span>
                    {new Date(periodResult.endDate + 'T12:00:00').toLocaleDateString('id-ID', {
                      day: '2-digit', month: '2-digit', year: 'numeric'
                    })}
                  </span>
                  <span style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                    ({new Intl.NumberFormat('id-ID').format(periodResult.totalDays)} hari)
                  </span>
                </div>
              </div>

              {/* Blok Countdown Sisa Hari */}
              <div 
                className="age-result-box" 
                style={{ 
                  marginTop: '1rem', 
                  textAlign: 'center', 
                  // Beri warna berdasarkan sisa hari
                  backgroundColor: periodResult.countdownDays <= 7 && periodResult.countdownDays > 0 ? '#fffbea' : (periodResult.countdownDays === 0 ? '#fff5f5' : '#f0fdf4'),
                  borderColor: periodResult.countdownDays <= 7 && periodResult.countdownDays > 0 ? '#f7d87f' : (periodResult.countdownDays === 0 ? '#fed7d7' : '#c6f6d5')
                }}
              >
                <span 
                  className="age-result-label" 
                  style={{ 
                    fontSize: '0.9rem', 
                    color: periodResult.countdownDays <= 7 && periodResult.countdownDays > 0 ? '#b7791f' : (periodResult.countdownDays === 0 ? '#c53030' : '#2f855a')
                  }}
                >
                  SISA MASA AKTIF (DARI HARI INI)
                </span>
                <span 
                  className="age-result-value" 
                  style={{ 
                    fontSize: '2.5rem', 
                    color: periodResult.countdownDays <= 7 && periodResult.countdownDays > 0 ? '#d69e2e' : (periodResult.countdownDays === 0 ? '#e53e3e' : '#38a169'), 
                    marginTop: '0.5rem', 
                    lineHeight: 1.2 
                  }}
                >
                  {new Intl.NumberFormat('id-ID').format(periodResult.countdownDays)}
                </span>
                <span 
                  className="age-result-label" 
                  style={{
                    marginTop: '0.25rem',
                    color: periodResult.countdownDays <= 7 ? '#b7791f' : (periodResult.countdownDays === 0 ? '#c53030' : '#2f855a')
                  }}
                >
                  Hari
                </span>
              </div>
            </React.Fragment>
          )}
          
        </div>
      )}

    </React.Fragment>
  );
}

export default AgeCalculator;