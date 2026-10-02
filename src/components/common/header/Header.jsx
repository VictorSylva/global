import React, { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import Head from "./Head"
import "./header.css"

const Header = () => {
  const [click, setClick] = useState(false)
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path ? "active" : ""
  }

  return (
    <>
      <Head />
      <header>
        <nav className='flexSB'>
          <ul className={click ? "mobile-nav" : "flexSB "} onClick={() => setClick(false)}>
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
            <li className='mobile-portal-link'>
              <Link to='/portal' className='portal-nav-btn'>
                <i className='fas fa-chart-line'></i> BLIS Operations ERP
              </Link>
            </li>
          </ul>

          <div className='start'>
            <Link to='/portal' className='button erp-launch-btn'>
              <i className='fas fa-laptop-code'></i>
              <span>BLIS OPERATIONS ERP</span>
              <span className='btn-badge'>LIVE</span>
            </Link>
          </div>

          <div className='mobile-brand-bar'>
            <span className='live-pulse'></span>
            <span>BLIS CAMPUS MENU</span>
          </div>

          <button className='toggle' onClick={() => setClick(!click)} aria-label="Toggle Navigation">
            {click ? <i className='fa fa-times'> </i> : <i className='fa fa-bars'></i>}
          </button>
        </nav>
      </header>
    </>
  )
}

export default Header
