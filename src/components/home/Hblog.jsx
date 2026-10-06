import React, { useState, useEffect, useRef } from "react"
import { Link, useLocation, useHistory } from "react-router-dom"
import "../blog/blog.css"
import { getStoredPublicNews, subscribeToPublicNews, getArticleShareData } from "../../services/newsService"
import Heading from "../common/heading/Heading"
import ArticleReaderModal from "../blog/ArticleReaderModal"

const Hblog = () => {
  const [newsList, setNewsList] = useState(getStoredPublicNews)
  const [activeArticle, setActiveArticle] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const location = useLocation()
  const history = useHistory()
  const hasAutoOpenedRef = useRef(false)

  useEffect(() => {
    const unsub = subscribeToPublicNews((updatedList) => {
      setNewsList(updatedList)
      if (activeArticle) {
        const found = updatedList.find((item) => String(item.id) === String(activeArticle.id))
        if (found) setActiveArticle(found)
      }
    })
    return () => {
      if (typeof unsub === "function") unsub()
    }
  }, [activeArticle])

  // Deep-link auto open on home if ?post=ID
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(location.search)
      const targetPostId = searchParams.get("post")
      if (targetPostId && newsList && newsList.length > 0 && !hasAutoOpenedRef.current) {
        const matched = newsList.find((p) => String(p.id) === String(targetPostId))
        if (matched) {
          hasAutoOpenedRef.current = true
          setActiveArticle(matched)
        }
      }
    } catch (e) {}
  }, [location.search, newsList])

  const handleCloseArticle = () => {
    setActiveArticle(null)
    hasAutoOpenedRef.current = true
    try {
      if (location.search && location.search.includes("post=")) {
        if (history && history.replace) {
          history.replace(location.pathname)
        } else if (window.history && window.history.replaceState) {
          window.history.replaceState(null, "", window.location.pathname)
        }
      }
    } catch (e) {}
  }

  const handleQuickCopy = (e, val) => {
    e.stopPropagation()
    const shareData = getArticleShareData(val)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareData.url)
    } else {
      const tempInput = document.createElement("input")
      tempInput.value = shareData.url
      document.body.appendChild(tempInput)
      tempInput.select()
      document.execCommand("copy")
      document.body.removeChild(tempInput)
    }
    setCopiedId(val.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <>
      <section className='blog'>
        <div className='container'>
          <Heading subtitle='CIRCULARS & HAPPENINGS' title='Latest News From Brighter Land' />
          {newsList && newsList.length > 0 ? (
            <div className='grid2'>
              {newsList.slice(0, 3).map((val) => {
                const shareData = getArticleShareData(val)
                const commentsCount = Array.isArray(val.comments) ? val.comments.length : (val.com ? parseInt(val.com, 10) || 0 : 0)

                return (
                  <div
                    className='items shadow'
                    key={val.id}
                    onClick={() => setActiveArticle(val)}
                    style={{ cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
                  >
                    <div className='img'>
                      <img
                        src={val.cover || "./images/blog/b1.webp"}
                        alt={val.title}
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src = "./images/blog/b1.webp"
                        }}
                      />
                    </div>
                    <div className='text'>
                      <div className='admin flexSB'>
                        <span>
                          <i className='fa fa-tag'></i>
                          <label htmlFor=''>{val.type || "School News"}</label>
                        </span>
                        <span>
                          <i className='fa fa-calendar-alt'></i>
                          <label htmlFor=''>{val.date || "Recent"}</label>
                        </span>
                        <span
                          title='Click to view comments'
                          style={{ cursor: 'pointer', color: '#00a884', fontWeight: '700' }}
                        >
                          <i className='fa fa-comments'></i>
                          <label htmlFor=''>{commentsCount} {commentsCount === 1 ? "COMMENT" : "COMMENTS"}</label>
                        </span>
                      </div>
                      <h1 onClick={() => setActiveArticle(val)}>{val.title}</h1>
                      <p>{val.desc && val.desc.length > 140 ? `${val.desc.slice(0, 137)}...` : val.desc}</p>

                      {/* Action & Sharing Bar */}
                      <div className='blog-card-actions'>
                        <button
                          type='button'
                          className='read-story-btn'
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveArticle(val)
                          }}
                        >
                          Read Story & Comments <i className='fas fa-arrow-right'></i>
                        </button>

                        <div className='card-share-triggers' onClick={(e) => e.stopPropagation()}>
                          <a
                            href={shareData.whatsappUrl}
                            target='_blank'
                            rel='noreferrer'
                            className='card-share-btn wa'
                            title='Share to WhatsApp group / status'
                          >
                            <i className='fab fa-whatsapp'></i>
                          </a>
                          <button
                            type='button'
                            className='card-share-btn link'
                            title='Copy link to share'
                            onClick={(e) => handleQuickCopy(e, val)}
                          >
                            <i className={copiedId === val.id ? "fas fa-check" : "fas fa-link"}></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
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

      {/* Interactive Article Reader & Comments Modal */}
      {activeArticle && (
        <ArticleReaderModal
          post={activeArticle}
          onClose={handleCloseArticle}
          onCommentAdded={(updatedPost) => {
            setActiveArticle(updatedPost)
          }}
        />
      )}
    </>
  )
}

export default Hblog
