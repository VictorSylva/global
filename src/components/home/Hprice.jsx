import React from "react"
import { Link } from "react-router-dom"
import Heading from "../common/heading/Heading"
import PriceCard from "../pricing/PriceCard"

const Hprice = () => {
  return (
    <>
      <section className='hprice padding'>
        <div className='container'>
          <Heading subtitle='TUITION & ADMISSIONS' title='Academic Division Investment' />
          <div className='price grid'>
            <PriceCard />
          </div>
          <div className='text-center' style={{ textAlign: "center", marginTop: "30px" }}>
            <Link to='/pricing' className='outline-btn' style={{ display: 'inline-block', width: 'auto', padding: '14px 32px' }}>
              VIEW DETAILED TUITION & SCHOLARSHIPS <i className='fas fa-arrow-right'></i>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

export default Hprice
