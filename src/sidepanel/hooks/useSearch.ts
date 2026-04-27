import { useLiveQuery } from "dexie-react-hooks";
import { searchNotes, sortByPinAndUpdate } from "../lib/db/search";
import type { Note } from "../../types";

// 検索クエリ・タグフィルタが変わるたびに IndexedDB を再走査して結果を返す。
// useLiveQuery を使うのでメモの追加・更新でもリアルタイムに更新される。
export function useSearch(
  query: string,
  selectedTagIds: string[],
): Note[] | undefined {
  return useLiveQuery(async () => {
    const result = await searchNotes({ query, tagIds: selectedTagIds });
    // クエリ未指定時はピン留め優先 + 更新日時降順を適用。
    // クエリありの場合は Fuse.js のスコア順を尊重するためそのまま返す。
    if (!query.trim()) return sortByPinAndUpdate(result);
    return result;
  }, [query, selectedTagIds.join(",")]);
}
