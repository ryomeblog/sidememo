import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db/index";
import type { Tag } from "../../types";

export function useTags(): Tag[] | undefined {
  return useLiveQuery(() => db.tags.orderBy("createdAt").toArray(), []);
}
