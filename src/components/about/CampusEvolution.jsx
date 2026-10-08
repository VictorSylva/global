import React, { useState } from "react"
import "./CampusEvolution.css"
import LightboxModal from "../gallery/LightboxModal"

const evolutionMilestones = [
  {
    id: "stage-1",
    phase: "Phase 1: Land & Foundation Digging",
    badge: "FOUNDATION PHASE",
    title: "Raw Land, Site Survey & Digging Foundation Trenches",
    year: "Foundation Phase",
    desc: "Starting at Gura-Suga with the raw land and old surrounding buildings, surveying the terrain, digging deep foundation holes, and laying the initial foundation blocks.",
    images: [
      {
        src: "/images/more/how the land was.jpeg",
        title: "How the Land Was: Original Site & Landscape",
        caption: "Raw ground and old community buildings before development began.",
        tag: "Original Site",
      },
      {
        src: "/images/more/how the land was2.jpeg",
        title: "How the Land Was: Land Survey & Terrain",
        caption: "Initial overview of the land and terrain before foundation excavation.",
        tag: "Site Survey",
      },
      {
        src: "/images/more/how the land was3.jpeg",
        title: "How the Land Was: Open Land View",
        caption: "Bare ground and open space showing the early layout of the land.",
        tag: "Genesis Grounds",
      },
      {
        src: "/images/more/how the land was4.jpeg",
        title: "How the Land Was: Site with Old Buildings",
        caption: "View of the land showing surrounding old community buildings.",
        tag: "Old Buildings",
      },
      {
        src: "/images/more/school buiding.jpeg",
        title: "Digging Foundation Trenches",
        caption: "Excavating the initial foundation trenches in the soil.",
        tag: "Foundation Digging",
      },
      {
        src: "/images/more/school building2.jpeg",
        title: "Foundation Holes & Groundwork",
        caption: "Foundation holes and trenches dug into the earth.",
        tag: "Foundation Holes",
      },
      {
        src: "/images/more/school building3.jpeg",
        title: "Inspecting Foundation Holes",
        caption: "Inspecting excavated foundation depth for the classroom structure.",
        tag: "Foundation Depth",
      },
      {
        src: "/images/more/school building4.jpeg",
        title: "Foundation with Blocks",
        caption: "Laying the first courses of foundation blocks inside the trenches.",
        tag: "Foundation Blocks",
      },
    ],
  },
  {
    id: "stage-2",
    phase: "Phase 2: Wall Raising, Lintel & Roofing Structure",
    badge: "STRUCTURAL WORK",
    title: "From 3–4 Block Courses to Lintel Level & Timber Roof Trusses",
    year: "Structural Work",
    desc: "Raising block walls 3 to 4 courses above foundation up to lintel level, mounting wooden roof trusses, and completing zinc roofing over unplastered blocks.",
    images: [
      {
        src: "/images/more/school building5.jpeg",
        title: "Raising Walls (3–4 Block Courses)",
        caption: "Raising classroom walls 3 to 4 courses of blocks above foundation.",
        tag: "Wall Raising",
      },
      {
        src: "/images/more/school buiding6.jpeg",
        title: "Wall Construction to Lintel Level",
        caption: "Block work progressing up to the lintel level across classroom rows.",
        tag: "Lintel Level",
      },
      {
        src: "/images/more/schoolbuilding7.jpeg",
        title: "Roofing Structure & Timber Trusses",
        caption: "Installation of wooden roof trusses and roofing framework.",
        tag: "Roof Structure",
      },
      {
        src: "/images/more/school building8.jpeg",
        title: "Roofed Building (Unplastered & Unpainted)",
        caption: "Classroom block with zinc roofing installed, unplastered and unpainted.",
        tag: "Roofed Structure",
      },
    ],
  },
  {
    id: "stage-3",
    phase: "Phase 3: Roofed Classrooms & Flooring",
    badge: "CLASSROOM BLOCKS",
    title: "One-Side Classroom Block, Floored Rooms & Learning",
    year: "Building Progress",
    desc: "One side of the new classroom block roofed alongside existing old buildings, progressing to floored classrooms and active daily teaching.",
    images: [
      {
        src: "/images/more/school building9.jpeg",
        title: "One-Side Classroom Block (Roofed & Unpainted)",
        caption: "One side of the classroom block built and roofed on raw ground alongside the old building, unpainted.",
        tag: "Roofed Block",
      },
      {
        src: "/images/more/school building10.jpeg",
        title: "Floored Classroom Wing & Site Grounds",
        caption: "Classroom block with internal flooring completed alongside the old buildings.",
        tag: "Floored Wing",
      },
      {
        src: "/images/more/school building11.jpeg",
        title: "Floored Classrooms & Compound View",
        caption: "Front view of floored classrooms with old buildings still situated on site.",
        tag: "Floored Classrooms",
      },
      {
        src: "/images/more/condusive learning environment.jpeg",
        title: "Conducive Classroom Learning",
        caption: "Scholars engaged in learning inside bright, equipped classroom spaces.",
        tag: "Conducive Learning",
      },
      {
        src: "/images/more/condusive learning environment2.jpeg",
        title: "Active Classroom Instruction",
        caption: "Dedicated teacher engaging with scholars during daily lessons.",
        tag: "Active Instruction",
      },
    ],
  },
]

const CampusEvolution = () => {
  const [activeTab, setActiveTab] = useState("all")
  const [lightboxData, setLightboxData] = useState(null)

  // Collect all images for lightbox navigation
  const allImages = React.useMemo(() => {
    const list = []
    evolutionMilestones.forEach((m) => {
      m.images.forEach((img) => {
        list.push({
          id: img.src,
          image: img.src,
          title: img.title,
          categoryLabel: m.badge,
          location: "BLIS Campus, Gura-Suga, Jos",
          date: m.year,
          description: img.caption,
        })
      })
    })
    return list
  }, [])

  const filteredStages =
    activeTab === "all"
      ? evolutionMilestones
      : evolutionMilestones.filter((m) => m.id === activeTab)

  const handleOpenLightbox = (src) => {
    const idx = allImages.findIndex((i) => i.image === src)
    if (idx !== -1) {
      setLightboxData({ index: idx, item: allImages[idx] })
    }
  }

  const handleNextLightbox = () => {
    if (lightboxData && lightboxData.index < allImages.length - 1) {
      const nextIdx = lightboxData.index + 1
      setLightboxData({ index: nextIdx, item: allImages[nextIdx] })
    }
  }

  const handlePrevLightbox = () => {
    if (lightboxData && lightboxData.index > 0) {
      const prevIdx = lightboxData.index - 1
      setLightboxData({ index: prevIdx, item: allImages[prevIdx] })
    }
  }

  return (
    <section className='campus-evolution-section' id='campus-evolution'>
      <div className='container'>
        {/* Section Header */}
        <div className='ce-header'>
          <div className='ce-pill'>
            <i className='fas fa-history'></i>
            <span>THE TESTIMONY OF FAITH & GROWTH</span>
          </div>
          <h2 className='ce-main-title'>
            From Nothing to Something: <span>Our Building Evolution</span>
          </h2>
          <p className='ce-subtitle'>
            Take a visual walkthrough of how Brighter Land International School grew from bare soil and a single
            unroofed block into a modern, multi-classroom campus providing world-class education for over 300 scholars.
          </p>
        </div>

        {/* Before vs After Impact Highlight Banner */}
        <div className='ce-transformation-banner'>
          <div className='ce-tb-card before'>
            <div className='ce-tb-badge then'>
              <i className='fas fa-seedling'></i> WHERE WE STARTED
            </div>
            <div className='ce-tb-img-wrap'>
              <img src='/images/more/how the land was.jpeg' alt='How the land was at the beginning' />
              <div className='ce-tb-caption'>
                <strong>How The Land Was</strong>
                <span>Untouched raw soil before construction began</span>
              </div>
            </div>
          </div>

          <div className='ce-tb-center'>
            <div className='ce-tb-arrow'>
              <i className='fas fa-arrow-right'></i>
            </div>
            <div className='ce-tb-quote'>
              <i className='fas fa-quote-left'></i>
              <p>
                "We had nothing in our hands but God's mandate to give hope to orphans, missionary children, and our community.
                Every block laid is a living testimony of grace."
              </p>
              <cite>— Rev. Fidelis Gambo, Founder & Proprietor</cite>
            </div>
          </div>

          <div className='ce-tb-card after'>
            <div className='ce-tb-badge now'>
              <i className='fas fa-university'></i> WHERE WE ARE TODAY
            </div>
            <div className='ce-tb-img-wrap'>
              <img src='/images/more/condusive learning environment.jpeg' alt='Modern conducive classroom' />
              <div className='ce-tb-caption'>
                <strong>Modern Conducive Campus</strong>
                <span>Vibrant classrooms, clean water & active learning</span>
              </div>
            </div>
          </div>
        </div>

        {/* Phase Navigation Tabs */}
        <div className='ce-tabs-wrap'>
          <button
            type='button'
            className={`ce-tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            <i className='fas fa-th-list'></i>
            <span>All Timeline Phases</span>
          </button>
          {evolutionMilestones.map((m) => (
            <button
              key={m.id}
              type='button'
              className={`ce-tab-btn ${activeTab === m.id ? "active" : ""}`}
              onClick={() => setActiveTab(m.id)}
            >
              <i className={m.id === "stage-1" ? "fas fa-hammer" : m.id === "stage-2" ? "fas fa-tools" : "fas fa-check-circle"}></i>
              <span>{m.phase.split(":")[0]}</span>
            </button>
          ))}
        </div>

        {/* Timeline Stages List */}
        <div className='ce-stages-list'>
          {filteredStages.map((stage, sIdx) => (
            <div className='ce-stage-block' key={stage.id}>
              <div className='ce-stage-info-bar'>
                <div className='ce-stage-meta'>
                  <span className='ce-stage-pill'>{stage.badge}</span>
                  <span className='ce-stage-year'>
                    <i className='far fa-calendar-alt'></i> {stage.year}
                  </span>
                </div>
                <h3 className='ce-stage-title'>{stage.title}</h3>
                <p className='ce-stage-desc'>{stage.desc}</p>
              </div>

              {/* Stage Photos Grid */}
              <div className='ce-photos-grid'>
                {stage.images.map((img, iIdx) => (
                  <div
                    className='ce-photo-card'
                    key={iIdx}
                    onClick={() => handleOpenLightbox(img.src)}
                    title='Click to view full photo'
                  >
                    <div className='ce-photo-img-holder'>
                      <img src={img.src} alt={img.title} loading='lazy' />
                      <div className='ce-photo-overlay'>
                        <i className='fas fa-search-plus'></i>
                        <span>View Photo</span>
                      </div>
                    </div>
                    <div className='ce-photo-details'>
                      <h4>{img.title}</h4>
                      <p>{img.caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Call to Partner Banner */}
        <div className='ce-bottom-cta'>
          <div className='ce-bcta-content'>
            <div className='ce-bcta-icon'>
              <i className='fas fa-hands-helping'></i>
            </div>
            <div>
              <h3>Help Us Build the Next Phase of BLIS Campus</h3>
              <p>
                Our vision continues to expand with plans for a modern Science & Computer Laboratory Wing, a Digital Library,
                and additional classrooms for our Senior Secondary Scholars. Partner with us to make impact.
              </p>
            </div>
          </div>
          <div className='ce-bcta-actions'>
            <a href='mailto:brighterlandschool2022@gmail.com' className='ce-bcta-btn primary'>
              <i className='fas fa-envelope'></i> Partner With Us
            </a>
            <a href='tel:+2348034367951' className='ce-bcta-btn secondary'>
              <i className='fas fa-phone-alt'></i> Call Management
            </a>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxData && (
        <LightboxModal
          item={lightboxData.item}
          onClose={() => setLightboxData(null)}
          onNext={handleNextLightbox}
          onPrev={handlePrevLightbox}
          hasNext={lightboxData.index < allImages.length - 1}
          hasPrev={lightboxData.index > 0}
        />
      )}
    </section>
  )
}

export default CampusEvolution
