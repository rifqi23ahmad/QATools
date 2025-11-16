import React, { useState } from 'react';

// --- Impor CSS Module ---
import styles from './AgeCalculator.module.css';

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
    setResult({ years, months, days });
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
    let date = new Date(startDate + 'T12:00:00'); 
    const originalStartDate = new Date(startDate + 'T12:00:00');

    if (unit === 'days') {
      date.setDate(date.getDate() + durationNum);
    } else if (unit === 'months') {
      date.setMonth(date.getMonth() + durationNum);
    } else if (unit === 'years') {
      date.setFullYear(date.getFullYear() + durationNum);
    }
    
    const diffTimeDuration = date.getTime() - originalStartDate.getTime();
    const totalDays = Math.floor(diffTimeDuration / (1000 * 60 * 60 * 24));
    const today = new Date(getToday() + 'T12:00:00');
    let countdown = 0;
    
    if (date.getTime() >= today.getTime()) {
        const diffTimeCountdown = date.getTime() - today.getTime();
        countdown = Math.floor(diffTimeCountdown / (1000 * 60 * 60 * 24)) + 1;
    }

    setPeriodResult({
      endDate: formatLocalDate(date),
      totalDays: totalDays,
      countdownDays: countdown
    });
  };

  // Render UI
  return (
    <React.Fragment>
      {/* --- Tombol Tab untuk Ganti Mode --- */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--card-border)', marginBottom: '1.5rem' }}>
        <button 
          className={mode === 'age' ? styles.activeTabButton : styles.tabButton}
          onClick={() => setMode('age')}
        >
          <i className="fas fa-birthday-cake" style={{ marginRight: '0.5rem' }}></i>
          Hitung Umur
        </button>
        <button 
          className={mode === 'period' ? styles.activeTabButton : styles.tabButton}
          onClick={() => setMode('period')}
        >
          <i className="fas fa-calendar-check" style={{ marginRight: '0.5rem' }}></i>
          Hitung Masa Aktif
        </button>
      </div>
      
      {mode === 'age' && (
        <div id="age-calc-content">
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '2rem', alignItems: 'center' }}>
            <div>
              <label htmlFor="dob" className="label">Tanggal Lahir</label>
              <input type="date" id="dob" className="input" value={dob} onChange={(e) => setDob(e.target.value)} max={getToday()} />
            </div>
            <div>
              <label htmlFor="calcDate" className="label">Hitung Umur Pada Tanggal</label>
              <input type="date" id="calcDate" className="input" value={calcDate} onChange={(e) => setCalcDate(e.target.value)} />
            </div>
          </div>
          {error && (<div style={{ color: 'var(--danger-color)', marginTop: '1rem', textAlign: 'center' }}>{error}</div>)}
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button className="button primary" style={{ padding: '0.8rem 2rem' }} onClick={calculateAge}>
              <i className="fas fa-calculator" style={{ marginRight: '0.75rem' }}></i>
              Hitung Umur
            </button>
          </div>
          
          {result && (
              <div 
                className={styles.ageCalculatorResults}
                style={{ gridTemplateColumns: 'repeat(3, 1fr)' }} 
              >
                <div className={styles.ageResultBox}>
                  <span className={styles.ageResultValue}>{result.years}</span>
                  <span className={styles.ageResultLabel}>Tahun</span>
                </div>
                <div className={styles.ageResultBox}>
                  <span className={styles.ageResultValue}>{result.months}</span>
                  <span className={styles.ageResultLabel}>Bulan</span>
                </div>
                <div className={styles.ageResultBox}>
                  <span className={styles.ageResultValue}>{result.days}</span>
                  <span className={styles.ageResultLabel}>Hari</span>
                </div>
              </div>
          )}
        </div>
      )}
      
      {mode === 'period' && (
        <div id="period-calc-content">
           <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '1.5rem', alignItems: 'flex-end' }}>
            <div>
              <label htmlFor="start-date" className="label">Tanggal Mulai</label>
              <input type="date" id="start-date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label htmlFor="duration-value" className="label">Durasi</label>
              <input type="number" id="duration-value" className="input" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div>
              <label htmlFor="duration-unit" className="label">Satuan</label>
              <select id="duration-unit" className="select" value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="days">Hari</option>
                <option value="months">Bulan</option>
                <option value="years">Tahun</option>
              </select>
            </div>
          </div>
          {periodError && (<div style={{ color: 'var(--danger-color)', marginTop: '1rem', textAlign: 'center' }}>{periodError}</div>)}
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button className="button primary" style={{ padding: '0.8rem 2rem' }} onClick={calculatePeriod}>
              <i className="fas fa-calendar-alt" style={{ marginRight: '0.75rem' }}></i>
              Hitung Tanggal Berakhir
            </button>
          </div>

          {periodResult && (
            <React.Fragment>
              <div className={`${styles.ageResultBox}`} style={{ marginTop: '1.5rem', textAlign: 'center', backgroundColor: '#ebf8ff' }}>
                <span className={`${styles.ageResultLabel} ${styles.label}`} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  TANGGAL BERAKHIR (JATUH TEMPO)
                </span>
                <div 
                  className={styles.ageResultValue}
                  style={{ 
                    color: 'var(--primary-color)', marginTop: '0.5rem', lineHeight: 1.2,
                    display: 'flex', justifyContent: 'center', alignItems: 'baseline',
                    gap: '0.75rem', flexWrap: 'wrap'
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

              <div 
                className={`
                  ${styles.ageResultBox} 
                  ${styles.countdownBox}
                  ${periodResult.countdownDays <= 7 && periodResult.countdownDays > 0 
                      ? styles.warnBox 
                      : (periodResult.countdownDays === 0 ? styles.dangerBox : styles.successBox)}
                `}
              >
                <span className={`${styles.ageResultLabel} ${styles.label}`}>
                  SISA MASA AKTIF (DARI HARI INI)
                </span>
                <span className={`${styles.ageResultValue} ${styles.value}`}>
                  {new Intl.NumberFormat('id-ID').format(periodResult.countdownDays)}
                </span>
                <span className={`${styles.ageResultLabel} ${styles.label}`}>
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