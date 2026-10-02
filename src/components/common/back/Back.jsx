import React from "react"
import { useLocation, Link } from "react-router-dom"

const pageHeroMap = {
  about: "/images/blis2.jpeg",
  courses: "/images/blis3.jpeg",
  academics: "/images/blis3.jpeg",
  team: "/images/blis4.jpeg",
  faculty: "/images/blis4.jpeg",
  pricing: "/images/blis5.jpeg",
  admissions: "/images/blis5.jpeg",
  journal: "/images/blis2.jpeg",
  notices: "/images/blis2.jpeg",
  contact: "/images/blis3.jpeg",
}

const Back = ({ title, heroImage }) => {
  const location = useLocation()
  const rawPath = location.pathname.split("/")[1] || "overview"
  const formattedPath = rawPath.charAt(0).toUpperCase() + rawPath.slice(1)
  const bgImage = heroImage || pageHeroMap[rawPath.toLowerCase()] || "/images/blis2.jpeg"

  return (
    <>
      <section
        className='back'
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(7, 22, 38, 0.62) 0%, rgba(7, 22, 38, 0.78) 55%, rgba(7, 22, 38, 0.88) 100%), url('${bgImage}')`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      >
        <div className='container'>
          <div className='back-breadcrumb'>
            <Link to='/'><i className='fas fa-home'></i> Home</Link>
            <span className='sep'>/</span>
            <span className='current'>{formattedPath}</span>
          </div>
          <h1>{title}</h1>
          <div className='back-sub' style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <img src='/images/logo.png' alt='BLIS Logo' style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
            <span>Brighter Land International School</span>
            <span className='dot'>•</span>
            <span>2026/2027 Academic Session</span>
            <span className='dot'>•</span>
            <span><em>"Study to Make Impact"</em></span>
          </div>
        </div>
      </section>
      <div className='margin-back'></div>
    </>
  )
}

export default Back
