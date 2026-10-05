import React from "react"
import { Link } from "react-router-dom"

const Head = () => {
  return (
    <>
      <section className='head'>
        {/* Mobile Slim Top Bar */}
        <div className='mobile-top-announcement'>
          <div className='container flexSB'>
            <span className='announcement-text'>
              <i className='fas fa-graduation-cap' style={{ color: '#10b981', marginRight: '6px' }}></i>
              <strong>2026/2027 Admissions Open</strong> • Jos, Plateau State
            </span>
            <div className='mobile-top-links flex'>
              <a href='tel:+2348034367951' className='mobile-phone-link'>
                <i className='fas fa-phone-alt'></i> +234 803 436 7951
              </a>
              <a
                href='https://brighterlandglobalmission.org/'
                target='_blank'
                rel='noopener noreferrer'
                className='mobile-mission-link'
                title='Parent Ministry'
              >
                <i className='fas fa-globe'></i> BLGM
              </a>
            </div>
          </div>
        </div>

        {/* Desktop Main Head Header */}
        <div className='container flexSB desktop-head-content'>
          <div className='logo flex'>
            <Link to='/' className='school-crest'>
              <img src='/images/logo.png' alt="Brighter Land Int'l School" className='logo-img' />
            </Link>
            <div className='logo-text'>
              <h1>BRIGHTER LAND</h1>
              <span>INT'L SCHOOL • STUDY TO MAKE IMPACT</span>
            </div>
          </div>

          <div className='head-right flex'>
            <a
              href='https://brighterlandglobalmission.org/'
              target='_blank'
              rel='noopener noreferrer'
              className='mission-pill'
              title='Visit Brighter Land Global Mission'
            >
              <i className='fas fa-globe-africa'></i>
              <div>
                <small>Parent Ministry</small>
                <strong>Global Mission</strong>
              </div>
            </a>

            <a href='tel:+2348034367951' className='contact-pill'>
              <i className='fas fa-phone-alt'></i>
              <div>
                <small>Admissions Line</small>
                <strong>+234 803 436 7951</strong>
              </div>
            </a>

            <div className='contact-pill hide-tablet'>
              <i className='fas fa-envelope-open-text'></i>
              <div>
                <small>Official Inquiries</small>
                <strong>brighterlandschool2022@gmail.com</strong>
              </div>
            </div>

            <div className='social'>
              <a href='https://facebook.com' target='_blank' rel='noopener noreferrer' aria-label='Facebook'>
                <i className='fab fa-facebook-f icon' title='Facebook'></i>
              </a>
              <a href='https://instagram.com' target='_blank' rel='noopener noreferrer' aria-label='Instagram'>
                <i className='fab fa-instagram icon' title='Instagram'></i>
              </a>
              <a href='https://twitter.com' target='_blank' rel='noopener noreferrer' aria-label='Twitter'>
                <i className='fab fa-twitter icon' title='Twitter'></i>
              </a>
              <a href='https://linkedin.com' target='_blank' rel='noopener noreferrer' aria-label='LinkedIn'>
                <i className='fab fa-linkedin-in icon' title='LinkedIn'></i>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Head

