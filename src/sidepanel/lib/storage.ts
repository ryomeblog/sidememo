// IndexedDB はストレージ逼迫時にブラウザから削除される可能性がある (§10.2)。
// 初回起動時に永続化を要求しておく。

export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    const granted = await navigator.storage.persist();
    if (!granted) {
      console.warn("Storage may be evicted under pressure.");
    }
    return granted;
  } catch (error) {
    console.warn("requestPersistence failed", error);
    return false;
  }
}
