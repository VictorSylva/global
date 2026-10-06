import React, { useState, useEffect } from "react"
import { addCommentToPost, getArticleShareData } from "../../services/newsService"
import "./articleReader.css"

const ArticleReaderModal = ({ post, onClose, onCommentAdded }) => {
  const [commentForm, setCommentForm] = useState({
    name: "",
    role: "Parent / Guardian",
    message: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState(null)

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (typeof onClose === "function") onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  if (!post) return null

  const shareData = getArticleShareData(post)
  const comments = Array.isArray(post.comments) ? post.comments : []

  const showReaderToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareData.url)
      } else {
        const tempInput = document.createElement("input")
        tempInput.value = shareData.url
        document.body.appendChild(tempInput)
        tempInput.select()
        document.execCommand("copy")
        document.body.removeChild(tempInput)
      }
      setCopied(true)
      showReaderToast("🔗 Link copied! Ready to share on WhatsApp or social media.")
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      showReaderToast("Failed to copy link. Please copy the URL from your browser address bar.")
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareData.title,
          text: `Read this news from Brighter Land International School: ${shareData.title}`,
          url: shareData.url,
        })
      } catch (e) {}
    } else {
      handleCopyLink()
    }
  }

  const handleSubmitComment = (e) => {
    e.preventDefault()
    if (!commentForm.name.trim() || !commentForm.message.trim()) return

    setSubmitting(true)
    const result = addCommentToPost(post.id, commentForm)
    setSubmitting(false)

    if (result.success) {
      setCommentForm({ name: "", role: "Parent / Guardian", message: "" })
      showReaderToast("🎉 Thank you! Your comment has been posted successfully.")
      if (typeof onCommentAdded === "function") {
        onCommentAdded(result.post)
      }
    } else {
      showReaderToast("Error saving comment. Please try again.")
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "Parent / Guardian": return { bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0" }
      case "Prospective Parent": return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" }
      case "Alumni / Old Student": return { bg: "#faf5ff", color: "#6b21a8", border: "#e9d5ff" }
      case "Student / Scholar": return { bg: "#fffbeb", color: "#b45309", border: "#fde68a" }
      default: return { bg: "#f1f5f9", color: "#334155", border: "#cbd5e1" }
    }
  }

  return (
    <div
      className='article-reader-overlay'
      onClick={(e) => {
        if (e.target === e.currentTarget && typeof onClose === "function") {
          onClose()
        }
      }}
    >
      <div className='article-reader-modal' onClick={(e) => e.stopPropagation()}>
        {/* Sticky Top Bar with Close Button */}
        <div className='article-sticky-header'>
          <span className='sticky-brand-label'>
            <i className='fas fa-newspaper' style={{ color: '#00a884', marginRight: '6px' }}></i>
            BLIS Gazette & News
          </span>
          <button
            type='button'
            className='article-close-btn'
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (typeof onClose === "function") onClose()
            }}
            title='Close Story and Continue on Website'
            aria-label='Close Story'
          >
            <i className='fas fa-times'></i>
            <span>Close</span>
          </button>
        </div>

        {/* Top Floating Feedback Toast */}
        {toast && (
          <div className='article-reader-toast'>
            <i className='fas fa-info-circle'></i>
            <span>{toast}</span>
          </div>
        )}

        {/* Header Visual Banner */}
        <div className='article-hero-banner'>
          <img
            src={post.cover || "./images/blog/b1.webp"}
            alt={post.title}
            onError={(e) => {
              e.target.onerror = null
              e.target.src = "./images/blog/b1.webp"
            }}
          />
          <div className='article-hero-gradient'></div>
          <span className='article-type-pill'>{post.type || "School News"}</span>
        </div>

        {/* Story Content Area */}
        <div className='article-body-wrapper'>
          {/* Metadata Row */}
          <div className='article-meta-row'>
            <span>
              <i className='fa fa-calendar-alt' style={{ color: '#00a884' }}></i>
              {post.date || "Recent Announcement"}
            </span>
            <span>
              <i className='fa fa-user-shield' style={{ color: '#0284c7' }}></i>
              BLIS Secretariat
            </span>
            <span>
              <i className='fa fa-comments' style={{ color: '#f59e0b' }}></i>
              {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
            </span>
          </div>

          {/* Article Title */}
          <h1 className='article-headline'>{post.title}</h1>

          {/* Main Story Text */}
          <div className='article-story-content'>
            {post.desc &&
              post.desc.split("\n\n").map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
          </div>

          {/* ============================================================ */}
          {/* VIRAL SOCIAL SHARING BAR (Boosts website visits & inquiries) */}
          {/* ============================================================ */}
          <div className='article-share-section'>
            <div className='share-header-text'>
              <h4>
                <i className='fas fa-bullhorn' style={{ color: '#00a884', marginRight: '6px' }}></i>
                Share this News & Spread the Word
              </h4>
              <p>Directly share this post with parents, family, and class groups to drive visitors to our official website.</p>
            </div>

            <div className='share-action-buttons'>
              {/* WhatsApp Share Button */}
              <a
                href={shareData.whatsappUrl}
                target='_blank'
                rel='noreferrer'
                className='share-btn whatsapp'
                title='Share to WhatsApp group or status'
              >
                <i className='fab fa-whatsapp'></i>
                <span>WhatsApp</span>
              </a>

              {/* Facebook Share Button */}
              <a
                href={shareData.facebookUrl}
                target='_blank'
                rel='noreferrer'
                className='share-btn facebook'
                title='Share to Facebook'
              >
                <i className='fab fa-facebook-f'></i>
                <span>Facebook</span>
              </a>

              {/* Twitter / X Share Button */}
              <a
                href={shareData.twitterUrl}
                target='_blank'
                rel='noreferrer'
                className='share-btn twitter'
                title='Share on X / Twitter'
              >
                <i className='fab fa-twitter'></i>
                <span>Twitter / X</span>
              </a>

              {/* LinkedIn Share */}
              <a
                href={shareData.linkedinUrl}
                target='_blank'
                rel='noreferrer'
                className='share-btn linkedin'
                title='Share on LinkedIn'
              >
                <i className='fab fa-linkedin-in'></i>
                <span>LinkedIn</span>
              </a>

              {/* Native Mobile Share */}
              {typeof navigator !== "undefined" && navigator.share && (
                <button
                  type='button'
                  onClick={handleNativeShare}
                  className='share-btn native'
                  title='Share via device'
                >
                  <i className='fas fa-share-alt'></i>
                  <span>Share</span>
                </button>
              )}

              {/* Copy Link Button */}
              <button
                type='button'
                onClick={handleCopyLink}
                className={`share-btn copy-link ${copied ? "copied" : ""}`}
                title='Copy direct link'
              >
                <i className={copied ? "fas fa-check" : "fas fa-link"}></i>
                <span>{copied ? "Link Copied!" : "Copy Link"}</span>
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* VISITOR COMMENTS & COMMUNITY FEEDBACK SECTION */}
          {/* ============================================================ */}
          <div className='article-comments-section'>
            <div className='comments-header flexSB'>
              <h3>
                <i className='fas fa-comments' style={{ color: '#00a884', marginRight: '8px' }}></i>
                Visitor & Parent Comments ({comments.length})
              </h3>
              <span className='comment-pill'>Community Discussion</span>
            </div>

            {/* Existing Comments List */}
            <div className='comments-list'>
              {comments.length > 0 ? (
                comments.map((comm) => {
                  const badgeStyle = getRoleBadgeColor(comm.role)
                  return (
                    <div className='single-comment-card' key={comm.id}>
                      <div className='comment-avatar-bubble'>
                        <i className='fas fa-user'></i>
                      </div>
                      <div className='comment-body'>
                        <div className='comment-meta-bar flexSB'>
                          <div className='flex' style={{ gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <strong className='comment-author-name'>{comm.name}</strong>
                            <span
                              className='comment-role-tag'
                              style={{
                                background: badgeStyle.bg,
                                color: badgeStyle.color,
                                border: `1px solid ${badgeStyle.border}`,
                              }}
                            >
                              {comm.role || "Parent / Guardian"}
                            </span>
                          </div>
                          <small className='comment-time-text'>{comm.date}</small>
                        </div>
                        <p className='comment-text-msg'>{comm.message}</p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className='no-comments-box'>
                  <i className='fas fa-comment-dots'></i>
                  <h4>No comments on this story yet</h4>
                  <p>Be the first to share your thoughts, congratulations, or questions with the school community below.</p>
                </div>
              )}
            </div>

            {/* Leave a Comment Form */}
            <div className='leave-comment-box'>
              <h4>
                <i className='fas fa-pen-nib' style={{ color: '#00a884', marginRight: '6px' }}></i>
                Leave a Comment or Inquiry
              </h4>
              <p>Your feedback is visible to our school administration and fellow visitors.</p>

              <form onSubmit={handleSubmitComment} className='comment-form'>
                <div className='form-row'>
                  <div className='form-group'>
                    <label>Your Full Name *</label>
                    <input
                      type='text'
                      required
                      placeholder='e.g. Dr. Ngozi Okafor'
                      value={commentForm.name}
                      onChange={(e) => setCommentForm({ ...commentForm, name: e.target.value })}
                    />
                  </div>
                  <div className='form-group'>
                    <label>Relationship with BLIS</label>
                    <select
                      value={commentForm.role}
                      onChange={(e) => setCommentForm({ ...commentForm, role: e.target.value })}
                    >
                      <option value='Parent / Guardian'>Parent / Guardian</option>
                      <option value='Prospective Parent'>Prospective Parent</option>
                      <option value='Student / Scholar'>Student / Scholar</option>
                      <option value='Alumni / Old Student'>Alumni / Old Student</option>
                      <option value='Community Member / Well-wisher'>Community Member / Well-wisher</option>
                    </select>
                  </div>
                </div>

                <div className='form-group'>
                  <label>Your Comment / Message *</label>
                  <textarea
                    rows='3'
                    required
                    placeholder='Type your thoughts, commendations, or inquiries here...'
                    value={commentForm.message}
                    onChange={(e) => setCommentForm({ ...commentForm, message: e.target.value })}
                  ></textarea>
                </div>

                <button
                  type='submit'
                  className='submit-comment-btn'
                  disabled={submitting}
                >
                  <i className={submitting ? "fas fa-spinner fa-spin" : "fas fa-paper-plane"}></i>
                  <span>{submitting ? "Posting Comment..." : "Post Comment"}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Bottom Dismiss / Continue Bar */}
          <div className='article-footer-dismiss-bar'>
            <button
              type='button'
              className='dismiss-modal-btn'
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (typeof onClose === "function") onClose()
              }}
            >
              <i className='fas fa-arrow-left'></i> Close & Explore More on Website
            </button>
            <button
              type='button'
              className='share-modal-btn'
              onClick={handleCopyLink}
            >
              <i className={copied ? "fas fa-check" : "fas fa-share-alt"}></i>
              <span>{copied ? "Link Copied!" : "Share this Story"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ArticleReaderModal
