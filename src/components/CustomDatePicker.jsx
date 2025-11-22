import React, { useState, useEffect, useRef } from 'react';
import styles from './CustomDatePicker.module.css';

const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
];

function CustomDatePicker({ value, onChange, max, pickerType = 'date' }) {
  const [isOpen, setIsOpen] = useState(false);
  const isMonthPicker = pickerType === 'month';
  
  // Helper Parsing
  const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    // Handle YYYY-MM format for month picker
    if (isMonthPicker && dateStr.length === 7) {
        const [y, m] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, 1);
    }
    // Handle YYYY-MM-DD
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d || 1);
  };

  const initialDate = parseDate(value);
  const [viewDate, setViewDate] = useState(initialDate); // State untuk navigasi
  const containerRef = useRef(null);

  const maxDate = max ? parseDate(max) : null;

  // Display Format
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return 'Pilih...';
    const date = parseDate(dateStr);
    
    if (isMonthPicker) {
        // Contoh: "Oktober 2023"
        return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }
    // Contoh: "23 Oktober 2023"
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Navigasi Header
  const handlePrev = (e) => {
    e.stopPropagation();
    if (isMonthPicker) {
        // Mundur 1 tahun
        setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1));
    } else {
        // Mundur 1 bulan
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    }
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (isMonthPicker) {
        // Maju 1 tahun
        setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1));
    } else {
        // Maju 1 bulan
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    }
  };

  // Logika Klik
  const handleDayClick = (day) => {
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    onChange(`${year}-${month}-${dayStr}`);
    setIsOpen(false);
  };

  const handleMonthClick = (monthIndex) => {
    const year = viewDate.getFullYear();
    const monthStr = String(monthIndex + 1).padStart(2, '0');
    onChange(`${year}-${monthStr}`); // Format YYYY-MM
    setIsOpen(false);
  };

  // Close click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- RENDERERS ---

  const renderMonthGrid = () => {
    const currentYear = viewDate.getFullYear();
    const selectedDate = parseDate(value);
    
    return (
        <div className={styles.monthGrid}>
            {MONTHS_SHORT.map((mName, idx) => {
                // Cek selected
                const isSelected = selectedDate.getMonth() === idx && selectedDate.getFullYear() === currentYear;
                
                // Cek disabled (max date)
                let isDisabled = false;
                if (maxDate) {
                    // Jika tahun ini > max tahun -> disable
                    // Jika tahun ini == max tahun DAN bulan ini > max bulan -> disable
                    if (currentYear > maxDate.getFullYear()) isDisabled = true;
                    if (currentYear === maxDate.getFullYear() && idx > maxDate.getMonth()) isDisabled = true;
                }

                return (
                    <div 
                        key={idx}
                        className={`
                            ${styles.monthCell} 
                            ${isSelected ? styles.selected : ''} 
                            ${isDisabled ? styles.disabled : ''}
                        `}
                        onClick={() => !isDisabled && handleMonthClick(idx)}
                    >
                        {mName}
                    </div>
                );
            })}
        </div>
    );
  };

  const renderDayGrid = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className={styles.empty}></div>);

    for (let d = 1; d <= daysInMonth; d++) {
      const currentDayDate = new Date(year, month, d);
      const isSelected = value === `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      let isDisabled = false;
      if (maxDate) isDisabled = currentDayDate > maxDate;

      const today = new Date();
      const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

      days.push(
        <div 
          key={d} 
          className={`${styles.dayCell} ${isSelected ? styles.selected : ''} ${isToday && !isSelected ? styles.today : ''} ${isDisabled ? styles.disabled : ''}`}
          onClick={() => !isDisabled && handleDayClick(d)}
        >
          {d}
        </div>
      );
    }
    return (
        <div className={styles.grid}>
            {DAYS_SHORT.map(day => <div key={day} className={styles.dayName}>{day}</div>)}
            {days}
        </div>
    );
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={`${styles.inputWrapper} ${isOpen ? styles.active : ''}`} onClick={() => setIsOpen(!isOpen)}>
        <span className={styles.inputText}>{formatDisplayDate(value)}</span>
        <i className={`fas fa-calendar-alt ${styles.calendarIcon}`}></i>
      </div>

      {isOpen && (
        <div className={styles.calendarPopup}>
          <div className={styles.header}>
            <button className={styles.navBtn} onClick={handlePrev} type="button"><i className="fas fa-chevron-left"></i></button>
            <span className={styles.currentMonth}>
              {/* Jika month picker, tampilkan TAHUN saja di header */}
              {isMonthPicker ? viewDate.getFullYear() : `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`}
            </span>
            <button className={styles.navBtn} onClick={handleNext} type="button"><i className="fas fa-chevron-right"></i></button>
          </div>
          
          {isMonthPicker ? renderMonthGrid() : renderDayGrid()}
        </div>
      )}
    </div>
  );
}

export default CustomDatePicker;