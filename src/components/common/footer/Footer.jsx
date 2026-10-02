import React, { useState } from "react"
import { Link } from "react-router-dom"
import { blog } from "../../../dummydata"
import "./footer.css"
import { sendWebsiteForm } from "../../../services/emailService"

const Footer = () => {
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (email) {
      setSending(true)
      await sendWebsiteForm({
        formType: "Newsletter & Gazette Subscription",
        fromName: "Gazette Subscriber",
        fromEmail: email,
        subject: "New Gazette Newsletter Subscriber",
        message: `A parent or patron has subscribed to receive the BLIS Gazette and academic circulars.\nSubscriber Email: ${email}`,
      })
      setSending(false)
      setSubscribed(true)
      setEmail("")
    }
  }

  return (
    <>
      <section className='newletter'>
        <div className='container flexSB'>
          <div className='left row'>
            <h1>BLIS Gazette & Academic Circulars</h1>
            <span>Subscribe to receive the weekly Principal's dispatch, term schedules, and admissions notices.</span>
          </div>
          <div className='right row'>
            {subscribed ? (
              <span className='subscribed-badge'>
                <i className='fas fa-check-circle'></i> Thank you for subscribing to the BLIS Gazette!
              </span>
            ) : (
              <form onSubmit={handleSubscribe} className='flex' style={{ width: '100%' }}>
                <input
                  type='email'
                  required
                  placeholder='Enter parent/guardian email...'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  type='submit'
                  disabled={sending}
                  style={{ margin: 0, padding: '0 25px', background: '#00a884', color: '#fff', border: 'none', borderRadius: '0 4px 4px 0', cursor: 'pointer', opacity: sending ? 0.75 : 1 }}
                  title='Subscribe to Newsletter'
                >
                  <i className={sending ? 'fas fa-spinner fa-spin' : 'fa fa-paper-plane'}></i>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <footer>
        <div className='container padding'>
          <div className='box logo'>
            <div className='footer-crest flex' style={{ alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div className='school-crest' style={{ width: '48px', height: '48px', margin: 0, padding: '3px', background: '#fff' }}>
                <img src='/images/logo.png' alt="Brighter Land Int'l School" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div>
                <h1 style={{ fontSize: '22px', margin: 0 }}>BRIGHTER LAND</h1>
                <span style={{ fontSize: '11px', color: '#34d399', letterSpacing: '1px' }}>INT'L SCHOOL • STUDY TO MAKE IMPACT</span>
              </div>
            </div>
            <p>
              A premier institution dedicated to academic distinction, high moral standards, and future leadership. Providing comprehensive education across Crèche, Nursery, Primary, Junior & Senior Secondary.
            </p>

            <div className='footer-socials flex' style={{ gap: '8px', marginTop: '16px' }}>
              <i className='fab fa-facebook-f icon' title='Facebook'></i>
              <i className='fab fa-twitter icon' title='Twitter'></i>
              <i className='fab fa-instagram icon' title='Instagram'></i>
              <i className='fab fa-linkedin-in icon' title='LinkedIn'></i>
            </div>
          </div>

          <div className='box link'>
            <h3>Academic Divisions</h3>
            <ul>
              <li><Link to='/courses'>Crèche (Infants & Toddlers)</Link></li>
              <li><Link to='/courses'>Nursery One & Two</Link></li>
              <li><Link to='/courses'>Primary School (Primary 1–5)</Link></li>
              <li><Link to='/courses'>Junior Secondary (JSS 1–3)</Link></li>
              <li><Link to='/courses'>Senior Secondary (SS 1–2)</Link></li>
              <li><Link to='/courses'>Digital Studies & Technologies</Link></li>
            </ul>
          </div>

          <div className='box link'>
            <h3>Operations & Bursary</h3>
            <ul>
              <li><Link to='/portal' style={{ color: '#34d399', fontWeight: '700' }}><i className='fas fa-laptop-code'></i> Operations ERP Suite</Link></li>
              <li><Link to='/pricing' style={{ color: '#f59e0b', fontWeight: '600' }}><i className='fas fa-file-invoice'></i> Prospectus & School Fees</Link></li>
              <li><Link to='/team'>Faculty & Leadership</Link></li>
              <li><Link to='/journal'>School Circulars</Link></li>
              <li><Link to='/about'>School Philosophy</Link></li>
              <li><Link to='/contact'>Campus & Inquiries</Link></li>
            </ul>
          </div>

          <div className='box'>
            <h3>Recent Notices</h3>
            {blog && blog.length > 0 ? (
              blog.slice(0, 2).map((val) => (
                <div className='items flexSB' key={val.id} style={{ marginBottom: '14px' }}>
                  <div className='img' style={{ width: '65px', height: '65px', flexShrink: 0, marginRight: '12px' }}>
                    <img src={val.cover} alt={val.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                  </div>
                  <div className='text'>
                    <span>
                      <i className='fa fa-calendar-alt' style={{ marginRight: '5px', color: '#10b981' }}></i>
                      <label style={{ fontSize: '11px', color: '#94a3b8' }}>{val.date}</label>
                    </span>
                    <h4 style={{ fontSize: '13px', lineHeight: '1.3', marginTop: '4px' }}>
                      <Link to='/journal' style={{ color: '#e2e8f0' }}>{val.title.slice(0, 48)}...</Link>
                    </h4>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', marginTop: '8px' }}>
                All previous circulars have been cleared. New announcements will appear here when published.
              </p>
            )}
          </div>

          <div className='box last'>
            <h3>Campus Registry</h3>
            <ul>
              <li>
                <i className='fa fa-map-marker-alt' style={{ color: '#f59e0b' }}></i>
                Gura-suga, Opposite Police Staff College Jos, Jos-South Local Government, Plateau State
              </li>
              <li>
                <i className='fa fa-phone-alt' style={{ color: '#f59e0b' }}></i>
                +234 803 436 7951
              </li>
              <li>
                <i className='fa fa-envelope' style={{ color: '#f59e0b' }}></i>
                brighterlandschool2022@gmail.com
              </li>
              <li>
                <i className='fa fa-clock' style={{ color: '#f59e0b' }}></i>
                Mon - Fri: 07:30 - 17:00 | Sat: 09:00 - 14:00
              </li>
            </ul>
          </div>
        </div>
      </footer>

      <div className='legal'>
        <p>
          Copyright © 2026 Brighter Land International School (BLIS). All Rights Reserved. 2026/2027 Academic Session Prospectus & Portal.
        </p>
      </div>
    </>
  )
}

export default Footer
