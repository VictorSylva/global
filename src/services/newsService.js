import { blog as defaultBlog } from "../dummydata"
import { saveToCloud, subscribeToCloudDoc } from "../firebase"

export const NEWS_STORAGE_KEY = "blis_public_news"
export const NEWS_EVENT_KEY = "blis_public_news_updated"

/**
 * Default preset cover images available for news articles
 */
export const DEFAULT_NEWS_COVERS = [
  { id: "b1", label: "Academic / Classroom", path: "./images/blog/b1.webp" },
  { id: "b2", label: "Campus Life / Library", path: "./images/blog/b2.webp" },
  { id: "b3", label: "Sports & Athletics", path: "./images/blog/b3.webp" },
  { id: "b4", label: "Faculty & Assembly", path: "./images/blog/b4.webp" },
  { id: "b5", label: "Laboratories & STEM", path: "./images/blog/b5.webp" },
  { id: "b6", label: "Arts & Culture", path: "./images/blog/b6.webp" },
  { id: "blis1", label: "School Campus Front", path: "./images/blis1.jpeg" },
  { id: "blis2", label: "Assembly Ground", path: "./images/blis2.jpeg" },
  { id: "blis3", label: "Computer / Tech Hub", path: "./images/blis3.jpeg" },
]

/**
 * Get stored public news from localStorage or fallback to default dataset
 */
export const getStoredPublicNews = () => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const saved = localStorage.getItem(NEWS_STORAGE_KEY)
      if (saved !== null) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed
        }
      }
    } catch (e) {
      console.error("Error reading public news from localStorage:", e)
    }
  }
  return Array.isArray(defaultBlog) ? defaultBlog : []
}

/**
 * Persist public news both locally and in Firebase Firestore
 */
export const savePublicNews = (newsList) => {
  const safeList = Array.isArray(newsList) ? newsList : []
  
  // 1. Save to localStorage
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(safeList))
      window.dispatchEvent(new CustomEvent(NEWS_EVENT_KEY, { detail: safeList }))
    } catch (e) {
      console.error("Error saving public news locally:", e)
    }
  }

  // 2. Sync to Firebase Cloud Firestore for multi-device live persistence
  saveToCloud("public_news", safeList)
}

/**
 * Real-time listener for public news changes across tabs, devices, and cloud
 */
export const subscribeToPublicNews = (onUpdate) => {
  if (typeof onUpdate !== "function") return () => {}

  // 1. Listen to Firestore cloud snapshot
  const unsubCloud = subscribeToCloudDoc("public_news", (cloudNews) => {
    if (Array.isArray(cloudNews)) {
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(cloudNews))
        } catch (e) {}
      }
      onUpdate(cloudNews)
    }
  })

  // 2. Listen to custom in-app dispatch
  const handleCustomEvent = (e) => {
    if (e.detail && Array.isArray(e.detail)) {
      onUpdate(e.detail)
    }
  }

  // 3. Listen to cross-tab storage changes
  const handleStorageEvent = (e) => {
    if (e.key === NEWS_STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue)
        if (Array.isArray(parsed)) {
          onUpdate(parsed)
        }
      } catch (err) {}
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener(NEWS_EVENT_KEY, handleCustomEvent)
    window.addEventListener("storage", handleStorageEvent)
  }

  return () => {
    if (typeof unsubCloud === "function") unsubCloud()
    if (typeof window !== "undefined") {
      window.removeEventListener(NEWS_EVENT_KEY, handleCustomEvent)
      window.removeEventListener("storage", handleStorageEvent)
    }
  }
}

/**
 * Add a visitor comment to an article and sync to localStorage + Firestore
 */
export const addCommentToPost = (postId, { name, role, message }) => {
  const currentList = getStoredPublicNews()
  let updatedPost = null

  const updatedList = currentList.map((post) => {
    if (String(post.id) === String(postId)) {
      const existingComments = Array.isArray(post.comments) ? post.comments : []
      const newComment = {
        id: "c-" + Date.now(),
        name: (name || "Website Visitor").trim(),
        role: (role || "Parent / Guardian").trim(),
        date: new Date().toLocaleDateString("en-NG", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        message: (message || "").trim(),
      }

      const updatedComments = [newComment, ...existingComments]
      const count = updatedComments.length

      updatedPost = {
        ...post,
        comments: updatedComments,
        com: `${count} ${count === 1 ? "COMMENT" : "COMMENTS"}`,
      }
      return updatedPost
    }
    return post
  })

  if (updatedPost) {
    savePublicNews(updatedList)
    return { success: true, post: updatedPost }
  }

  return { success: false, error: "Post not found" }
}

/**
 * Generate share metadata & URL for viral traffic generation
 */
export const getArticleShareData = (post) => {
  if (!post) return { url: "", text: "", title: "" }

  const baseUrl = typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : "https://blis-jos.web.app"

  // Deep-link directly to this exact article on the public journal page
  const shareUrl = `${baseUrl}/journal?post=${post.id}`
  const title = post.title || "Latest School News"
  const summary = post.desc ? (post.desc.length > 120 ? `${post.desc.slice(0, 117)}...` : post.desc) : ""
  const shareText = `📰 *${title}*\n${summary}\n\nRead the full article on Brighter Land International School's official portal:\n${shareUrl}`

  return {
    url: shareUrl,
    title,
    summary,
    text: shareText,
    whatsappUrl: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,
    facebookUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    twitterUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`📰 ${title}`)}&url=${encodeURIComponent(shareUrl)}&hashtags=BrighterLandSchool,BLIS,JosEducation`,
    linkedinUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    telegramUrl: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`📰 ${title}`)}`,
  }
}
