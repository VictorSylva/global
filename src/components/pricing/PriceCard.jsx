import React from "react"
import { price } from "../../dummydata"

const PriceCard = ({ onOpenApply, onOpenProspectusRequest }) => {
  return (
    <>
      {price.map((val, index) => (
        <div className='items shadow price-card-blis' key={index}>
          <div className='price-tier-header'>
            <div>
              <h4>{val.name}</h4>
              <span className='division-subtitle'>{val.division} • {val.age}</span>
            </div>
            <span className='term-badge'>{val.badge || "2026/2027"}</span>
          </div>

          <div className='prospectus-request-callout'>
            <div className='prc-icon'>
              <i className='fas fa-file-invoice-dollar'></i>
            </div>
            <div className='prc-text'>
              <strong>Official Prospectus & Fee Guide</strong>
              <span>Section A & B Itemized Schedules On Request</span>
            </div>
          </div>

          <p className='division-desc'>{val.desc}</p>

          <div className='prospectus-card-highlights'>
            <span className='pch-label'><i className='fas fa-check-circle'></i> Division Inclusions:</span>
            <ul>
              {val.highlights && val.highlights.map((h, i) => (
                <li key={i}>
                  <i className='fas fa-check'></i> {h}
                </li>
              ))}
            </ul>
          </div>

          <div className='card-requirement-box'>
            <small><i className='fas fa-box-open'></i> <strong>Term Requirement:</strong> {val.req}</small>
          </div>

          <div className='card-btn-stack' style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              className='primary-btn'
              style={{ width: '100%', padding: '12px', fontSize: '13px' }}
              onClick={() => onOpenProspectusRequest ? onOpenProspectusRequest(val.name) : (window.location.href = '/pricing#prospectus-request')}
            >
              <i className='fas fa-file-download' style={{ marginRight: '6px' }}></i> REQUEST PROSPECTUS
            </button>
            <button
              className='outline-btn'
              style={{ width: '100%', padding: '10px', fontSize: '12px' }}
              onClick={() => onOpenApply ? onOpenApply(val.name) : (window.location.href = '/contact')}
            >
              <i className='fas fa-user-graduate' style={{ marginRight: '6px' }}></i> Enroll Scholar
            </button>
          </div>
        </div>
      ))}
    </>
  )
}

export default PriceCard

