import React from "react"
import { team } from "../../dummydata"

const TeamCard = () => {
  return (
    <>
      {team.map((val, index) => (
        <div className={`items shadow team-card-item ${index === 0 ? "proprietor-item" : ""}`} key={index}>
          {/* Only render photo for the Proprietor (Rev. Fidelis Gambo), comment out images for other faculty */}
          {index === 0 ? (
            <div className='img'>
              <img src={val.cover} alt={val.name} />
              <div className='team-badge-tag'>
                PROPRIETOR & FOUNDER
              </div>
              <div className='overlay'>
                <i className='fab fa-linkedin-in icon' title='LinkedIn'></i>
                <i className='fas fa-envelope icon' title='Contact Office'></i>
                <i className='fab fa-twitter icon' title='Profile'></i>
              </div>
            </div>
          ) : (
            <div className='img team-no-img-header'>
              {/* <img src={val.cover} alt={val.name} /> */}
              <div className='team-badge-tag'>
                LEADERSHIP TEAM
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
      ))}
    </>
  )
}

export default TeamCard
