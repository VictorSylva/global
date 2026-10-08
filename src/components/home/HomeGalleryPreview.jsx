import React, { useState } from "react"
import { Link } from "react-router-dom"
import { galleryItems } from "../gallery/galleryData"
import GalleryCard from "../gallery/GalleryCard"
import LightboxModal from "../gallery/LightboxModal"
import "./HomeGalleryPreview.css"

const previewFilterTabs = [
  { id: "all", label: "Featured Highlights", icon: "fas fa-star" },
  { id: "evolution", label: "Campus Evolution", icon: "fas fa-building" },
  { id: "excursions", label: "Excursions & Safaris", icon: "fas fa-bus" },
  { id: "partners", label: "Sponsors & Benefactors", icon: "fas fa-hand-holding-heart" },
  { id: "mission", label: "School Bags & Relief", icon: "fas fa-hands-helping" },
]

const HomeGalleryPreview = () => {
  const [selectedTab, setSelectedTab] = useState("all")
  const [selectedItemIndex, setSelectedItemIndex] = useState(null)

  // Filter items for home preview
  const displayItems = React.useMemo(() => {
    if (selectedTab === "all") {
      return galleryItems.filter((item) => item.featured).slice(0, 6)
    }
    if (selectedTab === "evolution") {
      return galleryItems.filter((item) => item.category === "evolution").slice(0, 6)
    }
    if (selectedTab === "excursions") {
      return galleryItems.filter((item) => item.group === "excursions").slice(0, 6)
    }
    if (selectedTab === "partners") {
      return galleryItems.filter((item) => item.category === "partners" || item.category === "supporter").slice(0, 6)
    }
    if (selectedTab === "mission") {
      return galleryItems.filter((item) => item.category === "bags" || item.group === "mission").slice(0, 6)
    }
    return galleryItems.filter((item) => item.category === selectedTab).slice(0, 6)
  }, [selectedTab])

  const selectedItem = selectedItemIndex !== null ? displayItems[selectedItemIndex] : null

  const handleSelect = (item) => {
    const idx = displayItems.findIndex((i) => i.id === item.id)
    if (idx !== -1) setSelectedItemIndex(idx)
  }

  const handleNext = () => {
    if (selectedItemIndex !== null && selectedItemIndex < displayItems.length - 1) {
      setSelectedItemIndex(selectedItemIndex + 1)
    }
  }

  const handlePrev = () => {
    if (selectedItemIndex !== null && selectedItemIndex > 0) {
      setSelectedItemIndex(selectedItemIndex - 1)
    }
  }

  return (
    <section className='home-gallery-preview' id='school-activities'>
      <div className='container'>
        {/* Section Header */}
        <div className='hgp-header flexSB'>
          <div className='hgp-header-left'>
            <div className='hgp-badge'>
              <i className='fas fa-camera'></i>
              <span>EXPERIENTIAL LEARNING & COMMUNITY IMPACT</span>
            </div>
            <h2>Life at BLIS: Excursions, Partnerships & Missions</h2>
            <p>
              Witness our scholars exploring world destinations like the Jos Zoo, Yakubu Gowon Airport, and National Museum, 
              alongside life-transforming scholarships, clean water boreholes, and community outreaches by the 
              <strong> Brighter Land Global Mission</strong>.
            </p>
          </div>
          <div className='hgp-header-right'>
            <Link to='/gallery' className='hgp-view-all-btn'>
              <span>EXPLORE FULL GALLERY (90+ PHOTOS)</span>
              <i className='fas fa-arrow-right'></i>
            </Link>
          </div>
        </div>

        {/* Highlight Filter Tabs */}
        <div className='hgp-tabs flex'>
          {previewFilterTabs.map((tab) => (
            <button
              key={tab.id}
              type='button'
              className={`hgp-tab-btn ${selectedTab === tab.id ? "active" : ""}`}
              onClick={() => setSelectedTab(tab.id)}
            >
              <i className={tab.icon}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Gallery Cards Grid */}
        <div className='blis-gallery-grid hgp-grid'>
          {displayItems.map((item) => (
            <GalleryCard key={item.id} item={item} onSelect={handleSelect} />
          ))}
        </div>

        {/* Bottom Banner with Quick Excursion Highlights */}
        <div className='hgp-feature-banner'>
          <div className='hgp-fb-pill'>
            <i className='fas fa-paw'></i>
            <div>
              <strong>Jos Zoo & Wildlife Park</strong>
              <small>Hands-on zoology & ecology</small>
            </div>
          </div>
          <div className='hgp-fb-divider'></div>
          <div className='hgp-fb-pill'>
            <i className='fas fa-plane-departure'></i>
            <div>
              <strong>Yakubu Gowon Airport</strong>
              <small>Aviation & flight logistics</small>
            </div>
          </div>
          <div className='hgp-fb-divider'></div>
          <div className='hgp-fb-pill'>
            <i className='fas fa-landmark'></i>
            <div>
              <strong>Jos National Museum</strong>
              <small>Nigerian heritage & Nok arts</small>
            </div>
          </div>
          <div className='hgp-fb-divider'></div>
          <div className='hgp-fb-pill'>
            <i className='fas fa-tint'></i>
            <div>
              <strong>Clean Water & Relief (BLGM)</strong>
              <small>Community boreholes & grants</small>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedItemIndex !== null && (
        <LightboxModal
          item={selectedItem}
          onClose={() => setSelectedItemIndex(null)}
          onNext={handleNext}
          onPrev={handlePrev}
          hasNext={selectedItemIndex < displayItems.length - 1}
          hasPrev={selectedItemIndex > 0}
        />
      )}
    </section>
  )
}

export default HomeGalleryPreview
