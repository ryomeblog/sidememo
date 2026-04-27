# Store Listing (English)

## Short description (max 132 chars)

A Markdown side-panel notebook for your browser. Real-time WYSIWYG, tags, full-text search, page reference, JSON backup. Local-only.

> Character count: 130 / 132

## Detailed description (max 4,000 chars)

SideMemo is a Manifest V3 side-panel extension that lets you take Markdown notes without leaving the page you're reading. Whether you're researching, drafting a blog post, or keeping study notes, just pop the panel and start typing.

### Highlights

- **True WYSIWYG Markdown editor**
  `#` becomes a heading, `**bold**` formats inline, `- [ ]` becomes a checkbox — all as you type. There is no separate edit / preview mode toggle.

- **Three layout modes**
  Auto, Two-pane, or One-pane. Auto mode uses 400px as the threshold: above that, the list and editor sit side-by-side; below it, they switch via tabs.

- **Tags and full-text search**
  Start with Inbox / Idea / Work. Tags are color-coded and you can add or edit them freely. Multi-tag filtering uses OR. Search is fuzzy across title and body.

- **Page reference**
  Click "+ ページ添付 (Attach page)" to capture the active tab's URL, title, and favicon. Click the chip later to reopen that page in a new tab.

- **Selected text capture**
  Select text on any page, right-click, and choose "Insert selected text into SideMemo" to drop it at your cursor in the current note.

- **Export / Import**
  Save all your notes and tags to a single JSON file. Re-import with merge (add to existing) or replace (clear and overwrite) modes.

- **Local-only, zero telemetry**
  Notes are stored in your browser's IndexedDB. SideMemo never sends data to any external server, and there is no analytics or tracking.

### How to open

- Click the SideMemo toolbar icon
- Keyboard shortcut: `Ctrl+Shift+M` (`Cmd+Shift+M` on macOS)
- Right-click any page → "Open SideMemo"

You can change the shortcut at `chrome://extensions/shortcuts`.

### Permissions

| Permission | Why |
|------|-----|
| `sidePanel` | Required for the side-panel UI itself |
| `storage` | Stores settings and a tiny session payload used to relay selected-text insertion |
| `tabs` | Reads the active tab's URL, title, and favicon when you click "Attach page". SideMemo does **not** read page content. |
| `contextMenus` | Registers the right-click menu entries |
| `downloads` | Saves the JSON export to disk |

SideMemo requests **no** `host_permissions`.

### Requirements

- Chrome or Edge 114+ (the `chrome.sidePanel` API is required).

### Privacy

All your data lives in IndexedDB on your device. Nothing is uploaded, shared, or sold. See the privacy policy for the full statement.
