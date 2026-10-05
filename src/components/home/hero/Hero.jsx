import React from "react"
import { Link } from "react-router-dom"
import Heading from "../../common/heading/Heading"
import "./Hero.css"

const Hero = () => {
  return (
    <>
      <section className='hero'>
        <div className='hero-bg-layer'></div>
        <div className='hero-overlay'></div>
        <div className='container'>
          <div className='hero-content'>
            <div className='hero-badge flex' style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <img src='/images/logo.png' alt='BLIS Logo' style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
              <span>Crèche • Nursery • Primary • JSS 1–3 • SS 1–3 | <em>"Study to Make Impact"</em></span>
            </div>
            
            <Heading
              subtitle='WHERE EDUCATION MEETS PURPOSE • STUDY TO MAKE IMPACT'
              title='Nurturing Mind, Character & Purpose in Every Child'
            />
            
            <p className='hero-desc'>
              Welcome to Brighter Land International School — a faith-based institution offering world-class education from Crèche to Secondary School. We are dedicated to raising confident, impactful leaders, with special scholarship support for orphans, missionary children, and vulnerable youths.
            </p>

            {/* Founding Parent Ministry Website Button */}
            <div className='hero-mission-cta'>
              <a
                href='https://brighterlandglobalmission.org/'
                target='_blank'
                rel='noopener noreferrer'
                className='hero-mission-btn'
                title='Visit Brighter Land Global Mission Website'
              >
                <div className='hm-icon-box'>
                  <i className='fas fa-globe-africa'></i>
                </div>
                <div className='hm-text-box'>
                  <small>FOUNDING PARENT MINISTRY</small>
                  <strong>Brighter Land Global Mission <i className='fas fa-arrow-right'></i></strong>
                </div>
              </a>
            </div>

            <div className='hero-buttons'>
              <a
                href='#prospectus-request'
                className='hero-btn primary-hero-btn'
                onClick={(e) => {
                  e.preventDefault()
                  const el = document.getElementById("prospectus-request")
                  if (el) el.scrollIntoView({ behavior: "smooth" })
                }}
              >
                <span>REQUEST PROSPECTUS</span>
                <i className='fa fa-file-invoice'></i>
              </a>
              <Link to='/courses' className='hero-btn secondary-hero-btn'>
                <span>EXPLORE ACADEMICS</span>
                <i className='fa fa-graduation-cap'></i>
              </Link>
              <a
                href='#mission-vision'
                className='hero-btn outline-hero-btn'
                onClick={(e) => {
                  e.preventDefault()
                  const el = document.getElementById("mission-vision")
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth" })
                  } else {
                    window.location.href = "/about"
                  }
                }}
              >
                <span>OUR MISSION & MANDATE</span>
                <i className='fa fa-university'></i>
              </a>
            </div>

            <div className='hero-features-grid'>
              <div className='hero-feature-card'>
                <div className='hf-icon'><i className='fas fa-book-open'></i></div>
                <div>
                  <h4>Building Minds</h4>
                  <small>World-Class Curriculum</small>
                </div>
              </div>

              <div className='hero-feature-card'>
                <div className='hf-icon'><i className='fas fa-seedling'></i></div>
                <div>
                  <h4>Shaping Character</h4>
                  <small>Faith & Moral Integrity</small>
                </div>
              </div>

              <div className='hero-feature-card'>
                <div className='hf-icon'><i className='fas fa-bullseye'></i></div>
                <div>
                  <h4>Discovering Purpose</h4>
                  <small>Proverbs 22:6 Mentorship</small>
                </div>
              </div>

              <div className='hero-feature-card'>
                <div className='hf-icon'><i className='fas fa-globe-africa'></i></div>
                <div>
                  <h4>Preparing Leaders</h4>
                  <small>Impact & Scholarship Care</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className='margin hero-spacing'></div>
    </>
  )
}

export default Hero
