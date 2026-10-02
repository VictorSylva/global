import React from "react"
import { Link } from "react-router-dom"
import "../blog/blog.css"
import { blog } from "../../dummydata"
import Heading from "../common/heading/Heading"

const Hblog = () => {
  return (
    <>
      <section className='blog'>
        <div className='container'>
          <Heading subtitle='CIRCULARS & HAPPENINGS' title='Latest News From Brighter Land' />
          {blog && blog.length > 0 ? (
            <div className='grid2'>
              {blog.slice(0, 3).map((val) => (
                <div className='items shadow' key={val.id}>
                  <div className='img'>
                    <img src={val.cover} alt={val.title} />
                  </div>
                  <div className='text'>
                    <div className='admin flexSB'>
                      <span>
                        <i className='fa fa-tag'></i>
                        <label htmlFor=''>{val.type}</label>
                      </span>
                      <span>
                        <i className='fa fa-calendar-alt'></i>
                        <label htmlFor=''>{val.date}</label>
                      </span>
                      <span>
                        <i className='fa fa-comments'></i>
                        <label htmlFor=''>{val.com}</label>
                      </span>
                    </div>
                    <h1>{val.title}</h1>
                    <p>{val.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "48px 24px", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1", maxWidth: "680px", margin: "24px auto" }}>
              <i className='fas fa-newspaper' style={{ fontSize: "40px", color: "#94a3b8", marginBottom: "12px", display: "inline-block" }}></i>
              <h3 style={{ color: "#071626", marginBottom: "8px" }}>No Active Circulars or News</h3>
              <p style={{ color: "#64748b", margin: 0, fontSize: "14px", lineHeight: "1.6" }}>
                All previous circulars have been cleared. New term schedules, academic announcements, and Principal dispatches will appear here.
              </p>
            </div>
          )}
          <div className='text-center' style={{ textAlign: "center", marginTop: "30px" }}>
            <Link to='/journal' className='outline-btn' style={{ display: 'inline-block', width: 'auto', padding: '14px 32px' }}>
              VIEW ALL NOTICES & CIRCULARS <i className='fas fa-arrow-right'></i>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

export default Hblog
