import React, { useState, useEffect, useRef } from "react"
import { useLocation, useHistory } from "react-router-dom"
import { getStoredPublicNews, subscribeToPublicNews, getArticleShareData } from "../../services/newsService"
import ArticleReaderModal from "./ArticleReaderModal"

const BlogCard = () => {
  const [newsList, setNewsList] = useState(getStoredPublicNews)
  const [activeArticle, setActiveArticle] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const location = useLocation()
  const history = useHistory()
  const hasAutoOpenedRef = useRef(false)

  useEffect(() => {
    const unsub = subscribeToPublicNews((updatedList) => {
      setNewsList(updatedList)
      // Keep active article updated in real-time if open
      if (activeArticle) {
        const found = updatedList.find((item) => String(item.id) === String(activeArticle.id))
        if (found) setActiveArticle(found)
      }
    })
    return () => {
      if (typeof unsub === "function") unsub()
    }
  }, [activeArticle])

  // Deep-link support: auto-open article once if ?post=ID is in URL
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

  if (!newsList || newsList.length === 0) {
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
      {newsList.map((val) => {
        const shareData = getArticleShareData(val)
        const commentsCount = Array.isArray(val.comments) ? val.comments.length : (val.com ? parseInt(val.com, 10) || 0 : 0)

        return (
          <div
            className='items shadow'
            key={val.id}
            onClick={() => setActiveArticle(val)}
            style={{ cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
          >
            <div className='img' style={{ position: 'relative' }}>
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
                  title='Click to view and write comments'
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

export default BlogCard
