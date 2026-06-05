import { Search, Plus } from "lucide-react";
import { C, inter, GRADIENT_PRIMARY } from "../theme";

interface Props {
  sw: number;
  searchText?: string;
  searchFocused?: boolean;
  showCaret?: boolean;
}

// Faithful recreation of the Bookshelf sticky header (src/pages/Bookshelf.tsx).
export const AppHeader = ({ sw, searchText = "", searchFocused = false, showCaret = false }: Props) => {
  const pad = sw * 0.04;
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.92)",
        borderBottom: `1px solid ${C.border}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        padding: `${sw * 0.03}px ${pad}px`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: sw * 0.02 }}>
          {/* logo ring */}
          <div
            style={{
              width: sw * 0.085,
              height: sw * 0.085,
              borderRadius: "50%",
              background: GRADIENT_PRIMARY,
              padding: 2.5,
              display: "flex",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: inter,
                fontWeight: 900,
                fontSize: sw * 0.045,
                color: C.primary,
              }}
            >
              S
            </div>
          </div>
          <span
            style={{
              fontFamily: inter,
              fontWeight: 800,
              fontSize: sw * 0.062,
              background: GRADIENT_PRIMARY,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Bookshelf
          </span>
        </div>

        {/* upload + author avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: sw * 0.025 }}>
          <div
            style={{
              width: sw * 0.078,
              height: sw * 0.078,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.mutedFg,
            }}
          >
            <Plus size={sw * 0.05} />
          </div>
          <div
            style={{
              width: sw * 0.082,
              height: sw * 0.082,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#EC4899,#9333EA)",
              padding: 2.5,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: "linear-gradient(135deg,#6366F1,#A855F7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontFamily: inter,
                fontWeight: 700,
                fontSize: sw * 0.04,
                border: "2px solid #fff",
              }}
            >
              A
            </div>
          </div>
        </div>
      </div>

      {/* search bar */}
      <div style={{ marginTop: sw * 0.03, position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: sw * 0.025,
            height: sw * 0.105,
            borderRadius: sw * 0.025,
            border: `1.5px solid ${searchFocused ? C.primary : C.border}`,
            background: C.card,
            padding: `0 ${sw * 0.035}px`,
            boxShadow: searchFocused ? `0 0 0 3px rgba(37,99,235,0.15)` : "none",
          }}
        >
          <Search size={sw * 0.045} color={C.mutedFg} />
          <span
            style={{
              fontFamily: inter,
              fontSize: sw * 0.042,
              color: searchText ? C.foreground : C.mutedFg,
              fontWeight: searchText ? 500 : 400,
            }}
          >
            {searchText || "Search books or authors..."}
          </span>
          {showCaret && (
            <span style={{ width: 2, height: sw * 0.05, background: C.primary, marginLeft: -sw * 0.015 }} />
          )}
        </div>
      </div>
    </div>
  );
};
