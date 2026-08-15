import { useEffect, useRef, useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { BumpDetector } from '../lib/bumpDetector';
import { publishBumpAndListenForMatch } from '../lib/matching';
import type { MatchResult } from '../types';

type Status = 'idle' | 'listening' | 'bumped' | 'matched' | 'timeout' | 'error';

interface Props {
  uid: string;
  phoneNumber: string;
}

export function BumpScreen({ uid, phoneNumber }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const detectorRef = useRef<BumpDetector | null>(null);

  useEffect(() => {
    const detector = new BumpDetector();
    detectorRef.current = detector;

    detector
      .start(async (_magnitude, timestamp) => {
        setStatus('bumped');

        let lat: number | null = null;
        let lng: number | null = null;
        try {
          const pos = await Geolocation.getCurrentPosition({ timeout: 3000 });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // Location denied or unavailable — matching falls back to time-only.
        }

        try {
          await publishBumpAndListenForMatch(uid, phoneNumber, timestamp, lat, lng, (result) => {
            setMatch(result);
            setStatus('matched');
          });
          setStatus('listening');
          setTimeout(() => {
            setStatus((current) => (current === 'listening' ? 'timeout' : current));
          }, 15000);
        } catch (err) {
          setErrorMsg(err instanceof Error ? err.message : 'Failed to publish bump');
          setStatus('error');
        }
      })
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : 'Sensor unavailable');
        setStatus('error');
      });

    return () => detector.stop();
  }, [uid, phoneNumber]);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>BumpShare</h1>
      {status === 'idle' && <p style={styles.subtitle}>Hold your phone and tap it against theirs</p>}
      {status === 'bumped' && <p style={styles.subtitle}>Bump detected — looking for a match...</p>}
      {status === 'listening' && <p style={styles.subtitle}>Waiting for their phone to confirm...</p>}
      {status === 'timeout' && (
        <p style={styles.subtitleWarn}>No match found. Make sure you both open the app and bump within a couple seconds of each other.</p>
      )}
      {status === 'error' && <p style={styles.subtitleWarn}>{errorMsg}</p>}
      {status === 'matched' && match && (
        <div style={styles.matchCard}>
          <p style={styles.matchLabel}>Matched!</p>
          <p style={styles.matchNumber}>{match.peerPhoneNumber}</p>
        </div>
      )}
      <div style={{ ...styles.pulse, ...(status === 'bumped' ? styles.pulseActive : {}) }} />
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
    textAlign: 'center',
    gap: '16px',
  },
  title: { fontSize: '28px', fontWeight: 700, margin: 0 },
  subtitle: { fontSize: '16px', color: '#a0a0a0', margin: 0 },
  subtitleWarn: { fontSize: '16px', color: '#e0a030', margin: 0 },
  pulse: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    border: '2px solid #333',
    marginTop: '24px',
    transition: 'all 0.3s ease',
  },
  pulseActive: {
    border: '2px solid #4ade80',
    boxShadow: '0 0 30px rgba(74, 222, 128, 0.5)',
  },
  matchCard: {
    background: '#111',
    border: '1px solid #4ade80',
    borderRadius: '12px',
    padding: '20px 32px',
    marginTop: '16px',
  },
  matchLabel: { color: '#4ade80', margin: 0, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' },
  matchNumber: { fontSize: '24px', fontWeight: 700, margin: '8px 0 0' },
};
