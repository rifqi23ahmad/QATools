import React, { useState } from 'react';

// Fungsi untuk melakukan perhitungan
const calculate = (op1, op2, operator) => {
  switch (operator) {
    case '+': return op1 + op2;
    case '-': return op1 - op2;
    case '*': return op1 * op2;
    case '/': return op1 / op2;
    default: return op2;
  }
};

function StandardCalculator() {
  const [display, setDisplay] = useState('0');
  const [operand1, setOperand1] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForOperand2, setWaitingForOperand2] = useState(false);

  const inputDigit = (digit) => {
    if (waitingForOperand2) {
      setDisplay(String(digit));
      setWaitingForOperand2(false);
    } else {
      setDisplay(display === '0' ? String(digit) : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand2) {
      setDisplay('0.');
      setWaitingForOperand2(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clearAll = () => {
    setDisplay('0');
    setOperand1(null);
    setOperator(null);
    setWaitingForOperand2(false);
  };

  const handlePercent = () => {
    // Mengubah angka di display menjadi persen (dibagi 100)
    setDisplay(String(parseFloat(display) / 100));
    setWaitingForOperand2(false);
  };

  const performOperation = (nextOperator) => {
    const inputValue = parseFloat(display);

    if (operand1 == null) {
      setOperand1(inputValue);
    } else if (operator) {
      const result = calculate(operand1, inputValue, operator);
      setDisplay(String(result));
      setOperand1(result);
    }

    setWaitingForOperand2(true);
    setOperator(nextOperator);
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);
    if (operator && operand1 != null) {
      const result = calculate(operand1, inputValue, operator);
      setDisplay(String(result));
      setOperand1(null); // Reset untuk perhitungan baru
      setOperator(null);
      setWaitingForOperand2(false);
    }
  };

  const buttons = [
    { id: 'clear', label: 'AC', class: 'op', action: clearAll },
    { id: 'percent', label: '%', class: 'op', action: handlePercent },
    { id: 'divide', label: '÷', class: 'op', action: () => performOperation('/') },
    { id: 'seven', label: '7', action: () => inputDigit(7) },
    { id: 'eight', label: '8', action: () => inputDigit(8) },
    { id: 'nine', label: '9', action: () => inputDigit(9) },
    { id: 'multiply', label: '×', class: 'op', action: () => performOperation('*') },
    { id: 'four', label: '4', action: () => inputDigit(4) },
    { id: 'five', label: '5', action: () => inputDigit(5) },
    { id: 'six', label: '6', action: () => inputDigit(6) },
    { id: 'subtract', label: '−', class: 'op', action: () => performOperation('-') },
    { id: 'one', label: '1', action: () => inputDigit(1) },
    { id: 'two', label: '2', action: () => inputDigit(2) },
    { id: 'three', label: '3', action: () => inputDigit(3) },
    { id: 'add', label: '+', class: 'op', action: () => performOperation('+') },
    { id: 'zero', label: '0', class: 'zero', action: () => inputDigit(0) },
    { id: 'decimal', label: '.', action: inputDecimal },
    { id: 'equals', label: '=', class: 'op', action: handleEquals },
  ];

  return (
    <div className="standard-calculator">
      <div className="calc-display">
        {display}
      </div>
      <div className="standard-calculator-grid">
        {buttons.map(btn => (
          <button 
            key={btn.id} 
            id={btn.id}
            className={`calc-button ${btn.class || ''}`}
            onClick={btn.action}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default StandardCalculator;