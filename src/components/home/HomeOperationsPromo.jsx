import React from "react"
import { Link } from "react-router-dom"
import Heading from "../common/heading/Heading"
import "./HomeOperationsPromo.css"

const HomeOperationsPromo = () => {
  return (
    <section className='home-operations-promo padding'>
      <div className='container'>
        <Heading
          subtitle='STATE-OF-THE-ART SCHOOL INFRASTRUCTURE'
          title='How Brighter Land Runs Professional School Operations'
        />

        <div className='promo-intro-text text-center'>
          <p>
            World-class international schools require modern, unified operational software. Brighter Land International School integrates its Student Information System (SIS), digital assessment gradebook, real-time daily roll-call, and bursary billing into a single professional suite.
          </p>
        </div>

        <div className='operations-features-grid'>
          {/* Card 1 */}
          <div className='op-card shadow'>
            <div className='op-card-icon emerald'><i className='fas fa-id-card-alt'></i></div>
            <h3>Student Information System (SIS)</h3>
            <p>Centralized scholar biodata, house allocations (Phoenix, Pegasus, Orion, Aquila), health alerts, and real-time cumulative GPA tracking.</p>
            <ul className='op-list'>
              <li><i className='fas fa-check'></i> Instant online enrollment intake</li>
              <li><i className='fas fa-check'></i> Comprehensive scholar dossiers</li>
              <li><i className='fas fa-check'></i> House & cohort analytics</li>
            </ul>
            <Link to='/portal' className='op-link'>
              Explore SIS Registry <i className='fas fa-arrow-right'></i>
            </Link>
          </div>

          {/* Card 2 */}
          <div className='op-card shadow'>
            <div className='op-card-icon blue'><i className='fas fa-award'></i></div>
            <h3>Digital Gradebook & Assessment</h3>
            <p>Continuous assessment mapping for Early Years, Primary, BECE, WAEC & NECO curricula. Dynamic CA tests, assignments, and terminal exam weighting.</p>
            <ul className='op-list'>
              <li><i className='fas fa-check'></i> Real-time letter grade & GPA calculus</li>
              <li><i className='fas fa-check'></i> 1-Click Official Report Card generation</li>
              <li><i className='fas fa-check'></i> Principal's remarks & printable certificates</li>
            </ul>
            <Link to='/portal' className='op-link'>
              Open Gradebook Ledger <i className='fas fa-arrow-right'></i>
            </Link>
          </div>

          {/* Card 3 */}
          <div className='op-card shadow'>
            <div className='op-card-icon amber'><i className='fas fa-clipboard-check'></i></div>
            <h3>Digital Roll Call & Attendance</h3>
            <p>Daily morning and period roll call with instant calculation of divisional attendance rates and automated parent alerts.</p>
            <ul className='op-list'>
              <li><i className='fas fa-check'></i> 1-Tap 'Mark All Present' batch roll</li>
              <li><i className='fas fa-check'></i> Instant SMS / email absence dispatch</li>
              <li><i className='fas fa-check'></i> Multi-status: Late, Absent, Excused</li>
            </ul>
            <Link to='/portal' className='op-link'>
              Launch Daily Roll Call <i className='fas fa-arrow-right'></i>
            </Link>
          </div>

          {/* Card 4 */}
          <div className='op-card shadow'>
            <div className='op-card-icon purple'><i className='fas fa-file-invoice-dollar'></i></div>
            <h3>Bursary, Fees & Receipts</h3>
            <p>Automated term invoicing for Section A & B, First Bank payment tracking, online balance reconciliation, and official printable fee receipts.</p>
            <ul className='op-list'>
              <li><i className='fas fa-check'></i> Itemized Section A tuition, levies & Section B materials</li>
              <li><i className='fas fa-check'></i> First Bank 2043561832 reconciliation</li>
              <li><i className='fas fa-check'></i> Official printable receipts & payment proofs</li>
            </ul>
            <Link to='/portal' className='op-link'>
              Manage Bursary Ledger <i className='fas fa-arrow-right'></i>
            </Link>
          </div>
        </div>

        {/* Live Interactive CTA Banner */}
        <div className='portal-cta-banner shadow'>
          <div className='pcb-left'>
            <div className='pcb-live-tag' style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <img src='/images/logo.png' alt='BLIS Logo' style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
              <span className='live-pulse'></span>
              <span>LIVE OPERATIONS ERP ENVIRONMENT</span>
            </div>
            <h2>Experience the BLIS Management System in Real-Time</h2>
            <p>
              Test the software as an <strong>Administrator</strong>, <strong>Teacher</strong>, <strong>Parent</strong>, or <strong>Student</strong>. Enroll scholars, grade assignments, mark attendance, and generate official BLIS report cards.
            </p>
          </div>
          <div className='pcb-right'>
            <Link to='/portal' className='primary-btn pcb-launch-btn'>
              <i className='fas fa-laptop-code'></i> LAUNCH BLIS OPERATIONS ERP
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HomeOperationsPromo
