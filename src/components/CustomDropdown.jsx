import React, { useState, useMemo, useEffect, useRef } from 'react';

function CustomDropdown({ options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  const filteredOptions = useMemo(() => {
    return options.filter(opt => 
      !opt.isGroup && opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const selectedLabel = options.find(o => o.value === value)?.label || '-- Tidak Ada Perubahan (Acuan) --';

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

  return (
    <div className="custom-select-container" ref={dropdownRef}>
      <button 
        className="custom-select-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        type="button" // Mencegah form submission jika ada
      >
        {selectedLabel}
      </button>

      {isOpen && (
        <div className="custom-select-panel">
          <input 
            type="text" 
            className="custom-select-search" 
            placeholder="Cari opsi..."
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <ul className="custom-select-options">
            {options.map((opt, i) => {
              if (opt.isGroup) {
                return <li key={i} className="custom-select-group">{opt.label}</li>;
              }
              return (
                <li 
                  key={i} 
                  className="custom-select-option" 
                  data-value={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  style={{ display: filteredOptions.includes(opt) ? '' : 'none' }}
                >
                  {opt.label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default CustomDropdown;