import React, { useState } from 'react';

// kalkulasi dasar
const calculate = (a, b, op) => {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return a / b;
    default: return b;
  }
};

const opToDisplay = (op) => {
  if (!op) return '';
  if (op === '*') return '×';
  if (op === '/') return '÷';
  if (op === '-') return '−';
  return op; // '+'
};

function StandardCalculator() {
  // Semua yang kita butuhkan: operand1 (number), operator (char), operand2 (string sementara),
  // waitingForOperand2=true berarti layar sekarang hanya menampilkan simbol operator
  const [display, setDisplay] = useState('0');      // apa yang terlihat di layar utama (string)
  const [operand1, setOperand1] = useState(null);   // number atau null
  const [operator, setOperator] = useState(null);   // '+','-','*','/' atau null
  const [operand2, setOperand2] = useState('');     // string (kosong jika belum mulai mengetik operand2)
  const [waitingForOperand2, setWaitingForOperand2] = useState(false);

  const clearAll = () => {
    setDisplay('0');
    setOperand1(null);
    setOperator(null);
    setOperand2('');
    setWaitingForOperand2(false);
  };

  const handleBackspace = () => {
    // Jangan izinkan backspace ketika layar hanya menampilkan simbol operator
    if (waitingForOperand2) return;

    // Jika sedang mengetik operand2
    if (operator && operand1 != null) {
      if (operand2.length > 1) {
        const nextOp2 = operand2.slice(0, -1);
        setOperand2(nextOp2);
        setDisplay(`${operand1} ${opToDisplay(operator)} ${nextOp2}`);
      } else if (operand2.length === 1) {
        // hapus semua operand2 -> kembali tampil simbol operator
        setOperand2('');
        setWaitingForOperand2(true);
        setDisplay(opToDisplay(operator));
      } else {
        // tidak ada operand2 (fallthrough) - tidak seharusnya terjadi karena waitingForOperand2 akan true
        setDisplay(opToDisplay(operator));
        setWaitingForOperand2(true);
      }
      return;
    }

    // Jika tidak ada operator (ketik angka pertama)
    if (!operator) {
      if (display.length <= 1 || (display.length === 2 && display.startsWith('-'))) {
        setDisplay('0');
      } else {
        setDisplay(display.slice(0, -1));
      }
    }
  };

  const inputDigit = (digit) => {
    const d = String(digit);

    // Jika layar sekarang menampilkan simbol operator, mulai mengetik operand2
    if (waitingForOperand2 && operand1 != null && operator) {
      const nextOp2 = d;
      setOperand2(nextOp2);
      setWaitingForOperand2(false);
      setDisplay(`${operand1} ${opToDisplay(operator)} ${nextOp2}`);
      return;
    }

    // Jika sedang mengetik operand2
    if (operator && operand1 != null) {
      const nextOp2 = operand2 === '' ? d : operand2 + d;
      setOperand2(nextOp2);
      setDisplay(`${operand1} ${opToDisplay(operator)} ${nextOp2}`);
      return;
    }

    // Tidak ada operator: kita sedang mengetik operand1 (display berisi operand1)
    const next = display === '0' ? d : display + d;
    setDisplay(next);
  };

  const inputDecimal = () => {
    // Jika layar menampilkan simbol operator -> mulai operand2 dengan '0.'
    if (waitingForOperand2 && operand1 != null && operator) {
      setOperand2('0.');
      setWaitingForOperand2(false);
      setDisplay(`${operand1} ${opToDisplay(operator)} 0.`);
      return;
    }

    if (operator && operand1 != null) {
      if (operand2.includes('.')) return;
      const next = operand2 === '' ? '0.' : operand2 + '.';
      setOperand2(next);
      setDisplay(`${operand1} ${opToDisplay(operator)} ${next}`);
      return;
    }

    // tanpa operator, decimal untuk operand1
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handlePercent = () => {
    // Terapkan percent pada angka yang sedang diketik: operand2 jika ada, selain itu operand1/display
    if (operator && operand1 != null && !waitingForOperand2) {
      const val = parseFloat(operand2 || '0') / 100;
      const valStr = String(val);
      setOperand2(valStr);
      setDisplay(`${operand1} ${opToDisplay(operator)} ${valStr}`);
      return;
    }

    // tidak ada operator atau masih menampilkan operator -> apply pada display as number
    const cur = parseFloat(display) || 0;
    const res = cur / 100;
    setDisplay(String(res));
  };

  const performOperation = (nextOperator) => {
    // Jika belum ada operand1, set operand1 dari display (as number), kemudian tampilkan operator simbol
    if (operand1 == null) {
      const val = parseFloat(display) || 0;
      setOperand1(val);
      setOperator(nextOperator);
      setOperand2('');
      setWaitingForOperand2(true);
      setDisplay(opToDisplay(nextOperator));
      return;
    }

    // Jika kita sedang menampilkan simbol operator (waitingForOperand2 true), berarti user mengganti operator
    if (waitingForOperand2) {
      setOperator(nextOperator);
      setDisplay(opToDisplay(nextOperator));
      return;
    }

    // Jika operand1 ada dan operand2 sudah diketik -> hitung dulu, lalu set operand1=result dan tampilkan operator simbol
    if (operator && operand2 !== '') {
      const a = operand1;
      const b = parseFloat(operand2) || 0;
      const result = calculate(a, b, operator);
      setOperand1(result);
      setOperator(nextOperator);
      setOperand2('');
      setWaitingForOperand2(true);
      setDisplay(opToDisplay(nextOperator));
      return;
    }

    // fallback: jika tidak ada operand2 tapi ada operand1, ganti operator
    setOperator(nextOperator);
    setWaitingForOperand2(true);
    setDisplay(opToDisplay(nextOperator));
  };

  const handleEquals = () => {
    // tidak ada operator -> tidak ada aksi
    if (!operator || operand1 == null) return;

    // jika user menekan = saat layar hanya menampilkan operator (tidak mengetik operand2),
    // treat operand2 = operand1 (sesuai implementasi sebelumnya)
    const right = (waitingForOperand2 || operand2 === '') ? operand1 : parseFloat(operand2 || '0');

    const result = calculate(operand1, right, operator);

    // tampilkan hasil di layar utama dan reset semua state (tidak ada history terpisah)
    setDisplay(String(result));
    setOperand1(null);
    setOperator(null);
    setOperand2('');
    setWaitingForOperand2(false);
  };

  const handleKeyDown = (e) => {
    e.preventDefault();
    const key = e.key;
    if (key >= '0' && key <= '9') { inputDigit(key); return; }
    if (key === '.') { inputDecimal(); return; }
    if (key === '+') { performOperation('+'); return; }
    if (key === '-') { performOperation('-'); return; }
    if (key === '*') { performOperation('*'); return; }
    if (key === '/') { performOperation('/'); return; }
    if (key === '%') { handlePercent(); return; }
    if (key === 'Enter' || key === '=') { handleEquals(); return; }
    if (key === 'Escape') { clearAll(); return; }
    if (key === 'Backspace') { handleBackspace(); return; }
  };

  // Susunan tombol standar (4 kolom)
  const buttons = [
    { id: 'clear', label: 'AC', action: clearAll },
    // **INI PERBAIKANNYA:** Menambahkan tombol backspace
    { id: 'backspace', label: '⌫', action: handleBackspace },
    { id: 'percent', label: '%', action: handlePercent },
    { id: 'divide', label: '÷', action: () => performOperation('/') },

    // Baris ini sekarang akan benar (7, 8, 9, x)
    { id: 'seven', label: '7', action: () => inputDigit(7) },
    { id: 'eight', label: '8', action: () => inputDigit(8) },
    { id: 'nine', label: '9', action: () => inputDigit(9) },
    { id: 'multiply', label: '×', action: () => performOperation('*') },

    { id: 'four', label: '4', action: () => inputDigit(4) },
    { id: 'five', label: '5', action: () => inputDigit(5) },
    { id: 'six', label: '6', action: () => inputDigit(6) },
    { id: 'subtract', label: '−', action: () => performOperation('-') },

    { id: 'one', label: '1', action: () => inputDigit(1) },
    { id: 'two', label: '2', action: () => inputDigit(2) },
    { id: 'three', label: '3', action: () => inputDigit(3) },
    { id: 'add', label: '+', action: () => performOperation('+') },

    { id: 'zero', label: '0', action: () => inputDigit(0) },
    { id: 'decimal', label: '.', action: inputDecimal },
    { id: 'equals', label: '=', action: handleEquals },
  ];

  return (
    <div className="standard-calculator" tabIndex="0" onKeyDown={handleKeyDown}>
      {/* Semua tampil di layar utama - tidak ada history lain */}
      <div className="calc-display">
        {display}
      </div>

      <div className="standard-calculator-grid">
        {buttons.map((b) => (
          <button
            key={b.id}
            id={b.id}
            className={`calc-button ${b.id === 'zero' ? 'zero' : ''}`}
            onClick={b.action}
            aria-label={b.label}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default StandardCalculator;