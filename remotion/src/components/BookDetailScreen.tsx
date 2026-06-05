import { ChevronLeft, ThumbsUp, Bookmark, MoreHorizontal, Eye, Star, Play, Download } from "lucide-react";
import { C, inter } from "../theme";
import { BookCoverArt, BookData } from "./AppBookCard";

interface Props {
  sw: number;
  book: BookData & { cat?: string; likes?: string };
  scrollY?: number;
  liked?: boolean;
  saved?: boolean;
}

const Badge = ({ children, sw, variant = "secondary" }: any) => (
  <span
    style={{
      fontFamily: inter,
      fontWeight: 600,
      fontSize: sw * 0.036,
      padding: `${sw * 0.015}px ${sw * 0.03}px`,
      borderRadius: sw * 0.018,
      background: variant === "secondary" ? C.muted : "transparent",
      border: variant === "outline" ? `1px solid ${C.border}` : "none",
      color: C.foreground,
    }}
  >
    {children}
  </span>
);

export const BookDetailScreen = ({ sw, book, scrollY = 0, liked = false, saved = false }: Props) => {
  const pad = sw * 0.045;
  return (
    <div style={{ width: "100%", height: "100%", background: C.appBg, position: "relative", overflow: "hidden" }}>
      {/* header */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          background: C.appBg,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          gap: sw * 0.025,
          padding: `${sw * 0.035}px ${pad}px`,
        }}
      >
        <ChevronLeft size={sw * 0.06} color={C.foreground} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: inter, fontWeight: 700, fontSize: sw * 0.05, color: C.foreground, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{book.title}</div>
          <div style={{ fontFamily: inter, fontSize: sw * 0.036, color: C.mutedFg }}>by {book.author}</div>
        </div>
        <ThumbsUp size={sw * 0.052} color={liked ? C.primary : C.mutedFg} fill={liked ? C.primary : "none"} />
        <Bookmark size={sw * 0.052} color={saved ? C.primary : C.mutedFg} fill={saved ? C.primary : "none"} />
        <MoreHorizontal size={sw * 0.052} color={C.mutedFg} />
      </div>

      {/* body */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${-scrollY}px)`, paddingTop: sw * 0.2, padding: `${sw * 0.2}px ${pad}px 0` }}>
        {/* info card */}
        <div style={{ background: C.card, borderRadius: sw * 0.04, border: `1px solid ${C.border}`, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", padding: sw * 0.045, display: "flex", gap: sw * 0.045 }}>
          <div style={{ width: sw * 0.32, height: sw * 0.32 * 1.5, borderRadius: sw * 0.025, overflow: "hidden", flexShrink: 0, fontSize: sw * 0.07, boxShadow: "0 8px 20px rgba(0,0,0,0.2)" }}>
            <BookCoverArt book={book} radius={0} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: inter, fontWeight: 800, fontSize: sw * 0.058, color: C.foreground, lineHeight: 1.15 }}>{book.title}</div>
            <div style={{ fontFamily: inter, fontSize: sw * 0.042, color: C.mutedFg, marginTop: sw * 0.01 }}>by {book.author}</div>

            {/* channel row */}
            <div style={{ display: "flex", alignItems: "center", gap: sw * 0.022, marginTop: sw * 0.035 }}>
              <div style={{ width: sw * 0.06, height: sw * 0.06, borderRadius: "50%", background: `linear-gradient(135deg,${book.g[0]},${book.g[1]})` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: inter, fontWeight: 600, fontSize: sw * 0.036, color: C.foreground }}>{book.author}</div>
                <div style={{ fontFamily: inter, fontSize: sw * 0.03, color: C.mutedFg }}>4.2K subscribers</div>
              </div>
            </div>

            {/* badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: sw * 0.018, marginTop: sw * 0.035 }}>
              {book.cat && <Badge sw={sw} variant="secondary">{book.cat}</Badge>}
              <Badge sw={sw} variant="outline">English</Badge>
              <Badge sw={sw} variant="outline">{book.pages} pages</Badge>
            </div>
          </div>
        </div>

        {/* stats */}
        <div style={{ display: "flex", gap: sw * 0.05, padding: `${sw * 0.04}px ${sw * 0.01}px`, fontFamily: inter, fontSize: sw * 0.04, color: C.mutedFg }}>
          <span style={{ display: "flex", alignItems: "center", gap: sw * 0.012 }}><Eye size={sw * 0.045} /> {book.views} views</span>
          <span style={{ display: "flex", alignItems: "center", gap: sw * 0.012 }}><ThumbsUp size={sw * 0.045} /> {book.likes} likes</span>
          <span style={{ display: "flex", alignItems: "center", gap: sw * 0.012 }}><Star size={sw * 0.045} /> 4.6 (382)</span>
        </div>

        {/* actions */}
        <div style={{ display: "flex", gap: sw * 0.03 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: sw * 0.02, height: sw * 0.12, borderRadius: sw * 0.025, background: C.primary, color: "#fff", fontFamily: inter, fontWeight: 700, fontSize: sw * 0.045 }}>
            <Play size={sw * 0.05} fill="#fff" /> Start Reading
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: sw * 0.02, height: sw * 0.12, padding: `0 ${sw * 0.04}px`, borderRadius: sw * 0.025, border: `1px solid ${C.border}`, background: C.card, color: C.foreground, fontFamily: inter, fontWeight: 600, fontSize: sw * 0.042 }}>
            <Download size={sw * 0.05} /> Download
          </div>
        </div>

        {/* about */}
        <div style={{ background: C.card, borderRadius: sw * 0.04, border: `1px solid ${C.border}`, padding: sw * 0.045, marginTop: sw * 0.045 }}>
          <div style={{ fontFamily: inter, fontWeight: 800, fontSize: sw * 0.05, color: C.foreground, marginBottom: sw * 0.025 }}>About This Book</div>
          <div style={{ fontFamily: inter, fontSize: sw * 0.04, color: C.mutedFg, lineHeight: 1.6 }}>
            A gripping, unforgettable journey that keeps you turning pages late into the night. Praised by readers for its rich characters and bold, emotional storytelling.
          </div>
        </div>
      </div>
    </div>
  );
};
