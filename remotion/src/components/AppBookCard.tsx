import { Eye } from "lucide-react";
import { C, inter, playfair } from "../theme";

export interface BookData {
  title: string;
  author: string;
  g: string[] | [string, string];
  views?: string;
  pages?: number;
}

// Procedural 2:3 book cover (matches the app's gradient covers for books w/o art).
export const BookCoverArt = ({ book, radius = 10 }: { book: BookData; radius?: number }) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: `linear-gradient(135deg, ${book.g[0]}, ${book.g[1]})`,
        overflow: "hidden",
        borderRadius: radius,
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "7%", background: "rgba(255,255,255,0.22)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(255,255,255,0.25) 0%, transparent 40%)" }} />
      <div style={{ position: "absolute", inset: 0, padding: "12% 11%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <div style={{ fontFamily: playfair, fontWeight: 800, color: "#fff", fontSize: "1.55em", lineHeight: 1.05, textShadow: "0 2px 8px rgba(0,0,0,0.35)" }}>
          {book.title}
        </div>
        <div style={{ fontFamily: inter, fontWeight: 600, color: "rgba(255,255,255,0.85)", fontSize: "0.8em", marginTop: "5%", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {book.author}
        </div>
      </div>
    </div>
  );
};

// Faithful recreation of src/components/bookshelf/BookCard.tsx
export const AppBookCard = ({ book, w }: { book: BookData; w: number }) => {
  return (
    <div
      style={{
        width: w,
        background: C.card,
        borderRadius: w * 0.085,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(20,20,30,0.08)",
        border: `1px solid ${C.border}`,
      }}
    >
      <div style={{ width: "100%", aspectRatio: "2 / 3", fontSize: w * 0.12 }}>
        <BookCoverArt book={book} radius={0} />
      </div>
      <div style={{ padding: w * 0.06 }}>
        <div
          style={{
            fontFamily: inter,
            fontWeight: 600,
            fontSize: w * 0.092,
            color: C.foreground,
            lineHeight: 1.15,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: w * 0.21,
          }}
        >
          {book.title}
        </div>
        <div style={{ fontFamily: inter, fontWeight: 400, fontSize: w * 0.072, color: C.mutedFg, marginTop: w * 0.02, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {book.author}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: w * 0.03, marginTop: w * 0.05, color: C.mutedFg, fontFamily: inter, fontSize: w * 0.068 }}>
          <Eye size={w * 0.08} />
          {book.views || "0"} views
        </div>
      </div>
    </div>
  );
};
