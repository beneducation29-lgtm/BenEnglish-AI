import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import type { FirebaseApp } from 'firebase/app';

export interface CloudMemorySnapshot {
  profile: any;
  vocabBank: any[];
  customLessons: any[];
  updatedAt?: number;
}

const learnerDocument = (app: FirebaseApp, uid: string) => doc(getFirestore(app), 'learners', uid);

export async function loadCloudMemory(app: FirebaseApp, uid: string): Promise<CloudMemorySnapshot | null> {
  const snapshot = await getDoc(learnerDocument(app, uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    profile: data.profile || {},
    vocabBank: Array.isArray(data.vocabBank) ? data.vocabBank : [],
    customLessons: Array.isArray(data.customLessons) ? data.customLessons : [],
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : undefined,
  };
}

export async function saveCloudMemory(app: FirebaseApp, uid: string, snapshot: Omit<CloudMemorySnapshot, 'updatedAt'>): Promise<void> {
  await setDoc(learnerDocument(app, uid), { ...snapshot, updatedAt: Date.now() });
}

// Merge object records by stable id/word so a first sync does not discard either device's history.
export function mergeCloudMemory<T>(local: T, remote: T): T {
  if (Array.isArray(local) && Array.isArray(remote)) {
    const merged = [...remote, ...local];
    const keyOf = (item: any) => item && typeof item === 'object'
      ? item.id ?? item.word ?? item.lessonId ?? JSON.stringify(item)
      : String(item);
    const unique = new Map<string, any>();
    for (const item of merged) unique.set(String(keyOf(item)), item);
    return Array.from(unique.values()).slice(-500) as T;
  }
  if (typeof local === 'number' && typeof remote === 'number') return Math.max(local, remote) as T;
  if (local && remote && typeof local === 'object' && typeof remote === 'object') {
    const result: Record<string, unknown> = { ...(remote as any) };
    for (const [key, value] of Object.entries(local as any)) {
      result[key] = key in result ? mergeCloudMemory(value, result[key]) : value;
    }
    return result as T;
  }
  return (local ?? remote) as T;
}
