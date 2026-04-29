/**
 * storage.js — localStorage helpers
 * Handles: liked songs persistence
 */

const Storage = (() => {
  const LIKED_KEY = 'beatflow_liked';

  function getLiked() {
    try {
      return JSON.parse(localStorage.getItem(LIKED_KEY) || '{}');
    } catch { return {}; }
  }

  function saveLiked(liked) {
    localStorage.setItem(LIKED_KEY, JSON.stringify(liked));
  }

  function isLiked(videoId) {
    return !!getLiked()[videoId];
  }

  function toggleLike(track) {
    const liked = getLiked();
    const vid = track.id.videoId;
    if (liked[vid]) {
      delete liked[vid];
      saveLiked(liked);
      return false;
    } else {
      liked[vid] = {
        id: track.id,
        snippet: track.snippet,
        likedAt: Date.now()
      };
      saveLiked(liked);
      return true;
    }
  }

  function getAllLiked() {
    const liked = getLiked();
    return Object.values(liked).sort((a, b) => b.likedAt - a.likedAt);
  }

  return { isLiked, toggleLike, getAllLiked };
})();
