import { useState } from 'react';

interface CalculatorProps {
  title?: string;
}

export default function Calculator({ title = 'Simple Calculator' }: CalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operator) {
      const result = calculate(previousValue, inputValue, operator);
      setDisplay(String(result));
      setPreviousValue(result);
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '*':
        return a * b;
      case '/':
        return b !== 0 ? a / b : 0;
      default:
        return b;
    }
  };

  const equals = () => {
    if (operator && previousValue !== null) {
      const inputValue = parseFloat(display);
      const result = calculate(previousValue, inputValue, operator);
      setDisplay(String(result));
      setPreviousValue(null);
      setOperator(null);
      setWaitingForOperand(true);
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>{title}</h3>
      <div style={styles.calculator}>
        <div style={styles.display}>{display}</div>
        <div style={styles.buttons}>
          <button style={styles.button} onClick={clear}>C</button>
          <button style={styles.button} onClick={() => setDisplay(String(-parseFloat(display)))}>+/-</button>
          <button style={styles.button} onClick={() => setDisplay(String(parseFloat(display) / 100))}>%</button>
          <button style={{ ...styles.button, ...styles.operatorBtn }} onClick={() => performOperation('/')}>÷</button>

          <button style={styles.button} onClick={() => inputDigit('7')}>7</button>
          <button style={styles.button} onClick={() => inputDigit('8')}>8</button>
          <button style={styles.button} onClick={() => inputDigit('9')}>9</button>
          <button style={{ ...styles.button, ...styles.operatorBtn }} onClick={() => performOperation('*')}>×</button>

          <button style={styles.button} onClick={() => inputDigit('4')}>4</button>
          <button style={styles.button} onClick={() => inputDigit('5')}>5</button>
          <button style={styles.button} onClick={() => inputDigit('6')}>6</button>
          <button style={{ ...styles.button, ...styles.operatorBtn }} onClick={() => performOperation('-')}>−</button>

          <button style={styles.button} onClick={() => inputDigit('1')}>1</button>
          <button style={styles.button} onClick={() => inputDigit('2')}>2</button>
          <button style={styles.button} onClick={() => inputDigit('3')}>3</button>
          <button style={{ ...styles.button, ...styles.operatorBtn }} onClick={() => performOperation('+')}>+</button>

          <button style={{ ...styles.button, ...styles.zeroBtn }} onClick={() => inputDigit('0')}>0</button>
          <button style={styles.button} onClick={inputDecimal}>.</button>
          <button style={{ ...styles.button, ...styles.equalsBtn }} onClick={equals}>=</button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: 'system-ui, sans-serif',
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: '1rem',
    color: 'var(--color-text)',
  },
  calculator: {
    maxWidth: '280px',
    backgroundColor: 'var(--color-bg)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid var(--color-border)',
  },
  display: {
    backgroundColor: 'var(--color-bg-secondary)',
    padding: '16px',
    borderRadius: '8px',
    fontSize: '2rem',
    textAlign: 'right',
    marginBottom: '12px',
    fontFamily: 'monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: 'var(--color-text)',
  },
  buttons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
  },
  button: {
    padding: '16px',
    fontSize: '1.25rem',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    backgroundColor: 'var(--color-bg-secondary)',
    color: 'var(--color-text)',
    transition: 'opacity 0.2s',
  },
  operatorBtn: {
    backgroundColor: 'var(--color-accent)',
    color: 'white',
  },
  zeroBtn: {
    gridColumn: 'span 2',
  },
  equalsBtn: {
    backgroundColor: 'var(--color-accent)',
    color: 'white',
  },
};
