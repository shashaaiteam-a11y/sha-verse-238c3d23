import { playfair, inter } from "../theme";

interface Props {
  title: string;
  author: string;
  g: [string, string] | string[];
  w?: number;
}

// A clean 2:3 book cover, procedurally styled to match the Bookshelf grid.
export const BookCover = ({ title, author, g, w = 200 }: Props) => {
  const h = w * 1.5;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: w * 0.06,
        overflow: "hidden",
        position: "relative",
        background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`,
        boxShadow: "0 22px 45px rgba(0,0,0,0.45)",
        flexShrink: 0,
      }}
    >
      {/* spine highlight */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: w * 0.07,
          background: "rgba(255,255,255,0.22)",
        }}
      />
      {/* glossy sheen */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(115deg, rgba(255,255,255,0.28) 0%, transparent 38%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: w * 0.1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            fontFamily: playfair,
            fontWeight: 800,
            color: "#fff",
            fontSize: w * 0.12,
            lineHeight: 1.05,
            textShadow: "0 2px 8px rgba(0,0,0,0.35)",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: inter,
            fontWeight: 600,
            color: "rgba(255,255,255,0.85)",
            fontSize: w * 0.06,
            marginTop: w * 0.04,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {author}
        </div>
      </div>
    </div>
  );
};
