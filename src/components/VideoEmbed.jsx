import { getYouTubeId, getVimeoId, getLinkType } from '../utils/videoUtils';
import './VideoEmbed.css';

const VideoEmbed = ({ url, title }) => {
  const linkType = getLinkType(url);
  const youtubeId = getYouTubeId(url);
  const vimeoId = getVimeoId(url);

  if (linkType === 'youtube') {
    return (
      <div className="video-wrapper">
        <div className="video-container">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&color=white`}
            title={title || 'Video'}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="video-iframe"
          />
        </div>
        <p className="video-source-label">
          YouTube · Playback within SafeTalk
        </p>
      </div>
    );
  }

  if (linkType === 'vimeo') {
    return (
      <div className="video-wrapper">
        <div className="video-container">
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0&color=003DA5`}
            title={title || 'Video'}
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="video-iframe"
          />
        </div>
        <p className="video-source-label">
          Vimeo · No ads · Safe viewing
        </p>
      </div>
    );
  }

  if (linkType === 'external') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="external-link-btn"
        onClick={(e) => e.stopPropagation()}
      >
        Open resource
        <span className="external-icon" aria-hidden="true">
          ↗
        </span>
      </a>
    );
  }

  return null;
};

export default VideoEmbed;
