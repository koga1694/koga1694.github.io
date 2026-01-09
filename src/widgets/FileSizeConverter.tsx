import { useState, useEffect } from 'react';

const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
const multipliers = [1, 1024, 1024 ** 2, 1024 ** 3, 1024 ** 4, 1024 ** 5];

export default function FileSizeConverter() {
  const [inputValue, setInputValue] = useState('1');
  const [inputUnit, setInputUnit] = useState('GB');
  const [results, setResults] = useState<Record<string, string>>({});

  useEffect(() => {
    const value = parseFloat(inputValue);
    if (isNaN(value)) {
      setResults({});
      return;
    }

    const inputIndex = units.indexOf(inputUnit);
    const bytesValue = value * multipliers[inputIndex];

    const newResults: Record<string, string> = {};
    units.forEach((unit, index) => {
      const converted = bytesValue / multipliers[index];
      newResults[unit] = formatNumber(converted);
    });

    setResults(newResults);
  }, [inputValue, inputUnit]);

  const formatNumber = (num: number): string => {
    if (num >= 1e15) return num.toExponential(2);
    if (num >= 1) return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (num === 0) return '0';
    return num.toPrecision(4);
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>File Size Converter</h3>
      <p style={styles.description}>
        파일 크기를 다양한 단위로 변환합니다. (1 KB = 1024 Bytes)
      </p>

      <div style={styles.inputGroup}>
        <input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          style={styles.input}
          placeholder="Enter value"
        />
        <select
          value={inputUnit}
          onChange={(e) => setInputUnit(e.target.value)}
          style={styles.select}
        >
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.results}>
        {units.map((unit) => (
          <div
            key={unit}
            style={{
              ...styles.resultRow,
              ...(unit === inputUnit ? styles.activeRow : {}),
            }}
          >
            <span style={styles.resultUnit}>{unit}</span>
            <span style={styles.resultValue}>{results[unit] || '-'}</span>
          </div>
        ))}
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
    marginBottom: '0.5rem',
    color: 'var(--color-text)',
  },
  description: {
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
    marginBottom: '1.5rem',
  },
  inputGroup: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
  },
  input: {
    flex: 1,
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text)',
    outline: 'none',
  },
  select: {
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text)',
    cursor: 'pointer',
    outline: 'none',
  },
  results: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--color-bg)',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
  },
  activeRow: {
    borderColor: 'var(--color-accent)',
    backgroundColor: 'var(--color-bg-secondary)',
  },
  resultUnit: {
    fontWeight: 600,
    color: 'var(--color-text)',
  },
  resultValue: {
    fontFamily: 'monospace',
    fontSize: '0.9375rem',
    color: 'var(--color-text-secondary)',
  },
};
