import React from "react"
import { blog } from "../../dummydata"

const BlogCard = () => {
  if (!blog || blog.length === 0) {
    return (
      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 24px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', maxWidth: '680px', margin: '30px auto' }}>
        <i className='fas fa-bullhorn' style={{ fontSize: '48px', color: '#94a3b8', marginBottom: '16px', display: 'inline-block' }}></i>
        <h3 style={{ color: '#071626', marginBottom: '8px' }}>Official Noticeboard Is Clear</h3>
        <p style={{ color: '#64748b', margin: 0, fontSize: '15px', lineHeight: '1.6' }}>
          All previous circulars and news articles have been cleared so you can start afresh. Newly published notices from the school secretariat will be displayed here.
        </p>
      </div>
    )
  }

  return (
    <>
      {blog.map((val) => (
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
    </>
  )
}

export default BlogCard
