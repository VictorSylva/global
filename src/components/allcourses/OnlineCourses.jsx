import React, { useState, useRef, useEffect } from "react"
import "./courses.css"
import { online } from "../../dummydata"
import Heading from "../common/heading/Heading"

const OnlineCourses = () => {
  const [filter, setFilter] = useState("all")
  const sliderRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  const categories = [
    { id: "all", label: "All Disciplines" },
    { id: "junior", label: "Junior Secondary (JSS 1–3)" },
    { id: "senior-science", label: "Senior Secondary — Science" },
    { id: "senior-social", label: "Senior Secondary — Social Science" },
    { id: "primary", label: "Primary Classes (Basic 1–5)" },
    { id: "nursery", label: "Nursery Classes (Early Years)" },
  ]

  const filteredCourses = online.filter((val) => {
    if (filter === "all") return true
    if (filter === "junior") return val.category === "junior"
    if (filter === "senior-science") return val.category === "senior-science" || val.category === "senior-core"
    if (filter === "senior-social") return val.category === "senior-social" || val.category === "senior-core"
    if (filter === "primary") return val.category === "primary"
    if (filter === "nursery") return val.category === "nursery"
    return true
  })

  const updateScrollState = () => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current
      setCanScrollLeft(scrollLeft > 10)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
      const approxCardWidth = 320
      const idx = Math.round(scrollLeft / approxCardWidth)
      setCurrentIndex(Math.min(Math.max(0, idx), filteredCourses.length - 1))
    }
  }

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.scrollTo({ left: 0, behavior: "smooth" })
    }
    setCurrentIndex(0)
    setCanScrollLeft(false)
    setCanScrollRight(filteredCourses.length > 3)
  }, [filter, filteredCourses.length])

  const slideLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -320 * 2, behavior: "smooth" })
    }
  }

  const slideRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 320 * 2, behavior: "smooth" })
    }
  }

  const getSectionSummary = () => {
    switch (filter) {
      case "junior":
        return {
          title: "Junior Secondary School (JSS 1 – 3 Curriculum)",
          desc: "Approved NERDC pre-vocational and foundational curriculum preparing learners for the Basic Education Certificate Examination (BECE). Scholars develop critical thinking, scientific reasoning, computational literacy, and entrepreneurial consciousness.",
        }
      case "senior-science":
        return {
          title: "Senior Secondary — Science Department (SS 1 – 2)",
          desc: "Rigorous science track combining General Core disciplines with foundational Biology, Chemistry, Physics, Agriculture, and Geography. Focused on STEM excellence, analytical inquiry, and top honors in WAEC, NECO, and JAMB UTME.",
        }
      case "senior-social":
        return {
          title: "Senior Secondary — Social Science & Commercial Department (SS 1 – 2)",
          desc: "Specialized pathway combining General Core requirements with Government, Economics, CRS, Literature, Accounting, Commerce, and Geography. Prepares students for distinction in Law, Finance, Administration, and Social Sciences.",
        }
      case "primary":
        return {
          title: "Primary School Classes (Basic 1 – 5 New Curriculum)",
          desc: "Revised NERDC Basic Education curriculum fostering deep literacy, numeracy, creative expression, citizenship, digital literacy, and practical living skills.",
        }
      case "nursery":
        return {
          title: "Nursery School Classes (Early Years New Curriculum)",
          desc: "Early Years Foundation Stage focused on phonics, counting, basic discovery, social etiquette, creative arts, and sensory-motor development in a nurturing environment.",
        }
      default:
        return {
          title: "Complete Brighter Land Academic Curriculum",
          desc: "Explore our government-approved NERDC curriculum structured to provide solid foundational mastery, critical thinking, practical vocational skills, and board examination distinction across all learning stages—from Early Years through Senior Secondary.",
        }
    }
  }

  const summary = getSectionSummary()

  return (
    <>
      <section className='online'>
        <div className='container'>
          <Heading
            subtitle='APPROVED NERDC CURRICULUM'
            title='Comprehensive Academic Curriculum & Departments'
          />
          <p className='online-curriculum-desc'>{summary.desc}</p>

          <div className='curriculum-filter-tabs flex'>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type='button'
                className={`curriculum-tab-btn ${filter === cat.id ? "active" : ""}`}
                onClick={() => setFilter(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className='curriculum-active-banner'>
            <div className='active-banner-info'>
              <h3>{summary.title}</h3>
              <span className='curriculum-count-badge'>
                Showing {filteredCourses.length} approved subjects
              </span>
            </div>

            <div className='curriculum-slider-controls'>
              <button
                type='button'
                className={`curriculum-arrow-btn prev ${!canScrollLeft ? "disabled" : ""}`}
                onClick={slideLeft}
                aria-label='Previous Subjects'
                title='Slide Previous'
              >
                <i className='fas fa-chevron-left'></i>
              </button>
              <button
                type='button'
                className={`curriculum-arrow-btn next ${!canScrollRight ? "disabled" : ""}`}
                onClick={slideRight}
                aria-label='Next Subjects'
                title='Slide Next'
              >
                <i className='fas fa-chevron-right'></i>
              </button>
            </div>
          </div>

          {/* HORIZONTAL SUBJECT SLIDER */}
          <div className='curriculum-slider-wrapper'>
            <button
              type='button'
              className={`curriculum-floating-arrow left ${!canScrollLeft ? "disabled" : ""}`}
              onClick={slideLeft}
              aria-label='Scroll Left'
              title='Slide Left'
            >
              <i className='fas fa-chevron-left'></i>
            </button>

            <div
              className='curriculum-slider-track'
              ref={sliderRef}
              onScroll={updateScrollState}
            >
              {filteredCourses.map((val, index) => (
                <div className='curriculum-slide-card' key={index}>
                  <div className='img'>
                    <img src={val.cover} alt={val.courseName} />
                    <img src={val.hoverCover} alt={val.courseName} className='show' />
                  </div>
                  <div className='course-category-tag'>
                    {val.category === "senior-core" ? "General Core" : val.course}
                  </div>
                  <h1>{val.courseName}</h1>
                  <p className='subject-desc'>{val.desc}</p>
                  <div className='curriculum-badge-row'>
                    <span className='curriculum-pill'>
                      <i className='fa fa-check-circle'></i> NERDC Standard
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type='button'
              className={`curriculum-floating-arrow right ${!canScrollRight ? "disabled" : ""}`}
              onClick={slideRight}
              aria-label='Scroll Right'
              title='Slide Right'
            >
              <i className='fas fa-chevron-right'></i>
            </button>
          </div>

          <div className='curriculum-slider-footer flexSB'>
            <div className='curriculum-slider-hint'>
              <i className='fas fa-arrows-alt-h'></i>
              <span>Use arrows or swipe left/right to browse all {filteredCourses.length} approved subjects</span>
            </div>
            <div className='curriculum-counter-pill'>
              <span>Subject <strong>{currentIndex + 1}</strong> of <strong>{filteredCourses.length}</strong></span>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default OnlineCourses
