import React, { useState, useMemo, useEffect, useRef } from 'react';
import styles from './CustomDropdown.module.css'; // Menggunakan CSS Module

function CustomDropdown({ options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null); // Ref untuk autofocus

  // Filter logic: hanya memfilter item (bukan grup)
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options.filter(opt => !opt.isGroup);
    return options.filter(opt => 
      !opt.isGroup && opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  // Cari label yang sedang dipilih
  const selectedOption = useMemo(() => {
    return options.find(o => o.value === value) || { label: '-- Tidak Ada Perubahan (Acuan) --' };
  }, [options, value]);

  // Menutup dropdown jika klik di luar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autofocus ke input pencarian saat dropdown dibuka
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Tambahkan delay kecil agar transisi CSS selesai
      setTimeout(() => searchInputRef.current.focus(), 100);
    }
  }, [isOpen]);

  // Kelompokkan opsi untuk rendering
  const groupedAndFilteredOptions = useMemo(() => {
    const groups = {};
    let currentGroup = 'default'; // Grup default jika tidak ada header
    
    options.forEach(opt => {
      if (opt.isGroup) {
        // Jika ini header grup, buat entri baru
        currentGroup = opt.label;
        groups[currentGroup] = [];
      } else if (filteredOptions.includes(opt)) {
        // Jika item ini lolos filter, masukkan ke grup saat ini
        if (!groups[currentGroup]) groups[currentGroup] = [];
        groups[currentGroup].push(opt);
      }
    });
    
    // Hapus grup yang kosong setelah difilter
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });
    return groups;
  }, [options, filteredOptions]);
  
  // Cek apakah ada hasil
  const hasResults = Object.keys(groupedAndFilteredOptions).length > 0;

  return (
    <div className={styles.customSelectContainer} ref={dropdownRef}>
      <button 
        className={styles.customSelectTrigger}
        onClick={() => setIsOpen(!isOpen)}
        type="button" // Pastikan ini tidak submit form
      >
        <span className={styles.triggerText}>{selectedOption.label}</span>
      </button>

      {isOpen && (
        <div className={styles.customSelectPanel}>
          
          {/* 1. Search Bar (Sekarang di luar list) */}
          <div className={styles.customSelectSearchWrapper}>
            <i className="fas fa-search" />
            <input 
              ref={searchInputRef}
              type="text" 
              className={styles.customSelectSearch}
              placeholder="Cari header..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* 2. Options List (Sekarang bisa scroll independen) */}
          <ul className={styles.customSelectOptions}>
            {!hasResults ? (
              // 3. Feedback jika tidak ada hasil
              <li className={styles.customSelectNoResult}>Tidak ada hasil ditemukan.</li>
            ) : (
              // Render grup dan item
              Object.entries(groupedAndFilteredOptions).map(([groupName, groupOptions]) => (
                <React.Fragment key={groupName}>
                  {groupName !== 'default' && (
                    <li className={styles.customSelectGroup}>{groupName}</li>
                  )}
                  {groupOptions.map((opt) => (
                    <li 
                      key={opt.value}
                      className={`${styles.customSelectOption} ${opt.value === value ? styles.selected : ''}`}
                      data-value={opt.value}
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                    >
                      {opt.label}
                    </li>
                  ))}
                </React.Fragment>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default CustomDropdown;