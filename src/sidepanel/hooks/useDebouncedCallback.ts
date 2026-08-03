import { useEffect, useMemo, useRef } from "react";

export interface DebouncedCallback<Args extends unknown[]> {
  /** 通常呼び出し。最後の呼び出しから delay ms 後に 1 回だけ実行される。 */
  (...args: Args): void;
  /** 保留中の呼び出しを即座に実行する（アンマウント直前などに使う）。 */
  flush(): void;
  /** 保留中の呼び出しを破棄する。 */
  cancel(): void;
  /** 保留中の呼び出しがあるか。 */
  isPending(): boolean;
}

// debounce: 最後の呼び出しから delay ms 経過後に実際の処理を 1 回だけ実行する。
// 自動保存などで使用 (§5.2: debounce 500ms)。
//
// [修正] 以前はアンマウント時に保留中のタイマーを cancel していたため、
// 入力直後にメモを切り替える / 削除する / サイドパネルを閉じると
// 最後の入力が保存されずに失われていた。現在は flush() を提供し、
// 呼び出し側がアンマウント時に確定保存できるようにしている。
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number,
): DebouncedCallback<Args> {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingArgsRef = useRef<Args | null>(null);
  const delayRef = useRef(delay);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // delay が変わっても保留中のタイマーは取りこぼさない（旧実装は取りこぼしていた）。
  useEffect(() => {
    delayRef.current = delay;
  }, [delay]);

  return useMemo(() => {
    const clear = () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const debounced = ((...args: Args) => {
      pendingArgsRef.current = args;
      clear();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const pending = pendingArgsRef.current;
        pendingArgsRef.current = null;
        if (pending) callbackRef.current(...pending);
      }, delayRef.current);
    }) as DebouncedCallback<Args>;

    debounced.flush = () => {
      const pending = pendingArgsRef.current;
      clear();
      pendingArgsRef.current = null;
      if (pending) callbackRef.current(...pending);
    };

    debounced.cancel = () => {
      clear();
      pendingArgsRef.current = null;
    };

    debounced.isPending = () => pendingArgsRef.current !== null;

    return debounced;
  }, []);
}
