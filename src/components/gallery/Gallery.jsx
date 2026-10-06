import React, { useState, useMemo } from "react"
import Back from "../common/back/Back"
import { galleryCategories, galleryItems, impactStats, missionVideos } from "./galleryData"
import GalleryCard from "./GalleryCard"
import LightboxModal from "./LightboxModal"
import "./gallery.css"

const Gallery = () => {
  const [activeCategory, setActiveCategory] = useState("all")
  const [selectedItemIndex, setSelectedItemIndex] = useState(null)
  const [videoPlaying, setVideoPlaying] = useState(false)

  // Filter items based on activeCategory
  const filteredItems = useMemo(() => {
    if (activeCategory === "all") return galleryItems
    return galleryItems.filter((item) => item.category === activeCategory)
  }, [activeCategory])

  const selectedItem = selectedItemIndex !== null ? filteredItems[selectedItemIndex] : null

  const handleSelect = (item) => {
    const idx = filteredItems.findIndex((i) => i.id === item.id)
    if (idx !== -1) setSelectedItemIndex(idx)
  }

  const handleNext = () => {
    if (selectedItemIndex !== null && selectedItemIndex < filteredItems.length - 1) {
      setSelectedItemIndex(selectedItemIndex + 1)
    }
  }

  const handlePrev = () => {
    if (selectedItemIndex !== null && selectedItemIndex > 0) {
      setSelectedItemIndex(selectedItemIndex - 1)
    }
  }

  const handleClose = () => {
    setSelectedItemIndex(null)
  }

  const founderDoc = missionVideos.founderInterview

  return (
    <>
      <Back
        title='Excursions, Community Outreach & Campus Gallery'
        heroImage='/images/gallery/zoo3.jpeg'
      />

      {/* Main Gallery Section */}
      <section className='blis-gallery-page padding'>
        <div className='container'>
          {/* Header Introduction */}
          <div className='gallery-intro-head text-center'>
            <div className='gallery-section-badge'>
              <i className='fas fa-camera-retro'></i>
              <span>DOCUMENTED IMPACT & MEMORIES</span>
            </div>
            <h2>Showcasing Our Journey, Excursions & Outreaches</h2>
            <p className='gallery-lead-text'>
              Explore how Brighter Land International School and its founding parent ministry, 
              <strong> Brighter Land Global Mission</strong>, blend world-class experiential learning with 
              transformative community interventions across Plateau State and beyond.
            </p>
          </div>

          {/* Impact Stats Counters */}
          <div className='gallery-stats-grid'>
            {impactStats.map((stat) => (
              <div className='gallery-stat-card' key={stat.id}>
                <div className='gsc-icon-wrap'>
                  <i className={stat.icon}></i>
                </div>
                <div className='gsc-text'>
                  <span className='gsc-number'>{stat.number}</span>
                  <strong className='gsc-label'>{stat.label}</strong>
                  <small className='gsc-sub'>{stat.sub}</small>
                </div>
              </div>
            ))}
          </div>

          {/* Featured Video Documentary: Founder's Story & The Birth of BLIS */}
          <div className='gallery-documentary-card' id='founder-documentary'>
            <div className='gdc-grid'>
              <div className='gdc-video-col'>
                <div className='gdc-video-wrapper'>
                  <video
                    controls
                    playsInline
                    preload='metadata'
                    poster={founderDoc.poster}
                    className='gdc-video-player'
                    onPlay={() => setVideoPlaying(true)}
                    onPause={() => setVideoPlaying(false)}
                  >
                    <source src={founderDoc.src} type='video/mp4' />
                    Your browser does not support HTML5 video.
                  </video>
                  {!videoPlaying && (
                    <div className='gdc-video-tag-badge'>
                      <i className='fas fa-play-circle'></i> Official Video Interview
                    </div>
                  )}
                </div>
              </div>

              <div className='gdc-info-col'>
                <div className='gdc-badge'>
                  <i className='fas fa-film'></i>
                  <span>FOUNDING MANDATE & INTERVIEW</span>
                </div>
                <h3>{founderDoc.title}</h3>
                <h4 className='gdc-subtitle'>{founderDoc.subtitle}</h4>
                <p className='gdc-desc'>{founderDoc.description}</p>

                <div className='gdc-takeaways-list'>
                  {founderDoc.takeaways.map((item, idx) => (
                    <div className='gdc-takeaway-item' key={idx}>
                      <div className='gdc-tick'>
                        <i className='fas fa-check'></i>
                      </div>
                      <div>
                        <strong>{item.title}:</strong>
                        <span> {item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className='gdc-actions'>
                  <a
                    href='https://brighterlandglobalmission.org/'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='gdc-btn primary'
                  >
                    <i className='fas fa-globe-africa'></i>
                    <span>Visit Parent Ministry Website</span>
                  </a>
                  <a href='#gallery-grid-section' className='gdc-btn secondary'>
                    <i className='fas fa-images'></i>
                    <span>Browse Photo Albums Below</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Category Filter Pills */}
          <div className='gallery-filter-wrapper' id='gallery-grid-section'>
            <div className='gallery-filter-label'>
              <i className='fas fa-filter'></i>
              <span>Filter by Activity & Outreach:</span>
            </div>
            <div className='gallery-filter-pills'>
              {galleryCategories.map((cat) => (
                <button
                  key={cat.id}
                  type='button'
                  className={`g-filter-btn ${activeCategory === cat.id ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <i className={cat.icon}></i>
                  <span>{cat.name}</span>
                  <span className='g-count'>
                    {cat.id === "all"
                      ? galleryItems.length
                      : galleryItems.filter((i) => i.category === cat.id).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Filter Description Header */}
          <div className='gallery-active-summary flexSB'>
            <div>
              <h3>
                {galleryCategories.find((c) => c.id === activeCategory)?.name || "All Highlights"}
              </h3>
              <p>Showing {filteredItems.length} documented moments and outreach projects</p>
            </div>
            {activeCategory !== "all" && (
              <button
                type='button'
                className='g-reset-filter-btn'
                onClick={() => setActiveCategory("all")}
              >
                <i className='fas fa-undo-alt'></i> Show All Photos
              </button>
            )}
          </div>

          {/* Gallery Items Grid */}
          <div className='blis-gallery-grid'>
            {filteredItems.map((item) => (
              <GalleryCard key={item.id} item={item} onSelect={handleSelect} />
            ))}
          </div>

          {/* Bottom Ministry Support & Sponsorship Callout */}
          <div className='gallery-partner-cta'>
            <div className='gp-cta-icon'>
              <i className='fas fa-hand-holding-heart'></i>
            </div>
            <div className='gp-cta-text'>
              <h3>Partner with Brighter Land Global Mission</h3>
              <p>
                Whether sponsoring a child's academic scholarship, co-funding a clean water community borehole, 
                or donating educational relief materials, your partnership empowers the next generation.
              </p>
            </div>
            <div className='gp-cta-buttons'>
              <a
                href='tel:+2348034367951'
                className='gp-btn primary'
              >
                <i className='fas fa-phone-alt'></i> Contact Leadership
              </a>
              <a
                href='https://brighterlandglobalmission.org/'
                target='_blank'
                rel='noopener noreferrer'
                className='gp-btn outline'
              >
                <i className='fas fa-external-link-alt'></i> Global Mission Portal
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {selectedItemIndex !== null && (
        <LightboxModal
          item={selectedItem}
          onClose={handleClose}
          onNext={handleNext}
          onPrev={handlePrev}
          hasNext={selectedItemIndex < filteredItems.length - 1}
          hasPrev={selectedItemIndex > 0}
        />
      )}
    </>
  )
}

export default Gallery
