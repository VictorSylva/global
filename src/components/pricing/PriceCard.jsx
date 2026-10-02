import React from "react"
import { price } from "../../dummydata"

const PriceCard = ({ onOpenApply, onOpenProspectusDetail }) => {
  return (
    <>
      {price.map((val, index) => (
        <div className='items shadow price-card-blis' key={index}>
          <div className='price-tier-header'>
            <h4>{val.name}</h4>
            <span className='term-badge'>2026/2027</span>
          </div>

          <div className='price-amount'>
            <span className='currency-symbol'>₦</span>
            {val.price}
            <small>/ term</small>
          </div>

          <div className='section-a-tag'>
            <i className='fas fa-shield-alt'></i> Section A (Tuition & Levies)
          </div>

          <p>{val.desc}</p>

          <div className='prospectus-card-breakdown'>
            <div className='pcb-row'>
              <span>Tuition Fees:</span>
              <strong>{val.tuition}</strong>
            </div>
            <div className='pcb-row'>
              <span>Total Section A:</span>
              <strong style={{ color: "#00a884" }}>{val.sectionATotal}</strong>
            </div>
            <div className='pcb-row'>
              <span>Section B (Materials):</span>
              <strong>{val.sectionBTotal}</strong>
            </div>
          </div>

          <div className='card-requirement-box'>
            <small><i className='fas fa-box-open'></i> <strong>Term Requirement:</strong> {val.req}</small>
          </div>

          <div className='card-btn-stack' style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              className='primary-btn'
              style={{ width: '100%', padding: '12px', fontSize: '13px' }}
              onClick={() => onOpenApply ? onOpenApply(val.name) : window.location.assign('/contact')}
            >
              ENROLL SCHOLAR <i className='fas fa-arrow-right'></i>
            </button>
            <button
              className='outline-btn'
              style={{ width: '100%', padding: '10px', fontSize: '12px' }}
              onClick={() => onOpenProspectusDetail ? onOpenProspectusDetail(val.name) : null}
            >
              <i className='fas fa-file-invoice'></i> View Full Breakdown
            </button>
          </div>
        </div>
      ))}
    </>
  )
}

export default PriceCard
