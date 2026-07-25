import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ReflowBook } from "@/lib/reader/types";

export interface SearchMatch {
  blockIndex: number;
  page: number;
  preview: string;
}

interface Props {
  book: ReflowBook;
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (match: SearchMatch) => void;
  onClose: () => void;
}

function buildMatches(book: ReflowBook, query: string): SearchMatch[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];

  const matches: SearchMatch[] = [];
  for (let index = 0; index < book.blocks.length && matches.length < 200; index++) {
    const block = book.blocks[index];
    if (block.type !== "paragraph" && block.type !== "heading") continue;
    const position = block.text.toLowerCase().indexOf(needle);
    if (position === -1) continue;
    const start = Math.max(0, position - 40);
    matches.push({
      blockIndex: index,
      page: block.page,
      preview:
        (start > 0 ? "…" : "") +
        block.text.slice(start, position + needle.length + 60).trim() +
        "…",
    });
  }
  return matches;
}

const ReaderSearchPanel = ({ book, query, onQueryChange, onSelect, onClose }: Props) => {
  const [draft, setDraft] = useState(query);
  const matches = useMemo(() => buildMatches(book, query), [book, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={draft}
            placeholder="Search in this book"
            className="pl-8"
            onChange={(event) => {
              setDraft(event.target.value);
              onQueryChange(event.target.value);
            }}
          />
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close search">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {query.trim().length < 2 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Type at least 2 characters to search.
          </p>
        ) : matches.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No results found.</p>
        ) : (
          <>
            <p className="px-2 py-1 text-xs text-muted-foreground">{matches.length} results</p>
            {matches.map((match, index) => (
              <button
                key={`${match.blockIndex}-${index}`}
                type="button"
                className="w-full rounded-md px-2 py-2 text-left hover:bg-muted"
                onClick={() => onSelect(match)}
              >
                <span className="line-clamp-2 text-sm">{match.preview}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Page {match.page}
                </span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default ReaderSearchPanel;
