import React from "react"
import "./ProprietorMessage.css"

const ProprietorMessage = () => {
  return (
    <section className='proprietor-section' id='proprietor-desk'>
      <div className='container'>
        <div className='proprietor-grid'>
          {/* Left: Official Portrait Frame */}
          <div className='proprietor-image-col'>
            <div className='proprietor-frame'>
              <img
                src='/images/proprietor.png'
                alt='Rev. Fidelis Gambo - Proprietor of Brighter Land International School'
                className='proprietor-img'
              />
              <div className='proprietor-floating-badge'>
                <div className='pfb-crest'>
                  <img src='/images/logo.png' alt='BLIS Logo' />
                </div>
                <div className='pfb-text'>
                  <h4>Rev. Fidelis Gambo</h4>
                  <span>Proprietor & Founder • BLIS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Message & Vision */}
          <div className='proprietor-content-col'>
            <div className='proprietor-tag'>
              <i className='fas fa-award'></i>
              <span>FROM THE PROPRIETOR'S DESK</span>
            </div>

            <h2>Visionary Leadership with Purpose</h2>
            <div className='proprietor-subtitle'>
              <span>Rev. Fidelis Gambo</span>
              <span className='dot'>•</span>
              <span>Police Chaplain</span>
              <span className='dot'>•</span>
              <span>Former University Lecturer</span>
            </div>

            <div className='proprietor-quote'>
              <p>
                "With a distinguished background in education, ministry, and public service, our vision is to nurture scholars who are not only intellectually formidable but morally grounded, disciplined, and equipped to lead with divine purpose."
              </p>
            </div>

            <p className='proprietor-body'>
              Brighter Land International School was founded on the unyielding principle that quality foundational education transforms families and society. Through rigorous academic instruction from Crèche and Nursery through Primary and Secondary divisions, we cultivate inquisitive minds, solid Christian morals, and practical problem-solving capabilities.
            </p>

            <div className='proprietor-highlights-grid'>
              <div className='ph-item'>
                <div className='ph-icon green'>
                  <i className='fas fa-graduation-cap'></i>
                </div>
                <div className='ph-text'>
                  <strong>Academic Distinction</strong>
                  <span>100% BECE, Common Entrance & WAEC focus</span>
                </div>
              </div>

              <div className='ph-item'>
                <div className='ph-icon blue'>
                  <i className='fas fa-shield-alt'></i>
                </div>
                <div className='ph-text'>
                  <strong>Moral Character & Discipline</strong>
                  <span>Pastoral mentorship & holistic leadership</span>
                </div>
              </div>
            </div>

            <div className='proprietor-signature-row'>
              <div className='psr-left'>
                <h4>Rev. Fidelis Gambo</h4>
                <span>Proprietor & Board Chairman</span>
              </div>
              <div className='psr-motto-badge'>
                <i className='fas fa-star'></i>
                <span>"STUDY TO MAKE IMPACT"</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProprietorMessage
