import Dexie, { type Table } from "dexie";
import type { Note, NoteRevision, Setting, Tag } from "../../../types";

class SideMemoDB extends Dexie {
  notes!: Table<Note, string>;
  tags!: Table<Tag, string>;
  settings!: Table<Setting, string>;
  revisions!: Table<NoteRevision, number>;

  constructor() {
    super("SideMemoDB");
    this.version(1).stores({
      notes: "id, updatedAt, createdAt, pinned, *tagIds, title",
      tags: "id, &name, createdAt",
      settings: "key",
      revisions: "++id, noteId, savedAt",
    });
  }
}

export const db = new SideMemoDB();
