import React, { useState } from "react"
import "./PioneeringFaculty.css"
import LightboxModal from "../gallery/LightboxModal"

const PioneeringFaculty = () => {
  const [showLightbox, setShowLightbox] = useState(false)

  const lightboxItem = {
    image: "/images/more/Pioneering Corp members.jpeg",
    title: "Pioneering NYSC Corps Members & Foundational Educators",
    categoryLabel: "Honoring Our Foundation",
    location: "BLIS Campus, Gura-Suga, Jos",
    date: "Pioneering Service Year",
    description: "National Youth Service Corps (NYSC) members and foundational teachers who dedicated their national service year to teaching the earliest classes and establishing academic excellence at Brighter Land International School.",
  }

  return (
    <section className='pioneering-faculty-section' id='pioneering-educators'>
      <div className='container'>
        <div className='pf-card'>
          <div className='pf-grid'>
            <div
              className='pf-image-col'
              onClick={() => setShowLightbox(true)}
              title='Click to view full photo'
            >
              <img
                src='/images/more/Pioneering Corp members.jpeg'
                alt='Pioneering Corp members'
                className='pf-img'
                loading='lazy'
              />
              <div className='pf-overlay'>
                <i className='fas fa-search-plus'></i>
                <span>Enlarge Photo</span>
              </div>
              <span className='pf-badge'>
                <i className='fas fa-award'></i> NYSC SERVICE LEGACY
              </span>
            </div>

            <div className='pf-content-col'>
              <div className='pf-tag'>
                <i className='fas fa-medal'></i> FOUNDATIONAL SERVICE & DEDICATION
              </div>
              <h2 className='pf-title'>
                Honoring Our <span>Pioneering NYSC Educators</span>
              </h2>
              <p className='pf-quote'>
                "A tree grows strong because of the depth of its roots. We celebrate the passionate young graduates and National
                Youth Service Corps (NYSC) members who poured their energy and knowledge into our first cohorts of scholars."
              </p>
              <p className='pf-body'>
                During the formative years of Brighter Land International School, dedicated corp members and volunteer educators
                partnered with Rev. Fidelis Gambo and school management. They brought innovative teaching methodologies,
                passion for youth mentorship, and selfless service—laying the unshakeable foundation upon which BLIS continues to thrive.
              </p>

              <div className='pf-highlights-row'>
                <div className='pf-h-item'>
                  <i className='fas fa-user-graduate'></i>
                  <div>
                    <strong>Youth Mentorship</strong>
                    <span>Inspiring young scholars to dream big</span>
                  </div>
                </div>
                <div className='pf-h-item'>
                  <i className='fas fa-book-reader'></i>
                  <div>
                    <strong>Early Curriculum Building</strong>
                    <span>Establishing sound literacy and numeracy foundations</span>
                  </div>
                </div>
                <div className='pf-h-item'>
                  <i className='fas fa-heart'></i>
                  <div>
                    <strong>Selfless Service</strong>
                    <span>Impacting the Gura-Suga community for a lifetime</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showLightbox && (
        <LightboxModal
          item={lightboxItem}
          onClose={() => setShowLightbox(false)}
          hasNext={false}
          hasPrev={false}
        />
      )}
    </section>
  )
}

export default PioneeringFaculty
