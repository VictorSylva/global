import React, { useState } from "react"
import { schoolAccountDetails } from "../../dummydata"
import "./ProspectusRequest.css"
import { sendWebsiteForm } from "../../services/emailService"

const ProspectusRequest = () => {
  const [formData, setFormData] = useState({
    parentName: "",
    email: "",
    phone: "",
    grade: "Primary One – Five",
    entryTerm: "Term 1 (2026/2027 Session)",
    notes: "",
  })
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)

    await sendWebsiteForm({
      formType: "Prospectus & Fee Guide Request",
      fromName: formData.parentName,
      fromEmail: formData.email,
      phone: formData.phone,
      subject: `Prospectus Request: ${formData.grade}`,
      grade: formData.grade,
      entryTerm: formData.entryTerm,
      message: formData.notes || `Requested official prospectus package for ${formData.grade} (${formData.entryTerm}).`,
    })

    setSending(false)
    setSubmitted(true)
  }

  const handleReset = () => {
    setFormData({
      parentName: "",
      email: "",
      phone: "",
      grade: "Primary One – Five",
      entryTerm: "Term 1 (2026/2027 Session)",
      notes: "",
    })
    setSubmitted(false)
  }

  return (
    <section className='prospectus-request-section' id='prospectus-request'>
      <div className='container'>
        <div className='pr-header'>
          <div className='pr-badge'>
            <i className='fas fa-file-invoice-dollar'></i>
            <span>2026/2027 ADMISSIONS & PROSPECTUS</span>
          </div>
          <h2>Request the Official School Prospectus & Fee Guide</h2>
          <p>
            Complete the form below to have the official Brighter Land International School prospectus, curriculum breakdown, and Section A & B fee schedules forwarded to your email by our Admissions Secretariat.
          </p>
        </div>

        <div className='pr-grid'>
          {/* Left: Info & Trust Card */}
          <div className='pr-info-card'>
            <div className='pr-crest-header'>
              <div className='pr-crest-img'>
                <img src='/images/logo.png' alt="Brighter Land International School Crest" />
              </div>
              <div className='pr-crest-title'>
                <h3>BRIGHTER LAND INT'L SCHOOL</h3>
                <span>STUDY TO MAKE IMPACT • 2026/2027</span>
              </div>
            </div>

            <ul className='pr-benefit-list'>
              <li className='pr-benefit-item'>
                <div className='pr-benefit-icon emerald'>
                  <i className='fas fa-graduation-cap'></i>
                </div>
                <div className='pr-benefit-text'>
                  <h4>Crèche to Senior Secondary Syllabi</h4>
                  <p>Comprehensive academic curriculum tailored for Early Years, Primary, BECE, WAEC, and NECO success.</p>
                </div>
              </li>

              <li className='pr-benefit-item'>
                <div className='pr-benefit-icon blue'>
                  <i className='fas fa-receipt'></i>
                </div>
                <div className='pr-benefit-text'>
                  <h4>Section A & B Itemized Schedules</h4>
                  <p>Complete breakdown of tuition, PTA levies, exam fees, lessons, uniforms, sportswear, and books.</p>
                </div>
              </li>

              <li className='pr-benefit-item'>
                <div className='pr-benefit-icon amber'>
                  <i className='fas fa-user-check'></i>
                </div>
                <div className='pr-benefit-text'>
                  <h4>Dedicated Admissions Support</h4>
                  <p>Our Registry team will review your scholar's placement diagnostic and schedule an entrance interview.</p>
                </div>
              </li>
            </ul>

            <div className='pr-account-notice'>
              <div className='pr-an-icon'>
                <i className='fas fa-university'></i>
              </div>
              <div className='pr-an-text'>
                <strong>Official School Bank Details:</strong>
                <div>{schoolAccountDetails.bankName} • Account: <strong>{schoolAccountDetails.accountNumber}</strong></div>
                <small>Account Name: {schoolAccountDetails.accountName}</small>
              </div>
            </div>
          </div>

          {/* Right: Interactive Prospectus Request Form */}
          <div className='pr-form-card'>
            {submitted ? (
              <div className='pr-success-box'>
                <div className='pr-success-icon'>
                  <i className='fas fa-check'></i>
                </div>
                <h3>Prospectus Request Logged!</h3>
                <p>
                  Thank you, <strong>{formData.parentName}</strong>. Our Admissions Secretariat has received your request for the <strong>{formData.grade}</strong> prospectus.
                </p>
                <div className='pr-success-details'>
                  <div><i className='fas fa-envelope' style={{ color: '#00a884', marginRight: '6px' }}></i> <strong>Recipient Email:</strong> {formData.email}</div>
                  <div><i className='fas fa-phone-alt' style={{ color: '#2563eb', marginRight: '6px' }}></i> <strong>Contact Phone:</strong> {formData.phone}</div>
                  <div><i className='fas fa-calendar-alt' style={{ color: '#f59e0b', marginRight: '6px' }}></i> <strong>Intake:</strong> {formData.entryTerm}</div>
                </div>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  Our Admissions Officer will forward the approved prospectus PDF and fee schedule directly to your email within 12 hours. For immediate assistance, call the Admissions Desk: <strong>+234 803 436 7951</strong>.
                </p>
                <button type='button' className='pr-reset-btn' onClick={handleReset}>
                  <i className='fas fa-redo'></i> Submit Another Request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className='pr-form-title'>
                  <h3>Admissions Inquiry Form</h3>
                  <p>Fill in your details to receive the official prospectus package.</p>
                </div>

                <div className='pr-form-row'>
                  <div className='pr-form-group'>
                    <label>
                      Parent / Guardian Name <span className='required'>*</span>
                    </label>
                    <input
                      type='text'
                      name='parentName'
                      required
                      placeholder='e.g. Dr. Kalu Nwachukwu'
                      value={formData.parentName}
                      onChange={handleChange}
                    />
                  </div>

                  <div className='pr-form-group'>
                    <label>
                      Phone / WhatsApp Number <span className='required'>*</span>
                    </label>
                    <input
                      type='tel'
                      name='phone'
                      required
                      placeholder='e.g. 0803 456 7891'
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className='pr-form-row'>
                  <div className='pr-form-group'>
                    <label>
                      Email Address (To Receive Prospectus) <span className='required'>*</span>
                    </label>
                    <input
                      type='email'
                      name='email'
                      required
                      placeholder='e.g. parent@domain.com'
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div className='pr-form-group'>
                    <label>
                      Prospective Class / Division <span className='required'>*</span>
                    </label>
                    <select name='grade' value={formData.grade} onChange={handleChange}>
                      <option value='Crèche Division (Infants & Toddlers)'>Crèche Division (Infants & Toddlers)</option>
                      <option value='Nursery One & Two (Early Years)'>Nursery One & Two (Early Years)</option>
                      <option value='Primary One – Five (Basic Education)'>Primary One – Five (Basic Education)</option>
                      <option value='Junior Secondary School (JSS 1 – 3)'>Junior Secondary School (JSS 1 – 3)</option>
                      <option value='Senior Secondary School (SS 1 – 2)'>Senior Secondary School (SS 1 – 2)</option>
                    </select>
                  </div>
                </div>

                <div className='pr-form-group'>
                  <label>Additional Scholar Notes or Questions (Optional)</label>
                  <textarea
                    rows='3'
                    name='notes'
                    placeholder='Mention scholar current school, special talents, or any inquiries...'
                    value={formData.notes}
                    onChange={handleChange}
                  ></textarea>
                </div>

                <button type='submit' className='pr-submit-btn' disabled={sending} style={{ opacity: sending ? 0.75 : 1 }}>
                  {sending ? (
                    <>
                      <i className='fas fa-spinner fa-spin'></i>
                      <span>DISPATCHING REQUEST...</span>
                    </>
                  ) : (
                    <>
                      <i className='fas fa-paper-plane'></i>
                      <span>REQUEST OFFICIAL PROSPECTUS & FEE GUIDE</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProspectusRequest
