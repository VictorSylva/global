import React, { useState } from "react"
import "./AcademicsEnvironment.css"
import LightboxModal from "../gallery/LightboxModal"

const academicHighlights = [
  {
    id: "acad-1",
    image: "/images/more/students learning.jpeg",
    title: "Attentive Classroom Learning & Inquiry",
    category: "academics",
    badge: "CLASSROOM FOCUS",
    desc: "Scholars engaged in structured classroom lessons, fostering deep literacy, mathematical reasoning, and critical thinking.",
  },
  {
    id: "acad-2",
    image: "/images/more/condusive learning environment.jpeg",
    title: "Bright & Conducive Learning Environment",
    category: "academics",
    badge: "CONDUCIVE SPACES",
    desc: "Well-ventilated, secure, and fully equipped classrooms engineered to maximize concentration and academic success.",
  },
  {
    id: "acad-3",
    image: "/images/more/condusive learning environment2.jpeg",
    title: "Interactive Teacher-Student Instruction",
    category: "academics",
    badge: "INDIVIDUAL ATTENTION",
    desc: "Low student-to-teacher ratio ensuring personalized academic mentorship and character development for every child.",
  },
  {
    id: "acad-4",
    image: "/images/more/Rev Dr Jea Chan Lee and the students in class.jpeg",
    title: "International Standard Pedagogy",
    category: "academics",
    badge: "GLOBAL STANDARDS",
    desc: "Integrating international educational best practices with the approved Nigerian NERDC curriculum.",
  },
]

const sportsHighlights = [
  {
    id: "sport-1",
    image: "/images/more/trophy winners in sport activity.jpeg",
    title: "Inter-House Sports Champions Celebrating Victory",
    category: "sports",
    badge: "CHAMPIONS",
    desc: "Proud scholars hoisting trophies after displaying exceptional teamwork, speed, and sportsmanship during inter-house athletics.",
  },
  {
    id: "sport-2",
    image: "/images/more/trophy winner insports activity.jpeg",
    title: "Trophy Presentation to Best Athlete",
    category: "sports",
    badge: "ATHLETIC HONORS",
    desc: "Recognizing outstanding individual track and field performances with commemorative cups and awards.",
  },
  {
    id: "sport-3",
    image: "/images/more/trophy winner in sport activity.jpeg",
    title: "Junior Division Sports Distinction",
    category: "sports",
    badge: "SPORTS EXCELLENCE",
    desc: "Encouraging sportsmanship, physical resilience, and healthy competitive spirit from the early years.",
  },
  {
    id: "sport-4",
    image: "/images/more/sports activity.jpeg",
    title: "Track, Field & Outdoor Athletic Drills",
    category: "sports",
    badge: "PHYSICAL FITNESS",
    desc: "Weekly physical education, aerobics, sprint drills, and team games building stamina and mental sharpness.",
  },
  {
    id: "sport-5",
    image: "/images/more/games.jpeg",
    title: "Recreational Games & Scholar Bonding",
    category: "sports",
    badge: "STUDENT LIFE",
    desc: "Wholesome outdoor games and camaraderie nurturing lifelong friendships and leadership skills.",
  },
]

const AcademicsEnvironment = () => {
  const [activeTab, setActiveTab] = useState("all")
  const [lightboxIndex, setLightboxIndex] = useState(null)

  const combinedItems = React.useMemo(() => {
    if (activeTab === "academics") return academicHighlights
    if (activeTab === "sports") return sportsHighlights
    return [...academicHighlights, ...sportsHighlights]
  }, [activeTab])

  const activeItem =
    lightboxIndex !== null && combinedItems[lightboxIndex]
      ? {
          image: combinedItems[lightboxIndex].image,
          title: combinedItems[lightboxIndex].title,
          categoryLabel: combinedItems[lightboxIndex].badge,
          location: "BLIS Campus & Sports Grounds, Jos",
          date: "Academic & Athletic Program",
          description: combinedItems[lightboxIndex].desc,
        }
      : null

  return (
    <section className='academics-env-section' id='learning-and-sports'>
      <div className='container'>
        <div className='ae-header'>
          <div className='ae-badge'>
            <i className='fas fa-medal'></i>
            <span>EXCELLENCE IN MIND, SPIRIT & BODY</span>
          </div>
          <h2 className='ae-title'>
            Conducive Classrooms & <span>Championship Sports</span>
          </h2>
          <p className='ae-desc'>
            At Brighter Land International School, balanced education goes beyond textbooks. We pair disciplined, 
            attentive classroom learning with vibrant sports, games, and character-building athletics.
          </p>
        </div>

        {/* Tab Filters */}
        <div className='ae-tabs'>
          <button
            type='button'
            className={`ae-tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("all")
              setLightboxIndex(null)
            }}
          >
            <i className='fas fa-th'></i> All School Life
          </button>
          <button
            type='button'
            className={`ae-tab-btn ${activeTab === "academics" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("academics")
              setLightboxIndex(null)
            }}
          >
            <i className='fas fa-chalkboard-teacher'></i> Conducive Classrooms ({academicHighlights.length})
          </button>
          <button
            type='button'
            className={`ae-tab-btn ${activeTab === "sports" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("sports")
              setLightboxIndex(null)
            }}
          >
            <i className='fas fa-trophy'></i> Sports & Trophy Winners ({sportsHighlights.length})
          </button>
        </div>

        {/* Dynamic Cards Grid */}
        <div className='ae-grid'>
          {combinedItems.map((item, index) => (
            <div
              className='ae-card'
              key={item.id}
              onClick={() => setLightboxIndex(index)}
              title='Click to enlarge'
            >
              <div className='ae-img-wrap'>
                <img src={item.image} alt={item.title} loading='lazy' />
                <div className='ae-overlay'>
                  <i className='fas fa-search-plus'></i>
                  <span>View Details</span>
                </div>
                <span className={`ae-tag ${item.category === "sports" ? "sports-tag" : "acad-tag"}`}>
                  <i className={item.category === "sports" ? "fas fa-trophy" : "fas fa-book-open"}></i> {item.badge}
                </span>
              </div>
              <div className='ae-details'>
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <LightboxModal
          item={activeItem}
          onClose={() => setLightboxIndex(null)}
          onNext={() => {
            if (lightboxIndex < combinedItems.length - 1) {
              setLightboxIndex(lightboxIndex + 1)
            }
          }}
          onPrev={() => {
            if (lightboxIndex > 0) {
              setLightboxIndex(lightboxIndex - 1)
            }
          }}
          hasNext={lightboxIndex < combinedItems.length - 1}
          hasPrev={lightboxIndex > 0}
        />
      )}
    </section>
  )
}

export default AcademicsEnvironment
