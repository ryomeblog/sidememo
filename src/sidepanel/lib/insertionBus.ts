// 選択テキスト挿入を Side Panel 内で受け渡すための簡易イベントバス。
// Service Worker からのメッセージや storage.session のドレインを App 層で受け取り、
// EditorContainer 側へ流す。リスナー未登録時はバッファリングして、購読が来た時点で消化する。

type InsertHandler = (text: string) => void;
const handlers = new Set<InsertHandler>();
let pending: string[] = [];

export function onInsertText(handler: InsertHandler): () => void {
  handlers.add(handler);
  if (pending.length > 0) {
    const drain = pending;
    pending = [];
    // 同期的に呼ぶと購読側の useEffect cleanup と被る可能性があるためマイクロタスクへ。
    queueMicrotask(() => {
      for (const text of drain) handler(text);
    });
  }
  return () => {
    handlers.delete(handler);
  };
}

export function emitInsertText(text: string): boolean {
  if (handlers.size === 0) {
    pending.push(text);
    return false;
  }
  for (const handler of handlers) handler(text);
  return true;
}
