// Hidden Videos Hook - For "Not Interested" feature with undo
import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'movion_hidden_videos';

export const useHiddenVideos = () => {
  const [hiddenVideos, setHiddenVideos] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenVideos));
  }, [hiddenVideos]);

  const hideVideo = useCallback((videoId: string) => {
    setHiddenVideos(prev => {
      if (prev.includes(videoId)) return prev;
      return [...prev, videoId];
    });
  }, []);

  const unhideVideo = useCallback((videoId: string) => {
    setHiddenVideos(prev => prev.filter(id => id !== videoId));
  }, []);

  const isHidden = useCallback((videoId: string) => {
    return hiddenVideos.includes(videoId);
  }, [hiddenVideos]);

  const clearHiddenVideos = useCallback(() => {
    setHiddenVideos([]);
  }, []);

  return {
    hiddenVideos,
    hideVideo,
    unhideVideo,
    isHidden,
    clearHiddenVideos,
  };
};
