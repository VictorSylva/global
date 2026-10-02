import React from "react"
import { Link } from "react-router-dom"
import "./courses.css"
import { coursesCard } from "../../dummydata"
import Heading from "../common/heading/Heading"

const CoursesCard = () => {
  const scrollToCurriculum = (e) => {
    e.preventDefault()
    const target = document.querySelector(".online")
    if (target) {
      target.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <>
      <section className='coursesCard'>
        <div className='container'>
          <Heading
            subtitle='ACADEMIC PATHWAYS & KEY STAGES'
            title='Structured Learning Divisions at Brighter Land'
          />
          <p className='academic-divisions-intro'>
            Brighter Land International School provides a continuous educational journey from early childcare through senior secondary graduation. Each key stage is anchored on the approved NERDC national curriculum, enriched with moral grounding, modern computing literacy, and preparation for national and international board examinations.
          </p>

          <div className='academic-stages-grid'>
            {coursesCard.map((val) => (
              <div className='academic-stage-card' key={val.id}>
                <div className='stage-card-top'>
                  <div className='stage-icon-circle'>
                    <i className={val.icon}></i>
                  </div>
                  <span className='stage-badge'>{val.stage}</span>
                </div>

                <h2 className='stage-title'>{val.coursesName}</h2>
                <div className='stage-age-pill'>
                  <i className='far fa-clock'></i> {val.targetAge}
                </div>

                <p className='stage-summary'>{val.summary}</p>

                <div className='stage-highlights-box'>
                  <h4><i className='fas fa-compass'></i> Core Academic Focus:</h4>
                  <ul>
                    {val.highlights.map((item, idx) => (
                      <li key={idx}>
                        <i className='fas fa-check-circle'></i>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className='stage-card-footer'>
                  <span className='credential-pill'>
                    <i className='fas fa-award'></i> {val.distinctive}
                  </span>
                  <a href='#curriculum' onClick={scrollToCurriculum} className='stage-explore-link'>
                    <span>View Subjects</span>
                    <i className='fas fa-arrow-down'></i>
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className='academic-prospectus-banner'>
            <div className='banner-text'>
              <h3>Looking for Complete Admissions & Enrollment Guidance?</h3>
              <p>Download our official 2026/2027 Academic Session Prospectus or request admissions consultation directly from the school registry.</p>
            </div>
            <div className='banner-action'>
              <Link to='/pricing' className='btn-prospectus-request'>
                <i className='fas fa-file-invoice'></i>
                <span>REQUEST PROSPECTUS & GUIDE</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default CoursesCard
