import React, { useState } from "react"
import Back from "../common/back/Back"
import "./contact.css"
import { sendWebsiteForm } from "../../services/emailService"

const Contact = () => {
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const map = 'https://maps.google.com/maps?q=Police+Staff+College+Jos,+Plateau+State,+Nigeria&t=&z=15&ie=UTF8&iwloc=&output=embed'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)

    await sendWebsiteForm({
      formType: "Contact & Admissions Office Inquiry",
      fromName: formData.name,
      fromEmail: formData.email,
      subject: formData.subject,
      message: formData.message,
    })

    setSending(false)
    setSubmitted(true)
  }

  return (
    <>
      <Back title='Contact & Admissions Office' />
      <section className='contacts padding'>
        <div className='container shadow flexSB'>
          <div className='left row'>
            <iframe
              title='Brighter Land International School Campus Location'
              src={map}
              width='100%'
              height='100%'
              style={{ border: 0, minHeight: "450px" }}
              allowFullScreen=''
              loading='lazy'
              referrerPolicy='no-referrer-when-downgrade'
            ></iframe>
          </div>
          <div className='right row'>
            <h1>Contact Brighter Land</h1>
            <p>Our Admissions Officers and Academic Registry are available Monday through Saturday to answer questions or arrange private campus tours.</p>

            <div className='items grid2'>
              <div className='box'>
                <h4>CAMPUS ADDRESS:</h4>
                <p>Gura-suga, Opposite Police Staff College Jos, Jos-South Local Government, Plateau State</p>
              </div>
              <div className='box'>
                <h4>OFFICIAL EMAIL:</h4>
                <p>brighterlandschool2022@gmail.com</p>
              </div>
              <div className='box'>
                <h4>ADMISSIONS DESK:</h4>
                <p>+234 803 436 7951</p>
              </div>
              <div className='box'>
                <h4>SCHOOL ACCOUNT:</h4>
                <p>First Bank: 2043561832 (Brighter Land)</p>
              </div>
            </div>

            {submitted ? (
              <div className='contact-success-msg' style={{ padding: '24px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #10b981', marginTop: '20px' }}>
                <h4 style={{ color: '#065f46', marginBottom: '8px' }}><i className='fas fa-check-circle'></i> Message Successfully Received</h4>
                <p style={{ color: '#047857', margin: 0 }}>
                  Thank you, <strong>{formData.name}</strong>. Our Admissions & Registry Secretariat will review your inquiry regarding "<em>{formData.subject}</em>" and get back to <strong>{formData.email}</strong> within 12 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className='flexSB'>
                  <input
                    type='text'
                    required
                    placeholder='Parent / Guardian Full Name'
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <input
                    type='email'
                    required
                    placeholder='Email Address'
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <input
                  type='text'
                  required
                  placeholder='Inquiry Subject (e.g. JSS 1 Admission, School Fees Payment Confirmation)'
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
                <textarea
                  cols='30'
                  rows='5'
                  required
                  placeholder='Provide details about prospective scholar, current grade, or specific questions...'
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                ></textarea>
                <button type='submit' className='primary-btn' disabled={sending} style={{ opacity: sending ? 0.75 : 1 }}>
                  {sending ? (
                    <>
                      <i className='fas fa-spinner fa-spin' style={{ marginRight: '8px' }}></i> DISPATCHING INQUIRY...
                    </>
                  ) : (
                    <>
                      DISPATCH OFFICIAL INQUIRY <i className='fas fa-paper-plane' style={{ marginLeft: '8px' }}></i>
                    </>
                  )}
                </button>
              </form>
            )}

            <div className='contact-socials' style={{ marginTop: '30px' }}>
              <h4 style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>Official School Channels</h4>
              <div className='social-links flex' style={{ gap: '10px' }}>
                <span className='social-tag'><i className='fab fa-facebook-f'></i> Facebook</span>
                <span className='social-tag'><i className='fab fa-twitter'></i> Twitter</span>
                <span className='social-tag'><i className='fab fa-linkedin-in'></i> LinkedIn</span>
                <span className='social-tag'><i className='fab fa-instagram'></i> Instagram</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Contact
