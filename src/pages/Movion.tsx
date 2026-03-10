// Movion Main Page - YouTube-style Video Platform
import { Routes, Route } from "react-router-dom";
import { MovionStoreProvider } from "@/movion/store";
import { MovionLayout } from "@/movion/components/MovionLayout";
import { UndoProvider } from "@/movion/contexts/UndoContext";
import MovionHome from "@/movion/pages/MovionHome";
import MovionShorts from "@/movion/pages/MovionShorts";
import MovionWatch from "@/movion/pages/MovionWatch";
import MovionChannel from "@/movion/pages/MovionChannel";
import MovionSubscriptions from "@/movion/pages/MovionSubscriptions";
import MovionLibrary from "@/movion/pages/MovionLibrary";
import MovionUpload from "@/movion/pages/MovionUpload";
import MovionStudio from "@/movion/pages/MovionStudio";

const Movion = () => {
  return (
    <MovionStoreProvider>
      <UndoProvider>
        <MovionLayout>
          <Routes>
            <Route path="/" element={<MovionHome />} />
            <Route path="/shorts" element={<MovionShorts />} />
            <Route path="/shorts/:videoId" element={<MovionShorts />} />
            <Route path="/watch/:videoId" element={<MovionWatch />} />
            <Route path="/channel/:channelId" element={<MovionChannel />} />
            <Route path="/subscriptions" element={<MovionSubscriptions />} />
            <Route path="/library" element={<MovionLibrary />} />
            <Route path="/upload" element={<MovionUpload />} />
            <Route path="/studio" element={<MovionStudio />} />
            <Route path="*" element={<MovionHome />} />
          </Routes>
        </MovionLayout>
      </UndoProvider>
    </MovionStoreProvider>
  );
};

export default Movion;
