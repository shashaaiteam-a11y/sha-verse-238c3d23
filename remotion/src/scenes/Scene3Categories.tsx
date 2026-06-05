import { interpolate, useCurrentFrame } from "remotion";
import { PhoneStage, SCREEN_W } from "../components/PhoneStage";
import { HomeScreen } from "../components/HomeScreen";
import { TapCursor } from "../components/TapCursor";
import { BOOKS } from "../theme";

const QUERY = "the";

export const Scene3Categories = () => {
  const frame = useCurrentFrame();
  const chars = Math.round(interpolate(frame, [22, 46], [0, QUERY.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const typed = QUERY.slice(0, chars);
  const caret = Math.floor(frame / 8) % 2 === 0;
  const filtered = typed
    ? BOOKS.filter((b) => b.title.toLowerCase().includes(typed) || b.author.toLowerCase().includes(typed))
    : BOOKS;
  return (
    <PhoneStage eyebrow="Step 2" title="Search any book" enterFrom="right">
      <HomeScreen
        sw={SCREEN_W}
        activeTab="Discover"
        selectedCategory="All"
        searchText={typed}
        searchFocused
        showCaret={caret && chars < QUERY.length}
        books={filtered}
      />
      <TapCursor x={SCREEN_W * 0.5} y={250} at={16} />
    </PhoneStage>
  );
};
