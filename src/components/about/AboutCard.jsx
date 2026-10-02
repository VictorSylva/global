import React from "react"
import Heading from "../common/heading/Heading"
import "./about.css"
import { homeAbout } from "../../dummydata"
import Awrapper from "./Awrapper"

const AboutCard = () => {
  return (
    <>
      <section className='aboutHome'>
        <div className='container flexSB'>
          <div className='left row'>
            <div className='about-image-wrapper'>
              <img src='./images/blis3.jpeg' alt='Brighter Land International School Campus' />
              <div className='campus-exp-badge' style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', background: '#ffffff', borderRadius: '6px', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <img src='/images/logo.png' alt="Brighter Land Crest" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div>
                  <strong>"Study to Make Impact"</strong>
                  <span>Brighter Land Smart Campus</span>
                </div>
              </div>
            </div>
          </div>
          <div className='right row'>
            <Heading subtitle='GLOBAL PEDAGOGY & PHILOSOPHY' title='The Brighter Land Educational Distinction' />
            <div className='items'>
              {homeAbout.map((val) => {
                return (
                  <div className='item flexSB' key={val.id}>
                    <div className='img'>
                      <img src={val.cover} alt={val.title} />
                    </div>
                    <div className='text'>
                      <h2>{val.title}</h2>
                      <p>{val.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>
      <Awrapper />
    </>
  )
}

export default AboutCard
