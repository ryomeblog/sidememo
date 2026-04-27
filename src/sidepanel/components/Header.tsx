interface HeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onNewNote: () => void;
  onOpenSettings: () => void;
}

export function Header(props: HeaderProps) {
  const { searchQuery, onSearchChange, onNewNote, onOpenSettings } = props;
  return (
    <header className="sidememo-header">
      <input
        className="sidememo-header__search"
        type="search"
        placeholder="検索..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label="メモを検索"
      />
      <button
        type="button"
        className="sidememo-button sidememo-button--primary"
        onClick={onNewNote}
        title="新規メモ (Ctrl+N)"
      >
        + 新規
      </button>
      <button
        type="button"
        className="sidememo-button"
        onClick={onOpenSettings}
        title="設定"
        aria-label="設定"
      >
        ⚙
      </button>
    </header>
  );
}
