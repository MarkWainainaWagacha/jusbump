import { useEffect, useState } from 'react';
import { ensureSignedIn } from './firebase';
import { PhoneNumberGate } from './components/PhoneNumberGate';
import { BumpScreen } from './components/BumpScreen';

export default function App() {
  const [uid, setUid] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  useEffect(() => {
    ensureSignedIn().then((user) => setUid(user.uid));
  }, []);

  if (!uid) {
    return <div style={{ color: '#888', textAlign: 'center', paddingTop: '40vh' }}>Connecting...</div>;
  }

  if (!phoneNumber) {
    return <PhoneNumberGate onSubmit={setPhoneNumber} />;
  }

  return <BumpScreen uid={uid} phoneNumber={phoneNumber} />;
}
