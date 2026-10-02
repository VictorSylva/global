import React, { useState } from "react"
import Back from "../common/back/Back"
import PriceCard from "./PriceCard"
import "./price.css"
import Faq from "./Faq"
import { schoolAccountDetails, prospectusData } from "../../dummydata"
import { sendWebsiteForm } from "../../services/emailService"

const Pricing = () => {
  const [activeTab, setActiveTab] = useState("cards") // 'cards' or 'table'
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [selectedProspectusLevel, setSelectedProspectusLevel] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)

  const [formData, setFormData] = useState({
    parentName: "",
    email: "",
    phone: "",
    studentName: "",
    grade: "Primary One – Five",
    comments: "",
  })

  const handleOpenApply = (planName) => {
    setSelectedPlan(planName)
    setShowApplyModal(true)
    setSubmitted(false)
  }

  const handleOpenProspectusDetail = (levelName) => {
    const found = prospectusData.find((p) => p.level.toLowerCase().includes(levelName.toLowerCase().slice(0, 5)))
    setSelectedProspectusLevel(found || prospectusData[0])
  }

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(schoolAccountDetails.accountNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)

    await sendWebsiteForm({
      formType: `Prospectus Enrollment Application (${selectedPlan || formData.grade})`,
      fromName: formData.parentName,
      fromEmail: formData.email,
      phone: formData.phone,
      subject: `Admissions Application: ${formData.studentName} (${formData.grade})`,
      grade: formData.grade,
      message: `Candidate Scholar: ${formData.studentName}\nClass Applying For: ${formData.grade}\nDivision Plan: ${selectedPlan || "General"}\nParent / Guardian: ${formData.parentName}\nPhone: ${formData.phone}\nNotes & Background: ${formData.comments || "None"}`,
    })

    setSending(false)
    setSubmitted(true)
  }

  return (
    <>
      <Back title='2026/2027 Academic Session Prospectus' />
      <section className='price padding'>
        <div className='container'>
          {/* Header Intro */}
          <div className='admissions-intro text-center' style={{ textAlign: "center", marginBottom: "30px" }}>
            <h3 style={{ color: "#00a884", letterSpacing: "1.5px", textTransform: "uppercase", fontSize: "14px", fontWeight: "700" }}>
              BRIGHTER LAND INTERNATIONAL SCHOOL
            </h3>
            <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: "36px", color: "#071626", marginTop: "8px" }}>
              Official 2026/2027 Session School Fees & Prospectus
            </h1>
            <p style={{ maxWidth: "760px", margin: "14px auto", color: "#64748b", fontSize: "15px" }}>
              Approved schedule of fees covering Section A (Tuition & School Levies) and Section B (Uniforms, Books & Learning Materials) across Crèche, Nursery, Primary, Junior Secondary (JSS), and Senior Secondary (SSS).
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

          {/* View Mode Switcher */}
          <div className='prospectus-tab-bar flexSB' style={{ margin: '30px 0 24px 0' }}>
            <div className='tab-buttons flex'>
              <button
                className={`tab-btn ${activeTab === "cards" ? "active" : ""}`}
                onClick={() => setActiveTab("cards")}
              >
                <i className='fas fa-th-large'></i> Class Summary Cards
              </button>
              <button
                className={`tab-btn ${activeTab === "table" ? "active" : ""}`}
                onClick={() => setActiveTab("table")}
              >
                <i className='fas fa-list-alt'></i> Full Itemized Prospectus Table
              </button>
            </div>

            <button
              className='download-prospectus-btn'
              onClick={() => handleOpenProspectusDetail("CRÈCHE")}
            >
              <i className='fas fa-print'></i> View Printable Prospectus
            </button>
          </div>

          {/* TAB 1: CARDS */}
          {activeTab === "cards" && (
            <div className='grid'>
              <PriceCard
                onOpenApply={handleOpenApply}
                onOpenProspectusDetail={handleOpenProspectusDetail}
              />
            </div>
          )}

          {/* TAB 2: FULL ITEMIZED PROSPECTUS TABLE */}
          {activeTab === "table" && (
            <div className='prospectus-table-wrapper shadow'>
              {prospectusData.map((sec, idx) => (
                <div className='prospectus-level-section' key={idx}>
                  <div className='level-header flexSB'>
                    <div>
                      <h3>{sec.level}</h3>
                      <span className='age-tag'>{sec.ageGroup}</span>
                    </div>
                    <div className='level-totals-badge flex'>
                      <div>
                        <small>Section A Total:</small>
                        <strong>₦{sec.sectionA.total.toLocaleString()}</strong>
                      </div>
                      <div className='sep'>|</div>
                      <div>
                        <small>Section B Total:</small>
                        <strong>₦{sec.sectionB.total.toLocaleString()}</strong>
                      </div>
                      <div className='sep'>|</div>
                      <div>
                        <small>Grand Package:</small>
                        <strong style={{ color: '#00a884' }}>₦{sec.grandTotal.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>

                  <div className='level-tables-grid'>
                    {/* Section A */}
                    <div className='sub-table-card'>
                      <h4><i className='fas fa-check-circle' style={{ color: '#00a884' }}></i> {sec.sectionA.title}</h4>
                      <table className='inner-spec-table'>
                        <thead>
                          <tr>
                            <th>Item Description</th>
                            <th className='text-right'>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sec.sectionA.items.map((it, i) => (
                            <tr key={i}>
                              <td>{it.name}</td>
                              <td className='text-right font-bold'>₦{it.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td><strong>Total Section A (Payable to School):</strong></td>
                            <td className='text-right'><strong>₦{sec.sectionA.total.toLocaleString()}</strong></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Section B */}
                    <div className='sub-table-card'>
                      <h4><i className='fas fa-book-reader' style={{ color: '#2563eb' }}></i> {sec.sectionB.title}</h4>
                      <table className='inner-spec-table'>
                        <thead>
                          <tr>
                            <th>Item Description</th>
                            <th className='text-right'>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sec.sectionB.items.map((it, i) => (
                            <tr key={i}>
                              <td>{it.name}</td>
                              <td className='text-right font-bold'>₦{it.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td><strong>Total Section B (Uniforms & Materials):</strong></td>
                            <td className='text-right'><strong>₦{sec.sectionB.total.toLocaleString()}</strong></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {sec.bookNote && (
                    <div className='prospectus-book-note'>
                      <i className='fas fa-info-circle'></i> {sec.bookNote}
                    </div>
                  )}

                  <div className='additional-req-strip flexSB'>
                    <span>
                      <i className='fas fa-box-open'></i> <strong>Additional Requirement:</strong> {sec.additionalRequirements}
                    </span>
                    <button
                      className='apply-level-btn'
                      onClick={() => handleOpenApply(sec.level)}
                    >
                      Enroll For {sec.level} <i className='fas fa-arrow-right'></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Notice on Bank Payments */}
          <div className='payment-reminder-card shadow flexSB'>
            <div className='flex' style={{ gap: '16px', alignItems: 'center' }}>
              <div className='pr-icon'><i className='fas fa-receipt'></i></div>
              <div>
                <h4>Important Payment Instructions</h4>
                <p>
                  Pay directly into <strong>First Bank, Account No: 2043561832 (Brighter Land International School)</strong>. 
                  Always write the scholar's name and class on the bank teller / narration, and present proof of payment to the Bursar for official receipt generation.
                </p>
              </div>
            </div>
            <button className='primary-btn' onClick={() => handleOpenApply("Admissions & Payment")}>
              BEGIN ENROLLMENT <i className='fas fa-chevron-right'></i>
            </button>
          </div>
        </div>
      </section>

      {/* --- MODAL 1: ITEMIZE PROSPECTUS DETAIL MODAL --- */}
      {selectedProspectusLevel && (
        <div className='blis-modal-overlay' onClick={() => setSelectedProspectusLevel(null)}>
          <div className='blis-modal-card prospectus-modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header no-print'>
              <div>
                <h3>Official Prospectus Breakdown</h3>
                <small>{selectedProspectusLevel.level} • 2026/2027 Session</small>
              </div>
              <div className='flex' style={{ gap: '10px' }}>
                <button className='btn-action-primary' onClick={() => window.print()}>
                  <i className='fas fa-print'></i> Print Prospectus
                </button>
                <button className='modal-close' onClick={() => setSelectedProspectusLevel(null)}>×</button>
              </div>
            </div>

            <div className='prospectus-print-paper'>
              <div className='prospectus-print-header flexSB'>
                <div className='flex' style={{ gap: '14px', alignItems: 'center' }}>
                  <div style={{ width: '60px', height: '60px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '3px', flexShrink: 0 }}>
                    <img src='/images/logo.png' alt="BLIS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div>
                    <h2>BRIGHTER LAND INTERNATIONAL SCHOOL</h2>
                    <p>2026/2027 Academic Session Prospectus • <em>Study to Make Impact</em></p>
                    <small>School Account: First Bank • Account No: 2043561832 • Brighter Land International School</small>
                  </div>
                </div>
                <div className='level-badge-large'>
                  {selectedProspectusLevel.level}
                </div>
              </div>

              {/* Section A */}
              <div className='modal-section-block'>
                <h4>{selectedProspectusLevel.sectionA.title}</h4>
                <table className='prospectus-print-table'>
                  <thead>
                    <tr>
                      <th>S/N</th>
                      <th>Levy Description</th>
                      <th className='text-right'>Amount (₦)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProspectusLevel.sectionA.items.map((it, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{it.name}</td>
                        <td className='text-right'>₦{it.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className='subtotal-row'>
                      <td colSpan='2'><strong>TOTAL SECTION A (Payable to School):</strong></td>
                      <td className='text-right'><strong>₦{selectedProspectusLevel.sectionA.total.toLocaleString()}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section B */}
              <div className='modal-section-block' style={{ marginTop: '20px' }}>
                <h4>{selectedProspectusLevel.sectionB.title}</h4>
                <table className='prospectus-print-table'>
                  <thead>
                    <tr>
                      <th>S/N</th>
                      <th>Material / Uniform Description</th>
                      <th className='text-right'>Amount (₦)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProspectusLevel.sectionB.items.map((it, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{it.name}</td>
                        <td className='text-right'>₦{it.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className='subtotal-row'>
                      <td colSpan='2'><strong>TOTAL SECTION B (Uniforms & Learning Materials):</strong></td>
                      <td className='text-right'><strong>₦{selectedProspectusLevel.sectionB.total.toLocaleString()}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Additional Requirements */}
              <div className='prospectus-print-req'>
                <strong>Additional Term Requirement:</strong>
                <p>{selectedProspectusLevel.additionalRequirements}</p>
              </div>

              <div className='prospectus-print-footer flexSB'>
                <div>
                  <strong>Official Accounts Details:</strong>
                  <p>Brighter Land International School | First Bank | Acc: 2043561832</p>
                </div>
                <div className='text-right'>
                  <p><strong>Approved by Management</strong></p>
                  <small>Brighter Land International School</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: INTERACTIVE ADMISSION / ENROLLMENT INTAKE --- */}
      {showApplyModal && (
        <div className='blis-modal-overlay' onClick={() => setShowApplyModal(false)}>
          <div className='blis-modal-card' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <div>
                <h3>BLIS Online Admissions Intake</h3>
                <small>{selectedPlan || "2026/2027 Academic Session"}</small>
              </div>
              <button className='modal-close' onClick={() => setShowApplyModal(false)}>×</button>
            </div>

            {submitted ? (
              <div className='modal-success'>
                <i className='fas fa-check-circle success-icon'></i>
                <h3>Application Successfully Registered!</h3>
                <p>
                  Thank you, <strong>{formData.parentName}</strong>. Your application for <strong>{formData.studentName}</strong> ({formData.grade}) has been received.
                </p>
                <div className='success-bank-box' style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', margin: '16px auto', maxWidth: '480px', border: '1px solid #cbd5e1' }}>
                  <strong style={{ display: 'block', color: '#071626', marginBottom: '6px' }}>Fee Payment Account Details:</strong>
                  <p style={{ margin: '2px 0', fontSize: '13px' }}><strong>Bank:</strong> {schoolAccountDetails.bankName}</p>
                  <p style={{ margin: '2px 0', fontSize: '13px' }}><strong>Account Name:</strong> {schoolAccountDetails.accountName}</p>
                  <p style={{ margin: '2px 0', fontSize: '15px', color: '#00a884', fontWeight: '800' }}>
                    <strong>Account Number:</strong> {schoolAccountDetails.accountNumber}
                  </p>
                </div>
                <p>Please present your payment confirmation to the school Bursar for formal enrollment confirmation.</p>
                <button className='primary-btn' onClick={() => setShowApplyModal(false)}>CLOSE</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className='modal-form'>
                <div className='form-row'>
                  <div className='form-group'>
                    <label>Parent / Guardian Name *</label>
                    <input
                      type='text'
                      required
                      placeholder='e.g. Dr. Chukwuma Okafor'
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    />
                  </div>
                  <div className='form-group'>
                    <label>Guardian Email Address *</label>
                    <input
                      type='email'
                      required
                      placeholder='e.g. chukwuma.okafor@example.com'
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className='form-group'>
                    <label>Scholar Full Name *</label>
                    <input
                      type='text'
                      required
                      placeholder='e.g. Chimamanda Okafor'
                      value={formData.studentName}
                      onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    />
                  </div>
                </div>

                <div className='form-group'>
                  <label>Class Division Applying For *</label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
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
                    value={formData.comments}
                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
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

      <Faq />
    </>
  )
}

export default Pricing
