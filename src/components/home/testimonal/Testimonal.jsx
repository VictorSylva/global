import React from "react"
import { testimonal } from "../../../dummydata"
import Heading from "../../common/heading/Heading"
import "./style.css"

const Testimonal = () => {
  return (
    <>
      <section className='testimonal padding'>
        <div className='container'>
          <Heading subtitle='COMMUNITY VOICES & PARENT ADVOCATES' title='What Our Families & Alumni Say' />

          <div className='content grid2'>
            {testimonal.map((val) => (
              <div className='items shadow' key={val.id}>
                <div className='testimonial-crest-badge flex'>
                  <div className='tcb-logo'>
                    <img src='/images/logo.png' alt="Brighter Land Int'l School" />
                  </div>
                  <div className='tcb-text'>
                    <strong>BRIGHTER LAND INT'L SCHOOL</strong>
                    <small>Verified Family • Study to Make Impact</small>
                  </div>
                </div>
                <div className='box flex'>
                  <div className='img'>
                    <img src={val.cover} alt={val.name} />
                    <i className='fa fa-quote-left icon'></i>
                  </div>
                  <div className='name'>
                    <h2>{val.name}</h2>
                    <span>{val.post}</span>
                  </div>
                </div>
                <p>{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export default Testimonal
