import React, { useState } from "react"
import "./ProprietorMessage.css"

const leadersData = {
  proprietor: {
    tag: "FROM THE PROPRIETOR'S DESK",
    name: "Rev. Fidelis Gambo",
    role: "Proprietor & Founder • BLIS",
    image: "/images/proprietor.png",
    subtitle: ["Rev. Fidelis Gambo", "Police Chaplain", "Lectured at Theological Seminary"],
    title: "Visionary Leadership with Purpose",
    quote:
      "With a distinguished background in education, ministry, and public service, our vision is to nurture scholars who are not only intellectually formidable but morally grounded, disciplined, and equipped to lead with divine purpose.",
    body:
      "Brighter Land International School was founded on the unyielding principle that quality foundational education transforms families and society. Through rigorous academic instruction from Crèche and Nursery through Primary and Secondary divisions, we cultivate inquisitive minds, solid Christian morals, and practical problem-solving capabilities.",
    highlightIcon: "fas fa-shield-alt",
    highlightTitle: "Moral Character & Discipline",
    highlightDesc: "Pastoral mentorship & holistic leadership",
    signName: "Rev. Fidelis Gambo",
    signTitle: "Proprietor & Board Chairman",
    facebook: "https://web.facebook.com/fidelis.gambo.98",
  },
  proprietress: {
    tag: "FROM THE PROPRIETRESS' DESK",
    name: "Mrs. Sifon Gambo",
    role: "Proprietress & Co-Founder • BLIS",
    image: "/images/team/sifon.jpeg",
    subtitle: ["Mrs. Sifon Gambo", "Dedicated Educator", "Pastoral Care & Mission Director"],
    title: "Nurturing Every Scholar with Compassion & Excellence",
    quote:
      "A dedicated educator, Mrs. Gambo, also the wife of Reverend Gambo, serves as proprietress — bringing compassion, discipline, and a motherly touch to the school and mission work.",
    body:
      "At Brighter Land International School, we are deeply committed to providing an atmosphere where every child is loved, inspired, and guided to reach their highest potential. By combining nurturing pastoral care with academic diligence, we empower our learners to grow into confident, disciplined, and purposeful global leaders.",
    highlightIcon: "fas fa-heart",
    highlightTitle: "Compassionate Mentorship",
    highlightDesc: "Motherly touch, pastoral guidance & personalized care",
    signName: "Mrs. Sifon Gambo",
    signTitle: "Proprietress & Co-Founder",
    facebook: "https://web.facebook.com/sifon.gambo.7",
  },
}

const ProprietorMessage = () => {
  const [activeLeader, setActiveLeader] = useState("proprietor")
  const leader = leadersData[activeLeader]

  return (
    <section className='proprietor-section' id='proprietor-desk'>
      <div className='container'>
        {/* Founder & Proprietress Switcher */}
        <div className='proprietor-leader-switcher'>
          <button
            type='button'
            className={`pls-btn ${activeLeader === "proprietor" ? "active" : ""}`}
            onClick={() => setActiveLeader("proprietor")}
          >
            <i className='fas fa-user-tie'></i>
            <div className='pls-btn-text'>
              <span className='pls-btn-name'>Rev. Fidelis Gambo</span>
              <span className='pls-btn-role'>Proprietor & Founder</span>
            </div>
          </button>
          <button
            type='button'
            className={`pls-btn ${activeLeader === "proprietress" ? "active" : ""}`}
            onClick={() => setActiveLeader("proprietress")}
          >
            <i className='fas fa-female'></i>
            <div className='pls-btn-text'>
              <span className='pls-btn-name'>Mrs. Sifon Gambo</span>
              <span className='pls-btn-role'>Proprietress & Co-Founder</span>
            </div>
          </button>
        </div>

        <div className='proprietor-grid'>
          {/* Left: Official Portrait Frame */}
          <div className='proprietor-image-col'>
            <div className='proprietor-frame'>
              <img
                src={leader.image}
                alt={`${leader.name} - ${leader.role}`}
                className='proprietor-img'
              />
              <div className='proprietor-floating-badge'>
                <div className='pfb-crest'>
                  <img src='/images/logo.png' alt='BLIS Logo' />
                </div>
                <div className='pfb-text'>
                  <h4>{leader.name}</h4>
                  <span>{leader.role}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Message & Vision */}
          <div className='proprietor-content-col'>
            <div className='proprietor-tag'>
              <i className='fas fa-award'></i>
              <span>{leader.tag}</span>
            </div>

            <h2>{leader.title}</h2>
            <div className='proprietor-subtitle'>
              {leader.subtitle.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className='dot'>•</span>}
                  <span>{item}</span>
                </React.Fragment>
              ))}
            </div>

            <div className='proprietor-quote'>
              <p>"{leader.quote.replace(/^"|"$/g, '')}"</p>
            </div>

            <p className='proprietor-body'>{leader.body}</p>

            <div className='proprietor-highlights-grid'>
              <div className='ph-item'>
                <div className={`ph-icon ${activeLeader === "proprietor" ? "blue" : "green"}`}>
                  <i className={leader.highlightIcon}></i>
                </div>
                <div className='ph-text'>
                  <strong>{leader.highlightTitle}</strong>
                  <span>{leader.highlightDesc}</span>
                </div>
              </div>
            </div>

            <div className='proprietor-signature-row'>
              <div className='psr-left'>
                <h4>{leader.signName}</h4>
                <span>{leader.signTitle}</span>
              </div>
              <div className='psr-actions'>
                {leader.facebook && (
                  <a
                    href={leader.facebook}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='proprietor-fb-btn'
                    title={`Connect with ${leader.name} on Facebook`}
                  >
                    <i className='fab fa-facebook-f'></i>
                    <span>Connect on Facebook</span>
                  </a>
                )}
                <div className='psr-motto-badge'>
                  <i className='fas fa-star'></i>
                  <span>"STUDY TO MAKE IMPACT"</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProprietorMessage
