import React, { useState } from "react"
import "./CommunityOutreachShowcase.css"
import LightboxModal from "../gallery/LightboxModal"

const bagOutreaches = [
  {
    id: "bag-0",
    image: "/images/more/sharing of school bags.jpeg",
    title: "School Bags & Supplies Distribution to Pupils",
    location: "Community Primary Outreach, Jos",
    desc: "Rev. Fidelis Gambo, BLGM team, and partners distributing sturdy school bags, writing materials, and educational kits to eager children.",
  },
  {
    id: "bag-1",
    image: "/images/more/sharing of school bags1.jpeg",
    title: "Joyful Scholars Receiving Brand-New Bags",
    location: "Rural Community Mission Field",
    desc: "Empowering children from vulnerable families with the necessary school essentials to attend classes with dignity and joy.",
  },
  {
    id: "bag-2",
    image: "/images/more/sharing of school bags2.jpeg",
    title: "Equipping Vulnerable Children for School",
    location: "Gura-Suga & Surrounding Settlements",
    desc: "Ensuring that no child is kept away from learning due to a lack of school bags, stationery, or basic educational materials.",
  },
  {
    id: "bag-3",
    image: "/images/more/sharing of school bags3.jpeg",
    title: "Mission Outreach Assembly & Bag Presentation",
    location: "Mission Field Assembly",
    desc: "Gathering community children for words of encouragement, prayers, and personal distribution of customized school bags.",
  },
  {
    id: "bag-4",
    image: "/images/more/sharing of school bags4.jpeg",
    title: "Smiles of Gratitude from Beneficiary Children",
    location: "Community Relief Mission",
    desc: "Children proudly showing their new backpacks, inspired to pursue academic excellence despite economic hardships.",
  },
  {
    id: "bag-5",
    image: "/images/more/sharing of school bags5.jpeg",
    title: "Hands-on Care by Mission Leaders & Volunteers",
    location: "BLGM Outreach Center",
    desc: "Volunteers and educators personally fitting backpacks and handing out stationery kits to each pupil.",
  },
  {
    id: "bag-6",
    image: "/images/more/sharing of school bags6.jpeg",
    title: "Empowering Young Girls with Learning Supplies",
    location: "Grassroots Educational Support",
    desc: "Special outreach targeting young girls in underserved areas to champion girl-child education and literacy.",
  },
  {
    id: "bag-7",
    image: "/images/more/sharing of school bags7.jpeg",
    title: "Community Elders & Parents Appreciating Support",
    location: "Community Outreach Ground",
    desc: "Parents and community leaders thanking Brighter Land Global Mission for continuous educational relief.",
  },
  {
    id: "bag-8",
    image: "/images/more/sharing of school bags8.jpeg",
    title: "Large-Scale Educational Material Relief",
    location: "Plateau State Mission Outreach",
    desc: "Hundreds of school bags and notebooks organized for systematic distribution across several conflict-affected clusters.",
  },
  {
    id: "bag-9",
    image: "/images/more/sharing of school bags9.jpeg",
    title: "Inspiring the Next Generation of Global Leaders",
    location: "Community Youth Outreach",
    desc: "Lifting burdens off struggling parents and inspiring children to study hard and make positive societal impact.",
  },
]

const CommunityOutreachShowcase = () => {
  const [lightboxIndex, setLightboxIndex] = useState(null)

  const handleOpenLightbox = (index) => {
    setLightboxIndex(index)
  }

  const activeItem =
    lightboxIndex !== null
      ? {
          image: bagOutreaches[lightboxIndex].image,
          title: bagOutreaches[lightboxIndex].title,
          categoryLabel: "BLGM Community Outreach",
          location: bagOutreaches[lightboxIndex].location,
          date: "Educational Relief Mission",
          description: bagOutreaches[lightboxIndex].desc,
        }
      : null

  return (
    <section className='community-outreach-section' id='community-relief'>
      <div className='container'>
        <div className='cos-header'>
          <div className='cos-badge'>
            <i className='fas fa-hands-helping'></i>
            <span>BRIGHTER LAND GLOBAL MISSION (BLGM) IN ACTION</span>
          </div>
          <h2 className='cos-title'>
            Educational Relief & <span>School Bags Outreach</span>
          </h2>
          <p className='cos-desc'>
            Brighter Land International School was birthed from the compassionate heartbeat of Brighter Land Global Mission.
            Through regular grassroots outreaches, we distribute brand-new school bags, books, uniforms, and essential supplies
            to orphans, vulnerable youths, and rural communities across Plateau State.
          </p>
        </div>

        {/* Impact Numbers Grid */}
        <div className='cos-stats-grid'>
          <div className='cos-stat-card'>
            <div className='cos-stat-icon'>
              <i className='fas fa-shopping-bag'></i>
            </div>
            <div className='cos-stat-text'>
              <h3>1,500+</h3>
              <p>School Bags & Kits Distributed</p>
            </div>
          </div>
          <div className='cos-stat-card'>
            <div className='cos-stat-icon'>
              <i className='fas fa-tint'></i>
            </div>
            <div className='cos-stat-text'>
              <h3>Clean Boreholes</h3>
              <p>Provided to Host Communities</p>
            </div>
          </div>
          <div className='cos-stat-card'>
            <div className='cos-stat-icon'>
              <i className='fas fa-graduation-cap'></i>
            </div>
            <div className='cos-stat-text'>
              <h3>Full & Partial</h3>
              <p>Scholarships for Orphans & Youths</p>
            </div>
          </div>
          <div className='cos-stat-card'>
            <div className='cos-stat-icon'>
              <i className='fas fa-map-marker-alt'></i>
            </div>
            <div className='cos-stat-text'>
              <h3>Multiple Villages</h3>
              <p>Across Plateau State Reached</p>
            </div>
          </div>
        </div>

        {/* Outreach Photos Grid */}
        <div className='cos-photos-grid'>
          {bagOutreaches.map((item, idx) => (
            <div
              className='cos-photo-card'
              key={item.id}
              onClick={() => handleOpenLightbox(idx)}
              title='Click to enlarge'
            >
              <div className='cos-img-wrapper'>
                <img src={item.image} alt={item.title} loading='lazy' />
                <div className='cos-overlay'>
                  <i className='fas fa-search-plus'></i>
                  <span>View Story</span>
                </div>
                <span className='cos-tag'>
                  <i className='fas fa-gift'></i> Free School Bags
                </span>
              </div>
              <div className='cos-details'>
                <span className='cos-loc'>
                  <i className='fas fa-map-pin'></i> {item.location}
                </span>
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <LightboxModal
          item={activeItem}
          onClose={() => setLightboxIndex(null)}
          onNext={() => {
            if (lightboxIndex < bagOutreaches.length - 1) {
              setLightboxIndex(lightboxIndex + 1)
            }
          }}
          onPrev={() => {
            if (lightboxIndex > 0) {
              setLightboxIndex(lightboxIndex - 1)
            }
          }}
          hasNext={lightboxIndex < bagOutreaches.length - 1}
          hasPrev={lightboxIndex > 0}
        />
      )}
    </section>
  )
}

export default CommunityOutreachShowcase
