import { useState } from 'react';

interface Props {
  onSubmit: (phoneNumber: string) => void;
}

export function PhoneNumberGate({ onSubmit }: Props) {
  const [value, setValue] = useState('');

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>BumpShare</h1>
      <p style={styles.subtitle}>Enter the number you want to share</p>
      <input
        style={styles.input}
        type="tel"
        placeholder="+254 7XX XXX XXX"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        style={styles.button}
        disabled={value.trim().length < 7}
        onClick={() => onSubmit(value.trim())}
      >
        Continue
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#f5f5f5',
    padding: '24px',
    gap: '16px',
  },
  title: { fontSize: '28px', fontWeight: 700, margin: 0 },
  subtitle: { fontSize: '16px', color: '#a0a0a0', margin: 0 },
  input: {
    width: '100%',
    maxWidth: '280px',
    padding: '14px 16px',
    fontSize: '16px',
    borderRadius: '10px',
    border: '1px solid #333',
    background: '#111',
    color: '#f5f5f5',
    marginTop: '12px',
  },
  button: {
    width: '100%',
    maxWidth: '280px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 600,
    borderRadius: '10px',
    border: 'none',
    background: '#4ade80',
    color: '#0a0a0a',
    marginTop: '8px',
    cursor: 'pointer',
  },
};
