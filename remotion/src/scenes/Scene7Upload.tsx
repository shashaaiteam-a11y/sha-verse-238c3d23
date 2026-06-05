import { interpolate, useCurrentFrame } from "remotion";
import { PhoneStage, SCREEN_W } from "../components/PhoneStage";
import { UploadScreen } from "../components/UploadScreen";
import { TapCursor } from "../components/TapCursor";
import { BOOKS } from "../theme";

const TITLE = "The Silent Echo";

export const Scene7Upload = () => {
  const frame = useCurrentFrame();
  const cover = frame >= 28 ? BOOKS[0] : null;
  const fileName = frame >= 52 ? "the-silent-echo.pdf" : null;
  const chars = Math.round(interpolate(frame, [66, 96], [0, TITLE.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const title = TITLE.slice(0, chars);
  const author = frame >= 104 ? "A. Rahman" : "";
  const caret = Math.floor(frame / 8) % 2 === 0 && chars < TITLE.length && frame >= 66;
  const uploading = frame >= 142;
  return (
    <PhoneStage eyebrow="Step 6" title="Publish your own" enterFrom="right">
      <UploadScreen
        sw={SCREEN_W}
        cover={cover}
        fileName={fileName}
        title={title}
        author={author}
        category="Fiction"
        language="English"
        showTitleCaret={caret}
        uploading={uploading}
      />
      <TapCursor x={SCREEN_W * 0.5} y={300} at={24} />
      <TapCursor x={SCREEN_W * 0.5} y={620} at={48} />
      <TapCursor x={SCREEN_W * 0.74} y={1320} at={140} />
    </PhoneStage>
  );
};
