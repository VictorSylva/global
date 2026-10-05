import React from "react"
import { team } from "../../dummydata"

const TeamCard = () => {
  return (
    <>
      {team.map((val, index) => {
        const isExecutive = index === 0 || index === 1 || val.role?.toLowerCase().includes("propriet")
        const hasCustomPhoto = val.cover && (val.cover.includes("gambo") || val.cover.includes("sifon") || val.cover.includes("propriet"))

        return (
          <div className={`items shadow team-card-item ${isExecutive ? "proprietor-item" : ""}`} key={index}>
            {hasCustomPhoto ? (
              <div className='img'>
                <img src={val.cover} alt={val.name} />
                <div className='team-badge-tag'>
                  {val.badge || (index === 0 ? "PROPRIETOR & FOUNDER" : index === 1 ? "PROPRIETRESS & CO-FOUNDER" : "LEADERSHIP TEAM")}
                </div>
                <div className='overlay'>
                  <i className='fab fa-linkedin-in icon' title='LinkedIn'></i>
                  <i className='fas fa-envelope icon' title='Contact Office'></i>
                  <i className='fab fa-twitter icon' title='Profile'></i>
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
            </div>
          </div>
        )
      })}
    </>
  )
}

export default TeamCard
