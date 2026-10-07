import React, { useState } from "react"
import "./CampusEvolution.css"
import LightboxModal from "../gallery/LightboxModal"

const evolutionMilestones = [
  {
    id: "stage-1",
    phase: "Phase 1: Genesis & First Foundations",
    badge: "HUMBLE BEGINNINGS",
    title: "Laying the First Blocks on Raw Soil",
    year: "Early Formation",
    desc: "Starting with prayer, faith, and empty ground at Gura-Suga, Rev. Fidelis Gambo and pioneering partners molded the first blocks with no substantial capital—driven purely by the mandate to give vulnerable children a future.",
    images: [
      {
        src: "/images/more/school buiding.jpeg",
        title: "The First Classroom Structure Under Construction",
        caption: "Foundational wall-raising for the initial single-block classroom facility.",
        tag: "Early Foundation",
      },
      {
        src: "/images/more/school building2.jpeg",
        title: "Block Moulding & Early Site Development",
        caption: "Raw building blocks and early partition works on the Gura-Suga school grounds.",
        tag: "Block Laying",
      },
      {
        src: "/images/more/school building3.jpeg",
        title: "Classroom Perimeter & Framing",
        caption: "Constructing the primary block windows and perimeter lintels under open skies.",
        tag: "Structural Framing",
      },
      {
        src: "/images/more/school building4.jpeg",
        title: "Pioneering School Yard & Compound Clearing",
        caption: "The early landscape before perimeter gating and grounds paved for students.",
        tag: "Initial Site",
      },
    ],
  },
  {
    id: "stage-2",
    phase: "Phase 2: Roofing, Expansion & Multi-Classrooms",
    badge: "EXPANSION PHASE",
    title: "Adding Roofs, Doors & Multi-Grade Classrooms",
    year: "Structural Growth",
    desc: "As student enrollment grew rapidly from local communities, the school expanded to roof multiple classroom wings, install security fixtures, and create dedicated sections for Crèche, Nursery, and Primary sections.",
    images: [
      {
        src: "/images/more/school building5.jpeg",
        title: "Roofing the Main Academic Block",
        caption: "Zinc roofing installed on the main wing to provide weather-tight classrooms.",
        tag: "Roofing Milestone",
      },
      {
        src: "/images/more/school buiding6.jpeg",
        title: "Classroom Wing Structure",
        caption: "Expanding classroom rows to accommodate emerging junior secondary classes.",
        tag: "Classroom Wings",
      },
      {
        src: "/images/more/schoolbuilding7.jpeg",
        title: "Multi-Block Structural Progress",
        caption: "Interconnected block layouts designed for safe scholar movement and ventilation.",
        tag: "Compound Layout",
      },
      {
        src: "/images/more/school building8.jpeg",
        title: "Exterior Wall Finishing & Plastering",
        caption: "Transitioning from bare blocks to reinforced, plastered educational facilities.",
        tag: "Plastering & Fortification",
      },
    ],
  },
  {
    id: "stage-3",
    phase: "Phase 3: Modern Smart Campus & Conducive Facilities",
    badge: "TODAY'S CAMPUS",
    title: "Vibrant Classrooms, Secured Grounds & Conducive Learning",
    year: "Present Day",
    desc: "Today, Brighter Land International School stands as a flourishing educational hub with secured perimeter fencing, furnished bright classrooms, science & ICT resources, and a safe, joyful environment for 300+ scholars.",
    images: [
      {
        src: "/images/more/school building9.jpeg",
        title: "Completed Academic Complex & Courtyard",
        caption: "Fully completed and painted academic block active with daily lessons and assemblies.",
        tag: "Modern Campus",
      },
      {
        src: "/images/more/school building10.jpeg",
        title: "Spacious Front Courtyard & Facilities",
        caption: "Vibrant school grounds equipped with security gates, clean water, and playing space.",
        tag: "Campus Grounds",
      },
      {
        src: "/images/more/school building11.jpeg",
        title: "Secondary & Primary Divisions Building",
        caption: "Welcoming entrance to our dedicated basic and secondary learning wings.",
        tag: "Active School Block",
      },
      {
        src: "/images/more/condusive learning environment.jpeg",
        title: "Conducive Classroom Learning Environment",
        caption: "Attentive scholars learning in bright, well-ventilated, and fully equipped classrooms.",
        tag: "Conducive Learning",
      },
      {
        src: "/images/more/condusive learning environment2.jpeg",
        title: "Active Learning with Dedicated Instructors",
        caption: "Personalized teacher attention fostering academic excellence and moral character.",
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
              <img src='/images/more/school buiding.jpeg' alt='Early school building' />
              <div className='ce-tb-caption'>
                <strong>The Early Foundation</strong>
                <span>Single bare block structure on open ground</span>
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
                      <span className='ce-photo-tag'>{img.tag}</span>
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
