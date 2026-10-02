import React from "react"
import { Link } from "react-router-dom"

const Head = () => {
  return (
    <>
      <section className='head'>
        <div className='container flexSB'>
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
            <a href='tel:+2348034367951' className='contact-pill'>
              <i className='fas fa-phone-alt'></i>
              <div>
                <small>Admissions Line</small>
                <strong>+234 803 436 7951</strong>
              </div>
            </a>

            <div className='contact-pill hide-mobile'>
              <i className='fas fa-envelope-open-text'></i>
              <div>
                <small>Official Inquiries</small>
                <strong>brighterlandschool2022@gmail.com</strong>
              </div>
            </div>

            <Link to='/portal' className='portal-quick-badge'>
              <span className='live-pulse'></span>
              <span>Operations ERP</span>
            </Link>

            <div className='social'>
              <i className='fab fa-facebook-f icon' title='Facebook'></i>
              <i className='fab fa-instagram icon' title='Instagram'></i>
              <i className='fab fa-twitter icon' title='Twitter'></i>
              <i className='fab fa-linkedin-in icon' title='LinkedIn'></i>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Head
