import React, { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import Back from "../common/back/Back"
import PriceCard from "./PriceCard"
import "./price.css"
import Faq from "./Faq"
import ProspectusRequest from "../home/ProspectusRequest"
import ScholarshipBenefactors from "./ScholarshipBenefactors"
import { schoolAccountDetails } from "../../dummydata"
import { sendWebsiteForm } from "../../services/emailService"

const Pricing = () => {
  const location = useLocation()
  const [selectedDivision, setSelectedDivision] = useState(null)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)

  // Enrollment Application Form State
  const [applyFormData, setApplyFormData] = useState({
    parentName: "",
    email: "",
    phone: "",
    studentName: "",
    grade: "Primary 1",
    comments: "",
  })

  // Quick Prospectus Request Modal State
  const [requestFormData, setRequestFormData] = useState({
    parentName: "",
    email: "",
    phone: "",
    division: "Primary One – Five",
    term: "Term 1 (2026/2027 Session)",
    notes: "",
  })

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const requestParam = params.get("request")
    const applyParam = params.get("apply")

    if (requestParam) {
      setRequestFormData((prev) => ({ ...prev, division: requestParam }))
      setShowRequestModal(true)
    } else if (applyParam) {
      setSelectedDivision(applyParam)
      setShowApplyModal(true)
    }
  }, [location])

  const handleOpenApply = (divisionName) => {
    setSelectedDivision(divisionName)
    setShowApplyModal(true)
    setSubmitted(false)
  }

  const handleOpenProspectusRequest = (divisionName) => {
    setRequestFormData((prev) => ({
      ...prev,
      division: divisionName || "Primary One – Five",
    }))
    setShowRequestModal(true)
    setSubmitted(false)
  }

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(schoolAccountDetails.accountNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  const handleApplySubmit = async (e) => {
    e.preventDefault()
    setSending(true)

    await sendWebsiteForm({
      formType: `Admissions Intake Application (${selectedDivision || applyFormData.grade})`,
      fromName: applyFormData.parentName,
      fromEmail: applyFormData.email,
      phone: applyFormData.phone,
      subject: `Admissions Application: ${applyFormData.studentName} (${applyFormData.grade})`,
      grade: applyFormData.grade,
      message: `Candidate Scholar: ${applyFormData.studentName}\nClass Applying For: ${applyFormData.grade}\nDivision Plan: ${selectedDivision || "General"}\nParent / Guardian: ${applyFormData.parentName}\nPhone: ${applyFormData.phone}\nNotes & Background: ${applyFormData.comments || "None"}`,
    })

    setSending(false)
    setSubmitted(true)
  }

  const handleRequestSubmit = async (e) => {
    e.preventDefault()
    setSending(true)

    await sendWebsiteForm({
      formType: `Prospectus Package Request (${requestFormData.division})`,
      fromName: requestFormData.parentName,
      fromEmail: requestFormData.email,
      phone: requestFormData.phone,
      subject: `Prospectus Request: ${requestFormData.division}`,
      grade: requestFormData.division,
      entryTerm: requestFormData.term,
      message: requestFormData.notes || `Requested official prospectus package & Section A/B fee schedule for ${requestFormData.division}.`,
    })

    setSending(false)
    setSubmitted(true)
  }

  return (
    <>
      <Back title='2026/2027 Academic Session Prospectus & Admissions' />
      <section className='price padding'>
        <div className='container'>
          {/* Header Intro */}
          <div className='admissions-intro text-center' style={{ textAlign: "center", marginBottom: "30px" }}>
            <h3 style={{ color: "#00a884", letterSpacing: "1.5px", textTransform: "uppercase", fontSize: "14px", fontWeight: "700" }}>
              BRIGHTER LAND INTERNATIONAL SCHOOL
            </h3>
            <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: "36px", color: "#071626", marginTop: "8px" }}>
              Academic Divisions & Official Prospectus Request
            </h1>
            <p style={{ maxWidth: "780px", margin: "14px auto", color: "#64748b", fontSize: "15px", lineHeight: "1.6" }}>
              Explore our academic divisions across Crèche, Nursery, Primary, Junior Secondary (JSS), and Senior Secondary (SSS). 
              Our official prospectus and itemized Section A (Tuition & Levies) & Section B (Uniforms, Sports & Books) schedules are provided upon request via our Admissions Secretariat.
            </p>
          </div>

          {/* Official Bank Account Details Banner */}
          <div className='bank-account-banner shadow'>
            <div className='bank-left flex'>
              <div className='bank-logo-badge' style={{ background: '#fff', padding: '3px', overflow: 'hidden' }}>
                <img src='/images/logo.png' alt="Brighter Land Int'l School" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div>
                <span className='bank-tag'><i className='fas fa-shield-alt'></i> OFFICIAL SCHOOL ACCOUNT DETAILS • STUDY TO MAKE IMPACT</span>
                <h2>{schoolAccountDetails.accountName}</h2>
                <div className='bank-meta-row flex'>
                  <span>Bank: <strong>{schoolAccountDetails.bankName}</strong></span>
                  <span className='dot'>•</span>
                  <span>Account Number: <strong className='acc-num'>{schoolAccountDetails.accountNumber}</strong></span>
                  <span className='dot'>•</span>
                  <span>Session: <strong>{schoolAccountDetails.session}</strong></span>
                </div>
              </div>
            </div>

            <div className='bank-right'>
              <button className='copy-acc-btn' onClick={handleCopyAccount}>
                <i className={copied ? "fas fa-check" : "fas fa-copy"}></i>
                <span>{copied ? "Account Number Copied!" : "Copy Account Details"}</span>
              </button>
            </div>
          </div>

          {/* Academic Division Cards Grid */}
          <div className='grid' style={{ marginTop: '30px', marginBottom: '40px' }}>
            <PriceCard
              onOpenApply={handleOpenApply}
              onOpenProspectusRequest={handleOpenProspectusRequest}
            />
          </div>

          {/* Embedded Prospectus Request Section */}
          <div id='prospectus-request'>
            <ProspectusRequest />
          </div>

          {/* Quick Notice on Bank Payments */}
          <div className='payment-reminder-card shadow flexSB'>
            <div className='flex' style={{ gap: '16px', alignItems: 'center' }}>
              <div className='pr-icon'><i className='fas fa-receipt'></i></div>
              <div>
                <h4>Official Fee Payment & Bursary Verification</h4>
                <p>
                  All approved fee payments must be remitted directly to <strong>First Bank, Account No: 2043561832 ({schoolAccountDetails.accountName})</strong>. 
                  Always include the scholar's full name on the payment narration, and present proof of transfer to the Bursar for official receipt issuance.
                </p>
              </div>
            </div>
            <button className='primary-btn' onClick={() => handleOpenApply("Direct Enrollment")}>
              BEGIN ENROLLMENT <i className='fas fa-chevron-right'></i>
            </button>
          </div>
        </div>
      </section>

      {/* --- MODAL 1: PROSPECTUS PACKAGE REQUEST MODAL --- */}
      {showRequestModal && (
        <div className='blis-modal-overlay' onClick={() => setShowRequestModal(false)}>
          <div className='blis-modal-card' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <div>
                <h3>Request Official School Prospectus</h3>
                <small>{requestFormData.division} • 2026/2027 Academic Session</small>
              </div>
              <button className='modal-close' onClick={() => setShowRequestModal(false)}>×</button>
            </div>

            {submitted ? (
              <div className='modal-success' style={{ textAlign: 'center', padding: '30px 20px' }}>
                <i className='fas fa-check-circle success-icon' style={{ fontSize: '48px', color: '#00a884', marginBottom: '14px', display: 'block' }}></i>
                <h3>Prospectus Request Logged!</h3>
                <p style={{ color: '#475569', fontSize: '14px', lineHeight: '1.6', maxWidth: '480px', margin: '10px auto' }}>
                  Thank you, <strong>{requestFormData.parentName}</strong>. Our Admissions Secretariat has received your request for the <strong>{requestFormData.division}</strong> prospectus.
                </p>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', margin: '16px auto', maxWidth: '440px', border: '1px solid #e2e8f0', textAlign: 'left', fontSize: '13px' }}>
                  <div style={{ marginBottom: '6px' }}><i className='fas fa-envelope' style={{ color: '#00a884', marginRight: '8px' }}></i> <strong>Recipient Email:</strong> {requestFormData.email}</div>
                  <div style={{ marginBottom: '6px' }}><i className='fas fa-phone-alt' style={{ color: '#2563eb', marginRight: '8px' }}></i> <strong>Contact Phone:</strong> {requestFormData.phone}</div>
                  <div><i className='fas fa-layer-group' style={{ color: '#f59e0b', marginRight: '8px' }}></i> <strong>Division:</strong> {requestFormData.division}</div>
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748b' }}>
                  The itemized Section A & Section B fee schedule and curriculum brochure will be dispatched to your email shortly.
                </p>
                <button className='primary-btn' style={{ marginTop: '14px' }} onClick={() => setShowRequestModal(false)}>DONE</button>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className='modal-form' style={{ padding: '20px' }}>
                <div className='form-row'>
                  <div className='form-group'>
                    <label>Parent / Guardian Name *</label>
                    <input
                      type='text'
                      required
                      placeholder='e.g. Dr. Kalu Nwachukwu'
                      value={requestFormData.parentName}
                      onChange={(e) => setRequestFormData({ ...requestFormData, parentName: e.target.value })}
                    />
                  </div>
                  <div className='form-group'>
                    <label>Email Address (To Receive Prospectus) *</label>
                    <input
                      type='email'
                      required
                      placeholder='e.g. parent@domain.com'
                      value={requestFormData.email}
                      onChange={(e) => setRequestFormData({ ...requestFormData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className='form-row'>
                  <div className='form-group'>
                    <label>Phone / WhatsApp Number *</label>
                    <input
                      type='tel'
                      required
                      placeholder='e.g. 0803 456 7891'
                      value={requestFormData.phone}
                      onChange={(e) => setRequestFormData({ ...requestFormData, phone: e.target.value })}
                    />
                  </div>
                  <div className='form-group'>
                    <label>Division Interested In *</label>
                    <select
                      value={requestFormData.division}
                      onChange={(e) => setRequestFormData({ ...requestFormData, division: e.target.value })}
                    >
                      <option value='Crèche Division (Infants & Toddlers)'>Crèche Division (Infants & Toddlers)</option>
                      <option value='Nursery One & Two (Early Years)'>Nursery One & Two (Early Years)</option>
                      <option value='Primary One – Five (Basic Education)'>Primary One – Five (Basic Education)</option>
                      <option value='Junior Secondary School (JSS 1 – 3)'>Junior Secondary School (JSS 1 – 3)</option>
                      <option value='Senior Secondary School (SS 1 – 3)'>Senior Secondary School (SS 1 – 3)</option>
                      <option value='All Divisions Prospectus'>All Divisions Complete Prospectus</option>
                    </select>
                  </div>
                </div>

                <div className='form-group'>
                  <label>Additional Scholar Notes or Inquiries (Optional)</label>
                  <textarea
                    rows='3'
                    placeholder='Specify any questions regarding admissions, transport, or scholarship considerations...'
                    value={requestFormData.notes}
                    onChange={(e) => setRequestFormData({ ...requestFormData, notes: e.target.value })}
                  ></textarea>
                </div>

                <div className='modal-actions'>
                  <button type='button' className='outline-btn' onClick={() => setShowRequestModal(false)}>CANCEL</button>
                  <button type='submit' className='primary-btn' disabled={sending} style={{ opacity: sending ? 0.75 : 1 }}>
                    {sending ? (
                      <>
                        <i className='fas fa-spinner fa-spin' style={{ marginRight: '6px' }}></i> DISPATCHING...
                      </>
                    ) : (
                      <>
                        <i className='fas fa-paper-plane' style={{ marginRight: '6px' }}></i> REQUEST PROSPECTUS PACKAGE
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL 2: INTERACTIVE ADMISSION / ENROLLMENT INTAKE --- */}
      {showApplyModal && (
        <div className='blis-modal-overlay' onClick={() => setShowApplyModal(false)}>
          <div className='blis-modal-card' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <div>
                <h3>BLIS Online Admissions Application</h3>
                <small>{selectedDivision || "2026/2027 Academic Session"}</small>
              </div>
              <button className='modal-close' onClick={() => setShowApplyModal(false)}>×</button>
            </div>

            {submitted ? (
              <div className='modal-success' style={{ textAlign: 'center', padding: '30px 20px' }}>
                <i className='fas fa-check-circle success-icon' style={{ fontSize: '48px', color: '#00a884', marginBottom: '14px', display: 'block' }}></i>
                <h3>Application Successfully Registered!</h3>
                <p style={{ color: '#475569', fontSize: '14px', lineHeight: '1.6', maxWidth: '480px', margin: '10px auto' }}>
                  Thank you, <strong>{applyFormData.parentName}</strong>. Your enrollment application for <strong>{applyFormData.studentName}</strong> ({applyFormData.grade}) has been received by our Admissions Registrar.
                </p>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', margin: '16px auto', maxWidth: '480px', border: '1px solid #cbd5e1', textAlign: 'left' }}>
                  <strong style={{ display: 'block', color: '#071626', marginBottom: '6px' }}>Approved School Bank Details:</strong>
                  <p style={{ margin: '2px 0', fontSize: '13px' }}><strong>Bank:</strong> {schoolAccountDetails.bankName}</p>
                  <p style={{ margin: '2px 0', fontSize: '13px' }}><strong>Account Name:</strong> {schoolAccountDetails.accountName}</p>
                  <p style={{ margin: '2px 0', fontSize: '15px', color: '#00a884', fontWeight: '800' }}>
                    <strong>Account Number:</strong> {schoolAccountDetails.accountNumber}
                  </p>
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748b' }}>Our Admissions Officer will reach out via WhatsApp/Phone ({applyFormData.phone}) to confirm assessment date.</p>
                <button className='primary-btn' style={{ marginTop: '14px' }} onClick={() => setShowApplyModal(false)}>CLOSE</button>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className='modal-form' style={{ padding: '20px' }}>
                <div className='form-row'>
                  <div className='form-group'>
                    <label>Parent / Guardian Name *</label>
                    <input
                      type='text'
                      required
                      placeholder='e.g. Dr. Chukwuma Okafor'
                      value={applyFormData.parentName}
                      onChange={(e) => setApplyFormData({ ...applyFormData, parentName: e.target.value })}
                    />
                  </div>
                  <div className='form-group'>
                    <label>Guardian Email Address *</label>
                    <input
                      type='email'
                      required
                      placeholder='e.g. chukwuma.okafor@example.com'
                      value={applyFormData.email}
                      onChange={(e) => setApplyFormData({ ...applyFormData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className='form-row'>
                  <div className='form-group'>
                    <label>Phone Number *</label>
                    <input
                      type='tel'
                      required
                      placeholder='e.g. 0803 456 7891'
                      value={applyFormData.phone}
                      onChange={(e) => setApplyFormData({ ...applyFormData, phone: e.target.value })}
                    />
                  </div>
                  <div className='form-group'>
                    <label>Scholar Full Name *</label>
                    <input
                      type='text'
                      required
                      placeholder='e.g. Chimamanda Okafor'
                      value={applyFormData.studentName}
                      onChange={(e) => setApplyFormData({ ...applyFormData, studentName: e.target.value })}
                    />
                  </div>
                </div>

                <div className='form-group'>
                  <label>Class Division Applying For *</label>
                  <select
                    value={applyFormData.grade}
                    onChange={(e) => setApplyFormData({ ...applyFormData, grade: e.target.value })}
                  >
                    <option value='Crèche'>Crèche (Infants & Toddlers)</option>
                    <option value='Nursery 1'>Nursery 1</option>
                    <option value='Nursery 2'>Nursery 2</option>
                    <option value='Primary 1'>Primary 1 (Basic 1)</option>
                    <option value='Primary 2'>Primary 2 (Basic 2)</option>
                    <option value='Primary 3'>Primary 3 (Basic 3)</option>
                    <option value='Primary 4'>Primary 4 (Basic 4)</option>
                    <option value='Primary 5'>Primary 5 (Basic 5)</option>
                    <option value='JSS 1'>JSS 1 (Junior Secondary 1)</option>
                    <option value='JSS 2'>JSS 2 (Junior Secondary 2)</option>
                    <option value='JSS 3'>JSS 3 (Junior Secondary 3)</option>
                    <option value='SS 1'>SS 1 (Senior Secondary 1)</option>
                    <option value='SS 2'>SS 2 (Senior Secondary 2)</option>
                  </select>
                </div>

                <div className='form-group'>
                  <label>Academic History or Special Notes</label>
                  <textarea
                    rows='3'
                    placeholder='Previous school attended, special learning interests, or medical considerations...'
                    value={applyFormData.comments}
                    onChange={(e) => setApplyFormData({ ...applyFormData, comments: e.target.value })}
                  ></textarea>
                </div>

                <div className='modal-actions'>
                  <button type='button' className='outline-btn' onClick={() => setShowApplyModal(false)}>CANCEL</button>
                  <button type='submit' className='primary-btn' disabled={sending} style={{ opacity: sending ? 0.75 : 1 }}>
                    {sending ? (
                      <>
                        <i className='fas fa-spinner fa-spin' style={{ marginRight: '6px' }}></i> SUBMITTING...
                      </>
                    ) : (
                      <>
                        SUBMIT ENROLLMENT INTAKE <i className='fas fa-paper-plane' style={{ marginLeft: '6px' }}></i>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ScholarshipBenefactors />
      <Faq />
    </>
  )
}

export default Pricing
