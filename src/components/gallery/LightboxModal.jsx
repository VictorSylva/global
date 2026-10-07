import React, { useState, useEffect, useRef } from "react"

const LightboxModal = ({ item, onClose, onNext, onPrev, hasNext, hasPrev }) => {
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)
  const autoPlayRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight" && hasNext) onNext()
      if (e.key === "ArrowLeft" && hasPrev) onPrev()
      if (e.key === " ") {
        e.preventDefault()
        setIsAutoPlaying((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "unset"
    }
  }, [onClose, onNext, onPrev, hasNext, hasPrev])

  // Auto-slide effect inside modal
  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(() => {
        if (hasNext) {
          onNext()
        } else {
          // loop back or stop
          setIsAutoPlaying(false)
        }
      }, 3500)
    } else {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current)
    }

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current)
    }
  }, [isAutoPlaying, hasNext, onNext])

  if (!item) return null

  return (
    <div className='gallery-lightbox-overlay' onClick={onClose}>
      <div className='gallery-lightbox-content' onClick={(e) => e.stopPropagation()}>
        {/* Top Controls Bar */}
        <div className='glb-top-bar'>
          <button
            type='button'
            className={`glb-slideshow-btn ${isAutoPlaying ? "active" : ""}`}
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            title={isAutoPlaying ? "Pause Auto-Slide" : "Start Auto-Slide"}
          >
            <i className={isAutoPlaying ? "fas fa-pause" : "fas fa-play"}></i>
            <span>{isAutoPlaying ? "Auto-Slide Playing (3.5s)" : "Auto-Slide"}</span>
          </button>

          <button className='glb-close-btn' onClick={onClose} aria-label='Close preview'>
            <i className='fas fa-times'></i>
          </button>
        </div>

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
            {item.categoryLabel && (
              <span className='glb-category-badge'>
                <i className='fas fa-tag'></i> {item.categoryLabel}
              </span>
            )}
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
