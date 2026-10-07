import React from "react"

const GalleryCard = ({ item, onSelect }) => {
  const isVideo = item.type === "video"

  return (
    <div className='gallery-card' onClick={() => onSelect(item)}>
      <div className='gc-media-wrap'>
        <img
          src={isVideo ? item.poster : item.image}
          alt={item.title}
          className='gc-img'
          loading='lazy'
          onError={(e) => {
            e.target.onerror = null
            e.target.src = "/images/blis3.jpeg"
          }}
        />

        {/* Gradient Overlay */}
        <div className='gc-overlay'>
          <div className='gc-action-btn' title={isVideo ? "Play Video" : "View Fullscreen"}>
            <i className={isVideo ? "fas fa-play" : "fas fa-expand-alt"}></i>
          </div>
        </div>

        {/* Video Badge (only for video media) */}
        {isVideo && (
          <div className='gc-badge'>
            <span className='video-badge'>
              <i className='fas fa-video'></i> VIDEO
            </span>
          </div>
        )}
      </div>

      <div className='gc-info'>
        <div className='gc-meta'>
          {item.location && (
            <span className='gc-location'>
              <i className='fas fa-map-marker-alt'></i> {item.location}
            </span>
          )}
        </div>
        <h4 className='gc-title'>{item.title}</h4>
        <p className='gc-desc'>{item.description}</p>
      </div>
    </div>
  )
}

export default GalleryCard
