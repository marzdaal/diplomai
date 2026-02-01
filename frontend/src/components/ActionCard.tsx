import type { SuggestionItem } from "@/lib/types";

interface ActionCardProps {
  item: SuggestionItem;
  onRephrase: (id: string) => void;
  onReplace: (id: string) => void;
  onToggleSelect?: (id: string) => void;
}

export default function ActionCard({
  item,
  onRephrase,
  onReplace,
  onToggleSelect
}: ActionCardProps) {
  return (
    <article className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          {onToggleSelect && (
            <button
              type="button"
              onClick={() => onToggleSelect(item.id)}
              className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold transition ${
                item.selected
                  ? "border-ink bg-ink text-white"
                  : "border-border bg-white text-slate hover:border-slate"
              }`}
              aria-pressed={item.selected}
            >
              {item.selected ? "✓" : ""}
            </button>
          )}
          <p className="text-base leading-relaxed text-ink md:max-w-[70%]">{item.text}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onRephrase(item.id)}
            className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-slate transition hover:border-slate"
            disabled={item.status === "loading"}
          >
            Переформулировать
          </button>
          <button
            type="button"
            onClick={() => onReplace(item.id)}
            className="rounded-full border border-border bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
            disabled={item.status === "loading"}
          >
            Заменить
          </button>
        </div>
      </div>
    </article>
  );
}
