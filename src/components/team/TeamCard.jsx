import React from "react"
import { team } from "../../dummydata"

const TeamCard = () => {
  return (
    <>
      {team.map((val, index) => {
        const isExecutive = index === 0 || index === 1 || val.role?.toLowerCase().includes("propriet")
        const hasPhoto = Boolean(val.cover)

        return (
          <div className={`items shadow team-card-item ${isExecutive ? "proprietor-item" : ""}`} key={index}>
            {hasPhoto ? (
              <div className='img'>
                <img
                  src={val.cover}
                  alt={val.name}
                  onError={(e) => {
                    e.target.onerror = null
                    e.target.parentElement.classList.add("team-no-img-header")
                    e.target.style.display = "none"
                  }}
                />
                <div className='team-badge-tag'>
                  {val.badge || (index === 0 ? "PROPRIETOR & FOUNDER" : index === 1 ? "PROPRIETRESS & CO-FOUNDER" : "LEADERSHIP TEAM")}
                </div>
                <div className='overlay'>
                  {val.facebook ? (
                    <a
                      href={val.facebook}
                      target='_blank'
                      rel='noopener noreferrer'
                      title={`Visit ${val.name}'s Facebook Profile`}
                      className='team-overlay-link fb'
                    >
                      <i className='fab fa-facebook-f icon'></i>
                    </a>
                  ) : (
                    <a
                      href='https://web.facebook.com'
                      target='_blank'
                      rel='noopener noreferrer'
                      title='BLIS Facebook Page'
                      className='team-overlay-link fb'
                    >
                      <i className='fab fa-facebook-f icon'></i>
                    </a>
                  )}
                  <a
                    href='mailto:info@blissacademy.org'
                    title='Contact Administration'
                    className='team-overlay-link'
                  >
                    <i className='fas fa-envelope icon'></i>
                  </a>
                </div>
              </div>
            ) : (
              <div className='img team-no-img-header'>
                <div className='team-badge-tag'>
                  {val.badge || "LEADERSHIP TEAM"}
                </div>
                <div className='team-initials-wrap'>
                  <i className='fas fa-user-tie'></i>
                </div>
              </div>
            )}
            <div className='details'>
              <h2>{val.name}</h2>
              <p className='team-work-role'>{val.work}</p>
              {val.bio && <span className='team-bio-text'>{val.bio}</span>}
              {val.facebook && (
                <div className='team-social-actions'>
                  <a
                    href={val.facebook}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='team-fb-profile-btn'
                    title={`Connect with ${val.name} on Facebook`}
                  >
                    <i className='fab fa-facebook-f'></i>
                    <span>Facebook Profile</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}

export default TeamCard
