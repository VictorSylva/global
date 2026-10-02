import React from "react"
import { Link } from "react-router-dom"
import OnlineCourses from "../allcourses/OnlineCourses"
import Heading from "../common/heading/Heading"
import "../allcourses/courses.css"
import { coursesCard } from "../../dummydata"

const HAbout = () => {
  return (
    <>
      <section className='homeAbout'>
        <div className='container'>
          <Heading
            subtitle='ACADEMIC PATHWAYS & SPECIALIZATIONS'
            title='Brighter Land Academic Divisions & Key Stages'
          />
          <p className='academic-divisions-intro' style={{ marginBottom: "35px" }}>
            Explore our structured learning divisions from early years phonics and primary basic education to junior and senior secondary examination preparation.
          </p>

          <div className='academic-stages-grid' style={{ marginBottom: "35px" }}>
            {coursesCard.slice(0, 3).map((val) => (
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

                <div className='stage-leader-box'>
                  <div className='leader-avatar-icon'>
                    <i className='fas fa-user-tie'></i>
                  </div>
                  <div className='leader-meta'>
                    <small>Division Leadership</small>
                    <strong>{val.leader}</strong>
                  </div>
                </div>

                <div className='stage-card-footer'>
                  <span className='credential-pill'>
                    <i className='fas fa-award'></i> {val.distinctive}
                  </span>
                  <Link to='/courses' className='stage-explore-link'>
                    <span>All Divisions</span>
                    <i className='fas fa-arrow-right'></i>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginBottom: "50px" }}>
            <Link to='/courses' className='outline-btn' style={{ display: "inline-block", padding: "14px 32px", fontSize: "14px", fontWeight: "700" }}>
              VIEW ALL ACADEMIC DIVISIONS & SYLLABUS <i className='fas fa-arrow-right' style={{ marginLeft: "8px" }}></i>
            </Link>
          </div>
        </div>
        <OnlineCourses />
      </section>
    </>
  )
}

export default HAbout
