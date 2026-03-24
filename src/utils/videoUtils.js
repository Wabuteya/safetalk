// Detect and extract YouTube video ID
export const getYouTubeId = (url) => {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
  );
  return match ? match[1] : null;
};

// Detect and extract Vimeo video ID
export const getVimeoId = (url) => {
  if (!url) return null;
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
};

// Detect what type of link it is
export const getLinkType = (url) => {
  if (!url) return null;
  if (getYouTubeId(url)) return 'youtube';
  if (getVimeoId(url)) return 'vimeo';
  return 'external';
};
