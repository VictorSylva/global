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
              <span>Crèche • Nursery • Primary • JSS 1–3 • SS 1–2 | <em>"Study to Make Impact"</em></span>
            </div>
            
            <Heading
              subtitle='WELCOME TO BRIGHTER LAND INTERNATIONAL SCHOOL'
              title='Nurturing Global Leaders, Inspiring Excellence'
            />
            
            <p className='hero-desc'>
              A premier institution of academic distinction, moral integrity, and technological innovation. 
              Providing world-class foundational care from Crèche and Nursery through Primary and Junior & Senior Secondary with outstanding success in BECE, WAEC, NECO, and international examinations.
            </p>

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
              <Link to='/about' className='hero-btn outline-hero-btn'>
                <span>ABOUT OUR SCHOOL</span>
                <i className='fa fa-university'></i>
              </Link>
            </div>

            <div className='hero-features-grid'>
              <div className='hero-feature-card'>
                <div className='hf-icon'><i className='fas fa-globe-americas'></i></div>
                <div>
                  <h4>Global Curriculum</h4>
                  <small>National & Global Standards</small>
                </div>
              </div>

              <div className='hero-feature-card'>
                <div className='hf-icon'><i className='fas fa-microchip'></i></div>
                <div>
                  <h4>STEAM & Computing</h4>
                  <small>Robotics & Digital Skills</small>
                </div>
              </div>

              <div className='hero-feature-card'>
                <div className='hf-icon'><i className='fas fa-user-graduate'></i></div>
                <div>
                  <h4>100% Exam Pass</h4>
                  <small>WAEC, NECO & BECE Distinctions</small>
                </div>
              </div>

              <div className='hero-feature-card'>
                <div className='hf-icon'><i className='fas fa-shield-alt'></i></div>
                <div>
                  <h4>Integrated ERP</h4>
                  <small>Real-Time Parent Portal</small>
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
