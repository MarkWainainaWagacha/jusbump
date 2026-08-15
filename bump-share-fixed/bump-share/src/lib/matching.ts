import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  getDocs,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { BumpDoc, MatchResult } from '../types';

const BUMPS_COLLECTION = 'bumps';

// Two bumps count as "the same event" if they land within this window...
const TIME_WINDOW_MS = 2000;
// ...and within this distance (rough degrees ~ meters; 0.0005 deg ~ 55m at
// the equator, plenty loose for GPS drift indoors where accuracy is worse).
const DISTANCE_TOLERANCE_DEG = 0.0007;
// Stop listening / clean up bumps older than this so the collection doesn't
// grow unbounded and stale bumps never get accidentally matched.
const BUMP_TTL_MS = 15000;

function isClose(aLat: number | null, aLng: number | null, bLat: number | null, bLng: number | null): boolean {
  if (aLat === null || aLng === null || bLat === null || bLng === null) {
    // No location on one side (permission denied, indoors, etc). Fall back to
    // time-only matching — less precise, but still usable in a quiet room
    // where only two people are bumping at once.
    return true;
  }
  return Math.abs(aLat - bLat) < DISTANCE_TOLERANCE_DEG && Math.abs(aLng - bLng) < DISTANCE_TOLERANCE_DEG;
}

/**
 * Publishes a bump event, then watches for a peer's bump that lands in the
 * same time+location window, and stitches the two together by writing
 * matchedWith on both docs. Returns an unsubscribe function.
 */
export function publishBumpAndListenForMatch(
  uid: string,
  phoneNumber: string,
  timestamp: number,
  lat: number | null,
  lng: number | null,
  onMatch: (result: MatchResult) => void,
): Promise<() => void> {
  return addDoc(collection(db, BUMPS_COLLECTION), {
    uid,
    phoneNumber,
    timestamp,
    serverTimestamp: serverTimestamp(),
    lat,
    lng,
    matchedWith: null,
    matchedPhoneNumber: null,
    expiresAt: timestamp + BUMP_TTL_MS,
  } satisfies Omit<BumpDoc, never>).then(async (myDocRef) => {
    // 1. Try to find an existing unmatched bump from someone else in the window.
    const candidatesQuery = query(
      collection(db, BUMPS_COLLECTION),
      where('matchedWith', '==', null),
    );
    const snapshot = await getDocs(candidatesQuery);
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as BumpDoc;
      if (docSnap.id === myDocRef.id) continue;
      if (data.uid === uid) continue;
      if (Math.abs(data.timestamp - timestamp) > TIME_WINDOW_MS) continue;
      if (!isClose(lat, lng, data.lat, data.lng)) continue;

      // Found a peer bump — claim both sides atomically.
      const batch = writeBatch(db);
      batch.update(myDocRef, { matchedWith: data.uid, matchedPhoneNumber: data.phoneNumber });
      batch.update(doc(db, BUMPS_COLLECTION, docSnap.id), {
        matchedWith: uid,
        matchedPhoneNumber: phoneNumber,
      });
      await batch.commit();
      onMatch({ peerUid: data.uid, peerPhoneNumber: data.phoneNumber });
      return () => {};
    }

    // 2. No existing peer yet — listen on our own doc in case someone else's
    // bump arrives a moment later and claims the match instead.
    const unsubscribe = onSnapshot(myDocRef, (snap) => {
      const data = snap.data() as BumpDoc | undefined;
      if (data?.matchedWith && data.matchedPhoneNumber) {
        onMatch({ peerUid: data.matchedWith, peerPhoneNumber: data.matchedPhoneNumber });
        unsubscribe();
      }
    });

    // Auto-unsubscribe after the TTL so we don't listen forever on a bump
    // that never found a match.
    setTimeout(() => unsubscribe(), BUMP_TTL_MS);

    return unsubscribe;
  });
}

/** Utility for a cleanup Cloud Function or scheduled task — not called client-side. */
export function isExpired(bump: BumpDoc, now: number = Date.now()): boolean {
  return now > bump.expiresAt;
}

export function toFirestoreTimestamp(ms: number): Timestamp {
  return Timestamp.fromMillis(ms);
}

export async function updateMyPhoneNumber(bumpDocId: string, phoneNumber: string): Promise<void> {
  await updateDoc(doc(db, BUMPS_COLLECTION, bumpDocId), { phoneNumber });
}
