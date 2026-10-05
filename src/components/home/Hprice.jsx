import React from "react"
import { Link } from "react-router-dom"
import Heading from "../common/heading/Heading"
import PriceCard from "../pricing/PriceCard"

const Hprice = () => {
  return (
    <>
      <section className='hprice padding'>
        <div className='container'>
          <Heading subtitle='ACADEMIC DIVISIONS & ADMISSIONS' title='Excellence Across Every Stage of Learning' />
          <div className='price grid'>
            <PriceCard
              onOpenProspectusRequest={(name) => {
                window.location.href = `/pricing?request=${encodeURIComponent(name)}#prospectus-request`
              }}
              onOpenApply={(name) => {
                window.location.href = `/pricing?apply=${encodeURIComponent(name)}`
              }}
            />
          </div>
          <div className='text-center' style={{ textAlign: "center", marginTop: "30px" }}>
            <Link to='/pricing' className='outline-btn' style={{ display: 'inline-block', width: 'auto', padding: '14px 32px' }}>
              REQUEST OFFICIAL PROSPECTUS & FEE SCHEDULE <i className='fas fa-arrow-right'></i>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

export default Hprice
