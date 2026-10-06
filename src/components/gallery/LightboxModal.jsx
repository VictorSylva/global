import React, { useEffect } from "react"

const LightboxModal = ({ item, onClose, onNext, onPrev, hasNext, hasPrev }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight" && hasNext) onNext()
      if (e.key === "ArrowLeft" && hasPrev) onPrev()
    }
    window.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "unset"
    }
  }, [onClose, onNext, onPrev, hasNext, hasPrev])

  if (!item) return null

  return (
    <div className='gallery-lightbox-overlay' onClick={onClose}>
      <div className='gallery-lightbox-content' onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className='glb-close-btn' onClick={onClose} aria-label='Close preview'>
          <i className='fas fa-times'></i>
        </button>

        {/* Previous Button */}
        {hasPrev && (
          <button className='glb-nav-btn glb-prev' onClick={onPrev} aria-label='Previous item'>
            <i className='fas fa-chevron-left'></i>
          </button>
        )}

        {/* Next Button */}
        {hasNext && (
          <button className='glb-nav-btn glb-next' onClick={onNext} aria-label='Next item'>
            <i className='fas fa-chevron-right'></i>
          </button>
        )}

        {/* Media Frame */}
        <div className='glb-media-frame'>
          {item.type === "video" ? (
            <video
              controls
              autoPlay
              playsInline
              className='glb-media-video'
              poster={item.poster || "/images/proprietor.png"}
            >
              <source src={item.src} type='video/mp4' />
              Your browser does not support the video tag.
            </video>
          ) : (
            <img src={item.image} alt={item.title} className='glb-media-img' />
          )}
        </div>

        {/* Caption & Metadata Bar */}
        <div className='glb-details'>
          <div className='glb-meta-row'>
            <span className='glb-category-badge'>
              <i className='fas fa-tag'></i> {item.categoryLabel}
            </span>
            {item.location && (
              <span className='glb-location'>
                <i className='fas fa-map-marker-alt'></i> {item.location}
              </span>
            )}
            {item.date && (
              <span className='glb-date'>
                <i className='far fa-calendar-alt'></i> {item.date}
              </span>
            )}
          </div>
          <h3 className='glb-title'>{item.title}</h3>
          {item.description && <p className='glb-desc'>{item.description}</p>}
        </div>
      </div>
    </div>
  )
}

export default LightboxModal
