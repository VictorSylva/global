import React from "react"
import { Link } from "react-router-dom"
import "./MissionVision.css"

const MissionVision = () => {
  const pillars = [
    {
      id: 1,
      icon: "fas fa-book-reader",
      title: "Building Minds",
      badge: "Academic Rigor",
      desc: "Delivering world-class foundational education from Crèche to Secondary with comprehensive STEM, language arts, and digital competencies.",
    },
    {
      id: 2,
      icon: "fas fa-heart",
      title: "Shaping Character",
      badge: "Faith & Morals",
      desc: "Instilling steadfast Christian virtues, discipline, empathy, and moral integrity that ground children for life's challenges.",
    },
    {
      id: 3,
      icon: "fas fa-crosshairs",
      title: "Discovering Purpose",
      badge: "Destiny & Growth",
      desc: "Providing individualized mentorship and spiritual guidance to help each child recognize and develop their God-given gifts.",
    },
    {
      id: 4,
      icon: "fas fa-globe-americas",
      title: "Preparing Leaders",
      badge: "Societal Impact",
      desc: "Empowering confident, ethical, and forward-thinking change-makers equipped to positively transform their communities and the world.",
    },
  ]

  return (
    <section className='mv-section' id='mission-vision'>
      <div className='container'>
        {/* Section Header */}
        <div className='mv-header'>
          <div className='mv-badge'>
            <i className='fas fa-cross'></i>
            <span>FAITH • PURPOSE • IMPACT</span>
          </div>
          <h2>Our Mandate, Mission & Vision</h2>
          <p className='mv-subtitle'>
            At Brighter Land International School, we believe that education is more than academic instruction—it is a divine calling to shape minds, mold godly character, and ignite lifelong impact.
          </p>
        </div>

        {/* Scriptural Anchor Banner */}
        <div className='mv-scripture-card'>
          <div className='mvs-icon'>
            <i className='fas fa-bible'></i>
          </div>
          <div className='mvs-content'>
            <blockquote>
              “Train up a child in the way he should go, and when he is old he will not depart from it.”
            </blockquote>
            <cite>— Proverbs 22:6 | <strong>Motto:</strong> "Study to Make Impact" • <em>Where Education Meets Purpose</em></cite>
          </div>
        </div>

        {/* Mission & Vision Dual Grid */}
        <div className='mv-dual-grid'>
          {/* Mission Card */}
          <div className='mv-card mv-mission-card'>
            <div className='mvc-header'>
              <div className='mvc-icon-box mission-glow'>
                <i className='fas fa-bullseye'></i>
              </div>
              <div>
                <span className='mvc-tag'>OUR DIVINE MANDATE</span>
                <h3>Our Mission</h3>
              </div>
            </div>
            <p className='mvc-statement'>
              To provide high-quality, faith-based education and compassionate scholarships that nurture every child—especially orphans, missionary children, children from conflict-affected communities, and the less privileged—into responsible, confident, and impactful leaders.
            </p>
            <div className='mvc-points'>
              <div className='mvc-point'>
                <i className='fas fa-check-circle'></i>
                <span><strong>Inclusive Compassion:</strong> Active scholarship pathways for orphans and vulnerable youths.</span>
              </div>
              <div className='mvc-point'>
                <i className='fas fa-check-circle'></i>
                <span><strong>Holistic Curriculum:</strong> Solid foundational learning from Crèche through Secondary school.</span>
              </div>
              <div className='mvc-point'>
                <i className='fas fa-check-circle'></i>
                <span><strong>Moral Fortitude:</strong> Christ-centered values, discipline, and ethical responsibility.</span>
              </div>
            </div>
          </div>

          {/* Vision Card */}
          <div className='mv-card mv-vision-card'>
            <div className='mvc-header'>
              <div className='mvc-icon-box vision-glow'>
                <i className='fas fa-eye'></i>
              </div>
              <div>
                <span className='mvc-tag'>OUR ASPIRATION</span>
                <h3>Our Vision</h3>
              </div>
            </div>
            <p className='mvc-statement'>
              To be a premier Christian center of educational distinction and social transformation, where education meets purpose, raising a generation of godly, innovative, and resilient leaders equipped to make a lasting global impact.
            </p>
            <div className='mvc-points'>
              <div className='mvc-point'>
                <i className='fas fa-star'></i>
                <span><strong>Transformational Excellence:</strong> Fostering intellectual curiosity and proven board examination distinction.</span>
              </div>
              <div className='mvc-point'>
                <i className='fas fa-star'></i>
                <span><strong>Purpose-Driven Life:</strong> Helping scholars unlock their unique destiny and calling.</span>
              </div>
              <div className='mvc-point'>
                <i className='fas fa-star'></i>
                <span><strong>Global Leadership:</strong> Raising scholars who serve God and humanity with impact.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Founder's Story & Genesis Video: From Global Mission to the School */}
        <div className='mv-genesis-video-card' id='founder-interview'>
          <div className='mvg-badge-row'>
            <span className='mvg-pill'>
              <i className='fas fa-video'></i> FOUNDER'S STORY & MISSION INTERVIEW
            </span>
            <span className='mvg-tagline'>THE GENESIS OF BRIGHTER LAND</span>
          </div>

          <div className='mvg-content-grid'>
            {/* Left: Video Player */}
            <div className='mvg-video-pane'>
              <div className='mvg-video-frame'>
                <video
                  controls
                  playsInline
                  preload='metadata'
                  poster='/images/proprietor.png'
                  className='mvg-video'
                >
                  <source src='/images/gallery/mission.mp4' type='video/mp4' />
                  Your browser does not support the video tag.
                </video>
                <div className='mvg-video-overlay-badge'>
                  <i className='fas fa-play-circle'></i>
                  <span>Interview with Rev. Fidelis Gambo</span>
                </div>
              </div>
              <div className='mvg-video-caption'>
                <i className='fas fa-info-circle'></i>
                <span>Watch Rev. Fidelis Gambo explain how God birthed Brighter Land Global Mission and established the school.</span>
              </div>
            </div>

            {/* Right: Narrative Context & Key Takeaways */}
            <div className='mvg-text-pane'>
              <div className='mvg-speaker-badge'>
                <img src='/images/proprietor.png' alt='Rev. Fidelis Gambo' className='mvg-avatar' />
                <div>
                  <strong>Rev. Fidelis Gambo</strong>
                  <small>Founder & Proprietor • Police Chaplain & Seminary Lecturer</small>
                </div>
              </div>

              <h3>How the Global Mission Birthed the School</h3>
              <p className='mvg-lead'>
                In this documentary interview, Rev. Fidelis Gambo reflects on the humble beginnings of 
                <strong> Brighter Land Global Mission</strong>—a divine vision rooted in evangelism, compassionate community outreaches, 
                clean water boreholes, and relief for vulnerable families.
              </p>
              <p className='mvg-body'>
                As the mission took root across communities in Plateau State, the urgent need for a Christ-centered institution of high academic distinction became undeniable. That burden gave birth to <strong>Brighter Land International School (BLIS)</strong>—providing foundational education, moral grounding, and life-changing scholarships for orphans and missionary children.
              </p>

              <div className='mvg-takeaway-grid'>
                <div className='mvg-takeaway-item'>
                  <div className='mvg-ti-icon'>
                    <i className='fas fa-cross'></i>
                  </div>
                  <div>
                    <strong>The Mother Ministry</strong>
                    <span>Brighter Land Global Mission's heartbeat for community transformation and humanitarian aid.</span>
                  </div>
                </div>
                <div className='mvg-takeaway-item'>
                  <div className='mvg-ti-icon'>
                    <i className='fas fa-graduation-cap'></i>
                  </div>
                  <div>
                    <strong>Birthing the School</strong>
                    <span>From Crèche to Secondary: Raising purposeful, godly champions under the motto <em>"Study to Make Impact."</em></span>
                  </div>
                </div>
              </div>

              <div className='mvg-action-row'>
                <Link to='/gallery' className='mvg-btn primary'>
                  <i className='fas fa-images'></i>
                  <span>View Excursions & Mission Gallery</span>
                </Link>
                <a
                  href='https://brighterlandglobalmission.org/'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='mvg-btn secondary'
                  title='Parent Ministry Website'
                >
                  <i className='fas fa-globe-africa'></i>
                  <span>Parent Ministry Portal</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Four Core Pillars */}
        <div className='mv-pillars-wrapper'>
          <div className='mv-pillars-header'>
            <h4>The Four Pillars of Brighter Land Distinction</h4>
            <span>Excellence in Learning • Character Development • Purposeful Living</span>
          </div>

          <div className='mv-pillars-grid'>
            {pillars.map((item) => (
              <div key={item.id} className='mv-pillar-card'>
                <div className='pillar-top'>
                  <div className='pillar-icon'>
                    <i className={item.icon}></i>
                  </div>
                  <span className='pillar-badge'>{item.badge}</span>
                </div>
                <h5>{item.title}</h5>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Banner with Address & CTA */}
        <div className='mv-footer-banner'>
          <div className='mv-fb-left'>
            <div className='mv-fb-pin'>
              <i className='fas fa-map-marker-alt'></i>
            </div>
            <div>
              <strong>Brighter Land International School Campus</strong>
              <span>Gura-Suga, Opposite Police Staff College, Jos, Plateau State, Nigeria</span>
            </div>
          </div>
          <div className='mv-fb-right'>
            <Link to='/admissions' className='mv-btn primary'>
              <span>ADMISSIONS & SCHOLARSHIPS</span>
              <i className='fas fa-arrow-right'></i>
            </Link>
            <Link to='/contact' className='mv-btn secondary'>
              <span>VISIT CAMPUS</span>
              <i className='fas fa-school'></i>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MissionVision

