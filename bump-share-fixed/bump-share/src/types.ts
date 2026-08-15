export interface BumpDoc {
  uid: string;
  phoneNumber: string;
  timestamp: number; // ms epoch, client-generated for matching precision
  serverTimestamp: unknown; // Firestore serverTimestamp(), for cleanup/ordering
  lat: number | null;
  lng: number | null;
  matchedWith: string | null; // uid of matched peer, once resolved
  matchedPhoneNumber: string | null; // filled in once matched
  expiresAt: number; // ms epoch — client should stop listening after this
}

export interface MatchResult {
  peerUid: string;
  peerPhoneNumber: string;
}
