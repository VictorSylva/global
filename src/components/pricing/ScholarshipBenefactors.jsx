import React, { useState } from "react"
import "./ScholarshipBenefactors.css"
import LightboxModal from "../gallery/LightboxModal"

const partnerRecords = [
  {
    id: "partner-1",
    image: "/images/more/sponsor Rev Dr Jea Chan Lee & Sun Ann.jpeg",
    title: "International Sponsoring Partners & Benefactors",
    subtitle: "Rev. Dr. Jea Chan Lee & Sun Ann",
    badge: "GLOBAL MISSION PARTNERS",
    desc: "Rev. Dr. Jea Chan Lee and Sun Ann, international supporters and mission partners, visiting Brighter Land International School to provide scholarships and educational support.",
  },
  {
    id: "partner-2",
    image: "/images/more/proprietor with Rev Dr Jea Chan Lee & Sun Ann.jpeg",
    title: "Strategic Educational Partnership",
    subtitle: "Proprietor & Founder with Rev. Dr. Jea Chan Lee",
    badge: "FOUNDER & SPONSORS",
    desc: "Rev. Fidelis Gambo in strategic fellowship and planning with Rev. Dr. Jea Chan Lee & Sun Ann for expanding scholarship programs for orphans and missionary children.",
  },
  {
    id: "partner-3",
    image: "/images/more/scholarship by Rev Dr Jea Chan Lee & Sun Ann.jpeg",
    title: "Official Scholarship Award Presentation",
    subtitle: "Annual Academic Sponsorship Grants",
    badge: "SCHOLARSHIP CEREMONY",
    desc: "Presentation of educational scholarship grants directly to beneficiary scholars, covering tuition, books, and essential school requirements.",
  },
  {
    id: "partner-4",
    image: "/images/more/scholarship by Rev Dr Jea Chan Lee & Sun Ann2.jpeg",
    title: "Empowering Underprivileged Scholars",
    subtitle: "Direct Student Impact",
    badge: "SCHOLARSHIP IMPACT",
    desc: "Beneficiary students receiving official scholarship packages, unlocking access to quality Christian and international standard education.",
  },
  {
    id: "partner-5",
    image: "/images/more/Rev Dr Jea Chan Lee & Sun Ann in class with students.jpeg",
    title: "Classroom Interaction with Scholars",
    subtitle: "Encouraging Academic Excellence",
    badge: "CLASSROOM VISIT",
    desc: "Rev. Dr. Jea Chan Lee and Sun Ann interacting closely with pupils in the classroom, sharing words of wisdom and divine purpose.",
  },
  {
    id: "partner-6",
    image: "/images/more/Rev Dr Jea Chan Lee with students.jpeg",
    title: "Scholars Fellowship with International Sponsor",
    subtitle: "Inspiring Future Global Leaders",
    badge: "SCHOLAR FELLOWSHIP",
    desc: "Pupils joyfully gathering around Rev. Dr. Jea Chan Lee, demonstrating the warm international relationship between BLIS and global benefactors.",
  },
  {
    id: "partner-7",
    image: "/images/more/sponsors and school management2.jpeg",
    title: "School Management & Sponsoring Delegation",
    subtitle: "Governance & Accountability",
    badge: "MANAGEMENT FELLOWSHIP",
    desc: "School directors, teachers, and management team meeting with the sponsoring delegation to review academic milestones and scholarship outcomes.",
  },
  {
    id: "partner-8",
    image: "/images/more/sponsors in class with students.jpeg",
    title: "Hands-on Classroom Mentorship",
    subtitle: "Inspiring Every Child",
    badge: "MENTORSHIP",
    desc: "Witnessing first-hand the daily academic diligence, moral discipline, and intellectual transformation of students at BLIS.",
  },
  {
    id: "partner-9",
    image: "/images/more/sponsorship givers and the school management.jpeg",
    title: "Partnership Thanksgiving & Dedication",
    subtitle: "Joint Dedication to God's Work",
    badge: "THANKSGIVING",
    desc: "Management and international benefactors uniting in prayer and thanksgiving for the continued growth of Brighter Land International School.",
  },
]

const ScholarshipBenefactors = () => {
  const [lightboxIndex, setLightboxIndex] = useState(null)

  const activeItem =
    lightboxIndex !== null
      ? {
          image: partnerRecords[lightboxIndex].image,
          title: partnerRecords[lightboxIndex].title,
          categoryLabel: partnerRecords[lightboxIndex].badge,
          location: "BLIS Smart Campus, Jos, Nigeria",
          date: "International Scholarship Partnership",
          description: partnerRecords[lightboxIndex].desc,
        }
      : null

  return (
    <section className='scholarship-benefactors-section' id='scholarship-partners'>
      <div className='container'>
        {/* Header */}
        <div className='sb-header'>
          <div className='sb-badge'>
            <i className='fas fa-globe-americas'></i>
            <span>INTERNATIONAL SPONSORSHIP & PARTNERSHIP</span>
          </div>
          <h2 className='sb-title'>
            Global Benefactors: <span>Rev. Dr. Jea Chan Lee & Sun Ann</span>
          </h2>
          <p className='sb-desc'>
            Through the divine connection with international partners including <strong>Rev. Dr. Jea Chan Lee & Sun Ann</strong>, 
            Brighter Land International School is able to provide vital educational scholarships to orphans, children of missionaries, 
            and learners from conflict-affected communities across Plateau State.
          </p>
        </div>

        {/* Highlight Feature Card */}
        <div className='sb-feature-card'>
          <div className='sb-feature-grid'>
            <div className='sb-feature-img-col'>
              <img
                src='/images/more/sponsor Rev Dr Jea Chan Lee & Sun Ann.jpeg'
                alt='Rev Dr Jea Chan Lee & Sun Ann'
                className='sb-main-sponsor-img'
              />
              <div className='sb-sponsor-caption'>
                <h4>Rev. Dr. Jea Chan Lee & Sun Ann</h4>
                <span>International Benefactors & Mission Supporters</span>
              </div>
            </div>

            <div className='sb-feature-info-col'>
              <div className='sb-info-pill'>
                <i className='fas fa-hands-helping'></i> TRANSFORMING LIVES THROUGH SCHOLARSHIPS
              </div>
              <h3>Empowering Children Who Need It Most</h3>
              <p>
                Education is the greatest equalizer and catalyst for kingdom advancement. 
                Our international partners believe that no bright child should be denied access to quality Christian 
                education due to financial hardship.
              </p>
              
              <div className='sb-benefits-list'>
                <div className='sb-b-item'>
                  <i className='fas fa-check-circle'></i>
                  <div>
                    <strong>Full & Partial Tuition Grants</strong>
                    <span>Covering termly fees for verified orphans and indigent pupils.</span>
                  </div>
                </div>
                <div className='sb-b-item'>
                  <i className='fas fa-check-circle'></i>
                  <div>
                    <strong>Learning Materials & Textbooks</strong>
                    <span>Providing complete book bundles, school bags, and stationery packages.</span>
                  </div>
                </div>
                <div className='sb-b-item'>
                  <i className='fas fa-check-circle'></i>
                  <div>
                    <strong>Pastoral & Spiritual Mentorship</strong>
                    <span>Personal visits, direct classroom encouragement, and prayer fellowship.</span>
                  </div>
                </div>
              </div>

              <div className='sb-apply-hint'>
                <i className='fas fa-info-circle'></i>
                <span>
                  Interested in applying for or contributing to the BLIS Compassionate Scholarship Scheme?
                  Contact our administration office or submit an intake application below.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Photo Gallery Grid */}
        <div className='sb-gallery-heading'>
          <h3>Partnership In Action: Visits, Awards & Fellowship</h3>
          <p>Click on any photograph to view the full impact moment.</p>
        </div>

        <div className='sb-photos-grid'>
          {partnerRecords.map((record, index) => (
            <div
              className='sb-photo-card'
              key={record.id}
              onClick={() => setLightboxIndex(index)}
              title='Click to view full photo'
            >
              <div className='sb-card-img-wrap'>
                <img src={record.image} alt={record.title} loading='lazy' />
                <div className='sb-card-overlay'>
                  <i className='fas fa-search-plus'></i>
                  <span>View Record</span>
                </div>
              </div>
              <div className='sb-card-details'>
                <h4>{record.title}</h4>
                <span className='sb-card-sub'>{record.subtitle}</span>
                <p>{record.desc}</p>
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
            if (lightboxIndex < partnerRecords.length - 1) {
              setLightboxIndex(lightboxIndex + 1)
            }
          }}
          onPrev={() => {
            if (lightboxIndex > 0) {
              setLightboxIndex(lightboxIndex - 1)
            }
          }}
          hasNext={lightboxIndex < partnerRecords.length - 1}
          hasPrev={lightboxIndex > 0}
        />
      )}
    </section>
  )
}

export default ScholarshipBenefactors
