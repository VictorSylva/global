import React, { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import Head from "./Head"
import "./header.css"

const Header = () => {
  const [click, setClick] = useState(false)
  const location = useLocation()

  // Auto-close mobile menu when changing routes
  useEffect(() => {
    setClick(false)
  }, [location.pathname])

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (click) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [click])

  const isActive = (path) => {
    return location.pathname === path ? "active" : ""
  }

  return (
    <>
      <Head />
      <header className='blis-main-header'>
        <nav className='nav-container flexSB'>
          {/* Mobile Header Brand (Only visible on mobile/tablet) */}
          <div className='mobile-nav-brand'>
            <Link to='/' className='mobile-logo flex' onClick={() => setClick(false)}>
              <div className='mobile-crest'>
                <img src='/images/logo.png' alt="BLIS Logo" />
              </div>
              <div className='mobile-logo-text'>
                <span className='mobile-title'>BRIGHTER LAND</span>
                <span className='mobile-sub'>INT'L SCHOOL • JOS</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <ul className='desktop-nav flex'>
            <li>
              <Link to='/' className={isActive("/")}>Home</Link>
            </li>
            <li>
              <Link to='/courses' className={isActive("/courses") || isActive("/academics")}>Academics</Link>
            </li>
            <li>
              <Link to='/about' className={isActive("/about")}>About BLIS</Link>
            </li>
            <li>
              <Link to='/team' className={isActive("/team") || isActive("/faculty")}>Faculty & Deans</Link>
            </li>
            <li>
              <Link to='/pricing' className={isActive("/pricing") || isActive("/admissions")}>Admissions & Prospectus</Link>
            </li>
            <li>
              <Link to='/journal' className={isActive("/journal") || isActive("/notices")}>Circulars & News</Link>
            </li>
            <li>
              <Link to='/contact' className={isActive("/contact")}>Contact</Link>
            </li>
          </ul>

          {/* Desktop Launch Button */}
          <div className='desktop-erp-cta'>
            <Link to='/portal' className='button erp-launch-btn'>
              <i className='fas fa-laptop-code'></i>
              <span>BLIS OPERATIONS ERP</span>
              <span className='btn-badge'>LIVE</span>
            </Link>
          </div>

          {/* Mobile Right Controls: Call + Portal Badge + Hamburger */}
          <div className='mobile-header-controls flex'>
            <a href='tel:+2348034367951' className='mobile-quick-call-btn' title='Call Admissions'>
              <i className='fas fa-phone-alt'></i>
            </a>

            <Link to='/portal' className='mobile-portal-badge' title='Launch Portal'>
              <span className='live-pulse'></span>
              <span>ERP</span>
            </Link>

            <button
              className={`mobile-toggle-btn ${click ? "is-open" : ""}`}
              onClick={() => setClick(!click)}
              aria-label={click ? "Close menu" : "Open menu"}
            >
              <i className={click ? "fas fa-times" : "fas fa-bars"}></i>
            </button>
          </div>
        </nav>

        {/* Mobile Navigation Drawer & Backdrop */}
        <div className={`mobile-nav-backdrop ${click ? "active" : ""}`} onClick={() => setClick(false)}></div>
        
        <div className={`mobile-nav-drawer ${click ? "open" : ""}`}>
          <div className='drawer-header flexSB'>
            <div className='drawer-brand flex'>
              <img src='/images/logo.png' alt='BLIS Logo' className='drawer-logo' />
              <div>
                <strong>BRIGHTER LAND</strong>
                <small>INT'L SCHOOL • JOS</small>
              </div>
            </div>
            <button className='drawer-close-btn' onClick={() => setClick(false)} aria-label='Close menu'>
              <i className='fas fa-times'></i>
            </button>
          </div>

          <div className='drawer-body'>
            {/* Quick ERP Launch Card in Drawer */}
            <div className='drawer-erp-card'>
              <div className='flexSB' style={{ alignItems: 'center', marginBottom: '8px' }}>
                <div className='flex' style={{ gap: '8px', alignItems: 'center' }}>
                  <span className='live-pulse'></span>
                  <span className='erp-card-label'>ACADEMIC & BURSARY PORTAL</span>
                </div>
                <span className='live-tag'>2026/2027</span>
              </div>
              <h4>BLIS Operations ERP</h4>
              <p>Parents, Scholars & Staff live terminal reports, fee invoices, roll-call & timetables.</p>
              <Link to='/portal' className='drawer-portal-launch-btn' onClick={() => setClick(false)}>
                <i className='fas fa-sign-in-alt'></i> Enter School Portal
              </Link>
            </div>

            {/* Founding Ministry Highlighted Button */}
            <a
              href='https://brighterlandglobalmission.org/'
              target='_blank'
              rel='noopener noreferrer'
              className='drawer-mission-link flexSB'
              title='Visit Brighter Land Global Mission'
            >
              <div className='flex' style={{ gap: '10px', alignItems: 'center' }}>
                <div className='mission-icon-circle'>
                  <i className='fas fa-globe-africa'></i>
                </div>
                <div>
                  <small style={{ color: '#34d399', fontWeight: '700', textTransform: 'uppercase', fontSize: '10px' }}>Founding Parent Ministry</small>
                  <strong style={{ display: 'block', color: '#ffffff', fontSize: '13px' }}>Brighter Land Global Mission</strong>
                </div>
              </div>
              <i className='fas fa-external-link-alt' style={{ color: '#34d399', fontSize: '12px' }}></i>
            </a>

            {/* Navigation Links */}
            <ul className='drawer-nav-list'>
              <li>
                <Link to='/' className={isActive("/")} onClick={() => setClick(false)}>
                  <i className='fas fa-home'></i>
                  <span>Home</span>
                </Link>
              </li>
              <li>
                <Link to='/courses' className={isActive("/courses") || isActive("/academics")} onClick={() => setClick(false)}>
                  <i className='fas fa-graduation-cap'></i>
                  <span>Academics & Curriculum</span>
                </Link>
              </li>
              <li>
                <Link to='/about' className={isActive("/about")} onClick={() => setClick(false)}>
                  <i className='fas fa-university'></i>
                  <span>About BLIS & Mandate</span>
                </Link>
              </li>
              <li>
                <Link to='/team' className={isActive("/team") || isActive("/faculty")} onClick={() => setClick(false)}>
                  <i className='fas fa-chalkboard-teacher'></i>
                  <span>Faculty & Deans</span>
                </Link>
              </li>
              <li>
                <Link to='/pricing' className={isActive("/pricing") || isActive("/admissions")} onClick={() => setClick(false)}>
                  <i className='fas fa-file-invoice-dollar'></i>
                  <span>Admissions & Prospectus</span>
                </Link>
              </li>
              <li>
                <Link to='/journal' className={isActive("/journal") || isActive("/notices")} onClick={() => setClick(false)}>
                  <i className='fas fa-bullhorn'></i>
                  <span>Circulars & News</span>
                </Link>
              </li>
              <li>
                <Link to='/contact' className={isActive("/contact")} onClick={() => setClick(false)}>
                  <i className='fas fa-map-marker-alt'></i>
                  <span>Contact & Visit Us</span>
                </Link>
              </li>
            </ul>

            {/* Drawer Contact Info */}
            <div className='drawer-contact-box'>
              <h5>Admissions & Enquiries</h5>
              <a href='tel:+2348034367951' className='drawer-contact-item'>
                <i className='fas fa-phone-alt'></i> +234 803 436 7951
              </a>
              <a href='mailto:brighterlandschool2022@gmail.com' className='drawer-contact-item'>
                <i className='fas fa-envelope'></i> brighterlandschool2022@gmail.com
              </a>
              <div className='drawer-contact-item address'>
                <i className='fas fa-map-marker-alt'></i> Gura-suga, Opposite Police Staff College Jos, Jos-South LGA, Plateau State
              </div>
            </div>

            {/* Drawer Social Links */}
            <div className='drawer-social-row flexSB'>
              <span>Follow BLIS:</span>
              <div className='drawer-social-icons flex'>
                <a href='https://facebook.com' target='_blank' rel='noopener noreferrer' aria-label='Facebook'>
                  <i className='fab fa-facebook-f'></i>
                </a>
                <a href='https://instagram.com' target='_blank' rel='noopener noreferrer' aria-label='Instagram'>
                  <i className='fab fa-instagram'></i>
                </a>
                <a href='https://twitter.com' target='_blank' rel='noopener noreferrer' aria-label='Twitter'>
                  <i className='fab fa-twitter'></i>
                </a>
                <a href='https://linkedin.com' target='_blank' rel='noopener noreferrer' aria-label='LinkedIn'>
                  <i className='fab fa-linkedin-in'></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}

export default Header

