import type { Tag } from "../../types";

interface TagFilterBarProps {
  tags: Tag[];
  selectedTagIds: string[];
  onToggle: (tagId: string) => void;
  onClear: () => void;
}

export function TagFilterBar(props: TagFilterBarProps) {
  const { tags, selectedTagIds, onToggle, onClear } = props;
  if (tags.length === 0) return null;

  const hasSelection = selectedTagIds.length > 0;

  return (
    <div className="sidememo-tag-filter">
      <div className="sidememo-tag-filter__chips">
        {tags.map((tag) => {
          const active = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              className={
                active
                  ? "sidememo-tag-chip sidememo-tag-chip--active"
                  : "sidememo-tag-chip sidememo-tag-chip--muted"
              }
              style={
                active
                  ? { backgroundColor: tag.color, borderColor: tag.color }
                  : { borderColor: tag.color }
              }
              onClick={() => onToggle(tag.id)}
              aria-pressed={active}
            >
              {tag.name}
            </button>
          );
        })}
      </div>
      {hasSelection && (
        <button
          type="button"
          className="sidememo-tag-filter__clear"
          onClick={onClear}
        >
          クリア
        </button>
      )}
    </div>
  );
}
