import React from "react"
import { team } from "../../dummydata"

const TeamCard = () => {
  return (
    <>
      {team.map((val, index) => (
        <div className={`items shadow team-card-item ${index === 0 ? "proprietor-item" : ""}`} key={index}>
          <div className='img'>
            <img src={val.cover} alt={val.name} />
            <div className='team-badge-tag'>
              {index === 0 ? "PROPRIETOR & FOUNDER" : "LEADERSHIP TEAM"}
            </div>
            <div className='overlay'>
              <i className='fab fa-linkedin-in icon' title='LinkedIn'></i>
              <i className='fas fa-envelope icon' title='Contact Faculty'></i>
              <i className='fab fa-twitter icon' title='Academic Profile'></i>
            </div>
          </div>
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
