import { v4 as uuidv4 } from "uuid";
import { db } from "./index";
import type { Tag } from "../../../types";

export async function listTags(): Promise<Tag[]> {
  return db.tags.orderBy("createdAt").toArray();
}

export async function getTag(id: string): Promise<Tag | undefined> {
  return db.tags.get(id);
}

export async function createTag(name: string, color: string): Promise<Tag> {
  const tag: Tag = {
    id: uuidv4(),
    name,
    color,
    createdAt: Date.now(),
  };
  await db.tags.add(tag);
  return tag;
}

export async function updateTag(
  id: string,
  patch: Partial<Pick<Tag, "name" | "color">>,
): Promise<void> {
  await db.tags.update(id, patch);
}

export async function deleteTag(id: string): Promise<void> {
  // タグを削除したら全メモの tagIds から取り除く
  await db.transaction("rw", db.tags, db.notes, async () => {
    await db.tags.delete(id);
    const affected = await db.notes.where("tagIds").equals(id).toArray();
    for (const note of affected) {
      const next = note.tagIds.filter((t) => t !== id);
      await db.notes.update(note.id, { tagIds: next });
    }
  });
}
