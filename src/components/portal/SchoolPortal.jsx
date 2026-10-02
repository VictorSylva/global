import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import {
  schoolAccountDetails,
  prospectusData,
  initialStudents,
  initialGradebook,
  initialInvoices,
  admissionsPipeline,
  schoolTimetable,
  generateDefaultTimetable,
  announcements,
  busFleet,
  initialPortalUsers,
  institutionalDepartments,
  availableSchoolClasses,
  getSubjectsForClass,
} from "../../dummydata"
import "./portal.css"
import { saveToCloud, subscribeToCloudDoc } from "../../firebase"

export const getDefaultDepartmentForRole = (role) => {
  switch (role) {
    case "proprietor": return "Executive Boardroom & Governance"
    case "admin": return "School Administration & Central Registry"
    case "teacher": return "Secondary School Faculty (JSS & SSS)"
    case "bursary": return "Bursary & Accounts Directorate"
    case "staff": return "Campus Logistics, Transport & Facilities"
    case "parent": return "Parent-Teacher Association (PTA)"
    case "student": return "Academic Scholar Registry"
    default: return "School Administration & Central Registry"
  }
}

export const getDefaultPrivilegesForRole = (role) => {
  switch (role) {
    case "proprietor": return "Executive Board Telemetry & Governance"
    case "admin": return "Full Administrative Control"
    case "teacher": return "Tutor Access (Assigned Classes only)"
    case "bursary": return "Bursary Command (Fee Invoicing & Payment Verification)"
    case "staff": return "Staff Operations (Bus Fleet, Attendance Verification)"
    case "parent": return "Parent Access (Ward Academic Progress & Invoices)"
    case "student": return "Student Access (Grades, Timetable & House Records)"
    default: return "Standard Access"
  }
}

// Clean schema initialization: Preserves all user registrations while ensuring Master Admin & Proprietor exist
const sanitizeLegacyStorage = () => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const currentRaw = localStorage.getItem("blis_portal_users")
      let currentUsers = []
      if (currentRaw) {
        try {
          const parsed = JSON.parse(currentRaw)
          if (Array.isArray(parsed)) currentUsers = parsed
        } catch (e) {}
      }

      const mergedUsers = [...currentUsers]
      initialPortalUsers.forEach((defU) => {
        const exists = mergedUsers.some(
          (u) =>
            u.id === defU.id ||
            (u.email && defU.email && u.email.toLowerCase().trim() === defU.email.toLowerCase().trim()) ||
            (u.username && defU.username && u.username.toLowerCase().trim() === defU.username.toLowerCase().trim())
        )
        if (!exists) {
          mergedUsers.push(defU)
        }
      })
      localStorage.setItem("blis_portal_users", JSON.stringify(mergedUsers))
    } catch (e) {
      console.error("Storage initialization notice:", e)
    }
  }
}
sanitizeLegacyStorage()

const SchoolPortal = () => {
  // Helper to fetch clean, sanitized portal users from localStorage
  const getStoredPortalUsers = () => {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = localStorage.getItem("blis_portal_users")
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            const merged = [...parsed]
            initialPortalUsers.forEach((defU) => {
              const found = merged.find(
                (u) =>
                  u.id === defU.id ||
                  (u.email && defU.email && u.email.toLowerCase().trim() === defU.email.toLowerCase().trim()) ||
                  (u.username && defU.username && u.username.toLowerCase().trim() === defU.username.toLowerCase().trim())
              )
              if (!found) {
                merged.push(defU)
              }
            })
            return merged
          }
        } catch (e) {
          console.error("Error reading stored users:", e)
        }
      }
    }
    return initialPortalUsers
  }

  // Authentication & Session State (Persistent & Separated)
  const [portalUsers, setPortalUsers] = useState(getStoredPortalUsers)

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("blis_current_user")
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return null
  })

  const [loginIdentifier, setLoginIdentifier] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [createdAccountInfo, setCreatedAccountInfo] = useState(null)
  const [newStaffForm, setNewStaffForm] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    role: "teacher",
    department: "Secondary School Faculty (JSS & SSS)",
    assignedClasses: ["JSS 1"],
    headTeacherClass: "",
    assignedSubjects: "Mathematics",
    privileges: "Tutor Access (Assigned Classes only)",
  })

  // State management for all operations (Clean Initial State - Loaded from LocalStorage)
  const [activeTab, setActiveTab] = useState(() => {
    if (!currentUser) return "dashboard"
    if (currentUser.role === "proprietor") return "proprietor-overview"
    if (currentUser.role === "admin") return "dashboard"
    if (currentUser.role === "teacher") return "teacher-dashboard"
    if (currentUser.role === "bursary") return "bursary-command"
    if (currentUser.role === "parent") return "parent-dashboard"
    return "student-dashboard"
  })
  const activeRole = currentUser ? currentUser.role : null

  // Automatic Route Protection & Role Isolation Guard
  useEffect(() => {
    if (currentUser) {
      if (!isTabAllowedForRole(activeTab, currentUser.role)) {
        setActiveTab(getDefaultTabForRole(currentUser.role))
      }
    }
  }, [currentUser, activeTab])

  // Real-Time System Clock (ticks every 30 seconds for live period active/past status)
  const [liveClock, setLiveClock] = useState(() => new Date())
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setLiveClock(new Date())
    }, 30000)
    return () => clearInterval(clockTimer)
  }, [])

  // Teaching Lesson Attendance & Status Log (Teacher marked Taught vs Missed)
  const [taughtLessonLog, setTaughtLessonLog] = useState(() => {
    try {
      const saved = localStorage.getItem("blis_taught_lesson_log")
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return {}
  })

  // Class Head Teacher Terminal Collation & Principal Approval State
  const [terminalCollation, setTerminalCollation] = useState(() => {
    try {
      const saved = localStorage.getItem("blis_terminal_collation")
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return {}
  })

  // Gradebook Sub-view Mode (Subject CA Entry vs Form Master Collation Hub vs Principal Final Endorsement)
  const [gradebookViewMode, setGradebookViewMode] = useState("subject_entry")
  const [collationSelectedClass, setCollationSelectedClass] = useState("JSS 1")
  const [principalSelectedClass, setPrincipalSelectedClass] = useState("JSS 1")

  const [students, setStudents] = useState(() => {
    try {
      const saved = localStorage.getItem("blis_students")
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return initialStudents
  })

  const [gradebookData, setGradebookData] = useState(() => {
    try {
      const saved = localStorage.getItem("blis_gradebook_data")
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return initialGradebook
  })

  const [invoices, setInvoices] = useState(() => {
    try {
      const saved = localStorage.getItem("blis_invoices")
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return initialInvoices
  })

  const [applications, setApplications] = useState(() => {
    try {
      const saved = localStorage.getItem("blis_admissions")
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return admissionsPipeline
  })

  const [notices, setNotices] = useState(() => {
    try {
      const saved = localStorage.getItem("blis_announcements")
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return announcements || []
  })

  // Timetables and Lesson Schedule States
  const [timetables, setTimetables] = useState(() => {
    try {
      const saved = localStorage.getItem("blis_timetable_data")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
          return parsed
        }
      }
    } catch (e) {}
    return schoolTimetable
  })
  const [selectedTimetableClass, setSelectedTimetableClass] = useState("JSS 1")
  const [dashboardDay, setDashboardDay] = useState(() => {
    const dayIdx = new Date().getDay()
    const days = ["mon", "mon", "tue", "wed", "thu", "fri", "mon"]
    return days[dayIdx] || "mon"
  })
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [periodClassFilter, setPeriodClassFilter] = useState("all")
  const [periodLimit, setPeriodLimit] = useState(6)

  const getActiveTabTitle = (tab) => {
    switch (tab) {
      case "dashboard": return "Operations ERP (Admin)"
      case "proprietor-overview": return "Proprietor Executive View"
      case "teacher-dashboard": return "Teacher Instruction Hub"
      case "bursary-command": return "Bursary Command Center"
      case "parent-dashboard": return "Parent Ward Portal"
      case "student-dashboard": return "Student Scholar Portal"
      case "staff-management": return "Staff & Access Control"
      case "sis": return "Student Registry (SIS)"
      case "gradebook": return "Gradebook & Terminal Reports"
      case "attendance": return "Daily Homeroom Roll Call"
      case "finance": return "Tuition & Bursary Ledger"
      case "bus": return "School Bus Operations"
      case "notices": return "Official Circulars"
      case "timetable": return "Academic Timetables"
      case "settings": return "System Settings"
      default: return "Portal Dashboard"
    }
  }

  const getActiveTabIcon = (tab) => {
    switch (tab) {
      case "dashboard": return "fas fa-tachometer-alt"
      case "proprietor-overview": return "fas fa-crown"
      case "teacher-dashboard": return "fas fa-chalkboard-teacher"
      case "bursary-command": return "fas fa-file-invoice-dollar"
      case "parent-dashboard": return "fas fa-user-friends"
      case "parent-report": return "fas fa-award"
      case "parent-fees": return "fas fa-receipt"
      case "parent-attendance": return "fas fa-clipboard-check"
      case "student-dashboard": return "fas fa-user-graduate"
      case "student-grades": return "fas fa-chart-line"
      case "student-house": return "fas fa-shield-alt"
      case "staff-management": return "fas fa-users-cog"
      case "sis": return "fas fa-user-graduate"
      case "gradebook": return "fas fa-award"
      case "attendance": return "fas fa-clipboard-check"
      case "finance": return "fas fa-file-invoice-dollar"
      case "admissions": return "fas fa-user-plus"
      case "bus":
      case "transport": return "fas fa-bus"
      case "notices": return "fas fa-bullhorn"
      case "timetable": return "fas fa-calendar-alt"
      case "settings": return "fas fa-sliders-h"
      default: return "fas fa-th-large"
    }
  }

  // Role-Based Access Control (RBAC) Permissions Matrix
  const ROLE_PERMISSIONS = {
    admin: [
      "dashboard",
      "proprietor-overview",
      "teacher-dashboard",
      "bursary-command",
      "parent-dashboard",
      "student-dashboard",
      "staff-management",
      "sis",
      "gradebook",
      "attendance",
      "finance",
      "admissions",
      "timetable",
      "notices",
      "bus",
      "transport",
      "bursary-prospectus",
    ],
    proprietor: [
      "proprietor-overview",
      "dashboard",
      "teacher-dashboard",
      "bursary-command",
      "parent-dashboard",
      "student-dashboard",
      "staff-management",
      "sis",
      "gradebook",
      "attendance",
      "finance",
      "admissions",
      "timetable",
      "notices",
      "bus",
      "transport",
      "bursary-prospectus",
    ],
    teacher: [
      "teacher-dashboard",
      "attendance",
      "gradebook",
      "timetable",
      "notices",
    ],
    bursary: [
      "bursary-command",
      "finance",
      "bursary-prospectus",
      "notices",
    ],
    parent: [
      "parent-dashboard",
      "parent-report",
      "parent-fees",
      "parent-attendance",
      "timetable",
      "notices",
    ],
    student: [
      "student-dashboard",
      "student-grades",
      "timetable",
      "student-house",
      "notices",
    ],
    staff: [
      "bus",
      "transport",
      "attendance",
      "notices",
    ],
  }

  const getDefaultTabForRole = (role) => {
    switch (role) {
      case "proprietor": return "proprietor-overview"
      case "admin": return "dashboard"
      case "teacher": return "teacher-dashboard"
      case "bursary": return "bursary-command"
      case "parent": return "parent-dashboard"
      case "staff": return "bus"
      case "student": return "student-dashboard"
      default: return "student-dashboard"
    }
  }

  const isTabAllowedForRole = (tab, role) => {
    if (!role) return false
    const allowed = ROLE_PERMISSIONS[role] || []
    return allowed.includes(tab)
  }

  const handleTabSelect = (tabKey) => {
    if (!currentUser) {
      setMobileSidebarOpen(false)
      return
    }
    if (!isTabAllowedForRole(tabKey, currentUser.role)) {
      showToast(`Access Restricted: Your ${currentUser.roleTitle || currentUser.role} account does not have permission to access "${getActiveTabTitle(tabKey)}".`)
      setMobileSidebarOpen(false)
      return
    }
    setActiveTab(tabKey)
    setMobileSidebarOpen(false)
  }

  const [cloudConnected, setCloudConnected] = useState(false)
  const [showPeriodModal, setShowPeriodModal] = useState(false)
  const [editingPeriodIndex, setEditingPeriodIndex] = useState(null)
  const [periodFormData, setPeriodFormData] = useState({
    period: "Period 1 (08:00 - 08:45)",
    mon: "",
    tue: "",
    wed: "",
    thu: "",
    fri: "",
  })

  // Gradebook and Attendance Class Filters
  const [gradebookSelectedClass, setGradebookSelectedClass] = useState("JSS 1")
  const [gradebookSelectedSubject, setGradebookSelectedSubject] = useState("All")
  const [attendanceDate, setAttendanceDate] = useState("2026-10-01")
  const [attendanceClass, setAttendanceClass] = useState("JSS 1")
  const [attendanceRecords, setAttendanceRecords] = useState(() => {
    try {
      const saved = localStorage.getItem("blis_attendance_records")
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return {}
  })

  // Continuous Assessment Score Entry Modal & State
  const [showAddScoreModal, setShowAddScoreModal] = useState(false)
  const [customSubjectActive, setCustomSubjectActive] = useState(false)
  const [newScoreForm, setNewScoreForm] = useState({
    studentId: "",
    studentName: "",
    gradeLevel: "JSS 1",
    subject: "Mathematics",
    assign1: "",
    assign2: "",
    test1: "",
    test2: "",
    exam: "",
    remarks: "Good academic progress.",
    isEditingExisting: false,
  })

  // Invoice creation modal
  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState(false)
  const [newInvoiceForm, setNewInvoiceForm] = useState({
    studentId: "",
    studentName: "",
    grade: "JSS 1",
    term: "Term 1 (2026/2027)",
  })

  // Admissions applicant modal
  const [showAddApplicantModal, setShowAddApplicantModal] = useState(false)
  const [newApplicantForm, setNewApplicantForm] = useState({
    studentName: "",
    gradeApplied: "JSS 1",
    parentName: "",
    phone: "",
    notes: "Entrance assessment scheduled.",
  })

  // Filter & Search states
  const [studentSearch, setStudentSearch] = useState("")
  const [studentGradeFilter, setStudentGradeFilter] = useState("All")
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("All")

  // Modals state
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [reportCardStudent, setReportCardStudent] = useState(null)
  const [receiptInvoice, setReceiptInvoice] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null)
  const [showNewNoticeModal, setShowNewNoticeModal] = useState(false)
  const [showProspectusModal, setShowProspectusModal] = useState(false)
  const [createdStudentCredentials, setCreatedStudentCredentials] = useState(null)
  const [parentSelectedWardId, setParentSelectedWardId] = useState(null)

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 4000)
  }

  // Parent-Ward Resolution Helpers (Multi-child support)
  const getParentWards = (parentUser) => {
    if (!parentUser) return students.slice(0, 1)
    if (parentUser.role !== "parent") return students
    return students.filter((s) => {
      if (Array.isArray(parentUser.linkedStudentIds) && parentUser.linkedStudentIds.includes(s.id)) return true
      if (Array.isArray(parentUser.linkedStudentNames) && parentUser.linkedStudentNames.some((n) => n && n.toLowerCase().trim() === (s.name || "").toLowerCase().trim())) return true
      if (s.guardian && parentUser.name && (s.guardian.toLowerCase().includes(parentUser.name.toLowerCase()) || parentUser.name.toLowerCase().includes(s.guardian.toLowerCase()))) return true
      if (s.phone && parentUser.phone && s.phone.replace(/[^0-9]/g, "") === parentUser.phone.replace(/[^0-9]/g, "")) return true
      if (s.email && parentUser.email && s.email.toLowerCase().trim() === parentUser.email.toLowerCase().trim()) return true
      return false
    })
  }

  const getActiveParentWard = (parentUser) => {
    const wards = getParentWards(parentUser)
    if (wards.length === 0) return null
    return wards.find((w) => w.id === parentSelectedWardId) || wards[0]
  }

  const renderWardSwitcher = (myWards, activeWard) => {
    if (!myWards || myWards.length <= 1) return null
    return (
      <div
        className='ward-switcher-bar'
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          padding: '12px 18px',
          background: '#ffffff',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className='fas fa-user-friends' style={{ color: '#00a884', fontSize: '16px' }}></i>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#071626' }}>
            Select Ward ({myWards.length} Enrolled):
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {myWards.map((w) => {
            const isSelected = activeWard && w.id === activeWard.id
            return (
              <button
                key={w.id}
                type='button'
                onClick={() => setParentSelectedWardId(w.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: isSelected ? '2px solid #00a884' : '1px solid #cbd5e1',
                  background: isSelected ? '#ecfdf5' : '#f8fafc',
                  color: isSelected ? '#065f46' : '#475569',
                  fontWeight: isSelected ? '700' : '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
              >
                <i className='fas fa-graduation-cap' style={{ color: isSelected ? '#10b981' : '#94a3b8' }}></i>
                {w.name} ({w.grade})
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Synchronize all operational records on initial mount and tab navigation
  useEffect(() => {
    try {
      const savedStudents = localStorage.getItem("blis_students")
      if (savedStudents) {
        const parsed = JSON.parse(savedStudents)
        if (Array.isArray(parsed)) setStudents(parsed)
      }
      const savedInvoices = localStorage.getItem("blis_invoices")
      if (savedInvoices) {
        const parsed = JSON.parse(savedInvoices)
        if (Array.isArray(parsed)) setInvoices(parsed)
      }
      const savedGradebook = localStorage.getItem("blis_gradebook_data")
      if (savedGradebook) {
        const parsed = JSON.parse(savedGradebook)
        if (Array.isArray(parsed)) setGradebookData(parsed)
      }
      const savedAdmissions = localStorage.getItem("blis_admissions")
      if (savedAdmissions) {
        const parsed = JSON.parse(savedAdmissions)
        if (Array.isArray(parsed)) setApplications(parsed)
      }
      const savedAttendance = localStorage.getItem("blis_attendance_records")
      if (savedAttendance) {
        const parsed = JSON.parse(savedAttendance)
        if (parsed && typeof parsed === "object") setAttendanceRecords(parsed)
      }
      const savedTimetable = localStorage.getItem("blis_timetable_data")
      if (savedTimetable) {
        const parsed = JSON.parse(savedTimetable)
        if (parsed && typeof parsed === "object") setTimetables(parsed)
      }
      const savedNotices = localStorage.getItem("blis_announcements")
      if (savedNotices !== null) {
        try {
          const parsedN = JSON.parse(savedNotices)
          if (Array.isArray(parsedN)) setNotices(parsedN)
        } catch (e) {}
      }
      const savedTaughtLogs = localStorage.getItem("blis_taught_lesson_log")
      if (savedTaughtLogs) {
        try {
          const parsedT = JSON.parse(savedTaughtLogs)
          if (parsedT && typeof parsedT === "object") setTaughtLessonLog(parsedT)
        } catch (e) {}
      }
      const savedCollation = localStorage.getItem("blis_terminal_collation")
      if (savedCollation) {
        try {
          const parsedC = JSON.parse(savedCollation)
          if (parsedC && typeof parsedC === "object") setTerminalCollation(parsedC)
        } catch (e) {}
      }
      const savedUsers = getStoredPortalUsers()
      setPortalUsers(savedUsers)

    } catch (e) {
      console.error("Storage sync error on mount:", e)
    }

    // Set up real-time Firebase Firestore cloud sync across all devices
    const unsubUsers = subscribeToCloudDoc("portal_users", (cloudUsers) => {
      if (Array.isArray(cloudUsers)) {
        if (cloudUsers.length > 0) {
          const localStored = getStoredPortalUsers()
          const combined = [...cloudUsers]
          localStored.forEach((locU) => {
            const exists = combined.some(
              (c) =>
                c.id === locU.id ||
                (c.email && locU.email && c.email.toLowerCase().trim() === locU.email.toLowerCase().trim()) ||
                (c.username && locU.username && c.username.toLowerCase().trim() === locU.username.toLowerCase().trim())
            )
            if (!exists) {
              combined.push(locU)
            }
          })
          initialPortalUsers.forEach((defU) => {
            if (
              !combined.some(
                (u) =>
                  u.id === defU.id ||
                  (u.username && defU.username && u.username.toLowerCase().trim() === defU.username.toLowerCase().trim()) ||
                  (u.email && defU.email && u.email.toLowerCase().trim() === defU.email.toLowerCase().trim())
              )
            ) {
              combined.push(defU)
            }
          })
          try {
            localStorage.setItem("blis_portal_users", JSON.stringify(combined))
          } catch (e) {}
          setPortalUsers(combined)
        } else {
          // Initialize empty Firestore with Master Admin
          saveToCloud("portal_users", initialPortalUsers)
        }
        setCloudConnected(true)
      }
    })

    const unsubStudents = subscribeToCloudDoc("students", (cloudStudents) => {
      if (Array.isArray(cloudStudents) && cloudStudents.length > 0) {
        setStudents(cloudStudents)
        try {
          localStorage.setItem("blis_students", JSON.stringify(cloudStudents))
        } catch (e) {}
        setCloudConnected(true)
      }
    })

    const unsubGradebook = subscribeToCloudDoc("gradebook", (cloudGradebook) => {
      if (Array.isArray(cloudGradebook)) {
        setGradebookData(cloudGradebook)
        try {
          localStorage.setItem("blis_gradebook_data", JSON.stringify(cloudGradebook))
        } catch (e) {}
      }
    })

    const unsubInvoices = subscribeToCloudDoc("invoices", (cloudInvoices) => {
      if (Array.isArray(cloudInvoices)) {
        setInvoices(cloudInvoices)
        try {
          localStorage.setItem("blis_invoices", JSON.stringify(cloudInvoices))
        } catch (e) {}
      }
    })

    const unsubAttendance = subscribeToCloudDoc("attendance", (cloudAttendance) => {
      if (cloudAttendance && typeof cloudAttendance === "object") {
        setAttendanceRecords(cloudAttendance)
        try {
          localStorage.setItem("blis_attendance_records", JSON.stringify(cloudAttendance))
        } catch (e) {}
      }
    })

    const unsubNotices = subscribeToCloudDoc("announcements", (cloudNotices) => {
      if (Array.isArray(cloudNotices)) {
        setNotices(cloudNotices)
        try {
          localStorage.setItem("blis_announcements", JSON.stringify(cloudNotices))
        } catch (e) {}
      }
    })

    const unsubTaught = subscribeToCloudDoc("taught_lesson_log", (cloudTaught) => {
      if (cloudTaught && typeof cloudTaught === "object") {
        setTaughtLessonLog(cloudTaught)
        try {
          localStorage.setItem("blis_taught_lesson_log", JSON.stringify(cloudTaught))
        } catch (e) {}
      }
    })

    const unsubCollation = subscribeToCloudDoc("terminal_collation", (cloudCollation) => {
      if (cloudCollation && typeof cloudCollation === "object") {
        setTerminalCollation(cloudCollation)
        try {
          localStorage.setItem("blis_terminal_collation", JSON.stringify(cloudCollation))
        } catch (e) {}
      }
    })

    return () => {
      if (typeof unsubUsers === "function") unsubUsers()
      if (typeof unsubStudents === "function") unsubStudents()
      if (typeof unsubGradebook === "function") unsubGradebook()
      if (typeof unsubInvoices === "function") unsubInvoices()
      if (typeof unsubAttendance === "function") unsubAttendance()
      if (typeof unsubNotices === "function") unsubNotices()
      if (typeof unsubTaught === "function") unsubTaught()
      if (typeof unsubCollation === "function") unsubCollation()
    }
  }, [])

  // --- Handlers ---
  const getRoleIcon = (role) => {
    switch (role) {
      case "proprietor": return "fas fa-crown"
      case "admin": return "fas fa-user-shield"
      case "teacher": return "fas fa-chalkboard-teacher"
      case "bursary": return "fas fa-file-invoice-dollar"
      case "parent": return "fas fa-user-friends"
      case "student": return "fas fa-user-graduate"
      default: return "fas fa-user"
    }
  }

  // Secure dynamic login: Enforces strict username/email/ID and exact password verification
  const handleLogin = (e) => {
    if (e) e.preventDefault()
    setLoginError("")
    const rawInput = (loginIdentifier || "").trim()
    const idClean = rawInput.toLowerCase().replace(/^@/, "").trim()
    if (!idClean) {
      setLoginError("Please enter your official username, email address, or student ID.")
      return
    }

    const enteredPass = (loginPassword || "").trim()
    if (!enteredPass) {
      setLoginError("Password is required. Please enter your password to sign in.")
      return
    }

    // Always fetch fresh from storage AND merge with active component state & initialPortalUsers
    const storedUsers = getStoredPortalUsers()
    const allUsers = [...storedUsers]
    if (Array.isArray(portalUsers)) {
      portalUsers.forEach((pu) => {
        if (
          !allUsers.find(
            (u) =>
              u.id === pu.id ||
              (u.username && pu.username && u.username.toLowerCase().trim() === pu.username.toLowerCase().trim()) ||
              (u.email && pu.email && u.email.toLowerCase().trim() === pu.email.toLowerCase().trim())
          )
        ) {
          allUsers.push(pu)
        }
      })
    }
    initialPortalUsers.forEach((defU) => {
      if (
        !allUsers.find(
          (u) =>
            u.id === defU.id ||
            (u.username && defU.username && u.username.toLowerCase().trim() === defU.username.toLowerCase().trim()) ||
            (u.email && defU.email && u.email.toLowerCase().trim() === defU.email.toLowerCase().trim())
        )
      ) {
        allUsers.push(defU)
      }
    })

    // Strict credential matching (email, username, user ID, name, student ID, or registered phone)
    const found = allUsers.find((u) => {
      const uEmail = (u.email || "").toLowerCase().trim()
      const uUser = (u.username || "").toLowerCase().trim().replace(/^@/, "")
      const uId = (u.id || "").toLowerCase().trim()
      const uName = (u.name || "").toLowerCase().trim()
      const uPhone = (u.phone || "").toLowerCase().trim()
      const uStudentId = (u.studentId || "").toLowerCase().trim()
      const uAdmNo = (u.admissionNumber || "").toLowerCase().trim()

      return (
        uEmail === idClean ||
        uUser === idClean ||
        uId === idClean ||
        uName === idClean ||
        (uStudentId && uStudentId === idClean) ||
        (uAdmNo && uAdmNo === idClean) ||
        (uPhone && (uPhone === idClean || uPhone.replace(/[^0-9]/g, "") === idClean.replace(/[^0-9]/g, "")))
      )
    })

    if (!found) {
      setLoginError(`Account not found for "${loginIdentifier}". Please check your login credentials and try again.`)
      return
    }

    // Strict password verification against account credentials
    const expectedPassword = (found.password || "").trim()
    if (enteredPass !== expectedPassword) {
      setLoginError("Incorrect password. Please verify your password and try again.")
      return
    }

    // Refresh operational data from localStorage so newly logged in user sees all persisted records
    try {
      const sStudents = localStorage.getItem("blis_students")
      if (sStudents) setStudents(JSON.parse(sStudents))
      const sInvoices = localStorage.getItem("blis_invoices")
      if (sInvoices) setInvoices(JSON.parse(sInvoices))
      const sGradebook = localStorage.getItem("blis_gradebook_data")
      if (sGradebook) setGradebookData(JSON.parse(sGradebook))
      const sAdmissions = localStorage.getItem("blis_admissions")
      if (sAdmissions) setApplications(JSON.parse(sAdmissions))
      const sAtt = localStorage.getItem("blis_attendance_records")
      if (sAtt) setAttendanceRecords(JSON.parse(sAtt))
    } catch (err) {
      console.error("Data sync notice:", err)
    }

    // Sync state and login
    setPortalUsers(allUsers)
    setCurrentUser(found)
    try {
      localStorage.setItem("blis_current_user", JSON.stringify(found))
      localStorage.setItem("blis_portal_users", JSON.stringify(allUsers))
    } catch (e) {}

    const defTab = getDefaultTabForRole(found.role)
    setActiveTab(defTab)

    if (found.role === "teacher" && found.assignedClasses && found.assignedClasses.length > 0) {
      setAttendanceClass(found.assignedClasses[0])
      setGradebookSelectedClass(found.assignedClasses[0])
      setSelectedTimetableClass(found.assignedClasses[0])
    }
    setLoginIdentifier("")
    setLoginPassword("")
    showToast(`Welcome back, ${found.name} (${found.roleTitle})`)
  }

  const handleLogout = () => {
    setCurrentUser(null)
    try {
      localStorage.removeItem("blis_current_user")
    } catch (e) {}
    // Freshly reload portal users so newly created accounts immediately appear on the login screen
    const storedUsers = getStoredPortalUsers()
    setPortalUsers(storedUsers)
    showToast("Signed out of BLIS operations portal.")
  }

  const handleExportDatabase = () => {
    try {
      const backupData = {
        app: "BrighterLand_ERP",
        version: "2026.1",
        exportedAt: new Date().toISOString(),
        portalUsers: JSON.parse(localStorage.getItem("blis_portal_users") || JSON.stringify(portalUsers || [])),
        students: JSON.parse(localStorage.getItem("blis_students") || JSON.stringify(students || [])),
        invoices: JSON.parse(localStorage.getItem("blis_invoices") || JSON.stringify(invoices || [])),
        gradebook: JSON.parse(localStorage.getItem("blis_gradebook_data") || JSON.stringify(gradebookData || [])),
        attendance: JSON.parse(localStorage.getItem("blis_attendance_records") || JSON.stringify(attendanceRecords || {})),
        timetables: JSON.parse(localStorage.getItem("blis_timetable_data") || JSON.stringify(timetables || {})),
        admissions: JSON.parse(localStorage.getItem("blis_admissions") || JSON.stringify(applications || [])),
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2))
      const downloadAnchor = document.createElement("a")
      downloadAnchor.setAttribute("href", dataStr)
      downloadAnchor.setAttribute("download", `BLIS_School_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      showToast("School database exported! You can import this file into any other browser or machine.")
    } catch (err) {
      console.error("Export error:", err)
      showToast("Failed to export database backup.")
    }
  }

  const handleImportDatabase = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result)
        if (!imported || typeof imported !== "object") {
          throw new Error("Invalid backup format")
        }
        if (Array.isArray(imported.portalUsers) && imported.portalUsers.length > 0) {
          localStorage.setItem("blis_portal_users", JSON.stringify(imported.portalUsers))
          setPortalUsers(imported.portalUsers)
        }
        if (Array.isArray(imported.students)) {
          localStorage.setItem("blis_students", JSON.stringify(imported.students))
          setStudents(imported.students)
        }
        if (Array.isArray(imported.invoices)) {
          localStorage.setItem("blis_invoices", JSON.stringify(imported.invoices))
          setInvoices(imported.invoices)
        }
        if (Array.isArray(imported.gradebook)) {
          localStorage.setItem("blis_gradebook_data", JSON.stringify(imported.gradebook))
          setGradebookData(imported.gradebook)
        }
        if (imported.attendance && typeof imported.attendance === "object") {
          localStorage.setItem("blis_attendance_records", JSON.stringify(imported.attendance))
          setAttendanceRecords(imported.attendance)
        }
        if (imported.timetables && typeof imported.timetables === "object") {
          localStorage.setItem("blis_timetable_data", JSON.stringify(imported.timetables))
          setTimetables(imported.timetables)
        }
        if (Array.isArray(imported.admissions)) {
          localStorage.setItem("blis_admissions", JSON.stringify(imported.admissions))
          setApplications(imported.admissions)
        }
        showToast("Database successfully restored! All accounts, students, and marks synchronized.")
      } catch (err) {
        console.error("Import error:", err)
        alert("Could not restore database: The uploaded file is not a valid BLIS backup JSON.")
      }
    }
    reader.readAsText(file)
    e.target.value = null
  }

  const handleDeleteStaff = (userId) => {
    if (userId === "USR-001" || userId === "USR-002" || userId === "USR-ADMIN-01") {
      showToast("Official master executive account cannot be deleted.")
      return
    }
    const currentUsers = getStoredPortalUsers()
    const updated = currentUsers.filter((u) => u.id !== userId)
    setPortalUsers(updated)
    localStorage.setItem("blis_portal_users", JSON.stringify(updated))
    saveToCloud("portal_users", updated)
    showToast("Account removed from staff registry.")
  }

  const handleToggleClassAssignment = (cls) => {
    setNewStaffForm((prev) => {
      const exists = prev.assignedClasses.includes(cls)
      return {
        ...prev,
        assignedClasses: exists
          ? prev.assignedClasses.filter((c) => c !== cls)
          : [...prev.assignedClasses, cls],
      }
    })
  }

  const handleAddStaffSubmit = async (e) => {
    e.preventDefault()
    if (!newStaffForm.name.trim()) {
      showToast("Please provide staff full name.")
      return
    }
    const cleanPassword = (newStaffForm.password || "").trim()
    if (!cleanPassword) {
      showToast("Please enter a password for this account.")
      return
    }

    const cleanEmail = (newStaffForm.email || "").trim().toLowerCase()
    const cleanUsername = (
      newStaffForm.username ||
      (cleanEmail ? cleanEmail.split("@")[0] : "") ||
      newStaffForm.name.trim().toLowerCase().replace(/\s+/g, ".")
    )
      .trim()
      .toLowerCase()
      .replace(/^@/, "")

    const currentUsers = getStoredPortalUsers()
    const existingIndex = currentUsers.findIndex(
      (u) =>
        (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail) ||
        (cleanUsername && u.username && u.username.toLowerCase().trim() === cleanUsername)
    )

    const isHead = newStaffForm.role === "teacher" && Boolean(newStaffForm.headTeacherClass)
    const newStaffUser = {
      id: `USR-${Date.now().toString(36)}-${String(currentUsers.length + 1).padStart(3, "0")}`,
      name: newStaffForm.name.trim(),
      email: cleanEmail || `${cleanUsername}@brighterland.sch.ng`,
      username: cleanUsername,
      password: cleanPassword,
      role: newStaffForm.role,
      headTeacherClass: newStaffForm.role === "teacher" ? (newStaffForm.headTeacherClass || "") : "",
      roleTitle:
        newStaffForm.role === "proprietor"
          ? "Proprietor & Founder"
          : newStaffForm.role === "admin"
          ? "Vice Principal / Admin"
          : newStaffForm.role === "teacher"
          ? (isHead ? `Form Master (${newStaffForm.headTeacherClass})` : `Tutor (${newStaffForm.assignedClasses.join(", ")})`)
          : newStaffForm.role === "bursary"
          ? "Bursar / Accounts Officer"
          : newStaffForm.role === "staff"
          ? "Institutional Staff (Operations / Transport)"
          : newStaffForm.role === "parent"
          ? "Parent / Guardian"
          : "Scholar",
      department:
        newStaffForm.department ||
        getDefaultDepartmentForRole(newStaffForm.role),
      assignedClasses:
        newStaffForm.role === "teacher"
          ? newStaffForm.assignedClasses.length > 0
            ? newStaffForm.assignedClasses
            : ["JSS 1"]
          : ["All Classes"],
      assignedSubjects: newStaffForm.assignedSubjects || "General Subjects",
      privileges:
        newStaffForm.privileges ||
        (newStaffForm.role === "teacher"
          ? (isHead ? `Form Master (${newStaffForm.headTeacherClass}) & Tutor: ${newStaffForm.assignedClasses.join(", ")}` : `Tutor Access: ${newStaffForm.assignedClasses.join(", ")}`)
          : getDefaultPrivilegesForRole(newStaffForm.role)),
      status: "Active",
      createdAt: new Date().toISOString(),
    }

    let updated
    if (existingIndex >= 0) {
      updated = [...currentUsers]
      updated[existingIndex] = { ...updated[existingIndex], ...newStaffUser }
    } else {
      updated = [...currentUsers, newStaffUser]
    }

    setPortalUsers(updated)
    try {
      localStorage.setItem("blis_portal_users", JSON.stringify(updated))
    } catch (e) {
      console.error("Failed to save blis_portal_users:", e)
    }
    await saveToCloud("portal_users", updated)
    setShowAddStaffModal(false)
    setCreatedAccountInfo(newStaffUser)
    showToast(`Account created for ${newStaffUser.name}! Username: "${newStaffUser.username}"`)

    // If registered on login screen, automatically login
    if (!currentUser) {
      setCurrentUser(newStaffUser)
      try {
        localStorage.setItem("blis_current_user", JSON.stringify(newStaffUser))
      } catch (e) {}
      const defTab =
        newStaffForm.role === "proprietor"
          ? "proprietor-overview"
          : newStaffForm.role === "admin"
          ? "dashboard"
          : newStaffForm.role === "teacher"
          ? "teacher-dashboard"
          : newStaffForm.role === "bursary"
          ? "bursary-command"
          : newStaffForm.role === "parent"
          ? "parent-dashboard"
          : "student-dashboard"
      setActiveTab(defTab)
      if (newStaffForm.role === "teacher" && newStaffUser.assignedClasses.length > 0) {
        setAttendanceClass(newStaffUser.assignedClasses[0])
        setGradebookSelectedClass(newStaffUser.assignedClasses[0])
      }
    }

    setNewStaffForm({
      name: "",
      email: "",
      username: "",
      password: "",
      role: "teacher",
      department: "Secondary School Faculty (JSS & SSS)",
      assignedClasses: ["JSS 1"],
      headTeacherClass: "",
      assignedSubjects: "Mathematics",
      privileges: "Tutor Access (Assigned Classes only)",
    })
  }

  const handleAttendanceChange = (studentId, status) => {
    const updated = {
      ...attendanceRecords,
      [studentId]: status,
    }
    setAttendanceRecords(updated)
    localStorage.setItem("blis_attendance_records", JSON.stringify(updated))
    saveToCloud("attendance", updated)
  }

  const markAllPresent = () => {
    const updated = { ...attendanceRecords }
    students.forEach((s) => {
      updated[s.id] = "Present"
    })
    setAttendanceRecords(updated)
    localStorage.setItem("blis_attendance_records", JSON.stringify(updated))
    saveToCloud("attendance", updated)
    showToast("Class roll call updated: All enrolled scholars marked Present.")
  }

  const sendAbsenceAlerts = () => {
    const absentCount = Object.values(attendanceRecords).filter((s) => s === "Absent" || s === "Late").length
    showToast(`Dispatched ${absentCount} attendance SMS & portal notifications to parents.`)
  }

  // Continuous Assessment score calculations
  const calculateGradeInfo = (item) => {
    // Breakdown: CA (40%) + Terminal Exam (60%) = 100%
    // CA: 1st Assign (10) + 2nd Assign (10) + 1st Test (10) + 2nd Test (10) = 40
    const a1 = item.assign1 !== undefined ? Number(item.assign1) : (Number(item.homework) ? Math.round(item.homework * 0.1) : 0)
    const a2 = item.assign2 !== undefined ? Number(item.assign2) : (Number(item.homework) ? Math.round(item.homework * 0.1) : 0)
    const t1 = item.test1 !== undefined ? Number(item.test1) : (Number(item.midterm) ? Math.round(item.midterm * 0.1) : 0)
    const t2 = item.test2 !== undefined ? Number(item.test2) : (Number(item.project) ? Math.round(item.project * 0.1) : 0)
    const caTotal = Math.min(40, a1 + a2 + t1 + t2)
    const examScore = item.exam !== undefined ? Number(item.exam) : (Number(item.finalExam) ? Math.round(item.finalExam * 0.6) : 0)
    const total = Math.min(100, Math.round(caTotal + examScore))

    let letter = "F9"
    let gpa = "0.0"
    if (total >= 75) {
      letter = "A1"
      gpa = "4.0"
    } else if (total >= 70) {
      letter = "B2"
      gpa = "3.8"
    } else if (total >= 65) {
      letter = "B3"
      gpa = "3.4"
    } else if (total >= 60) {
      letter = "C4"
      gpa = "3.0"
    } else if (total >= 55) {
      letter = "C5"
      gpa = "2.6"
    } else if (total >= 50) {
      letter = "C6"
      gpa = "2.2"
    } else if (total >= 45) {
      letter = "D7"
      gpa = "1.8"
    } else if (total >= 40) {
      letter = "E8"
      gpa = "1.4"
    } else {
      letter = "F9"
      gpa = "0.0"
    }
    return { a1, a2, t1, t2, caTotal, examScore, total, letter, gpa }
  }

  // --- Real-time Timetable and Period Status Evaluator ---
  const parsePeriodTime = (periodStr, periodIndex) => {
    if (periodStr && typeof periodStr === "string") {
      const match = periodStr.match(/(?:(\d{1,2}):(\d{2}))\s*-\s*(?:(\d{1,2}):(\d{2}))/)
      if (match) {
        const startH = parseInt(match[1], 10)
        const startM = parseInt(match[2], 10)
        const endH = parseInt(match[3], 10)
        const endM = parseInt(match[4], 10)
        const startMinutes = startH * 60 + startM
        const endMinutes = endH * 60 + endM
        const startStr = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`
        const endStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`
        return { startMinutes, endMinutes, startStr, endStr }
      }
    }
    const defaultSlots = [
      { start: 480, end: 525, s: "08:00", e: "08:45" },
      { start: 525, end: 570, s: "08:45", e: "09:30" },
      { start: 570, end: 615, s: "09:30", e: "10:15" },
      { start: 615, end: 645, s: "10:15", e: "10:45" },
      { start: 645, end: 690, s: "10:45", e: "11:30" },
      { start: 690, end: 735, s: "11:30", e: "12:15" },
      { start: 735, end: 780, s: "12:15", e: "13:00" },
      { start: 780, end: 820, s: "13:00", e: "13:40" },
      { start: 820, end: 880, s: "13:40", e: "14:40" },
    ]
    const fallback = defaultSlots[((periodIndex || 1) - 1) % defaultSlots.length] || defaultSlots[0]
    return {
      startMinutes: fallback.start,
      endMinutes: fallback.end,
      startStr: fallback.s,
      endStr: fallback.e,
    }
  }

  const evaluatePeriodStatus = (p, dayKey, currentTime, currentLessonLog) => {
    const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
    const todayDayKey = dayKeys[currentTime.getDay()] || "mon"
    const isToday = dayKey === todayDayKey
    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()
    const { startMinutes, endMinutes, startStr, endStr } = parsePeriodTime(p.period, p.periodIndex)
    const logKey = `${dayKey}_${p.className}_${p.periodIndex}_${(p.subject || "").replace(/[^a-zA-Z0-9]/g, "_")}`
    const logStatus = currentLessonLog ? currentLessonLog[logKey] : undefined

    if (logStatus === "taught") {
      return { status: "taught", label: "Taught", logKey, logStatus, startStr, endStr, isTaught: true }
    }
    if (logStatus === "missed") {
      return { status: "missed", label: "Missed", logKey, logStatus, startStr, endStr, isMissed: true }
    }

    if (isToday) {
      if (nowMinutes >= startMinutes && nowMinutes <= endMinutes) {
        return { status: "active", label: "Active", logKey, logStatus, startStr, endStr, isActive: true }
      }
      if (nowMinutes > endMinutes) {
        return { status: "unrecorded", label: "Past (Unrecorded)", logKey, logStatus, startStr, endStr, isUnrecorded: true }
      }
      return { status: "upcoming", label: "Upcoming", logKey, logStatus, startStr, endStr, isUpcoming: true }
    }

    const dayIndices = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5 }
    const todayIndex = dayIndices[todayDayKey] || 0
    const targetIndex = dayIndices[dayKey] || 0

    if (todayIndex > 0 && targetIndex < todayIndex) {
      return { status: "unrecorded", label: "Past (Unrecorded)", logKey, logStatus, startStr, endStr, isUnrecorded: true }
    }
    return { status: "scheduled", label: "Scheduled", logKey, logStatus, startStr, endStr, isScheduled: true }
  }

  // Teacher manual toggle for Taught vs Missed
  const handleSetLessonStatus = (logKey, newStatus) => {
    const updated = {
      ...taughtLessonLog,
      [logKey]: newStatus,
    }
    setTaughtLessonLog(updated)
    try {
      localStorage.setItem("blis_taught_lesson_log", JSON.stringify(updated))
    } catch (e) {}
    saveToCloud("taught_lesson_log", updated)
    showToast(newStatus === "taught" ? "Lesson marked as Taught ✓" : "Lesson marked as Missed / Not Taught ✕")
  }

  // --- Class Head Teacher Terminal Collation & Broadsheet System ---
  const calculateClassBroadsheet = (targetClass) => {
    const classScholars = students.filter((s) => s.grade === targetClass)
    const results = classScholars.map((s) => {
      const scholarScores = gradebookData.filter(
        (g) =>
          (g.studentId && g.studentId === s.id) ||
          (g.studentName && s.name && g.studentName.toLowerCase().trim() === s.name.toLowerCase().trim())
      )
      const totalScore = scholarScores.reduce((acc, curr) => acc + calculateGradeInfo(curr).total, 0)
      const count = scholarScores.length
      const avgScore = count > 0 ? Math.round((totalScore / count) * 10) / 10 : 0
      const totalGpa = scholarScores.reduce((acc, curr) => acc + parseFloat(calculateGradeInfo(curr).gpa), 0)
      const avgGpa = count > 0 ? (totalGpa / count).toFixed(2) : "0.00"

      const collation = (terminalCollation && terminalCollation[s.id]) || {}
      return {
        student: s,
        scholarScores,
        subjectCount: count,
        totalScore,
        avgScore,
        avgGpa,
        classTeacherRemark: collation.classTeacherRemark !== undefined ? collation.classTeacherRemark : (avgScore >= 75 ? "An exceptionally diligent, brilliant and well-mannered pupil with stellar cognitive ability." : avgScore >= 50 ? "Good academic progress and commendable classroom participation." : "Needs to dedicate more time to core and quantitative subjects."),
        classTeacherName: collation.classTeacherName || (currentUser && currentUser.role === "teacher" ? currentUser.name : "Class Head Teacher"),
        classTeacherDate: collation.classTeacherDate || "2026-10-02",
        principalRemark: collation.principalRemark !== undefined ? collation.principalRemark : (avgScore >= 75 ? "Promoted to next class with Honours & Distinction. Keep shining!" : avgScore >= 50 ? "Promoted to next class in good academic standing." : "Promoted on Trial. Additional academic tutoring advised."),
        principalName: collation.principalName || "Tangai Gamaliel Samuel",
        principalDate: collation.principalDate || "2026-10-02",
        isApproved: collation.isApproved || false,
        isSubmitted: collation.isSubmitted || false,
      }
    })

    // Sort descending by average score
    results.sort((a, b) => b.avgScore - a.avgScore)

    // Assign ordinal positions
    return results.map((item, idx) => {
      const rank = idx + 1
      const s = ["th", "st", "nd", "rd"]
      const v = rank % 100
      const ordinal = s[(v - 20) % 10] || s[v] || s[0]
      return {
        ...item,
        rank,
        rankOrdinal: `${rank}${ordinal}`,
        positionStr: `${rank}${ordinal} of ${classScholars.length}`,
      }
    })
  }

  const handleSaveStudentRemark = (studentId, studentName, gradeLevel, classTeacherRemark, principalRemark, isApproved) => {
    const existing = terminalCollation[studentId] || {}
    const updated = {
      ...terminalCollation,
      [studentId]: {
        ...existing,
        studentId,
        studentName,
        gradeLevel,
        term: "Term 1 (2026/2027)",
        classTeacherRemark: classTeacherRemark !== undefined ? classTeacherRemark : (existing.classTeacherRemark || "A diligent, attentive scholar."),
        classTeacherName: existing.classTeacherName || (currentUser && currentUser.role === "teacher" ? currentUser.name : "Class Head Teacher"),
        classTeacherDate: existing.classTeacherDate || "2026-10-02",
        principalRemark: principalRemark !== undefined ? principalRemark : (existing.principalRemark || "Promoted to next class with distinction."),
        principalName: "Tangai Gamaliel Samuel",
        principalDate: "2026-10-02",
        isApproved: isApproved !== undefined ? isApproved : (existing.isApproved || false),
        isSubmitted: true,
      }
    }
    setTerminalCollation(updated)
    try {
      localStorage.setItem("blis_terminal_collation", JSON.stringify(updated))
    } catch (e) {}
    saveToCloud("terminal_collation", updated)
    showToast(`Remark saved for ${studentName}!`)
  }

  const handleBatchApproveClass = (targetClass, approveStatus = true) => {
    const classScholars = students.filter((s) => s.grade === targetClass)
    const updated = { ...terminalCollation }
    classScholars.forEach((s) => {
      const existing = updated[s.id] || {}
      updated[s.id] = {
        ...existing,
        studentId: s.id,
        studentName: s.name,
        gradeLevel: s.grade,
        term: "Term 1 (2026/2027)",
        isApproved: approveStatus,
        principalName: "Tangai Gamaliel Samuel",
        principalDate: "2026-10-02",
      }
    })
    setTerminalCollation(updated)
    try {
      localStorage.setItem("blis_terminal_collation", JSON.stringify(updated))
    } catch (e) {}
    saveToCloud("terminal_collation", updated)
    showToast(approveStatus ? `🏛️ BLIS Official Seal & Principal Endorsement applied to ${targetClass}!` : `Revoked approval for ${targetClass}.`)
  }

  const handleSubmitCollationToPrincipal = (targetClass) => {
    const classScholars = students.filter((s) => s.grade === targetClass)
    const updated = { ...terminalCollation }
    classScholars.forEach((s) => {
      const existing = updated[s.id] || {}
      updated[s.id] = {
        ...existing,
        studentId: s.id,
        studentName: s.name,
        gradeLevel: s.grade,
        term: "Term 1 (2026/2027)",
        isSubmitted: true,
      }
    })
    setTerminalCollation(updated)
    try {
      localStorage.setItem("blis_terminal_collation", JSON.stringify(updated))
    } catch (e) {}
    saveToCloud("terminal_collation", updated)
    showToast(`📊 ${targetClass} Broadsheet successfully submitted to the Principal for executive sign-off!`)
  }

  // Inline score change in gradebook
  const handleScoreChange = (index, field, value) => {
    const maxVal = field === "exam" ? 60 : 10
    const num = Math.min(maxVal, Math.max(0, Number(value) || 0))
    const updated = [...gradebookData]
    updated[index] = {
      ...updated[index],
      [field]: num,
    }
    setGradebookData(updated)
    localStorage.setItem("blis_gradebook_data", JSON.stringify(updated))
  }

  // Explicit Save Continuous Assessment button
  const handleSaveGradebook = () => {
    localStorage.setItem("blis_gradebook_data", JSON.stringify(gradebookData))
    showToast("💾 Continuous Assessment scores saved successfully to official records!")
  }

  // Search existing score record in gradebookData
  const findExistingScore = (studentId, studentName, subject, gradeLevel) => {
    if (!subject) return null
    const cleanSub = subject.toLowerCase().trim()
    const cleanName = (studentName || "").toLowerCase().trim()
    return gradebookData.find((g) => {
      const matchId = studentId && g.studentId === studentId
      const matchName = cleanName && (g.studentName || "").toLowerCase().trim() === cleanName
      if (!matchId && !matchName) return false

      const gSub = (g.subject || "").toLowerCase().trim()
      const matchSub = gSub === cleanSub || gSub.includes(cleanSub) || cleanSub.includes(gSub)
      const matchClass = !gradeLevel || g.gradeLevel === gradeLevel || (g.gradeLevel && g.gradeLevel.toLowerCase() === gradeLevel.toLowerCase())
      return matchSub && matchClass
    })
  }

  // Dynamic reaction when student selection changes in modal
  const handleScoreFormStudentChange = (selStudentId) => {
    const st = students.find((s) => s.id === selStudentId)
    const stName = st ? st.name : ""
    const stGrade = st ? st.grade : newScoreForm.gradeLevel
    const currentSub = newScoreForm.subject

    const existing = findExistingScore(selStudentId, stName, currentSub, stGrade)
    if (existing) {
      setNewScoreForm({
        ...newScoreForm,
        studentId: selStudentId,
        studentName: stName,
        gradeLevel: stGrade,
        subject: existing.subject || currentSub,
        assign1: existing.assign1 !== undefined ? existing.assign1 : "",
        assign2: existing.assign2 !== undefined ? existing.assign2 : "",
        test1: existing.test1 !== undefined ? existing.test1 : "",
        test2: existing.test2 !== undefined ? existing.test2 : "",
        exam: existing.exam !== undefined ? existing.exam : "",
        remarks: existing.remarks || "Good academic progress.",
        isEditingExisting: true,
      })
    } else {
      setNewScoreForm({
        ...newScoreForm,
        studentId: selStudentId,
        studentName: stName,
        gradeLevel: stGrade,
        assign1: "",
        assign2: "",
        test1: "",
        test2: "",
        exam: "",
        isEditingExisting: false,
      })
    }
  }

  // Dynamic reaction when subject changes in modal
  const handleScoreFormSubjectChange = (newSubject) => {
    if (newSubject === "__custom__") {
      setCustomSubjectActive(true)
      return
    }
    setCustomSubjectActive(false)
    const existing = findExistingScore(newScoreForm.studentId, newScoreForm.studentName, newSubject, newScoreForm.gradeLevel)
    if (existing) {
      setNewScoreForm({
        ...newScoreForm,
        subject: newSubject,
        assign1: existing.assign1 !== undefined ? existing.assign1 : "",
        assign2: existing.assign2 !== undefined ? existing.assign2 : "",
        test1: existing.test1 !== undefined ? existing.test1 : "",
        test2: existing.test2 !== undefined ? existing.test2 : "",
        exam: existing.exam !== undefined ? existing.exam : "",
        remarks: existing.remarks || newScoreForm.remarks,
        isEditingExisting: true,
      })
    } else {
      setNewScoreForm({
        ...newScoreForm,
        subject: newSubject,
        assign1: "",
        assign2: "",
        test1: "",
        test2: "",
        exam: "",
        isEditingExisting: false,
      })
    }
  }

  // Dynamic reaction when class division changes in modal
  const handleScoreFormClassChange = (newClass) => {
    const classSubs = getSubjectsForClass(newClass)
    const newSub = classSubs.includes(newScoreForm.subject) ? newScoreForm.subject : (classSubs[0] || "Mathematics")
    const existing = findExistingScore(newScoreForm.studentId, newScoreForm.studentName, newSub, newClass)
    if (existing) {
      setNewScoreForm({
        ...newScoreForm,
        gradeLevel: newClass,
        subject: newSub,
        assign1: existing.assign1 !== undefined ? existing.assign1 : "",
        assign2: existing.assign2 !== undefined ? existing.assign2 : "",
        test1: existing.test1 !== undefined ? existing.test1 : "",
        test2: existing.test2 !== undefined ? existing.test2 : "",
        exam: existing.exam !== undefined ? existing.exam : "",
        remarks: existing.remarks || newScoreForm.remarks,
        isEditingExisting: true,
      })
    } else {
      setNewScoreForm({
        ...newScoreForm,
        gradeLevel: newClass,
        subject: newSub,
        assign1: "",
        assign2: "",
        test1: "",
        test2: "",
        exam: "",
        isEditingExisting: false,
      })
    }
  }

  // Open modal from top button with intelligent defaults
  const handleOpenNewScoreModal = () => {
    const activeClass =
      gradebookSelectedClass !== "All"
        ? gradebookSelectedClass
        : currentUser && currentUser.role === "teacher" && currentUser.assignedClasses && currentUser.assignedClasses.length > 0
        ? currentUser.assignedClasses[0]
        : "JSS 1"
    const classSubs = getSubjectsForClass(activeClass)
    const activeSub =
      gradebookSelectedSubject !== "All"
        ? gradebookSelectedSubject
        : (classSubs.length > 0 ? classSubs[0] : "Mathematics")

    // Check if there is an enrolled student for this class
    const classStudents = students.filter(
      (s) => s.grade === activeClass || activeClass === "All"
    )
    const defaultStudent = classStudents.length > 0 ? classStudents[0] : null

    if (defaultStudent) {
      const existing = findExistingScore(defaultStudent.id, defaultStudent.name, activeSub, activeClass)
      if (existing) {
        setNewScoreForm({
          studentId: defaultStudent.id,
          studentName: defaultStudent.name,
          gradeLevel: defaultStudent.grade || activeClass,
          subject: existing.subject || activeSub,
          assign1: existing.assign1 !== undefined ? existing.assign1 : "",
          assign2: existing.assign2 !== undefined ? existing.assign2 : "",
          test1: existing.test1 !== undefined ? existing.test1 : "",
          test2: existing.test2 !== undefined ? existing.test2 : "",
          exam: existing.exam !== undefined ? existing.exam : "",
          remarks: existing.remarks || "Good academic progress.",
          isEditingExisting: true,
        })
      } else {
        setNewScoreForm({
          studentId: defaultStudent.id,
          studentName: defaultStudent.name,
          gradeLevel: defaultStudent.grade || activeClass,
          subject: activeSub,
          assign1: "",
          assign2: "",
          test1: "",
          test2: "",
          exam: "",
          remarks: "Good academic progress.",
          isEditingExisting: false,
        })
      }
    } else {
      setNewScoreForm({
        studentId: "",
        studentName: "",
        gradeLevel: activeClass,
        subject: activeSub,
        assign1: "",
        assign2: "",
        test1: "",
        test2: "",
        exam: "",
        remarks: "Good academic progress.",
        isEditingExisting: false,
      })
    }
    setCustomSubjectActive(false)
    setShowAddScoreModal(true)
  }

  // Edit existing score directly from table row
  const handleEditScoreRecord = (item) => {
    setNewScoreForm({
      studentId: item.studentId,
      studentName: item.studentName,
      gradeLevel: item.gradeLevel,
      subject: item.subject,
      assign1: item.assign1 !== undefined ? item.assign1 : "",
      assign2: item.assign2 !== undefined ? item.assign2 : "",
      test1: item.test1 !== undefined ? item.test1 : "",
      test2: item.test2 !== undefined ? item.test2 : "",
      exam: item.exam !== undefined ? item.exam : "",
      remarks: item.remarks || "Good academic progress.",
      isEditingExisting: true,
    })
    setCustomSubjectActive(false)
    setShowAddScoreModal(true)
  }

  // Modal handler to add or update assessment score
  const handleAddScoreSubmit = (e) => {
    e.preventDefault()
    let targetStudentName = newScoreForm.studentName.trim()
    let targetStudentId = newScoreForm.studentId.trim()
    const targetSubject = newScoreForm.subject.trim()

    if (!targetStudentName && !targetStudentId) {
      showToast("Please enter or select scholar name.")
      return
    }
    if (!targetSubject) {
      showToast("Please specify subject discipline.")
      return
    }

    if (newScoreForm.studentId) {
      const foundScholar = students.find((s) => s.id === newScoreForm.studentId)
      if (foundScholar) {
        targetStudentName = foundScholar.name
        targetStudentId = foundScholar.id
      }
    } else if (!targetStudentId) {
      targetStudentId = `BLIS-2026-${String(students.length + 1).padStart(3, "0")}`
    }

    const a1 = newScoreForm.assign1 !== "" ? Math.min(10, Math.max(0, Number(newScoreForm.assign1) || 0)) : 0
    const a2 = newScoreForm.assign2 !== "" ? Math.min(10, Math.max(0, Number(newScoreForm.assign2) || 0)) : 0
    const t1 = newScoreForm.test1 !== "" ? Math.min(10, Math.max(0, Number(newScoreForm.test1) || 0)) : 0
    const t2 = newScoreForm.test2 !== "" ? Math.min(10, Math.max(0, Number(newScoreForm.test2) || 0)) : 0
    const ex = newScoreForm.exam !== "" ? Math.min(60, Math.max(0, Number(newScoreForm.exam) || 0)) : 0

    const newRecord = {
      studentId: targetStudentId,
      studentName: targetStudentName,
      gradeLevel: newScoreForm.gradeLevel,
      subject: targetSubject,
      assign1: a1,
      assign2: a2,
      test1: t1,
      test2: t2,
      exam: ex,
      remarks: newScoreForm.remarks.trim() || "Good academic progress.",
    }

    // Check if score record already exists for this student, subject, and gradeLevel
    const existingIndex = gradebookData.findIndex(
      (g) =>
        (g.studentId === targetStudentId ||
          g.studentName.toLowerCase().trim() === targetStudentName.toLowerCase().trim()) &&
        (g.subject || "").toLowerCase().trim() === targetSubject.toLowerCase().trim() &&
        (g.gradeLevel || "").toLowerCase().trim() === newScoreForm.gradeLevel.toLowerCase().trim()
    )

    let updated
    if (existingIndex >= 0) {
      updated = [...gradebookData]
      updated[existingIndex] = { ...updated[existingIndex], ...newRecord }
    } else {
      updated = [...gradebookData, newRecord]
    }

    setGradebookData(updated)
    localStorage.setItem("blis_gradebook_data", JSON.stringify(updated))
    saveToCloud("gradebook", updated)
    setShowAddScoreModal(false)
    showToast(existingIndex >= 0 ? `Updated assessment scores for ${targetStudentName} in ${targetSubject}!` : `Continuous assessment score recorded for ${targetStudentName} in ${targetSubject}!`)

    setNewScoreForm({
      studentId: "",
      studentName: "",
      gradeLevel: newScoreForm.gradeLevel,
      subject: targetSubject,
      assign1: "",
      assign2: "",
      test1: "",
      test2: "",
      exam: "",
      remarks: "Good academic progress.",
      isEditingExisting: false,
    })
    setCustomSubjectActive(false)
  }

  // Add new student form
  const [newStudentForm, setNewStudentForm] = useState({
    name: "",
    grade: "JSS 1",
    house: "Phoenix",
    dob: "2013-05-14",
    gender: "Female",
    guardian: "",
    email: "",
    phone: "",
    medical: "None",
  })

  // Enroll scholar in SIS + auto-generate fee invoice & student/parent login accounts
  const handleAddStudentSubmit = (e) => {
    e.preventDefault()
    if (!newStudentForm.name.trim()) {
      showToast("Please enter scholar full name.")
      return
    }
    const currentStudents = (() => {
      try {
        const saved = localStorage.getItem("blis_students")
        if (saved) return JSON.parse(saved)
      } catch (e) {}
      return students
    })()

    const newId = `BLIS-2026-${String((currentStudents || []).length + 1).padStart(3, "0")}`
    const newRecord = {
      id: newId,
      name: newStudentForm.name.trim(),
      grade: newStudentForm.grade,
      house: newStudentForm.house,
      dob: newStudentForm.dob,
      gender: newStudentForm.gender,
      guardian: newStudentForm.guardian.trim() || "Guardian",
      email: newStudentForm.email.trim(),
      phone: newStudentForm.phone.trim(),
      attendance: 100,
      gpa: "—",
      status: "Active",
      feeStatus: "Pending",
      medical: newStudentForm.medical || "None",
      enrolledSubjects: ["Mathematics", "English Studies", "Basic Science", "Agricultural Science", "Computer Studies", "Social Studies"],
    }
    const updatedStudents = [newRecord, ...(currentStudents || [])]
    setStudents(updatedStudents)
    try {
      localStorage.setItem("blis_students", JSON.stringify(updatedStudents))
    } catch (e) {
      console.error("Failed to save blis_students:", e)
    }

    // Automatically generate Section A fee invoice based on prospectus
    const classProspectus =
      prospectusData.find((p) => p.level.toLowerCase().includes(newStudentForm.grade.toLowerCase())) ||
      prospectusData[2]
    const secATotal = classProspectus ? classProspectus.sectionA.total : 22000
    const newInvoice = {
      invoiceNo: `INV-2026-${String(1000 + updatedStudents.length)}`,
      studentId: newId,
      studentName: newRecord.name,
      grade: newRecord.grade,
      term: "Term 1 (2026/2027)",
      tuition: classProspectus ? classProspectus.sectionA.items[0].amount : 15000,
      examFee: 2000,
      lessonFee: 2000,
      devLevy: 1000,
      ptaLevy: 1000,
      firstAid: 1000,
      total: secATotal,
      amountPaid: 0,
      status: "Pending",
      paymentDate: "N/A",
      method: "Pending First Bank Payment",
      bankRef: "PENDING",
    }
    const currentInvoices = (() => {
      try {
        const saved = localStorage.getItem("blis_invoices")
        if (saved) return JSON.parse(saved)
      } catch (e) {}
      return invoices
    })()
    const updatedInvoices = [newInvoice, ...(currentInvoices || [])]
    setInvoices(updatedInvoices)
    try {
      localStorage.setItem("blis_invoices", JSON.stringify(updatedInvoices))
    } catch (e) {
      console.error("Failed to save blis_invoices:", e)
    }

    // Automatically create portal user accounts for Student and Parent
    const cleanStudentUsername = newRecord.name
      .toLowerCase()
      .replace(/\s+/g, ".")
      .replace(/[^a-z0-9.]/g, "")
    const studentUser = {
      id: `USR-STU-${newId}`,
      studentId: newId,
      name: newRecord.name,
      username: cleanStudentUsername || newId.toLowerCase(),
      email: `${cleanStudentUsername || newId.toLowerCase()}@student.brighterland.sch.ng`,
      password: "password123",
      role: "student",
      roleTitle: `Scholar (${newRecord.grade})`,
      department: "Student Body",
      assignedClasses: [newRecord.grade],
      privileges: "Scholar View (Grades, Timetable, House Standings)",
      status: "Active",
    }

    const cleanParentUsername = (newRecord.guardian || "guardian")
      .toLowerCase()
      .replace(/\s+/g, ".")
      .replace(/[^a-z0-9.]/g, "")

    const currentUsers = getStoredPortalUsers()

    // Check if an existing parent account exists with matching phone, email, or guardian name
    const existingParent = currentUsers.find(
      (u) =>
        u.role === "parent" &&
        ((u.phone && newRecord.phone && u.phone.replace(/[^0-9]/g, "") === newRecord.phone.replace(/[^0-9]/g, "")) ||
          (u.email && newRecord.email && u.email.toLowerCase().trim() === newRecord.email.toLowerCase().trim()) ||
          (u.name && newRecord.guardian && u.name.toLowerCase().trim() === newRecord.guardian.toLowerCase().trim()))
    )

    let parentAccountToReport = null
    let updatedUserList = [...currentUsers]

    if (existingParent) {
      const updatedLinkedIds = [...new Set([...(existingParent.linkedStudentIds || []), newId])]
      const updatedLinkedNames = [...new Set([...(existingParent.linkedStudentNames || []), newRecord.name])]
      const updatedAssigned = [...new Set([...(existingParent.assignedClasses || []), newRecord.grade])]
      const updatedParent = {
        ...existingParent,
        linkedStudentIds: updatedLinkedIds,
        linkedStudentNames: updatedLinkedNames,
        assignedClasses: updatedAssigned,
        roleTitle: `Parent of ${updatedLinkedNames.join(", ")}`,
      }
      updatedUserList = updatedUserList.map((u) => (u.id === existingParent.id ? updatedParent : u))
      parentAccountToReport = updatedParent
    } else {
      const parentUser = {
        id: `USR-PAR-${newId}`,
        name: newRecord.guardian || "Guardian",
        username: cleanParentUsername || `parent.${newId.toLowerCase()}`,
        email: newRecord.email || `${cleanParentUsername}@parent.brighterland.sch.ng`,
        phone: newRecord.phone || "",
        password: "password123",
        role: "parent",
        roleTitle: `Parent of ${newRecord.name} (${newRecord.grade})`,
        department: "PTA Association",
        assignedClasses: [newRecord.grade],
        linkedStudentIds: [newId],
        linkedStudentNames: [newRecord.name],
        privileges: "Parent Access (Ward Progress Reports, Bursary Statements, Attendance)",
        status: "Active",
      }
      updatedUserList.push(parentUser)
      parentAccountToReport = parentUser
    }

    if (!updatedUserList.some((u) => u.id === studentUser.id || u.username === studentUser.username)) {
      updatedUserList.push(studentUser)
    }

    setPortalUsers(updatedUserList)
    try {
      localStorage.setItem("blis_portal_users", JSON.stringify(updatedUserList))
    } catch (e) {
      console.error("Failed to save blis_portal_users:", e)
    }
    saveToCloud("portal_users", updatedUserList)
    saveToCloud("students", updatedStudents)
    saveToCloud("invoices", updatedInvoices)

    setShowAddStudentModal(false)
    showToast(`Scholar ${newRecord.name} enrolled in ${newRecord.grade}! Accounts generated for scholar and parent.`)

    // Open Credentials Modal for Admin to share with Parent
    setCreatedStudentCredentials({
      studentName: newRecord.name,
      studentId: newId,
      grade: newRecord.grade,
      studentUsername: cleanStudentUsername || newId,
      studentPassword: "password123",
      parentName: parentAccountToReport.name,
      parentUsername: parentAccountToReport.username,
      parentEmail: parentAccountToReport.email,
      parentPhone: parentAccountToReport.phone || "On File",
      parentPassword: parentAccountToReport.password || "password123",
    })

    setNewStudentForm({
      name: "",
      grade: "JSS 1",
      house: "Phoenix",
      dob: "2013-05-14",
      gender: "Female",
      guardian: "",
      email: "",
      phone: "",
      medical: "None",
    })
  }

  // Record payment into First Bank
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("First Bank Direct Deposit")

  const handleRecordPayment = (e) => {
    e.preventDefault()
    if (!selectedInvoiceForPayment) return
    const amt = parseFloat(paymentAmount) || 0
    const updatedInvoices = invoices.map((inv) => {
      if (inv.invoiceNo === selectedInvoiceForPayment.invoiceNo) {
        const newPaid = inv.amountPaid + amt
        const newStatus = newPaid >= inv.total ? "Paid" : "Partial"
        return {
          ...inv,
          amountPaid: newPaid,
          status: newStatus,
          paymentDate: "2026-10-01",
          method: paymentMethod,
          bankRef: `FB-2043561832-TX${Math.floor(100 + Math.random() * 900)}`,
        }
      }
      return inv
    })
    setInvoices(updatedInvoices)
    localStorage.setItem("blis_invoices", JSON.stringify(updatedInvoices))
    saveToCloud("invoices", updatedInvoices)
    setShowPaymentModal(false)
    showToast(`Payment of ₦${amt.toLocaleString()} recorded for ${selectedInvoiceForPayment.invoiceNo} into First Bank.`)
  }

  // Admissions pipeline transition
  const advanceApplicationStage = (appId) => {
    const stages = ["Inquiry", "Assessment", "Interview", "Offer Extended", "Enrolled"]
    const updated = applications.map((app) => {
      if (app.appId === appId) {
        const currentIndex = stages.indexOf(app.stage)
        const nextStage = stages[Math.min(stages.length - 1, currentIndex + 1)]
        return { ...app, stage: nextStage }
      }
      return app
    })
    setApplications(updated)
    localStorage.setItem("blis_admissions", JSON.stringify(updated))
    saveToCloud("admissions", updated)
    showToast(`Application ${appId} advanced to next milestone in the admissions pipeline.`)
  }

  // Handle bursary fee invoice generation
  const handleAddInvoiceSubmit = (e) => {
    e.preventDefault()
    if (!newInvoiceForm.studentName.trim()) {
      showToast("Please provide scholar full name.")
      return
    }
    const studentId = newInvoiceForm.studentId || `BLIS-2026-${String(students.length + 1).padStart(3, "0")}`
    const classProspectus =
      prospectusData.find((p) => p.level.toLowerCase().includes(newInvoiceForm.grade.toLowerCase())) ||
      prospectusData[2]
    const secATotal = classProspectus ? classProspectus.sectionA.total : 22000
    const newInvoice = {
      invoiceNo: `INV-2026-${String(1001 + invoices.length)}`,
      studentId: studentId,
      studentName: newInvoiceForm.studentName.trim(),
      grade: newInvoiceForm.grade,
      term: newInvoiceForm.term || "Term 1 (2026/2027)",
      tuition: classProspectus ? classProspectus.sectionA.items[0].amount : 15000,
      examFee: 2000,
      lessonFee: 2000,
      devLevy: 1000,
      ptaLevy: 1000,
      firstAid: 1000,
      total: secATotal,
      amountPaid: 0,
      status: "Pending",
      paymentDate: "N/A",
      method: "Pending First Bank Payment",
      bankRef: "PENDING",
    }
    const updated = [newInvoice, ...invoices]
    setInvoices(updated)
    localStorage.setItem("blis_invoices", JSON.stringify(updated))
    saveToCloud("invoices", updated)
    setShowAddInvoiceModal(false)
    showToast(`Invoice ${newInvoice.invoiceNo} (₦${secATotal.toLocaleString()}) issued for ${newInvoice.studentName}!`)
    setNewInvoiceForm({
      studentId: "",
      studentName: "",
      grade: "JSS 1",
      term: "Term 1 (2026/2027)",
    })
  }

  // Handle adding candidate to admissions pipeline
  const handleAddApplicantSubmit = (e) => {
    e.preventDefault()
    if (!newApplicantForm.studentName.trim()) {
      showToast("Please enter candidate scholar name.")
      return
    }
    const newApp = {
      appId: `BLIS-ADM-2026-${String(101 + applications.length)}`,
      studentName: newApplicantForm.studentName.trim(),
      gradeApplied: newApplicantForm.gradeApplied,
      parentName: newApplicantForm.parentName.trim() || "Parent/Guardian",
      phone: newApplicantForm.phone.trim() || "+234 803 000 0000",
      stage: "Inquiry",
      assessmentScore: "Scheduled",
      notes: newApplicantForm.notes.trim() || "Entrance assessment scheduled.",
    }
    const updated = [newApp, ...applications]
    setApplications(updated)
    localStorage.setItem("blis_admissions", JSON.stringify(updated))
    setShowAddApplicantModal(false)
    showToast(`Applicant ${newApp.studentName} added to Admissions pipeline!`)
    setNewApplicantForm({
      studentName: "",
      gradeApplied: "JSS 1",
      parentName: "",
      phone: "",
      notes: "Entrance assessment scheduled.",
    })
  }

  // Filtered Students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.id.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.guardian && s.guardian.toLowerCase().includes(studentSearch.toLowerCase()))
    const matchesGrade =
      studentGradeFilter === "All" || s.grade.toLowerCase().includes(studentGradeFilter.toLowerCase())
    return matchesSearch && matchesGrade
  })

  // Filtered Invoices
  const filteredInvoices = invoices.filter((inv) => {
    if (invoiceStatusFilter === "All") return true
    return inv.status.toLowerCase() === invoiceStatusFilter.toLowerCase()
  })

  // Real-time financial calculations (strictly from real invoices - starts at ₦0)
  const totalBilled = invoices.reduce((acc, curr) => acc + curr.total, 0)
  const totalCollected = invoices.reduce((acc, curr) => acc + curr.amountPaid, 0)
  const totalOutstanding = totalBilled - totalCollected
  const presentCount = Object.values(attendanceRecords).filter((s) => s === "Present").length
  const dailyAttendanceRate =
    students.length > 0 && Object.keys(attendanceRecords).length > 0
      ? Math.round((presentCount / Math.max(1, Object.keys(attendanceRecords).length)) * 100)
      : 100

  // Modal 8 Component: Create/Register Staff Account
  const renderAddStaffModal = () => {
    if (!showAddStaffModal) return null
    return (
      <div className='blis-modal-overlay' onClick={() => setShowAddStaffModal(false)}>
        <div className='blis-modal-card' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
          <div className='modal-header'>
            <div>
              <h3>{currentUser ? "Create Staff Account & Allocate Privileges" : "Register Teacher or Staff Account"}</h3>
              <small>Admin, Proprietor & Faculty Access Authorization</small>
            </div>
            <button className='modal-close' onClick={() => setShowAddStaffModal(false)}>×</button>
          </div>
          <form onSubmit={handleAddStaffSubmit} className='modal-form'>
            <div className='form-row'>
              <div className='form-group'>
                <label>Staff Full Name *</label>
                <input
                  type='text'
                  required
                  placeholder='e.g. Mbasiti Sylva or John Christiana'
                  value={newStaffForm.name}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                />
              </div>
              <div className='form-group'>
                <label>Username (For Portal Login) *</label>
                <input
                  type='text'
                  required
                  placeholder='e.g. fidelis.gambo or principal'
                  value={newStaffForm.username}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, username: e.target.value })}
                />
              </div>
            </div>

            <div className='form-row'>
              <div className='form-group'>
                <label>Official Email Address *</label>
                <input
                  type='email'
                  required
                  placeholder='e.g. fidelisgambo9@gmail.com'
                  value={newStaffForm.email}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                />
              </div>
              <div className='form-group'>
                <label>Login Password *</label>
                <input
                  type='password'
                  required
                  placeholder='Create account password'
                  value={newStaffForm.password}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, password: e.target.value })}
                />
              </div>
            </div>

            <div className='form-row'>
              <div className='form-group'>
                <label>System Role *</label>
                <select
                  value={newStaffForm.role}
                  onChange={(e) => {
                    const selectedRole = e.target.value
                    setNewStaffForm({
                      ...newStaffForm,
                      role: selectedRole,
                      department: getDefaultDepartmentForRole(selectedRole),
                      privileges: getDefaultPrivilegesForRole(selectedRole),
                    })
                  }}
                >
                  <option value='teacher'>Teacher (Academic Staff)</option>
                  <option value='bursary'>Bursary / Accounts (Non-Academic Staff)</option>
                  <option value='admin'>Admin / Principal</option>
                  <option value='proprietor'>Proprietor (Executive Board)</option>
                  <option value='staff'>Institutional Staff (Operations / Transport / Facilities)</option>
                  <option value='parent'>Parent / Guardian</option>
                  <option value='student'>Student / Scholar</option>
                </select>
              </div>
              <div className='form-group'>
                <label>Department / Faculty *</label>
                <select
                  value={newStaffForm.department}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, department: e.target.value })}
                >
                  {institutionalDepartments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Class allocation if Teacher */}
            {newStaffForm.role === "teacher" && (
              <div className='form-group' style={{ marginTop: '6px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontWeight: '700', color: '#071626' }}>
                    <i className='fas fa-user-tie' style={{ color: '#00a884', marginRight: '6px' }}></i> Appoint as Class Head Teacher / Form Master (Optional):
                  </label>
                  <select
                    value={newStaffForm.headTeacherClass || ""}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, headTeacherClass: e.target.value })}
                    style={{ marginTop: '4px' }}
                  >
                    <option value=''>None (Subject Teacher / Specialist Only)</option>
                    {availableSchoolClasses.map((cls) => (
                      <option key={cls} value={cls}>⭐ Form Master of {cls} (Collates BroadSheet & Terminal Results)</option>
                    ))}
                  </select>
                  <small style={{ display: 'block', color: '#64748b', marginTop: '4px' }}>
                    Class Head Teachers collate all subject scores for their class, compute rankings, and write the official <strong>Class Teacher's Remark</strong> before submitting to the Principal.
                  </small>
                </div>

                <label style={{ fontWeight: '700', color: '#071626', display: 'block', marginBottom: '6px' }}>
                  <i className='fas fa-chalkboard'></i> Assign Authorized Classes (Teacher will ONLY see these classes & scholars) *:
                </label>
                <div className='class-checkbox-grid'>
                  {availableSchoolClasses.map((cls) => {
                    const isChecked = newStaffForm.assignedClasses.includes(cls)
                    return (
                      <label key={cls} className='class-checkbox-label'>
                        <input
                          type='checkbox'
                          checked={isChecked}
                          onChange={() => handleToggleClassAssignment(cls)}
                        />
                        <span>{cls}</span>
                      </label>
                    )
                  })}
                </div>
                <div style={{ marginTop: '12px' }}>
                  <label style={{ fontWeight: '700', color: '#071626' }}>Assigned Teaching Subjects:</label>
                  <input
                    type='text'
                    placeholder='e.g. Mathematics, Basic Science'
                    value={newStaffForm.assignedSubjects}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, assignedSubjects: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className='modal-actions'>
              <button type='button' className='outline-btn' onClick={() => setShowAddStaffModal(false)}>CANCEL</button>
              <button type='submit' className='primary-btn'>ACTIVATE STAFF ACCOUNT</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Modal: Show credentials of newly created staff account
  const renderCreatedAccountModal = () => {
    if (!createdAccountInfo) return null
    return (
      <div className='blis-modal-overlay' onClick={() => setCreatedAccountInfo(null)}>
        <div className='blis-modal-card' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
          <div className='modal-header' style={{ background: '#ecfdf5', borderBottom: '1px solid #a7f3d0' }}>
            <div>
              <h3 style={{ color: '#065f46' }}><i className='fas fa-check-circle' style={{ color: '#10b981' }}></i> Account Created Successfully</h3>
              <small style={{ color: '#047857' }}>Active in BLIS Institutional User Registry</small>
            </div>
            <button className='modal-close' onClick={() => setCreatedAccountInfo(null)}>×</button>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div className='flexSB' style={{ padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>Full Name:</span>
                <strong>{createdAccountInfo.name}</strong>
              </div>
              <div className='flexSB' style={{ padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>System Role:</span>
                <span className={`staff-role-badge role-${createdAccountInfo.role}`}>{createdAccountInfo.roleTitle}</span>
              </div>
              <div className='flexSB' style={{ padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>Login Username:</span>
                <strong style={{ color: '#00a884', fontSize: '15px' }}>{createdAccountInfo.username}</strong>
              </div>
              <div className='flexSB' style={{ padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>Official Email:</span>
                <strong style={{ color: '#2563eb' }}>{createdAccountInfo.email}</strong>
              </div>
              <div className='flexSB' style={{ padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>Password:</span>
                <strong>{createdAccountInfo.password || "password123"}</strong>
              </div>
              <div className='flexSB' style={{ padding: '6px 0' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>Assigned Classes:</span>
                <span style={{ fontWeight: '600', color: '#071626' }}>
                  {createdAccountInfo.assignedClasses && createdAccountInfo.assignedClasses.length > 0
                    ? createdAccountInfo.assignedClasses.join(", ")
                    : "All Classes"}
                </span>
              </div>
            </div>

            <div style={{ background: '#eff6ff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '13px', color: '#1e40af', marginBottom: '18px' }}>
              <i className='fas fa-info-circle' style={{ marginRight: '6px' }}></i>
              <strong>Login Ready:</strong> The staff member can now log into the BLIS Portal using either their <strong>Username ("{createdAccountInfo.username}")</strong> or <strong>Official Email</strong> with password <strong>"{createdAccountInfo.password || "password123"}"</strong>.
            </div>

            <div className='modal-actions' style={{ justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type='button'
                className='outline-btn'
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `BLIS Portal Login Credentials:\nName: ${createdAccountInfo.name}\nUsername: ${createdAccountInfo.username}\nEmail: ${createdAccountInfo.email}\nPassword: ${createdAccountInfo.password || "password123"}\nRole: ${createdAccountInfo.roleTitle}`
                  )
                  showToast("Credentials copied to clipboard!")
                }}
              >
                <i className='fas fa-copy'></i> Copy Credentials
              </button>
              <button
                type='button'
                className='primary-btn'
                style={{ background: '#00a884', color: '#fff' }}
                onClick={() => setCreatedAccountInfo(null)}
              >
                <i className='fas fa-check'></i> Done
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Modal: Show credentials for newly registered scholar and parent
  const renderCreatedStudentCredentialsModal = () => {
    if (!createdStudentCredentials) return null
    const c = createdStudentCredentials
    const parentLoginId =
      c.parentPhone && c.parentPhone !== "On File"
        ? c.parentPhone
        : c.parentEmail && c.parentEmail !== "On File"
        ? c.parentEmail
        : c.parentUsername

    const origin = typeof window !== "undefined" ? window.location.origin : "https://brighterland.sch.ng"
    const whatsappMessage = `*BRIGHTER LAND INTERNATIONAL SCHOOL (BLIS)*
Official Student & Parent Portal Activation

Dear ${c.parentName},
Your ward, *${c.studentName}*, has been registered in *${c.grade}* at Brighter Land International School for the 2026/2027 Academic Session!

📱 *PARENT WARD PORTAL LOGIN:*
- Portal Link: ${origin}/portal
- Login Identifier (Phone / Email / Username): ${parentLoginId}
- Password: ${c.parentPassword}
(Log in to view terminal report cards, continuous assessment scores, attendance logs, and First Bank tuition receipts. If you have multiple children at BLIS, all wards are accessible under this single login!)

🎓 *SCHOLAR PORTAL LOGIN:*
- Student ID: ${c.studentId}
- Username: ${c.studentUsername}
- Password: ${c.studentPassword}

Motto: "Study to Make Impact"
📍 Gura-suga, Opposite Police Staff College Jos
📞 +234 803 436 7951`

    return (
      <div className='blis-modal-overlay' onClick={() => setCreatedStudentCredentials(null)}>
        <div className='blis-modal-card' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
          <div className='modal-header' style={{ background: '#ecfdf5', borderBottom: '1px solid #a7f3d0' }}>
            <div>
              <h3 style={{ color: '#065f46' }}>
                <i className='fas fa-user-check' style={{ color: '#10b981', marginRight: '8px' }}></i>
                Scholar & Parent Portal Credentials
              </h3>
              <small style={{ color: '#047857' }}>
                {c.studentName} enrolled in {c.grade} • Ready for Immediate Portal Sign-In
              </small>
            </div>
            <button className='modal-close' onClick={() => setCreatedStudentCredentials(null)}>×</button>
          </div>

          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              {/* Scholar Account Box */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    <i className='fas fa-user-graduate'></i>
                  </div>
                  <div>
                    <strong style={{ fontSize: '14px', color: '#071626' }}>Scholar Account</strong>
                    <small style={{ display: 'block', color: '#64748b' }}>{c.grade}</small>
                  </div>
                </div>
                <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                  <div><span style={{ color: '#64748b' }}>Name:</span> <strong>{c.studentName}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Student ID:</span> <strong style={{ color: '#00a884' }}>{c.studentId}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Username:</span> <strong>{c.studentUsername}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Password:</span> <code>{c.studentPassword}</code></div>
                </div>
              </div>

              {/* Parent Account Box */}
              <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    <i className='fas fa-user-friends'></i>
                  </div>
                  <div>
                    <strong style={{ fontSize: '14px', color: '#071626' }}>Parent Portal Account</strong>
                    <small style={{ display: 'block', color: '#16a34a' }}>Linked to {c.studentName}</small>
                  </div>
                </div>
                <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                  <div><span style={{ color: '#64748b' }}>Guardian:</span> <strong>{c.parentName}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Phone / Login:</span> <strong style={{ color: '#15803d' }}>{c.parentPhone}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Email:</span> <strong style={{ color: '#2563eb' }}>{c.parentEmail}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Password:</span> <code>{c.parentPassword}</code></div>
                </div>
              </div>
            </div>

            <div style={{ background: '#eff6ff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '13px', color: '#1e40af', marginBottom: '18px' }}>
              <i className='fas fa-info-circle' style={{ marginRight: '6px' }}></i>
              <strong>Seamless Login & Connectivity:</strong> The parent can sign in using their <strong>Phone Number ({c.parentPhone})</strong>, <strong>Email</strong>, or <strong>Username</strong> with password <strong>"{c.parentPassword}"</strong>. Parents with multiple enrolled children will automatically see all their wards with a 1-click ward switcher!
            </div>

            <div className='modal-actions' style={{ justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type='button'
                className='primary-btn'
                style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}
                onClick={() => {
                  navigator.clipboard?.writeText(whatsappMessage)
                  showToast("Parent WhatsApp/SMS invite copied to clipboard!")
                }}
              >
                <i className='fab fa-whatsapp'></i> Copy Parent WhatsApp / SMS
              </button>
              <button
                type='button'
                className='outline-btn'
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `BLIS Scholar Login:\nStudent: ${c.studentName}\nID: ${c.studentId}\nUsername: ${c.studentUsername}\nPassword: ${c.studentPassword}`
                  )
                  showToast("Scholar login credentials copied!")
                }}
              >
                <i className='fas fa-copy'></i> Copy Scholar Login
              </button>
              <button type='button' className='outline-btn' onClick={() => setCreatedStudentCredentials(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Modal: Enter / Update Continuous Assessment Score
  const renderAddScoreModal = () => {
    if (!showAddScoreModal) return null
    const a1 = newScoreForm.assign1 !== "" ? Math.min(10, Math.max(0, Number(newScoreForm.assign1) || 0)) : 0
    const a2 = newScoreForm.assign2 !== "" ? Math.min(10, Math.max(0, Number(newScoreForm.assign2) || 0)) : 0
    const t1 = newScoreForm.test1 !== "" ? Math.min(10, Math.max(0, Number(newScoreForm.test1) || 0)) : 0
    const t2 = newScoreForm.test2 !== "" ? Math.min(10, Math.max(0, Number(newScoreForm.test2) || 0)) : 0
    const ex = newScoreForm.exam !== "" ? Math.min(60, Math.max(0, Number(newScoreForm.exam) || 0)) : 0
    const previewCa = a1 + a2 + t1 + t2
    const previewTotal = previewCa + ex

    const availableSubjects = getSubjectsForClass(newScoreForm.gradeLevel)
    const isSubjectInList = availableSubjects.includes(newScoreForm.subject)

    return (
      <div className='blis-modal-overlay' onClick={() => setShowAddScoreModal(false)}>
        <div className='blis-modal-card' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '660px' }}>
          <div className='modal-header'>
            <div>
              <h3>{newScoreForm.isEditingExisting ? "Update Assessment Score" : "Log Continuous Assessment Score"}</h3>
              <small>NERDC / WAEC Evaluation (CA 40% + Terminal Exam 60%)</small>
            </div>
            <button className='modal-close' onClick={() => setShowAddScoreModal(false)}>×</button>
          </div>

          <form onSubmit={handleAddScoreSubmit} className='modal-form'>
            {/* Status indicator: Shows whether an existing record was loaded or new entry */}
            {newScoreForm.isEditingExisting ? (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className='fas fa-edit' style={{ color: '#2563eb', fontSize: '18px' }}></i>
                <div>
                  <strong style={{ color: '#1e40af', fontSize: '13px' }}>
                    Existing Record Found for {newScoreForm.studentName || "Scholar"} ({newScoreForm.subject} • {newScoreForm.gradeLevel})
                  </strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#3b82f6' }}>
                    Previously recorded scores are loaded below. Adjust any assignment, test, or exam marks and click "Update Assessment Score" to save changes.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', marginBottom: '14px', fontSize: '12px', color: '#64748b' }}>
                <i className='fas fa-info-circle' style={{ color: '#00a884', marginRight: '6px' }}></i>
                Select an enrolled scholar, class division, and subject discipline to record assessment scores.
              </div>
            )}

            <div className='form-row'>
              <div className='form-group'>
                <label>Scholar Name *</label>
                {students.length > 0 ? (
                  <select
                    value={newScoreForm.studentId}
                    onChange={(e) => handleScoreFormStudentChange(e.target.value)}
                  >
                    <option value=''>-- Select Enrolled Scholar --</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>{st.name} ({st.grade} • {st.id})</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type='text'
                    required
                    placeholder='e.g. Victor Sylva or Amina Bello'
                    value={newScoreForm.studentName}
                    onChange={(e) => setNewScoreForm({ ...newScoreForm, studentName: e.target.value })}
                  />
                )}
                {students.length > 0 && !newScoreForm.studentId && (
                  <input
                    type='text'
                    style={{ marginTop: '8px' }}
                    placeholder='Or enter custom scholar name...'
                    value={newScoreForm.studentName}
                    onChange={(e) => setNewScoreForm({ ...newScoreForm, studentName: e.target.value })}
                  />
                )}
              </div>

              <div className='form-group'>
                <label>Class Division *</label>
                <select
                  value={newScoreForm.gradeLevel}
                  onChange={(e) => handleScoreFormClassChange(e.target.value)}
                >
                  {availableSchoolClasses.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className='form-group'>
              <label>Subject Discipline *</label>
              {!customSubjectActive ? (
                <div className='flex' style={{ gap: '8px' }}>
                  <select
                    value={newScoreForm.subject}
                    onChange={(e) => handleScoreFormSubjectChange(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    {!isSubjectInList && newScoreForm.subject && (
                      <option value={newScoreForm.subject}>{newScoreForm.subject} (Custom)</option>
                    )}
                    {availableSubjects.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                    <option value='__custom__'>+ Enter Custom Subject...</option>
                  </select>
                  <button
                    type='button'
                    className='outline-btn'
                    style={{ whiteSpace: 'nowrap', padding: '0 12px', fontSize: '12px' }}
                    onClick={() => setCustomSubjectActive(true)}
                  >
                    Custom
                  </button>
                </div>
              ) : (
                <div className='flex' style={{ gap: '8px' }}>
                  <input
                    type='text'
                    required
                    placeholder='e.g. Further Mathematics or Technical Drawing'
                    value={newScoreForm.subject}
                    onChange={(e) => handleScoreFormSubjectChange(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type='button'
                    className='outline-btn'
                    style={{ whiteSpace: 'nowrap', padding: '0 12px', fontSize: '12px' }}
                    onClick={() => setCustomSubjectActive(false)}
                  >
                    Back to List
                  </button>
                </div>
              )}
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: '10px 0' }}>
              <label style={{ fontWeight: '700', color: '#071626', display: 'block', marginBottom: '8px' }}>
                Continuous Assessment (40 Marks Breakdown):
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div>
                  <small style={{ display: 'block', color: '#64748b' }}>1st Assign (/10)</small>
                  <input
                    type='number'
                    min='0'
                    max='10'
                    placeholder='0-10'
                    value={newScoreForm.assign1}
                    onChange={(e) => setNewScoreForm({ ...newScoreForm, assign1: e.target.value })}
                  />
                </div>
                <div>
                  <small style={{ display: 'block', color: '#64748b' }}>2nd Assign (/10)</small>
                  <input
                    type='number'
                    min='0'
                    max='10'
                    placeholder='0-10'
                    value={newScoreForm.assign2}
                    onChange={(e) => setNewScoreForm({ ...newScoreForm, assign2: e.target.value })}
                  />
                </div>
                <div>
                  <small style={{ display: 'block', color: '#64748b' }}>1st Test (/10)</small>
                  <input
                    type='number'
                    min='0'
                    max='10'
                    placeholder='0-10'
                    value={newScoreForm.test1}
                    onChange={(e) => setNewScoreForm({ ...newScoreForm, test1: e.target.value })}
                  />
                </div>
                <div>
                  <small style={{ display: 'block', color: '#64748b' }}>2nd Test (/10)</small>
                  <input
                    type='number'
                    min='0'
                    max='10'
                    placeholder='0-10'
                    value={newScoreForm.test2}
                    onChange={(e) => setNewScoreForm({ ...newScoreForm, test2: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className='form-row'>
              <div className='form-group'>
                <label>Terminal Examination (/60) *</label>
                <input
                  type='number'
                  min='0'
                  max='60'
                  placeholder='0-60'
                  value={newScoreForm.exam}
                  onChange={(e) => setNewScoreForm({ ...newScoreForm, exam: e.target.value })}
                />
              </div>
              <div className='form-group'>
                <label>Score Summary Preview</label>
                <div style={{ background: '#ecfdf5', padding: '10px 14px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                  <strong style={{ color: '#065f46', fontSize: '15px' }}>
                    CA: {previewCa}/40 + Exam: {ex}/60 = {previewTotal}%
                  </strong>
                </div>
              </div>
            </div>

            <div className='form-group'>
              <label>Teacher Remarks</label>
              <input
                type='text'
                placeholder='e.g. Excellent computational accuracy and diligence.'
                value={newScoreForm.remarks}
                onChange={(e) => setNewScoreForm({ ...newScoreForm, remarks: e.target.value })}
              />
            </div>

            <div className='modal-actions'>
              <button type='button' className='outline-btn' onClick={() => setShowAddScoreModal(false)}>Cancel</button>
              <button type='submit' className='primary-btn'>
                <i className={newScoreForm.isEditingExisting ? 'fas fa-save' : 'fas fa-plus'}></i> {newScoreForm.isEditingExisting ? "Update Assessment Score" : "Log Continuous Assessment Score"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Modal: Generate New Fee Invoice
  const renderAddInvoiceModal = () => {
    if (!showAddInvoiceModal) return null
    return (
      <div className='blis-modal-overlay' onClick={() => setShowAddInvoiceModal(false)}>
        <div className='blis-modal-card' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
          <div className='modal-header'>
            <div>
              <h3>Generate Section A Fee Invoice</h3>
              <small>First Bank Account: 2043561832 • Brighter Land International School</small>
            </div>
            <button className='modal-close' onClick={() => setShowAddInvoiceModal(false)}>×</button>
          </div>
          <form onSubmit={handleAddInvoiceSubmit} className='modal-form'>
            <div className='form-group'>
              <label>Scholar Name *</label>
              {students.length > 0 ? (
                <select
                  value={newInvoiceForm.studentId}
                  onChange={(e) => {
                    const selId = e.target.value
                    const st = students.find((s) => s.id === selId)
                    setNewInvoiceForm({
                      ...newInvoiceForm,
                      studentId: selId,
                      studentName: st ? st.name : "",
                      grade: st ? st.grade : newInvoiceForm.grade,
                    })
                  }}
                >
                  <option value=''>-- Select Enrolled Scholar --</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>{st.name} ({st.grade})</option>
                  ))}
                </select>
              ) : (
                <input
                  type='text'
                  required
                  placeholder='e.g. Victor Sylva or Zainab Aliyu'
                  value={newInvoiceForm.studentName}
                  onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, studentName: e.target.value })}
                />
              )}
              {students.length > 0 && !newInvoiceForm.studentId && (
                <input
                  type='text'
                  style={{ marginTop: '8px' }}
                  placeholder='Or enter custom scholar name...'
                  value={newInvoiceForm.studentName}
                  onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, studentName: e.target.value })}
                />
              )}
            </div>

            <div className='form-row'>
              <div className='form-group'>
                <label>Academic Class Level *</label>
                <select
                  value={newInvoiceForm.grade}
                  onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, grade: e.target.value })}
                >
                  {availableSchoolClasses.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
              <div className='form-group'>
                <label>Term Period</label>
                <select
                  value={newInvoiceForm.term}
                  onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, term: e.target.value })}
                >
                  <option value='Term 1 (2026/2027)'>Term 1 (2026/2027)</option>
                  <option value='Term 2 (2026/2027)'>Term 2 (2026/2027)</option>
                  <option value='Term 3 (2026/2027)'>Term 3 (2026/2027)</option>
                </select>
              </div>
            </div>

            <div className='modal-actions'>
              <button type='button' className='outline-btn' onClick={() => setShowAddInvoiceModal(false)}>Cancel</button>
              <button type='submit' className='primary-btn'>Issue Tuition Invoice</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Modal: Add Admissions Applicant
  const renderAddApplicantModal = () => {
    if (!showAddApplicantModal) return null
    return (
      <div className='blis-modal-overlay' onClick={() => setShowAddApplicantModal(false)}>
        <div className='blis-modal-card' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
          <div className='modal-header'>
            <div>
              <h3>Register Prospective Applicant</h3>
              <small>Admissions & Entrance Evaluation Pipeline</small>
            </div>
            <button className='modal-close' onClick={() => setShowAddApplicantModal(false)}>×</button>
          </div>
          <form onSubmit={handleAddApplicantSubmit} className='modal-form'>
            <div className='form-group'>
              <label>Candidate Full Name *</label>
              <input
                type='text'
                required
                placeholder='e.g. Grace Emeka'
                value={newApplicantForm.studentName}
                onChange={(e) => setNewApplicantForm({ ...newApplicantForm, studentName: e.target.value })}
              />
            </div>

            <div className='form-row'>
              <div className='form-group'>
                <label>Class Applying For *</label>
                <select
                  value={newApplicantForm.gradeApplied}
                  onChange={(e) => setNewApplicantForm({ ...newApplicantForm, gradeApplied: e.target.value })}
                >
                  {availableSchoolClasses.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
              <div className='form-group'>
                <label>Parent / Guardian Name</label>
                <input
                  type='text'
                  placeholder='e.g. Mr. & Mrs. Emeka'
                  value={newApplicantForm.parentName}
                  onChange={(e) => setNewApplicantForm({ ...newApplicantForm, parentName: e.target.value })}
                />
              </div>
            </div>

            <div className='form-group'>
              <label>Contact Phone Number</label>
              <input
                type='tel'
                placeholder='e.g. +234 803 123 4567'
                value={newApplicantForm.phone}
                onChange={(e) => setNewApplicantForm({ ...newApplicantForm, phone: e.target.value })}
              />
            </div>

            <div className='form-group'>
              <label>Assessment Notes</label>
              <input
                type='text'
                value={newApplicantForm.notes}
                onChange={(e) => setNewApplicantForm({ ...newApplicantForm, notes: e.target.value })}
              />
            </div>

            <div className='modal-actions'>
              <button type='button' className='outline-btn' onClick={() => setShowAddApplicantModal(false)}>Cancel</button>
              <button type='submit' className='primary-btn'>Add to Admissions Pipeline</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Dynamic Teacher Schedule Resolver: Resolves real teaching slots for a teacher based on their assigned classes & subjects
  const getTeacherPeriodsForDay = (teacher, dayKey, currentTimetables) => {
    if (!teacher) return []
    const assignedCls = teacher.assignedClasses && Array.isArray(teacher.assignedClasses) && teacher.assignedClasses.length > 0
      ? teacher.assignedClasses
      : []

    // If teacher has "All Classes" or empty, match across all classes
    const targetClasses = assignedCls.includes("All Classes") || assignedCls.length === 0
      ? availableSchoolClasses
      : assignedCls

    const rawTeacherSub = (teacher.assignedSubjects || "").toLowerCase()
    const teacherSubjects = rawTeacherSub
      .split(/[,&/]/)
      .map((s) => s.trim())
      .filter(Boolean)

    const isGeneralTeacher = teacherSubjects.length === 0 || 
      teacherSubjects.some((s) => s.includes("all") || s.includes("general") || s.includes("curriculum") || s.includes("homeroom"))

    const results = []

    targetClasses.forEach((cls) => {
      const classSchedule = (currentTimetables && currentTimetables[cls]) || generateDefaultTimetable(cls)
      if (!Array.isArray(classSchedule)) return

      classSchedule.forEach((row, idx) => {
        const slotSubject = (row && row[dayKey]) ? String(row[dayKey]).trim() : ""
        const sLower = slotSubject.toLowerCase()
        if (!sLower) return

        // Exclude breaks / recesses / lunch / closing
        if (
          sLower.includes("recess") ||
          sLower.includes("break") ||
          sLower.includes("lunch") ||
          sLower.includes("snack") ||
          sLower.includes("nap") ||
          sLower.includes("dismissal") ||
          sLower.includes("closing")
        ) {
          return
        }

        let isMatch = false
        if (isGeneralTeacher) {
          isMatch = true
        } else {
          isMatch = teacherSubjects.some((ts) => {
            if (sLower.includes(ts) || ts.includes(sLower)) return true
            // Match key root words (e.g. "math" matches "mathematics", "quant" matches "quantitative")
            const root = ts.replace(/s$/, "")
            if (root.length >= 4 && sLower.includes(root)) return true
            return false
          })
        }

        if (isMatch) {
          results.push({
            periodIndex: idx + 1,
            period: row.period || `Period ${idx + 1}`,
            className: cls,
            subject: slotSubject,
            day: dayKey,
          })
        }
      })
    })

    return results
  }

  // Timetable Management Handlers (Admin / Proprietor)
  const handleSavePeriod = (e) => {
    if (e) e.preventDefault()
    if (!periodFormData.period.trim()) {
      showToast("Please provide a period label or time interval.")
      return
    }

    const currentSchedule = [
      ...(timetables[selectedTimetableClass] || generateDefaultTimetable(selectedTimetableClass)),
    ]

    if (editingPeriodIndex !== null && editingPeriodIndex >= 0 && editingPeriodIndex < currentSchedule.length) {
      currentSchedule[editingPeriodIndex] = { ...periodFormData }
    } else {
      currentSchedule.push({ ...periodFormData })
    }

    const updated = {
      ...timetables,
      [selectedTimetableClass]: currentSchedule,
    }

    setTimetables(updated)
    try {
      localStorage.setItem("blis_timetable_data", JSON.stringify(updated))
    } catch (err) {
      console.error("Storage error saving timetable:", err)
    }

    setShowPeriodModal(false)
    showToast(
      editingPeriodIndex !== null
        ? `Updated period in ${selectedTimetableClass} timetable!`
        : `Added new period to ${selectedTimetableClass} timetable!`
    )
  }

  const handleDeletePeriod = (className, index) => {
    if (window.confirm(`Are you sure you want to remove this period from the ${className} timetable?`)) {
      const currentSchedule = [
        ...(timetables[className] || generateDefaultTimetable(className)),
      ]
      currentSchedule.splice(index, 1)
      const updated = {
        ...timetables,
        [className]: currentSchedule,
      }
      setTimetables(updated)
      try {
        localStorage.setItem("blis_timetable_data", JSON.stringify(updated))
      } catch (err) {}
      showToast(`Period deleted from ${className} timetable.`)
    }
  }

  const handleResetClassTimetable = (className) => {
    if (window.confirm(`Reset ${className} timetable to the standard BLIS curriculum schedule? This will restore official periods and subjects.`)) {
      const standardSchedule = generateDefaultTimetable(className)
      const updated = {
        ...timetables,
        [className]: standardSchedule,
      }
      setTimetables(updated)
      try {
        localStorage.setItem("blis_timetable_data", JSON.stringify(updated))
      } catch (err) {}
      showToast(`${className} timetable reset to standard schedule.`)
    }
  }

  // Modal: Add or Edit Period in Timetable
  const renderPeriodModal = () => {
    if (!showPeriodModal) return null
    const classSubjects = getSubjectsForClass(selectedTimetableClass)

    return (
      <div className='blis-modal-overlay' onClick={() => setShowPeriodModal(false)}>
        <div className='blis-modal-card' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
          <div className='modal-header'>
            <div>
              <h3>
                <i className='fas fa-calendar-alt' style={{ color: '#00a884', marginRight: '8px' }}></i>
                {editingPeriodIndex !== null ? "Edit Timetable Period" : "Add Period to Timetable"}
              </h3>
              <small>Class: <strong>{selectedTimetableClass}</strong> • Master Schedule Management</small>
            </div>
            <button className='modal-close' onClick={() => setShowPeriodModal(false)}>×</button>
          </div>

          <form onSubmit={handleSavePeriod} className='modal-form'>
            <div className='form-group'>
              <label>Period Label & Time Interval *</label>
              <input
                type='text'
                required
                placeholder='e.g. Period 1 (08:00 - 08:45) or Lunch Break (13:00 - 13:40)'
                value={periodFormData.period}
                onChange={(e) => setPeriodFormData({ ...periodFormData, period: e.target.value })}
              />
              <div className='quick-period-pills flex' style={{ gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                <small style={{ color: '#64748b', alignSelf: 'center', marginRight: '4px' }}>Quick Presets:</small>
                {[
                  "Period 1 (08:00 - 08:45)",
                  "Period 2 (08:45 - 09:30)",
                  "Period 3 (09:30 - 10:15)",
                  "Breakfast Break (10:15 - 10:45)",
                  "Period 4 (10:45 - 11:30)",
                  "Period 5 (11:30 - 12:15)",
                  "Period 6 (12:15 - 13:00)",
                  "Lunch Break (13:00 - 13:40)",
                  "Lesson Period (13:40 - 14:40)",
                ].map((pText) => (
                  <button
                    key={pText}
                    type='button'
                    className='outline-btn'
                    style={{ fontSize: '11px', padding: '2px 8px' }}
                    onClick={() => setPeriodFormData({ ...periodFormData, period: pText })}
                  >
                    {pText.split(" ")[0]} {pText.split(" ")[1] || ""}
                  </button>
                ))}
              </div>
            </div>

            <datalist id='class-subject-options'>
              {classSubjects.map((sub) => (
                <option key={sub} value={sub} />
              ))}
              <option value='Lunch Recess' />
              <option value='Recess Break' />
              <option value='Assembly & Recess' />
              <option value='Compulsory Lesson' />
              <option value='Co-Curricular Clubs' />
            </datalist>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '8px' }}>
              <h4 style={{ fontSize: '13px', color: '#0f172a', marginBottom: '10px' }}>
                <i className='fas fa-book' style={{ color: '#2563eb', marginRight: '6px' }}></i>
                Weekday Subject Allocations ({selectedTimetableClass})
              </h4>

              <div className='form-row'>
                <div className='form-group'>
                  <label>Monday Subject *</label>
                  <input
                    type='text'
                    list='class-subject-options'
                    required
                    placeholder='e.g. Mathematics'
                    value={periodFormData.mon}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, mon: e.target.value })}
                  />
                </div>
                <div className='form-group'>
                  <label>Tuesday Subject *</label>
                  <input
                    type='text'
                    list='class-subject-options'
                    required
                    placeholder='e.g. English Language'
                    value={periodFormData.tue}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, tue: e.target.value })}
                  />
                </div>
              </div>

              <div className='form-row'>
                <div className='form-group'>
                  <label>Wednesday Subject *</label>
                  <input
                    type='text'
                    list='class-subject-options'
                    required
                    placeholder='e.g. Basic Science'
                    value={periodFormData.wed}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, wed: e.target.value })}
                  />
                </div>
                <div className='form-group'>
                  <label>Thursday Subject *</label>
                  <input
                    type='text'
                    list='class-subject-options'
                    required
                    placeholder='e.g. Computer Studies'
                    value={periodFormData.thu}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, thu: e.target.value })}
                  />
                </div>
              </div>

              <div className='form-group'>
                <label>Friday Subject *</label>
                <input
                  type='text'
                  list='class-subject-options'
                  required
                  placeholder='e.g. Physical & Health Education (PHE)'
                  value={periodFormData.fri}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, fri: e.target.value })}
                />
              </div>
            </div>

            <div className='modal-actions' style={{ marginTop: '16px' }}>
              <button type='button' className='outline-btn' onClick={() => setShowPeriodModal(false)}>
                Cancel
              </button>
              <button type='submit' className='primary-btn'>
                <i className='fas fa-save'></i> {editingPeriodIndex !== null ? "Update Period Schedule" : "Add to Timetable"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Render Login Screen if not authenticated
  if (!currentUser) {
    return (
      <div className='portal-login-screen'>
        {renderAddStaffModal()}
        {renderCreatedAccountModal()}
        <div className='portal-login-card'>
          {/* Left Showcase Panel */}
          <div className='login-showcase-panel'>
            <div>
              <div className='login-brand-header'>
                <img src='/images/logo.png' alt="Brighter Land International School" />
                <div className='login-brand-text'>
                  <h2>BRIGHTER LAND</h2>
                  <span>International School ERP & SIS</span>
                </div>
              </div>

              <div className='login-showcase-content'>
                <h3>Institutional Portal Access</h3>
                <p>
                  Secure role-based enterprise environment for Proprietor oversight, Principal administration, Class teachers, Bursary accounting, Parents, and Scholars.
                </p>
                <ul className='login-security-features'>
                  <li><i className='fas fa-lock'></i> Encrypted Role & Class Isolation</li>
                  <li><i className='fas fa-user-check'></i> Dedicated Dashboards per Staff Function</li>
                  <li><i className='fas fa-graduation-cap'></i> Continuous Assessment & WAEC Gradebook</li>
                  <li><i className='fas fa-university'></i> First Bank Direct Tuition Verification</li>
                </ul>
              </div>
            </div>

            <div className='login-showcase-footer'>
              <span>© 2026 Brighter Land Int'l School</span>
              <Link to='/' style={{ color: '#34d399', textDecoration: 'none', fontWeight: '700' }}>
                <i className='fas fa-arrow-left'></i> Return to Public Site
              </Link>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className='login-form-panel'>
            <div className='login-form-title'>
              <h3>Sign In to Your Dashboard</h3>
              <p>Enter your assigned staff, parent, or scholar credentials.</p>
            </div>

            {loginError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                <i className='fas fa-exclamation-circle'></i> {loginError}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className='login-form-group'>
                <label>Username or Official Email</label>
                <div className='login-input-field'>
                  <i className='fas fa-user'></i>
                  <input
                    type='text'
                    required
                    placeholder='e.g. principal or admin@brighterland.sch.ng'
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                  />
                </div>
              </div>

              <div className='login-form-group'>
                <label>Password</label>
                <div className='login-input-field'>
                  <i className='fas fa-key'></i>
                  <input
                    type='password'
                    required
                    placeholder='Enter your password'
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
              </div>

              <button type='submit' className='login-btn-submit'>
                <i className='fas fa-sign-in-alt'></i> Secure Portal Login
              </button>

              <div style={{ marginTop: '14px', textAlign: 'center', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
                <i className='fas fa-user-shield' style={{ color: '#00a884', marginRight: '6px' }}></i>
                Institutional Security: Staff, Student & Parent accounts are provisioned exclusively by the School Administrator.
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', margin: '12px 0 0 0', fontSize: '12px', flexWrap: 'wrap' }}>
                <button
                  type='button'
                  onClick={() => setShowAddStaffModal(true)}
                  style={{ background: 'none', border: 'none', color: '#00a884', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px', padding: 0 }}
                  title='Register a new staff, teacher or proprietor account'
                >
                  <i className='fas fa-user-plus'></i> Register Staff / Executive
                </button>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <button
                  type='button'
                  onClick={handleExportDatabase}
                  style={{ background: 'none', border: 'none', color: '#00a884', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px', padding: 0 }}
                  title='Download full school database backup file'
                >
                  <i className='fas fa-download'></i> Backup Database
                </button>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <label
                  style={{ background: 'none', border: 'none', color: '#00a884', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px', margin: 0 }}
                  title='Sync custom accounts and data from another browser backup'
                >
                  <i className='fas fa-upload'></i> Restore Backup
                  <input type='file' accept='.json' style={{ display: 'none' }} onChange={handleImportDatabase} />
                </label>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='blis-portal-wrapper'>
      {/* Unified Responsive Top Navbar */}
      <header className='portal-top-bar'>
        <div className='portal-top-left'>
          {/* Mobile Menu Hamburger Toggle */}
          <button
            type='button'
            className={`portal-hamburger-btn ${mobileSidebarOpen ? "is-active" : ""}`}
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            aria-label={mobileSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            title={mobileSidebarOpen ? "Close menu" : "Open menu"}
          >
            <i className={mobileSidebarOpen ? 'fas fa-times' : 'fas fa-bars'}></i>
            <span className='hamburger-label'>Menu</span>
          </button>

          {/* School Brand Identity */}
          <div className='portal-brand-wrap'>
            <div className='portal-logo-icon'>
              <img src='/images/logo.png' alt="Brighter Land Int'l School" />
            </div>
            <div className='portal-brand-text'>
              <h3 className='portal-school-name'>BRIGHTER LAND INTERNATIONAL SCHOOL</h3>
              <div className='portal-brand-sub'>
                <span className='portal-sub-system'>OPERATIONS ERP & STUDENT INFORMATION SYSTEM</span>
                <span className='portal-sub-sep'>•</span>
                <span className='portal-session-tag'>2026/2027 SESSION</span>
              </div>
            </div>
          </div>

          {/* Active Section Breadcrumb Badge (Desktop & Tablet) */}
          <div className='portal-active-tab-badge' title={`Current View: ${getActiveTabTitle(activeTab)}`}>
            <i className={getActiveTabIcon(activeTab)}></i>
            <span>{getActiveTabTitle(activeTab)}</span>
          </div>
        </div>

        <div className='portal-top-right'>
          {/* Authenticated User Profile Pill */}
          <div className='active-user-pill' title={`Logged in as ${currentUser.name} • ${currentUser.roleTitle}`}>
            <div className='active-user-avatar'>
              <i className={getRoleIcon(currentUser.role)}></i>
            </div>
            <div className='active-user-details'>
              <span className='active-user-name'>{currentUser.name}</span>
              <span className='active-user-role'>{currentUser.roleTitle}</span>
            </div>
          </div>

          {/* Public Website Button */}
          <Link to='/' className='exit-portal-btn' title='Return to Public School Website'>
            <i className='fas fa-globe'></i>
            <span className='btn-text'>Public Site</span>
          </Link>

          {/* Sign Out Button */}
          <button onClick={handleLogout} className='logout-portal-btn' title='Sign out of your dashboard'>
            <i className='fas fa-sign-out-alt'></i>
            <span className='btn-text'>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className='portal-container'>
        {/* Backdrop for mobile drawer */}
        {mobileSidebarOpen && (
          <div className='portal-mobile-backdrop' onClick={() => setMobileSidebarOpen(false)}></div>
        )}

        {/* Left Navigation Sidebar / Mobile Drawer */}
        <aside className={`portal-sidebar ${mobileSidebarOpen ? "mobile-open" : ""}`}>
          <div className='portal-sidebar-mobile-close'>
            <div className='sidebar-drawer-brand'>
              <span className='sdb-dot'></span>
              <span>BLIS DASHBOARDS</span>
            </div>
            <button
              type='button'
              className='sidebar-close-btn'
              onClick={() => setMobileSidebarOpen(false)}
              aria-label='Close Menu'
            >
              ✕
            </button>
          </div>
          <div className='user-profile-badge'>
            <div className='upb-avatar'>
              <i className={getRoleIcon(currentUser.role)}></i>
            </div>
            <div className='upb-info'>
              <h4>{currentUser.name}</h4>
              <small>{currentUser.roleTitle}</small>
              {currentUser.role === "teacher" && currentUser.assignedClasses && (
                <div style={{ marginTop: '5px' }}>
                  <span className='assigned-class-chip' style={{ background: '#00a884', color: '#fff', border: 'none' }}>
                    Classes: {currentUser.assignedClasses.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <nav className='portal-menu'>
            {/* 1. PROPRIETOR EXECUTIVE NAVIGATION */}
            {currentUser.role === "proprietor" && (
              <>
                <div className='sidebar-section-title'>ALL DASHBOARDS</div>
                <button
                  className={`menu-item ${activeTab === "proprietor-overview" ? "active" : ""}`}
                  onClick={() => handleTabSelect("proprietor-overview")}
                >
                  <i className='fas fa-crown'></i>
                  <span>Proprietor Executive View</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "dashboard" ? "active" : ""}`}
                  onClick={() => handleTabSelect("dashboard")}
                >
                  <i className='fas fa-tachometer-alt'></i>
                  <span>Operations ERP (Admin)</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "teacher-dashboard" ? "active" : ""}`}
                  onClick={() => handleTabSelect("teacher-dashboard")}
                >
                  <i className='fas fa-chalkboard-teacher'></i>
                  <span>Teacher Instruction Hub</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "bursary-command" ? "active" : ""}`}
                  onClick={() => handleTabSelect("bursary-command")}
                >
                  <i className='fas fa-file-invoice-dollar'></i>
                  <span>Bursary Command Center</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "parent-dashboard" ? "active" : ""}`}
                  onClick={() => handleTabSelect("parent-dashboard")}
                >
                  <i className='fas fa-user-friends'></i>
                  <span>Parent Ward Portal</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "student-dashboard" ? "active" : ""}`}
                  onClick={() => handleTabSelect("student-dashboard")}
                >
                  <i className='fas fa-user-graduate'></i>
                  <span>Student Scholar Portal</span>
                </button>

                <div className='sidebar-section-title' style={{ marginTop: '14px' }}>EXECUTIVE OVERSIGHT</div>
                <button
                  className={`menu-item ${activeTab === "staff-management" ? "active" : ""}`}
                  onClick={() => handleTabSelect("staff-management")}
                >
                  <i className='fas fa-users-cog'></i>
                  <span>Staff & Access Control</span>
                  <span className='menu-count'>{portalUsers.length}</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "finance" ? "active" : ""}`}
                  onClick={() => handleTabSelect("finance")}
                >
                  <i className='fas fa-file-invoice-dollar'></i>
                  <span>Bursary & Section A Fees</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "gradebook" ? "active" : ""}`}
                  onClick={() => handleTabSelect("gradebook")}
                >
                  <i className='fas fa-award'></i>
                  <span>Academic Telemetry & CA</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "timetable" ? "active" : ""}`}
                  onClick={() => handleTabSelect("timetable")}
                >
                  <i className='fas fa-calendar-alt'></i>
                  <span>Master Academic Calendar</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "notices" ? "active" : ""}`}
                  onClick={() => handleTabSelect("notices")}
                >
                  <i className='fas fa-bullhorn'></i>
                  <span>Official Board Directives</span>
                </button>
              </>
            )}

            {/* 2. ADMIN / PRINCIPAL NAVIGATION - ALL DASHBOARDS & OPERATIONS */}
            {currentUser.role === "admin" && (
              <>
                <div className='sidebar-section-title'>ALL DASHBOARDS</div>
                <button
                  className={`menu-item ${activeTab === "dashboard" ? "active" : ""}`}
                  onClick={() => handleTabSelect("dashboard")}
                >
                  <i className='fas fa-tachometer-alt'></i>
                  <span>Operations ERP (Admin)</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "proprietor-overview" ? "active" : ""}`}
                  onClick={() => handleTabSelect("proprietor-overview")}
                >
                  <i className='fas fa-crown'></i>
                  <span>Proprietor Executive View</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "teacher-dashboard" ? "active" : ""}`}
                  onClick={() => handleTabSelect("teacher-dashboard")}
                >
                  <i className='fas fa-chalkboard-teacher'></i>
                  <span>Teacher Instruction Hub</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "bursary-command" ? "active" : ""}`}
                  onClick={() => handleTabSelect("bursary-command")}
                >
                  <i className='fas fa-file-invoice-dollar'></i>
                  <span>Bursary Command Center</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "parent-dashboard" ? "active" : ""}`}
                  onClick={() => handleTabSelect("parent-dashboard")}
                >
                  <i className='fas fa-user-friends'></i>
                  <span>Parent Ward Portal</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "student-dashboard" ? "active" : ""}`}
                  onClick={() => handleTabSelect("student-dashboard")}
                >
                  <i className='fas fa-user-graduate'></i>
                  <span>Student Scholar Portal</span>
                </button>

                <div className='sidebar-section-title' style={{ marginTop: '14px' }}>ADMINISTRATION & MODULES</div>
                <button
                  className={`menu-item ${activeTab === "staff-management" ? "active" : ""}`}
                  onClick={() => handleTabSelect("staff-management")}
                >
                  <i className='fas fa-users-cog'></i>
                  <span>Staff & Access Control</span>
                  <span className='menu-count'>{portalUsers.length}</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "sis" ? "active" : ""}`}
                  onClick={() => handleTabSelect("sis")}
                >
                  <i className='fas fa-user-graduate'></i>
                  <span>Student Registry (SIS)</span>
                  <span className='menu-count'>{students.length}</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "gradebook" ? "active" : ""}`}
                  onClick={() => handleTabSelect("gradebook")}
                >
                  <i className='fas fa-award'></i>
                  <span>Gradebook & Terminal Reports</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "attendance" ? "active" : ""}`}
                  onClick={() => handleTabSelect("attendance")}
                >
                  <i className='fas fa-clipboard-check'></i>
                  <span>Daily Roll Call</span>
                  <span className='menu-pill green'>{dailyAttendanceRate}%</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "finance" ? "active" : ""}`}
                  onClick={() => handleTabSelect("finance")}
                >
                  <i className='fas fa-file-invoice-dollar'></i>
                  <span>Bursary & Section A Fees</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "admissions" ? "active" : ""}`}
                  onClick={() => handleTabSelect("admissions")}
                >
                  <i className='fas fa-user-plus'></i>
                  <span>Admissions Pipeline</span>
                  <span className='menu-count amber'>{applications.length}</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "timetable" ? "active" : ""}`}
                  onClick={() => handleTabSelect("timetable")}
                >
                  <i className='fas fa-calendar-alt'></i>
                  <span>Class Timetables</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "notices" ? "active" : ""}`}
                  onClick={() => handleTabSelect("notices")}
                >
                  <i className='fas fa-bullhorn'></i>
                  <span>Circulars & Notices</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "transport" ? "active" : ""}`}
                  onClick={() => handleTabSelect("transport")}
                >
                  <i className='fas fa-bus'></i>
                  <span>Bus Logistics</span>
                </button>
              </>
            )}

            {/* 3. TEACHER NAVIGATION (Class & Student Isolated) */}
            {currentUser.role === "teacher" && (
              <>
                <button
                  className={`menu-item ${activeTab === "teacher-dashboard" ? "active" : ""}`}
                  onClick={() => handleTabSelect("teacher-dashboard")}
                >
                  <i className='fas fa-chalkboard-teacher'></i>
                  <span>Faculty Command Center</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "attendance" ? "active" : ""}`}
                  onClick={() => handleTabSelect("attendance")}
                >
                  <i className='fas fa-clipboard-check'></i>
                  <span>Homeroom Roll Call</span>
                  <span className='menu-pill green'>
                    {currentUser.assignedClasses ? currentUser.assignedClasses.join(" & ") : "Assigned"}
                  </span>
                </button>

                <button
                  className={`menu-item ${activeTab === "gradebook" ? "active" : ""}`}
                  onClick={() => handleTabSelect("gradebook")}
                >
                  <i className='fas fa-edit'></i>
                  <span>Continuous Assessment</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "timetable" ? "active" : ""}`}
                  onClick={() => handleTabSelect("timetable")}
                >
                  <i className='fas fa-calendar-alt'></i>
                  <span>My Teaching Schedule</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "notices" ? "active" : ""}`}
                  onClick={() => handleTabSelect("notices")}
                >
                  <i className='fas fa-bullhorn'></i>
                  <span>Staff Circulars & Memos</span>
                </button>
              </>
            )}

            {/* 4. BURSARY / ACCOUNTS OFFICE (Non-Academic Staff) */}
            {currentUser.role === "bursary" && (
              <>
                <button
                  className={`menu-item ${activeTab === "bursary-command" ? "active" : ""}`}
                  onClick={() => handleTabSelect("bursary-command")}
                >
                  <i className='fas fa-file-invoice-dollar'></i>
                  <span>Bursary Command Center</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "finance" ? "active" : ""}`}
                  onClick={() => handleTabSelect("finance")}
                >
                  <i className='fas fa-receipt'></i>
                  <span>Tuition & Levies Invoices</span>
                  <span className='menu-count'>{invoices.length}</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "bursary-prospectus" ? "active" : ""}`}
                  onClick={() => setShowProspectusModal(true)}
                >
                  <i className='fas fa-book-open'></i>
                  <span>Approved Prospectus</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "notices" ? "active" : ""}`}
                  onClick={() => handleTabSelect("notices")}
                >
                  <i className='fas fa-bullhorn'></i>
                  <span>Bursary Circulars & Memos</span>
                </button>
              </>
            )}

            {/* 4b. INSTITUTIONAL & NON-ACADEMIC STAFF */}
            {currentUser.role === "staff" && (
              <>
                <button
                  className={`menu-item ${activeTab === "bus" || activeTab === "transport" ? "active" : ""}`}
                  onClick={() => handleTabSelect("bus")}
                >
                  <i className='fas fa-bus'></i>
                  <span>School Bus Fleet & Routes</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "attendance" ? "active" : ""}`}
                  onClick={() => handleTabSelect("attendance")}
                >
                  <i className='fas fa-clipboard-check'></i>
                  <span>Daily Homeroom Roll Call</span>
                </button>

                <button
                  className={`menu-item ${activeTab === "notices" ? "active" : ""}`}
                  onClick={() => handleTabSelect("notices")}
                >
                  <i className='fas fa-bullhorn'></i>
                  <span>Official Circulars</span>
                </button>
              </>
            )}

            {/* 5. PARENT NAVIGATION */}
            {currentUser.role === "parent" && (() => {
              const parentWard = getActiveParentWard(currentUser)
              const wardScores = parentWard ? gradebookData.filter((g) => g.studentId === parentWard.id || (g.studentName && g.studentName.toLowerCase().trim() === parentWard.name.toLowerCase().trim())) : []
              const wardGpa = wardScores.length > 0 ? (wardScores.reduce((acc, curr) => acc + parseFloat(calculateGradeInfo(curr).gpa), 0) / wardScores.length).toFixed(2) : null
              const wardInv = parentWard ? invoices.find((i) => i.studentId === parentWard.id) : null
              const feePill = wardInv ? (wardInv.status === "Paid" ? "Cleared" : "Due") : null

              return (
                <>
                  <button
                    className={`menu-item ${activeTab === "parent-dashboard" ? "active" : ""}`}
                    onClick={() => handleTabSelect("parent-dashboard")}
                  >
                    <i className='fas fa-home'></i>
                    <span>Ward Academic Hub</span>
                  </button>

                  <button
                    className={`menu-item ${activeTab === "parent-report" ? "active" : ""}`}
                    onClick={() => {
                      if (parentWard) {
                        setReportCardStudent(parentWard)
                      } else {
                        showToast("No enrolled ward found in the school registry.")
                      }
                    }}
                  >
                    <i className='fas fa-award'></i>
                    <span>Terminal Progress Report</span>
                    {wardGpa && <span className='menu-pill green'>GPA {wardGpa}</span>}
                  </button>

                  <button
                    className={`menu-item ${activeTab === "parent-fees" ? "active" : ""}`}
                    onClick={() => handleTabSelect("parent-fees")}
                  >
                    <i className='fas fa-file-invoice-dollar'></i>
                    <span>Bursary & Receipts</span>
                    {feePill && <span className={`menu-pill ${feePill === "Cleared" ? "green" : "amber"}`}>{feePill}</span>}
                  </button>

                  <button
                    className={`menu-item ${activeTab === "parent-attendance" ? "active" : ""}`}
                    onClick={() => handleTabSelect("parent-attendance")}
                  >
                    <i className='fas fa-user-check'></i>
                    <span>Attendance & Punctuality</span>
                    {parentWard && <span className='menu-pill green'>{parentWard.attendance || 100}%</span>}
                  </button>

                  <button
                    className={`menu-item ${activeTab === "timetable" ? "active" : ""}`}
                    onClick={() => handleTabSelect("timetable")}
                  >
                    <i className='fas fa-calendar-alt'></i>
                    <span>Ward Class Timetable</span>
                  </button>

                  <button
                    className={`menu-item ${activeTab === "notices" ? "active" : ""}`}
                    onClick={() => handleTabSelect("notices")}
                  >
                    <i className='fas fa-bullhorn'></i>
                    <span>PTA Notices & Circulars</span>
                  </button>
                </>
              )
            })()}

            {/* 6. STUDENT NAVIGATION */}
            {currentUser.role === "student" && (() => {
              const studentScholar = students.find((s) => (s.id && s.id === currentUser.id) || (s.name && s.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim())) || students[0]
              const scholarScores = studentScholar ? gradebookData.filter((g) => g.studentId === studentScholar.id || (g.studentName && g.studentName.toLowerCase().trim() === studentScholar.name.toLowerCase().trim())) : []
              const avgScore = scholarScores.length > 0 ? Math.round(scholarScores.reduce((acc, curr) => acc + calculateGradeInfo(curr).total, 0) / scholarScores.length) : null
              const avgLetter = avgScore !== null ? (avgScore >= 75 ? "A1" : avgScore >= 70 ? "B2" : avgScore >= 65 ? "B3" : avgScore >= 60 ? "C4" : avgScore >= 55 ? "C5" : avgScore >= 50 ? "C6" : "Pass") : null
              const scholarHouse = studentScholar ? studentScholar.house || "Phoenix" : "House"

              return (
                <>
                  <button
                    className={`menu-item ${activeTab === "student-dashboard" ? "active" : ""}`}
                    onClick={() => handleTabSelect("student-dashboard")}
                  >
                    <i className='fas fa-user-graduate'></i>
                    <span>My Scholar Dashboard</span>
                  </button>

                  <button
                    className={`menu-item ${activeTab === "student-grades" ? "active" : ""}`}
                    onClick={() => handleTabSelect("student-grades")}
                  >
                    <i className='fas fa-chart-line'></i>
                    <span>My Term Grades & Results</span>
                    {avgLetter && <span className='menu-pill green'>{avgLetter} Grade</span>}
                  </button>

                  <button
                    className={`menu-item ${activeTab === "timetable" ? "active" : ""}`}
                    onClick={() => handleTabSelect("timetable")}
                  >
                    <i className='fas fa-clock'></i>
                    <span>My Daily Timetable</span>
                  </button>

                  <button
                    className={`menu-item ${activeTab === "student-house" ? "active" : ""}`}
                    onClick={() => handleTabSelect("student-house")}
                  >
                    <i className='fas fa-shield-alt'></i>
                    <span>{scholarHouse} House</span>
                  </button>

                  <button
                    className={`menu-item ${activeTab === "notices" ? "active" : ""}`}
                    onClick={() => handleTabSelect("notices")}
                  >
                    <i className='fas fa-bullhorn'></i>
                    <span>Assembly Notices</span>
                  </button>
                </>
              )
            })()}
          </nav>

          <div className='sidebar-drawer-actions'>
            <Link to='/' className='drawer-action-btn public-btn' onClick={() => setMobileSidebarOpen(false)}>
              <i className='fas fa-globe'></i> Public School Site
            </Link>
            <button onClick={handleLogout} className='drawer-action-btn logout-btn'>
              <i className='fas fa-sign-out-alt'></i> Sign Out
            </button>
          </div>

          <div className='sidebar-footer-card' style={{ marginBottom: '8px' }}>
            <div className='sfc-icon' style={{ background: '#00a884', color: '#fff' }}><i className='fas fa-user-tie'></i></div>
            <div className='sfc-text'>
              <strong>Rev. Fidelis Gambo</strong>
              <small>Proprietor & Founder</small>
            </div>
          </div>

          <div className='sidebar-footer-card'>
            <div className='sfc-icon'><i className='fas fa-university'></i></div>
            <div className='sfc-text'>
              <strong>First Bank of Nigeria</strong>
              <small>Acc: 2043561832</small>
            </div>
          </div>
        </aside>

        {/* Center Main Work Area */}
        <main className='portal-main'>
          {/* Toast Alert */}
          {toastMessage && (
            <div className='portal-toast'>
              <i className='fas fa-info-circle'></i>
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Access Control Guard Screen (Fallback for Unauthorized Tab Navigation) */}
          {currentUser && !isTabAllowedForRole(activeTab, currentUser.role) && (
            <div className='tab-view' style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ maxWidth: '520px', margin: '0 auto', background: '#ffffff', padding: '40px 24px', borderRadius: '16px', boxShadow: '0 10px 35px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '0 auto 18px auto' }}>
                  <i className='fas fa-shield-alt'></i>
                </div>
                <h2 style={{ fontSize: '22px', color: '#0f172a', margin: '0 0 10px 0', fontWeight: '800' }}>Access Restricted</h2>
                <p style={{ fontSize: '14.5px', color: '#64748b', lineHeight: '1.6', margin: '0 0 24px 0' }}>
                  Your account role (<strong>{currentUser.roleTitle || currentUser.role}</strong>) does not have authorization to access this module.
                </p>
                <button
                  type='button'
                  className='primary-btn'
                  style={{ width: '100%', padding: '13px 20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: '700' }}
                  onClick={() => setActiveTab(getDefaultTabForRole(currentUser.role))}
                >
                  <i className='fas fa-home'></i> Return to My Authorized Dashboard
                </button>
              </div>
            </div>
          )}

          {/* PROPRIETOR EXECUTIVE GOVERNANCE VIEW */}
          {activeTab === "proprietor-overview" && isTabAllowedForRole("proprietor-overview", currentUser?.role) && (
            <div className='tab-view proprietor-overview-view'>
              <div className='tab-header flexSB'>
                <div>
                  <h2>Executive Boardroom & Governance</h2>
                  <p>Welcome, Rev. Fidelis Gambo. Institutional oversight across academics, finances, and faculty administration.</p>
                </div>
                <div className='quick-action-btns'>
                  <button className='primary-btn' onClick={() => setActiveTab("staff-management")}>
                    <i className='fas fa-users-cog'></i> Staff Access Control
                  </button>
                  <button className='outline-btn' onClick={() => setActiveTab("finance")}>
                    <i className='fas fa-file-invoice-dollar'></i> Bursary Audit
                  </button>
                </div>
              </div>

              {/* Executive Telemetry Grid */}
              <div className='kpi-grid'>
                <div className='kpi-card'>
                  <div className='kpi-icon blue'><i className='fas fa-user-graduate'></i></div>
                  <div className='kpi-details'>
                    <small>TOTAL ENROLLED</small>
                    <h3>{students.length}</h3>
                    <span className='kpi-sub positive'><i className='fas fa-check-circle'></i> {students.length} Registered Scholars</span>
                  </div>
                </div>

                <div className='kpi-card'>
                  <div className='kpi-icon green'><i className='fas fa-hand-holding-usd'></i></div>
                  <div className='kpi-details'>
                    <small>FEES COLLECTED</small>
                    <h3>₦{totalCollected.toLocaleString()}</h3>
                    <span className='kpi-sub positive'>First Bank: 2043561832</span>
                  </div>
                </div>

                <div className='kpi-card'>
                  <div className='kpi-icon gold'><i className='fas fa-balance-scale'></i></div>
                  <div className='kpi-details'>
                    <small>OUTSTANDING FEES</small>
                    <h3>₦{totalOutstanding.toLocaleString()}</h3>
                    <span className='kpi-sub amber'>Term 1 Invoicing</span>
                  </div>
                </div>

                <div className='kpi-card'>
                  <div className='kpi-icon purple'><i className='fas fa-chalkboard-teacher'></i></div>
                  <div className='kpi-details'>
                    <small>ACTIVE STAFF</small>
                    <h3>{portalUsers.length}</h3>
                    <span className='kpi-sub'>Academic & Non-Academic</span>
                  </div>
                </div>

                <div className='kpi-card'>
                  <div className='kpi-icon teal'><i className='fas fa-award'></i></div>
                  <div className='kpi-details'>
                    <small>WAEC/BECE PASS RATE</small>
                    <h3>{gradebookData.length > 0 ? `${Math.round((gradebookData.filter((g) => calculateGradeInfo(g).total >= 50).length / gradebookData.length) * 100)}%` : "—"}</h3>
                    <span className='kpi-sub positive'>{gradebookData.length > 0 ? "Continuous Assessment Baseline" : "Awaiting Score Entry"}</span>
                  </div>
                </div>
              </div>

              {/* Strategic Insights */}
              <div className='dash-grid-2col'>
                <div className='portal-card shadow'>
                  <div className='card-header-line flexSB'>
                    <h3><i className='fas fa-university' style={{ color: '#00a884' }}></i> Institutional Bank Account (First Bank)</h3>
                    <span className='status-pill active'>Verified Active</span>
                  </div>
                  <div style={{ padding: '16px 0' }}>
                    <p style={{ fontSize: '14px', color: '#475569', marginBottom: '14px' }}>
                      All Section A tuition, development levies, exam fees, and lessons are cleared directly through the designated institutional account.
                    </p>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div className='flexSB' style={{ marginBottom: '8px' }}>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>Bank Name:</span>
                        <strong>First Bank of Nigeria</strong>
                      </div>
                      <div className='flexSB' style={{ marginBottom: '8px' }}>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>Account Name:</span>
                        <strong>Brighter Land International School</strong>
                      </div>
                      <div className='flexSB'>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>Account Number:</span>
                        <strong style={{ color: '#00a884', fontSize: '16px', letterSpacing: '1px' }}>2043561832</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='portal-card shadow'>
                  <div className='card-header-line flexSB'>
                    <h3><i className='fas fa-shield-alt' style={{ color: '#00a884' }}></i> Proprietor Executive Directives</h3>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>2026/2027</span>
                  </div>
                  <div style={{ padding: '16px 0' }}>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
                      "Study to Make Impact. We continue to uphold Christian moral values, sound intellectual discipline, and comprehensive continuous assessment benchmarks across all basic and secondary education disciplines."
                    </p>
                    <div className='flex' style={{ gap: '12px', marginTop: '16px' }}>
                      <button className='outline-btn' onClick={() => setActiveTab("staff-management")}>
                        <i className='fas fa-users'></i> Staff Privileges & Classes
                      </button>
                      <button className='primary-btn' onClick={() => setActiveTab("gradebook")}>
                        <i className='fas fa-book-reader'></i> View Gradebook
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BURSARY / NON-ACADEMIC STAFF COMMAND CENTER */}
          {activeTab === "bursary-command" && (
            <div className='tab-view bursary-command-view'>
              <div className='tab-header flexSB'>
                <div>
                  <h2>Bursary & Accounts Command Center</h2>
                  <p>Bursar Office: <strong>{currentUser ? currentUser.name : "Accounts Directorate"}</strong>. Invoicing, payment reconciliations, and official First Bank receipts.</p>
                </div>
                <div className='quick-action-btns'>
                  <button className='primary-btn' onClick={() => setActiveTab("finance")}>
                    <i className='fas fa-file-invoice-dollar'></i> Manage All Invoices
                  </button>
                  <button className='outline-btn' onClick={() => setShowProspectusModal(true)}>
                    <i className='fas fa-book'></i> School Prospectus
                  </button>
                </div>
              </div>

              {/* Financial Metrics */}
              <div className='metrics-grid'>
                <div className='metric-card shadow flex'>
                  <div className='metric-icon emerald'><i className='fas fa-cash-register'></i></div>
                  <div className='metric-data'>
                    <small>TOTAL BILLED</small>
                    <h3>₦{totalBilled.toLocaleString()}</h3>
                    <span className='trend-badge green'>Term 1 Invoicing</span>
                  </div>
                </div>

                <div className='metric-card shadow flex'>
                  <div className='metric-icon blue'><i className='fas fa-hand-holding-usd'></i></div>
                  <div className='metric-data'>
                    <small>FEES COLLECTED</small>
                    <h3>₦{totalCollected.toLocaleString()}</h3>
                    <span className='trend-badge blue'>First Bank 2043561832</span>
                  </div>
                </div>

                <div className='metric-card shadow flex'>
                  <div className='metric-icon amber'><i className='fas fa-file-invoice'></i></div>
                  <div className='metric-data'>
                    <small>OUTSTANDING DEBTORS</small>
                    <h3>₦{totalOutstanding.toLocaleString()}</h3>
                    <span className='trend-badge amber'>Follow-up Active</span>
                  </div>
                </div>

                <div className='metric-card shadow flex'>
                  <div className='metric-icon purple'><i className='fas fa-users'></i></div>
                  <div className='metric-data'>
                    <small>SCHOLARS BILLED</small>
                    <h3>{invoices.length} Invoices</h3>
                    <span className='trend-badge purple'>Crèche to SS 2</span>
                  </div>
                </div>
              </div>

              {/* Recent Invoices Table */}
              <div className='portal-card table-card' style={{ overflowX: 'auto', marginTop: '20px' }}>
                <div className='card-header-line flexSB' style={{ marginBottom: '16px' }}>
                  <h3><i className='fas fa-receipt' style={{ color: '#00a884' }}></i> Tuition & Levies Invoices (First Bank Cleared)</h3>
                  <button className='outline-btn' onClick={() => setActiveTab("finance")}>View Full Ledger →</button>
                </div>
                <table className='portal-table'>
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Scholar</th>
                      <th>Class Level</th>
                      <th>Billed Total</th>
                      <th>Amount Paid</th>
                      <th>Payment Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan='7' style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}>
                          <i className='fas fa-file-invoice-dollar' style={{ fontSize: '32px', color: '#94a3b8', display: 'block', marginBottom: '10px' }}></i>
                          <strong>Bursary Ledger is Clean (₦0)</strong>
                          <p style={{ margin: '6px 0 0', fontSize: '13px' }}>
                            No fee invoices created yet. Invoices are automatically generated when scholars are enrolled, or you can create one manually.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => (
                      <tr key={inv.invoiceNo}>
                        <td><strong>{inv.invoiceNo}</strong></td>
                        <td>{inv.studentName}</td>
                        <td>{inv.grade}</td>
                        <td>₦{inv.total.toLocaleString()}</td>
                        <td>₦{inv.amountPaid.toLocaleString()}</td>
                        <td>
                          <span className={`invoice-status ${inv.status.toLowerCase()}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td>
                          <div className='flex' style={{ gap: '6px' }}>
                            <button
                              className='btn-action-sm'
                              onClick={() => {
                                setSelectedInvoiceForPayment(inv)
                                setShowPaymentModal(true)
                              }}
                            >
                              <i className='fas fa-credit-card'></i> Pay
                            </button>
                            <button
                              className='btn-action-sm'
                              onClick={() => setReceiptInvoice(inv)}
                            >
                              <i className='fas fa-receipt'></i> Receipt
                            </button>
                          </div>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STAFF & PRIVILEGES ACCESS CONTROL */}
          {activeTab === "staff-management" && (
            currentUser && (currentUser.role === "admin" || currentUser.role === "proprietor") ? (
              <div className='tab-view staff-management-view'>
                <div className='tab-header flexSB'>
                  <div>
                    <h2>Staff & User Access Control</h2>
                    <p>Admin & Proprietor exclusive: Create staff accounts, assign administrative roles, and allocate class authorizations.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button className='primary-btn' onClick={() => setShowAddStaffModal(true)}>
                      <i className='fas fa-user-plus'></i> Add New Staff / User
                    </button>
                    <button className='outline-btn' onClick={handleExportDatabase} title="Backup entire school database (users, students, grades, invoices) to a JSON file">
                      <i className='fas fa-download'></i> Backup Database
                    </button>
                    <label className='outline-btn' style={{ cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }} title="Import a BLIS database backup from another browser">
                      <i className='fas fa-upload'></i> Restore Backup
                      <input type='file' accept='.json' style={{ display: 'none' }} onChange={handleImportDatabase} />
                    </label>
                  </div>
                </div>

                <div className='portal-card table-card' style={{ overflowX: 'auto' }}>
                  <table className='portal-table'>
                    <thead>
                      <tr>
                        <th>Staff / User</th>
                        <th>System Role</th>
                        <th>Department / Faculty</th>
                        <th>Assigned Classes</th>
                        <th>Assigned Privileges</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portalUsers.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <div className='flex' style={{ gap: '10px', alignItems: 'center' }}>
                              <div className='active-user-avatar' style={{ width: '36px', height: '36px' }}>
                                <i className={getRoleIcon(u.role)}></i>
                              </div>
                              <div>
                                <strong>{u.name}</strong>
                                <small style={{ display: 'block', color: '#64748b' }}>{u.email} • @{u.username}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`staff-role-badge role-${u.role}`}>
                              <i className={getRoleIcon(u.role)}></i> {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td>{u.department || "Academic Division"}</td>
                          <td>
                            <div className='assigned-classes-chips'>
                              {u.assignedClasses && u.assignedClasses.length > 0 ? (
                                u.assignedClasses.map((c, i) => (
                                  <span key={i} className='assigned-class-chip'>{c}</span>
                                ))
                              ) : (
                                <span className='assigned-class-chip'>None</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <small style={{ color: '#475569', fontWeight: '600' }}>{u.privileges}</small>
                          </td>
                          <td>
                            <span className='status-pill active'>
                              <i className='fas fa-circle' style={{ fontSize: '8px', color: '#10b981' }}></i> Active
                            </span>
                          </td>
                          <td>
                            <div className='flex' style={{ gap: '6px' }}>
                              <button
                                className='btn-action-sm'
                                onClick={() => setCreatedAccountInfo(u)}
                                title='View Login Credentials'
                              >
                                <i className='fas fa-id-card'></i> Credentials
                              </button>
                              {u.id !== "USR-001" && u.id !== "USR-002" && u.id !== "USR-ADMIN-01" && (
                                <button
                                  className='btn-action-sm'
                                  style={{ color: '#ef4444' }}
                                  onClick={() => handleDeleteStaff(u.id)}
                                  title='Remove Staff Account'
                                >
                                  <i className='fas fa-trash-alt'></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className='tab-view'>
                <div className='portal-card' style={{ textAlign: 'center', padding: '60px 20px', maxWidth: '520px', margin: '40px auto' }}>
                  <i className='fas fa-shield-alt' style={{ fontSize: '48px', color: '#ef4444', marginBottom: '16px', display: 'block' }}></i>
                  <h3 style={{ color: '#071626' }}>Access Restricted</h3>
                  <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>
                    Staff & User Access Control is restricted exclusively to the School Administrator (Principal) and Proprietor.
                  </p>
                </div>
              </div>
            )
          )}

          {/* 1. OPERATIONS DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className='tab-view dashboard-view'>
              <div className='tab-header flexSB'>
                <div>
                  <h2>School Operations Command Center</h2>
                  <p>Real-time telemetry across Crèche, Nursery, Primary, JSS, and SSS divisions.</p>
                </div>
                <div className='quick-action-btns'>
                  <button className='primary-btn' onClick={() => setShowAddStudentModal(true)}>
                    <i className='fas fa-user-plus'></i> Enroll Scholar
                  </button>
                  <button className='outline-btn' onClick={() => setActiveTab("attendance")}>
                    <i className='fas fa-clipboard-check'></i> Launch Roll Call
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className='kpi-grid'>
                <div className='kpi-card'>
                  <div className='kpi-icon blue'><i className='fas fa-user-graduate'></i></div>
                  <div className='kpi-details'>
                    <small>TOTAL ENROLLED</small>
                    <h3>{students.length}</h3>
                    <span className='kpi-sub positive'><i className='fas fa-arrow-up'></i> {students.length} Enrolled Scholars</span>
                  </div>
                </div>

                <div className='kpi-card'>
                  <div className='kpi-icon green'><i className='fas fa-user-check'></i></div>
                  <div className='kpi-details'>
                    <small>TODAY'S ATTENDANCE</small>
                    <h3>{dailyAttendanceRate}%</h3>
                    <span className='kpi-sub positive'>Daily Roll Call Active</span>
                  </div>
                </div>

                <div className='kpi-card'>
                  <div className='kpi-icon gold'><i className='fas fa-hand-holding-usd'></i></div>
                  <div className='kpi-details'>
                    <small>FEES COLLECTED</small>
                    <h3>₦{totalCollected.toLocaleString()}</h3>
                    <span className='kpi-sub'>₦{totalOutstanding.toLocaleString()} outstanding</span>
                  </div>
                </div>

                <div className='kpi-card'>
                  <div className='kpi-icon purple'><i className='fas fa-chalkboard-teacher'></i></div>
                  <div className='kpi-details'>
                    <small>FACULTY & STAFF</small>
                    <h3>{portalUsers.length}</h3>
                    <span className='kpi-sub'>Registered Faculty & Staff</span>
                  </div>
                </div>

                <div className='kpi-card'>
                  <div className='kpi-icon teal'><i className='fas fa-inbox'></i></div>
                  <div className='kpi-details'>
                    <small>PROSPECTIVE APPLICANTS</small>
                    <h3>{applications.length}</h3>
                    <span className='kpi-sub amber'>2026/2027 Pipeline</span>
                  </div>
                </div>
              </div>

              {/* Operations Status Matrix */}
              <div className='dash-grid-2col'>
                {/* Academic Highlights */}
                <div className='portal-card'>
                  <div className='card-head flexSB'>
                    <h3><i className='fas fa-graduation-cap'></i> Prospectus Class Divisions</h3>
                    <span className='badge-pill green'>2026/2027 Active</span>
                  </div>
                  <div className='division-progress-list'>
                    <div className='division-item'>
                      <div className='flexSB'>
                        <strong>Crèche Division (Infants & Toddlers)</strong>
                        <span>₦19,500 Section A • ₦47,500 Section B</span>
                      </div>
                      <div className='progress-bar'><div className='progress-fill' style={{ width: "98%" }}></div></div>
                    </div>

                    <div className='division-item'>
                      <div className='flexSB'>
                        <strong>Nursery One & Two</strong>
                        <span>₦19,500 Section A • ₦50,000 Section B</span>
                      </div>
                      <div className='progress-bar'><div className='progress-fill' style={{ width: "97%" }}></div></div>
                    </div>

                    <div className='division-item'>
                      <div className='flexSB'>
                        <strong>Primary One – Five</strong>
                        <span>₦22,000 Section A • ₦59,000 Section B</span>
                      </div>
                      <div className='progress-bar'><div className='progress-fill' style={{ width: "96%" }}></div></div>
                    </div>

                    <div className='division-item'>
                      <div className='flexSB'>
                        <strong>Junior Secondary School (JSS 1 – 3)</strong>
                        <span>₦30,000 Section A • ₦64,000 Section B</span>
                      </div>
                      <div className='progress-bar'><div className='progress-fill' style={{ width: "96.5%" }}></div></div>
                    </div>

                    <div className='division-item'>
                      <div className='flexSB'>
                        <strong>Senior Secondary School (SS 1 – 2)</strong>
                        <span>₦30,000 Section A • ₦76,000 Section B</span>
                      </div>
                      <div className='progress-bar'><div className='progress-fill' style={{ width: "95%" }}></div></div>
                    </div>
                  </div>
                </div>

                {/* Operations Announcements */}
                <div className='portal-card'>
                  <div className='card-head flexSB'>
                    <h3><i className='fas fa-bullhorn'></i> Urgent School Circulars</h3>
                    <button className='btn-text-sm' onClick={() => setActiveTab("notices")}>View All</button>
                  </div>
                  <div className='quick-notice-list'>
                    {notices && notices.length > 0 ? (
                      notices.map((n) => (
                        <div className='quick-notice-item' key={n.id}>
                          <div className={`notice-priority-dot ${n.priority.toLowerCase()}`}></div>
                          <div>
                            <h4>{n.title}</h4>
                            <small>{n.date} • {n.audience}</small>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: '#64748b', fontSize: '13px', padding: '16px 0', margin: 0, textAlign: 'center' }}>
                        No active circulars. Noticeboard has been cleared to start afresh.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Persona Demo Banner */}
              <div className='role-demo-banner'>
                <div className='rdb-icon'><i className='fas fa-lightbulb'></i></div>
                <div>
                  <h4>Role-Based Operations Experience</h4>
                  <p>
                    You are exploring as <strong>{activeRole.toUpperCase()}</strong>. Switch between Administrator, Teacher, Parent, and Student in the top bar to inspect attendance alerts, bursar fee receipts, terminal gradebooks, and class schedules!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =======================================================
              TEACHER VIEW: FACULTY INSTRUCTION & ASSESSMENT COMMAND
             ======================================================= */}
          {activeTab === "teacher-dashboard" && (
            <div className='tab-view teacher-dashboard-view'>
              <div className='tab-header flexSB'>
                <div>
                  <h2>Faculty Instruction & Assessment Center</h2>
                  <p>
                    Tutor: <strong>{currentUser ? currentUser.name : "Faculty Member"}</strong> • Assigned: <strong>{currentUser && currentUser.assignedClasses ? currentUser.assignedClasses.join(" & ") : "Assigned Classes"}</strong> • 2026/2027 Session
                  </p>
                </div>
                <div className='header-quick-actions flex' style={{ gap: '10px' }}>
                  <button className='primary-btn' onClick={() => setActiveTab("attendance")}>
                    <i className='fas fa-clipboard-check'></i> Homeroom Roll Call
                  </button>
                  <button className='outline-btn' onClick={() => setActiveTab("gradebook")}>
                    <i className='fas fa-edit'></i> Record CA Scores
                  </button>
                </div>
              </div>

              {/* Metric Cards for Teacher */}
              {(() => {
                const assignedCls = currentUser && currentUser.assignedClasses ? currentUser.assignedClasses : []
                const myScholars = students.filter(
                  (s) => assignedCls.includes(s.grade) || assignedCls.includes("All Classes")
                )
                const myScores = gradebookData.filter(
                  (g) => assignedCls.includes(g.gradeLevel) || assignedCls.includes("All Classes")
                )
                const caProgress = myScholars.length > 0 && myScores.length > 0
                  ? Math.min(100, Math.round((myScores.length / myScholars.length) * 100))
                  : 0

                const myPresentCount = myScholars.filter((s) => (attendanceRecords[s.id] || "Present") === "Present").length
                const myAttendanceRate = myScholars.length > 0
                  ? Math.round((myPresentCount / myScholars.length) * 100)
                  : 100

                const teacherPeriodsToday = getTeacherPeriodsForDay(currentUser, dashboardDay, timetables)
                const availableTeacherClasses = Array.from(new Set(teacherPeriodsToday.map((p) => p.className)))
                const filteredTeacherPeriods = periodClassFilter === "all"
                  ? teacherPeriodsToday
                  : teacherPeriodsToday.filter((p) => p.className === periodClassFilter)
                const displayTeacherPeriods = periodClassFilter === "all"
                  ? filteredTeacherPeriods.slice(0, periodLimit)
                  : filteredTeacherPeriods

                // Real-time evaluation of active period across today's schedule
                const todayDayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][liveClock.getDay()] || "mon"
                const isViewingToday = dashboardDay === todayDayKey
                const activePeriodNow = isViewingToday
                  ? teacherPeriodsToday.find((p) => evaluatePeriodStatus(p, dashboardDay, liveClock, taughtLessonLog).isActive)
                  : null

                const clockTimeString = liveClock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

                return (
                  <>
                    {/* Form Master / Class Head Teacher Collation Hub Banner */}
                    {currentUser && currentUser.headTeacherClass && (
                      <div
                        className='portal-card shadow'
                        style={{
                          marginBottom: '20px',
                          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)',
                          border: '1.5px solid #a7f3d0',
                          padding: '16px 20px',
                        }}
                      >
                        <div className='flexSB' style={{ flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                              <i className='fas fa-user-tie'></i>
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ background: '#059669', color: '#fff', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                  ⭐ Class Head Teacher Assigned
                                </span>
                                <h3 style={{ margin: 0, color: '#065f46', fontSize: '17px' }}>
                                  {currentUser.headTeacherClass} Terminal Result Collation Hub
                                </h3>
                              </div>
                              <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#047857' }}>
                                As Form Master of <strong>{currentUser.headTeacherClass}</strong>, you collate all subject Continuous Assessment marks, calculate class positions, and write official <strong>Class Teacher Remarks</strong>.
                              </p>
                            </div>
                          </div>
                          <button
                            type='button'
                            className='primary-btn'
                            style={{ background: '#059669', borderColor: '#059669', color: '#fff', padding: '8px 18px', fontSize: '13px', whiteSpace: 'nowrap' }}
                            onClick={() => {
                              setGradebookViewMode("collation_hub")
                              setCollationSelectedClass(currentUser.headTeacherClass)
                              setActiveTab("gradebook")
                            }}
                          >
                            <i className='fas fa-calculator'></i> Open {currentUser.headTeacherClass} Collation Broadsheet →
                          </button>
                        </div>
                      </div>
                    )}

                    <div className='metrics-grid'>
                      <div className='metric-card shadow flex'>
                        <div className='metric-icon emerald'><i className='fas fa-chalkboard'></i></div>
                        <div className='metric-data'>
                          <small>AUTHORIZED CLASSES</small>
                          <h3>{assignedCls.length > 0 ? assignedCls.join(" & ") : "Assigned"}</h3>
                          <span className='trend-badge green'>{currentUser ? currentUser.assignedSubjects || "Class Curriculum" : "Teaching Scope"}</span>
                        </div>
                      </div>

                      <div className='metric-card shadow flex'>
                        <div className='metric-icon blue'><i className='fas fa-users'></i></div>
                        <div className='metric-data'>
                          <small>HOMEROOM SCHOLARS</small>
                          <h3>{myScholars.length} Scholars</h3>
                          <span className='trend-badge blue'>{myScholars.length > 0 ? "Enrolled Class Scope" : "Awaiting Enrollment"}</span>
                        </div>
                      </div>

                      <div className='metric-card shadow flex'>
                        <div className='metric-icon amber'><i className='fas fa-award'></i></div>
                        <div className='metric-data'>
                          <small>CA MARKS LOGGED</small>
                          <h3>{caProgress}%</h3>
                          <span className='trend-badge amber'>{myScores.length} Assessment Entries</span>
                        </div>
                      </div>

                      <div className='metric-card shadow flex'>
                        <div className='metric-icon purple'><i className='fas fa-clock'></i></div>
                        <div className='metric-data'>
                          <small>{dashboardDay.toUpperCase()} LESSONS</small>
                          <h3>{filteredTeacherPeriods.length} Periods</h3>
                          <span className={`trend-badge ${activePeriodNow ? "green" : "blue"}`}>
                            {activePeriodNow ? `🟢 Live: ${activePeriodNow.subject}` : isViewingToday ? "No Active Class Now" : "Schedule"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Teacher Workspace Layout */}
                    <div className='portal-two-col-grid' style={{ marginTop: '24px' }}>
                      {/* Today's Teaching Schedule with Real-Time Clock */}
                      <div className='portal-card shadow'>
                        <div className='card-header-line flexSB' style={{ flexWrap: 'wrap', gap: '10px' }}>
                          <div className='flex' style={{ gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <h3 style={{ margin: 0 }}><i className='fas fa-calendar-day' style={{ color: '#00a884' }}></i> Teaching Periods</h3>
                            <div className='flex' style={{ gap: '4px', marginLeft: '4px' }}>
                              {[
                                { key: "mon", label: "MON" },
                                { key: "tue", label: "TUE" },
                                { key: "wed", label: "WED" },
                                { key: "thu", label: "THU" },
                                { key: "fri", label: "FRI" },
                              ].map((d) => (
                                <button
                                  key={d.key}
                                  type='button'
                                  onClick={() => setDashboardDay(d.key)}
                                  style={{
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    borderRadius: '4px',
                                    border: dashboardDay === d.key ? '1px solid #00a884' : '1px solid #cbd5e1',
                                    background: dashboardDay === d.key ? '#00a884' : '#f8fafc',
                                    color: dashboardDay === d.key ? '#fff' : '#475569',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {d.label} {todayDayKey === d.key ? "•" : ""}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className='flex' style={{ gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {availableTeacherClasses.length > 1 && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Class:</label>
                                <select
                                  value={periodClassFilter}
                                  onChange={(e) => {
                                    setPeriodClassFilter(e.target.value)
                                    setPeriodLimit(6)
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '11.5px',
                                    borderRadius: '6px',
                                    border: '1.5px solid #00a884',
                                    background: '#f0fdfa',
                                    color: '#065f46',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    outline: 'none',
                                  }}
                                >
                                  <option value='all'>All Classes ({teacherPeriodsToday.length})</option>
                                  {availableTeacherClasses.map((cls) => (
                                    <option key={cls} value={cls}>{cls}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <button className='link-btn' onClick={() => setActiveTab("timetable")}>Full Timetable →</button>
                          </div>
                        </div>

                        {/* Real-Time Status & Clock Header */}
                        <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>
                              <i className='fas fa-clock' style={{ color: '#00a884', marginRight: '4px' }}></i>
                              Current Local Time: <strong>{clockTimeString}</strong> ({isViewingToday ? "Today" : dashboardDay.toUpperCase()})
                            </span>
                          </div>
                          <div>
                            {activePeriodNow ? (
                              <span style={{ fontSize: '12px', color: '#065f46', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', fontWeight: '700', border: '1px solid #a7f3d0' }}>
                                <i className='fas fa-spinner fa-spin' style={{ color: '#059669', marginRight: '5px' }}></i>
                                In Session: <strong>{activePeriodNow.subject}</strong> ({activePeriodNow.className})
                              </span>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                                <i className='fas fa-coffee' style={{ color: '#94a3b8', marginRight: '5px' }}></i>
                                {isViewingToday ? "No Active Class Scheduled at this time" : `Viewing ${dashboardDay.toUpperCase()} Schedule`}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className='teacher-periods-list'>
                          {displayTeacherPeriods.length > 0 ? (
                            displayTeacherPeriods.map((p, idx) => {
                              const evalStatus = evaluatePeriodStatus(p, dashboardDay, liveClock, taughtLessonLog)
                              return (
                                <div className='teacher-period-row flexSB' key={idx} style={{ flexWrap: 'wrap', gap: '8px', padding: '12px 8px' }}>
                                  <div className='flex' style={{ gap: '12px', alignItems: 'center' }}>
                                    <span className='period-tag'>Period {p.periodIndex}</span>
                                    <div>
                                      <strong>{p.subject}</strong>
                                      <small style={{ display: 'block', color: '#64748b', marginTop: '2px' }}>
                                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold', marginRight: '6px' }}>{p.className}</span>
                                        {evalStatus.startStr} - {evalStatus.endStr} • {p.className.startsWith("SS") ? "Senior Wing Hall" : p.className.startsWith("JSS") ? "Junior Secondary Block" : "Primary Wing"}
                                      </small>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {/* Real-time Dynamic Status Badge */}
                                    {evalStatus.status === "active" && (
                                      <span className='badge-in-progress'>
                                        <i className='fas fa-spinner fa-spin'></i> Active
                                      </span>
                                    )}
                                    {evalStatus.status === "taught" && (
                                      <span className='badge-completed'>
                                        <i className='fas fa-check'></i> Taught
                                      </span>
                                    )}
                                    {evalStatus.status === "missed" && (
                                      <span className='badge-missed'>
                                        <i className='fas fa-times-circle'></i> Missed
                                      </span>
                                    )}
                                    {evalStatus.status === "unrecorded" && (
                                      <span className='badge-unrecorded'>
                                        <i className='fas fa-clock'></i> Needs Log
                                      </span>
                                    )}
                                    {(evalStatus.status === "upcoming" || evalStatus.status === "scheduled") && (
                                      <span className='badge-upcoming'>
                                        {evalStatus.label}
                                      </span>
                                    )}

                                    {/* Interactive Teacher Action Buttons (Taught vs Missed) */}
                                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                                      <button
                                        type='button'
                                        className={`period-action-pill taught-btn ${evalStatus.logStatus === "taught" ? "active-selected" : ""}`}
                                        onClick={() => handleSetLessonStatus(evalStatus.logKey, "taught")}
                                        title='Mark as Taught'
                                      >
                                        <i className='fas fa-check'></i> Taught
                                      </button>
                                      <button
                                        type='button'
                                        className={`period-action-pill missed-btn ${evalStatus.logStatus === "missed" ? "active-selected" : ""}`}
                                        onClick={() => handleSetLessonStatus(evalStatus.logKey, "missed")}
                                        title='Mark as Missed / Not Taught'
                                      >
                                        <i className='fas fa-times'></i> Missed
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          ) : (
                            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b' }}>
                              <i className='fas fa-calendar-check' style={{ fontSize: '32px', color: '#cbd5e1', marginBottom: '10px', display: 'block' }}></i>
                              <h4 style={{ color: '#1e293b', marginBottom: '4px' }}>No Teaching Periods Found</h4>
                              <p style={{ fontSize: '13px', margin: '0 auto 12px', maxWidth: '340px' }}>
                                No lessons found for {periodClassFilter === "all" ? "any class" : periodClassFilter} on {dashboardDay.toUpperCase()}.
                              </p>
                              {periodClassFilter !== "all" && (
                                <button className='outline-btn' style={{ fontSize: '11px', padding: '4px 10px', marginTop: '6px' }} onClick={() => setPeriodClassFilter("all")}>
                                  Reset Class Filter
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {periodClassFilter === "all" && filteredTeacherPeriods.length > 6 && (
                          <div style={{ textAlign: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                            <button
                              type='button'
                              className='outline-btn'
                              style={{ fontSize: '12px', padding: '6px 16px', width: 'auto' }}
                              onClick={() => setPeriodLimit((prev) => (prev > 6 ? 6 : filteredTeacherPeriods.length))}
                            >
                              {periodLimit > 6
                                ? `▲ Collapse to 6 Periods`
                                : `▼ View All ${filteredTeacherPeriods.length} Periods Across All ${availableTeacherClasses.length} Classes`}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Quick Homeroom Roll Call & Direct Actions */}
                      <div className='portal-card shadow'>
                        <div className='card-header-line flexSB'>
                          <h3><i className='fas fa-clipboard-check' style={{ color: '#2563eb' }}></i> Homeroom Roll Call Quick Status</h3>
                          <button className='link-btn' onClick={() => setActiveTab("attendance")}>Open Roll Call →</button>
                        </div>
                        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                          Roll call for {assignedCls.length > 0 ? assignedCls.join(", ") : "assigned classes"} is active for <strong>{attendanceDate}</strong>.
                        </p>
                        <div className='homeroom-quick-stats' style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div className='flexSB' style={{ marginBottom: '8px' }}>
                            <span>Class Attendance Rate Today:</span>
                            <strong style={{ color: '#00a884', fontSize: '16px' }}>{myAttendanceRate}% Present</strong>
                          </div>
                          <div className='flexSB' style={{ marginBottom: '8px' }}>
                            <span>Present Scholars:</span>
                            <strong>{myPresentCount} of {myScholars.length} Present</strong>
                          </div>
                          <div className='flexSB'>
                            <span>Excused / Absent:</span>
                            <span>{myScholars.length - myPresentCount > 0 ? `${myScholars.length - myPresentCount} Absent/Late` : "0 Absent"}</span>
                          </div>
                        </div>

                        <div style={{ marginTop: '20px' }}>
                          <h4 style={{ fontSize: '13px', color: '#071626', marginBottom: '8px' }}>Direct Academic Actions:</h4>
                          <div className='flex' style={{ gap: '10px' }}>
                            <button className='btn-action-primary' style={{ flex: 1, padding: '10px' }} onClick={() => setActiveTab("gradebook")}>
                              <i className='fas fa-pen'></i> Record CA Marks
                            </button>
                            <button className='btn-action' style={{ flex: 1, padding: '10px' }} onClick={() => setActiveTab("notices")}>
                              <i className='fas fa-bullhorn'></i> Staff Circulars
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {/* =======================================================
              PARENT VIEW: WARD ACADEMIC & BURSARY HUB
             ======================================================= */}
          {activeTab === "parent-dashboard" && (() => {
            const myWards = getParentWards(currentUser)
            const parentWard = getActiveParentWard(currentUser)

            if (!parentWard) {
              return (
                <div className='tab-view parent-dashboard-view'>
                  <div className='portal-card' style={{ textAlign: 'center', padding: '60px 20px', margin: '20px auto', maxWidth: '600px' }}>
                    <i className='fas fa-user-friends' style={{ fontSize: '48px', color: '#94a3b8', display: 'block', marginBottom: '16px' }}></i>
                    <h3 style={{ color: '#071626', marginBottom: '8px' }}>No Ward Enrolled in School Registry</h3>
                    <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
                      {currentUser && currentUser.role === "parent"
                        ? `No scholars in the school registry are currently linked to your parent profile (${currentUser.name}). When the School Administrator enrolls your ward with your contact details or links them to your account, their academic terminal reports, attendance, and fee receipts will show here.`
                        : "There are currently no active students enrolled in the Student Information System (SIS). When the School Administrator enrolls your ward, academic terminal report cards, roll-call attendance, and Bursary fee receipts will appear here."}
                    </p>
                    {currentUser && (currentUser.role === "admin" || currentUser.role === "proprietor") && (
                      <button className='primary-btn' onClick={() => setShowAddStudentModal(true)}>
                        <i className='fas fa-user-plus'></i> Enroll First Scholar Now
                      </button>
                    )}
                  </div>
                </div>
              )
            }

            const wardScores = gradebookData.filter((g) => g.studentId === parentWard.id || (g.studentName && g.studentName.toLowerCase().trim() === parentWard.name.toLowerCase().trim()))
            const wardInvoice = invoices.find((i) => i.studentId === parentWard.id)
            const wardAttendance = parentWard.attendance || 100
            const avgGpa = wardScores.length > 0
              ? (wardScores.reduce((acc, curr) => acc + parseFloat(calculateGradeInfo(curr).gpa), 0) / wardScores.length).toFixed(2)
              : (parentWard.gpa && parentWard.gpa !== "—" ? parentWard.gpa : "—")

            return (
              <div className='tab-view parent-dashboard-view'>
                {renderWardSwitcher(myWards, parentWard)}

                {/* Ward Profile Banner */}
                <div className='ward-hero-banner shadow flexSB'>
                  <div className='flex' style={{ gap: '18px', alignItems: 'center' }}>
                    <div className='ward-avatar'>
                      <i className='fas fa-user-graduate'></i>
                    </div>
                    <div>
                      <span className='ward-tag'><i className='fas fa-shield-alt'></i> ENROLLED SCHOLAR • {parentWard.grade.toUpperCase()}</span>
                      <h2>{parentWard.name}</h2>
                      <p style={{ margin: '4px 0', fontSize: '14px', color: '#64748b' }}>
                        Student ID: <strong>{parentWard.id}</strong> • House: <span className={`house-tag ${(parentWard.house || "phoenix").toLowerCase()}`}>{parentWard.house || "Phoenix"} House</span> • Session: <strong>2026/2027</strong>
                      </p>
                      <small style={{ color: '#00a884', fontWeight: '700' }}>
                        Motto: "Study to Make Impact" • Guardian: {parentWard.guardian} ({parentWard.phone || "On File"})
                      </small>
                    </div>
                  </div>

                  <div className='ward-banner-actions flex' style={{ gap: '10px' }}>
                    <button className='primary-btn' onClick={() => setReportCardStudent(parentWard)}>
                      <i className='fas fa-print'></i> View Official Report Card
                    </button>
                    {wardInvoice && (
                      <button className='outline-btn' onClick={() => setReceiptInvoice(wardInvoice)}>
                        <i className='fas fa-receipt'></i> Official Bursar Receipt
                      </button>
                    )}
                  </div>
                </div>

                {/* Parent KPI Grid */}
                <div className='metrics-grid' style={{ marginTop: '24px' }}>
                  <div className='metric-card shadow flex'>
                    <div className='metric-icon emerald'><i className='fas fa-award'></i></div>
                    <div className='metric-data'>
                      <small>CUMULATIVE GPA</small>
                      <h3>{avgGpa} / 4.0</h3>
                      <span className='trend-badge green'>{wardScores.length > 0 ? `${wardScores.length} Subjects Evaluated` : "Awaiting Terminal Exams"}</span>
                    </div>
                  </div>

                  <div className='metric-card shadow flex'>
                    <div className='metric-icon blue'><i className='fas fa-clipboard-check'></i></div>
                    <div className='metric-data'>
                      <small>TERM ATTENDANCE</small>
                      <h3>{wardAttendance}%</h3>
                      <span className='trend-badge green'>{attendanceRecords[parentWard.id] || "Present"} Today</span>
                    </div>
                  </div>

                  <div className='metric-card shadow flex'>
                    <div className='metric-icon purple'><i className='fas fa-file-invoice-dollar'></i></div>
                    <div className='metric-data'>
                      <small>TUITION STATUS</small>
                      <h3>{wardInvoice ? (wardInvoice.status === "Paid" ? `₦${wardInvoice.total.toLocaleString()} PAID` : `₦${(wardInvoice.total - wardInvoice.amountPaid).toLocaleString()} DUE`) : "NO INVOICE"}</h3>
                      <span className={`trend-badge ${wardInvoice && wardInvoice.status === "Paid" ? "green" : "amber"}`}>
                        {wardInvoice ? `First Bank Ref: ${wardInvoice.status}` : "Bursary Ledger"}
                      </span>
                    </div>
                  </div>

                  <div className='metric-card shadow flex'>
                    <div className='metric-icon amber'><i className='fas fa-medal'></i></div>
                    <div className='metric-data'>
                      <small>CLASS LEVEL</small>
                      <h3>{parentWard.grade}</h3>
                      <span className='trend-badge amber'>Academic Session 2026/2027</span>
                    </div>
                  </div>
                </div>

                {/* Parent Two-Column Grid */}
                <div className='portal-two-col-grid' style={{ marginTop: '24px' }}>
                  {/* Ward Academic Grades Breakdown */}
                  <div className='portal-card shadow'>
                    <div className='card-header-line flexSB'>
                      <h3><i className='fas fa-book' style={{ color: '#00a884' }}></i> {parentWard.name}'s Continuous Assessment</h3>
                      <button className='link-btn' onClick={() => setReportCardStudent(parentWard)}>Full Report Card →</button>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
                      CA: 1st & 2nd Assignment (10 each) + 1st & 2nd Test (10 each) = 40% | Terminal Exam: 60%
                    </p>
                    <table className='portal-table' style={{ fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>CA (40%)</th>
                          <th>Exam (60%)</th>
                          <th>Total</th>
                          <th>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wardScores.length === 0 ? (
                          <tr>
                            <td colSpan='5' style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                              <i className='fas fa-info-circle'></i> No continuous assessment scores logged yet for {parentWard.name}.
                            </td>
                          </tr>
                        ) : (
                          wardScores.map((sc, i) => {
                            const { caTotal, examScore, total, letter } = calculateGradeInfo(sc)
                            return (
                              <tr key={i}>
                                <td><strong>{sc.subject}</strong></td>
                                <td>{caTotal}/40</td>
                                <td>{examScore}/60</td>
                                <td><strong>{total}%</strong></td>
                                <td><span className={`letter-badge grade-${letter}`}>{letter}</span></td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Bursary & Bank Verification Card */}
                  <div className='portal-card shadow'>
                    <div className='card-header-line flexSB'>
                      <h3><i className='fas fa-university' style={{ color: '#2563eb' }}></i> School Fees & Payment Statement</h3>
                      {wardInvoice && (
                        <button className='link-btn' onClick={() => setReceiptInvoice(wardInvoice)}>Receipt Slip →</button>
                      )}
                    </div>

                    {wardInvoice ? (
                      <div className='parent-bursary-box' style={{ background: '#ecfdf5', padding: '16px', borderRadius: '8px', border: '1px solid #a7f3d0', marginBottom: '14px' }}>
                        <div className='flexSB' style={{ alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '11px', color: '#065f46', textTransform: 'uppercase', fontWeight: '700' }}>Payment Status</span>
                            <h3 style={{ color: '#065f46', margin: '2px 0 6px 0', fontSize: '20px' }}>
                              ₦{wardInvoice.amountPaid.toLocaleString()} Paid {wardInvoice.amountPaid >= wardInvoice.total ? "in Full" : `(₦${(wardInvoice.total - wardInvoice.amountPaid).toLocaleString()} Due)`}
                            </h3>
                            <p style={{ margin: 0, fontSize: '12px', color: '#047857' }}>
                              Bank: <strong>First Bank</strong> | Acc No: <strong>2043561832</strong>
                            </p>
                            <small style={{ color: '#065f46' }}>Invoice: {wardInvoice.invoiceNo} • Term: {wardInvoice.term}</small>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className={`status-pill ${wardInvoice.status.toLowerCase()}`} style={{ fontSize: '13px', padding: '6px 14px' }}>
                              {wardInvoice.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                        <p>No fee invoice issued yet for this scholar.</p>
                      </div>
                    )}

                    <div style={{ marginTop: '16px' }} className='flexSB'>
                      <button className='btn-action-primary' onClick={() => setShowProspectusModal(true)}>
                        <i className='fas fa-file-invoice'></i> View Approved Prospectus
                      </button>
                      {wardInvoice && (
                        <button className='btn-action' onClick={() => setReceiptInvoice(wardInvoice)}>
                          <i className='fas fa-print'></i> Print Bursar Receipt
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* PARENT SUB-TAB: BURSARY & RECEIPTS */}
          {activeTab === "parent-fees" && (() => {
            const myWards = getParentWards(currentUser)
            const parentWard = getActiveParentWard(currentUser)
            const wardInvoices = parentWard ? invoices.filter((i) => i.studentId === parentWard.id) : invoices

            return (
              <div className='tab-view parent-fees-view'>
                <div className='tab-header flexSB'>
                  <div>
                    <h2>Ward Bursary & School Fees Ledger</h2>
                    <p>{parentWard ? `Statement of account for ${parentWard.name} (${parentWard.grade}) • Session 2026/2027` : "Institutional fee statements and First Bank payments."}</p>
                  </div>
                  <button className='primary-btn' onClick={() => setShowProspectusModal(true)}>
                    <i className='fas fa-file-invoice'></i> Approved Prospectus Schedule
                  </button>
                </div>

                {renderWardSwitcher(myWards, parentWard)}

                <div className='bank-account-banner shadow' style={{ marginBottom: '24px' }}>
                  <div className='bank-left flex'>
                    <div className='bank-logo-badge' style={{ background: '#fff', padding: '3px', overflow: 'hidden' }}>
                      <img src='/images/logo.png' alt="Brighter Land Int'l School" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div>
                      <span className='bank-tag'><i className='fas fa-shield-alt'></i> OFFICIAL SCHOOL ACCOUNT DETAILS • STUDY TO MAKE IMPACT</span>
                      <h2>{schoolAccountDetails.accountName}</h2>
                      <div className='bank-meta-row flex'>
                        <span>Bank: <strong>{schoolAccountDetails.bankName}</strong></span>
                        <span className='dot'>•</span>
                        <span>Account Number: <strong className='acc-num'>{schoolAccountDetails.accountNumber}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='portal-card table-card shadow'>
                  <table className='portal-table'>
                    <thead>
                      <tr>
                        <th>Invoice ID</th>
                        <th>Term</th>
                        <th>Amount Invoiced</th>
                        <th>Amount Paid</th>
                        <th>Balance Due</th>
                        <th>Status</th>
                        <th>Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wardInvoices.length === 0 ? (
                        <tr>
                          <td colSpan='7' style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                            <i className='fas fa-info-circle'></i> No tuition fee invoices generated yet for this ward.
                          </td>
                        </tr>
                      ) : (
                        wardInvoices.map((inv) => {
                          const balance = inv.total - inv.amountPaid
                          return (
                            <tr key={inv.invoiceNo}>
                              <td><strong>{inv.invoiceNo}</strong></td>
                              <td>{inv.term}</td>
                              <td><strong>₦{inv.total.toLocaleString()}</strong></td>
                              <td><strong style={{ color: '#00a884' }}>₦{inv.amountPaid.toLocaleString()}</strong></td>
                              <td><strong style={{ color: balance > 0 ? '#ef4444' : '#10b981' }}>₦{balance.toLocaleString()}</strong></td>
                              <td><span className={`status-pill ${inv.status.toLowerCase()}`}>{inv.status}</span></td>
                              <td>
                                <button className='btn-action-primary' onClick={() => setReceiptInvoice(inv)}>
                                  <i className='fas fa-receipt'></i> Print Official Receipt
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}

          {/* PARENT SUB-TAB: ATTENDANCE & PUNCTUALITY */}
          {activeTab === "parent-attendance" && (() => {
            const myWards = getParentWards(currentUser)
            const parentWard = getActiveParentWard(currentUser)

            return (
              <div className='tab-view parent-attendance-view'>
                <div className='tab-header flexSB'>
                  <div>
                    <h2>Attendance & Daily Roll Call Record</h2>
                    <p>{parentWard ? `${parentWard.name} (${parentWard.grade}) • Session 2026/2027` : "Student daily roll call and punctuality log."}</p>
                  </div>
                  <div className='flex' style={{ gap: '10px' }}>
                    <span className='status-pill paid' style={{ fontSize: '14px', padding: '6px 14px' }}>
                      {parentWard ? `${parentWard.attendance || 100}% Rate` : "100% Rate"}
                    </span>
                  </div>
                </div>

                {renderWardSwitcher(myWards, parentWard)}

                <div className='portal-two-col-grid'>
                  <div className='portal-card shadow'>
                    <h3><i className='fas fa-chart-pie' style={{ color: '#00a884' }}></i> Terminal Attendance Summary</h3>
                    <div style={{ marginTop: '16px' }}>
                      <div className='flexSB' style={{ padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span>Today's Status:</span>
                        <strong style={{ color: '#00a884' }}>{parentWard ? (attendanceRecords[parentWard.id] || "Present") : "Present"}</strong>
                      </div>
                      <div className='flexSB' style={{ padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span>Academic Session:</span>
                        <strong>2026/2027 Session</strong>
                      </div>
                      <div className='flexSB' style={{ padding: '8px 0' }}>
                        <span>Class Room:</span>
                        <strong>{parentWard ? parentWard.grade : "General Division"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className='portal-card shadow'>
                    <h3><i className='fas fa-clock' style={{ color: '#2563eb' }}></i> Punctuality & Morning Gate Log</h3>
                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: '10px' }}>
                      Morning assembly starts promptly at <strong>07:45 AM</strong>. Prompt arrival reinforces moral discipline and character molding.
                    </p>
                    <div style={{ background: '#ecfdf5', padding: '14px', borderRadius: '8px', border: '1px solid #a7f3d0', marginTop: '14px' }}>
                      <small style={{ color: '#065f46', fontWeight: '700' }}><i className='fas fa-award'></i> Dean's Punctuality & Discipline Directive Active</small>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* =======================================================
              STUDENT VIEW: SCHOLAR DASHBOARD & ACADEMICS
             ======================================================= */}
          {activeTab === "student-dashboard" && (() => {
            const studentScholar = currentUser && currentUser.role === "student"
              ? students.find((s) => s.id === currentUser.id || s.id === currentUser.studentId || (s.name && s.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim())) || students[0]
              : students[0]

            if (!studentScholar) {
              return (
                <div className='tab-view student-dashboard-view'>
                  <div className='portal-card' style={{ textAlign: 'center', padding: '60px 20px', margin: '20px auto', maxWidth: '600px' }}>
                    <i className='fas fa-user-graduate' style={{ fontSize: '48px', color: '#94a3b8', display: 'block', marginBottom: '16px' }}></i>
                    <h3 style={{ color: '#071626', marginBottom: '8px' }}>Welcome to the Scholar Portal</h3>
                    <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
                      No scholar records have been registered in the Student Information System (SIS) yet. Once enrolled, your curriculum performance, term timetable, and house standings will appear here.
                    </p>
                    {currentUser && (currentUser.role === "admin" || currentUser.role === "proprietor") && (
                      <button className='primary-btn' onClick={() => setShowAddStudentModal(true)}>
                        <i className='fas fa-user-plus'></i> Enroll Scholar Now
                      </button>
                    )}
                  </div>
                </div>
              )
            }

            const scholarScores = gradebookData.filter((g) => g.studentId === studentScholar.id || (g.studentName && g.studentName.toLowerCase().trim() === studentScholar.name.toLowerCase().trim()))
            const avgGpa = scholarScores.length > 0
              ? (scholarScores.reduce((acc, curr) => acc + parseFloat(calculateGradeInfo(curr).gpa), 0) / scholarScores.length).toFixed(2)
              : (studentScholar.gpa && studentScholar.gpa !== "—" ? studentScholar.gpa : "—")

            return (
              <div className='tab-view student-dashboard-view'>
                {/* Scholar Banner */}
                <div className='student-hero-banner shadow flexSB'>
                  <div className='flex' style={{ gap: '18px', alignItems: 'center' }}>
                    <div className='student-avatar-ring'>
                      <i className='fas fa-user-graduate'></i>
                    </div>
                    <div>
                      <span className='scholar-badge'><i className='fas fa-star'></i> ACADEMIC SCHOLAR • {studentScholar.grade.toUpperCase()}</span>
                      <h2>Welcome, {studentScholar.name}! 🎓</h2>
                      <p style={{ margin: '4px 0', fontSize: '14px', color: '#64748b' }}>
                        Brighter Land International School • <em>"Study to Make Impact"</em>
                      </p>
                      <small style={{ color: '#00a884', fontWeight: '700' }}>
                        {studentScholar.house || "Phoenix"} House • Student ID: {studentScholar.id}
                      </small>
                    </div>
                  </div>

                  <div className='student-hero-actions flex' style={{ gap: '10px' }}>
                    <button className='primary-btn' onClick={() => setReportCardStudent(studentScholar)}>
                      <i className='fas fa-award'></i> My Report Card
                    </button>
                    <button className='outline-btn' onClick={() => setActiveTab("timetable")}>
                      <i className='fas fa-clock'></i> Daily Schedule
                    </button>
                  </div>
                </div>

                {/* Scholar Metrics */}
                <div className='metrics-grid' style={{ marginTop: '24px' }}>
                  <div className='metric-card shadow flex'>
                    <div className='metric-icon emerald'><i className='fas fa-graduation-cap'></i></div>
                    <div className='metric-data'>
                      <small>TERM GPA</small>
                      <h3>{avgGpa} / 4.0</h3>
                      <span className='trend-badge green'>{scholarScores.length} Subjects Evaluated</span>
                    </div>
                  </div>

                  <div className='metric-card shadow flex'>
                    <div className='metric-icon blue'><i className='fas fa-clipboard-check'></i></div>
                    <div className='metric-data'>
                      <small>ROLL CALL ATTENDANCE</small>
                      <h3>{studentScholar.attendance || 100}%</h3>
                      <span className='trend-badge green'>Status: {attendanceRecords[studentScholar.id] || "Present"}</span>
                    </div>
                  </div>

                  <div className='metric-card shadow flex'>
                    <div className='metric-icon amber'><i className='fas fa-shield-alt'></i></div>
                    <div className='metric-data'>
                      <small>HOUSE ASSIGNMENT</small>
                      <h3>{studentScholar.house || "Phoenix"} House</h3>
                      <span className='trend-badge amber'>Inter-House Sports Active</span>
                    </div>
                  </div>

                  <div className='metric-card shadow flex'>
                    <div className='metric-icon purple'><i className='fas fa-book-reader'></i></div>
                    <div className='metric-data'>
                      <small>CURRICULUM STAGE</small>
                      <h3>{studentScholar.grade}</h3>
                      <span className='trend-badge purple'>NERDC Curriculum Track</span>
                    </div>
                  </div>
                </div>

                {/* Scholar Performance & Timetable Grid */}
                <div className='portal-two-col-grid' style={{ marginTop: '24px' }}>
                  {/* My Subjects & Letter Grades */}
                  <div className='portal-card shadow'>
                    <div className='card-header-line flexSB'>
                      <h3><i className='fas fa-chart-line' style={{ color: '#00a884' }}></i> My Continuous Assessment & Grades</h3>
                      <button className='link-btn' onClick={() => setReportCardStudent(studentScholar)}>Full Report Card →</button>
                    </div>

                    <div className='student-grades-grid'>
                      {scholarScores.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                          <p>No continuous assessment scores logged yet for this term.</p>
                        </div>
                      ) : (
                        scholarScores.map((item, i) => {
                          const { total, letter } = calculateGradeInfo(item)
                          return (
                            <div className='student-grade-pill flexSB' key={i} style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
                              <div>
                                <strong>{item.subject}</strong>
                                <small style={{ display: 'block', color: '#64748b' }}>{item.remarks || "Continuous Assessment"}</small>
                              </div>
                              <div className='flex' style={{ gap: '10px', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{total}%</span>
                                <span className={`letter-badge grade-${letter}`}>{letter}</span>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Today's Bell Schedule */}
                  <div className='portal-card shadow'>
                    <div className='card-header-line flexSB'>
                      <h3><i className='fas fa-bell' style={{ color: '#f59e0b' }}></i> Today's Bell & Classroom Schedule</h3>
                      <button className='link-btn' onClick={() => setActiveTab("timetable")}>Weekly Grid →</button>
                    </div>

                    <div className='bell-schedule-list'>
                      <div className='bell-item flexSB' style={{ padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span><strong>Period 1</strong> (08:00 - 08:45)</span>
                        <span style={{ color: '#071626', fontWeight: '600' }}>Mathematics • Main Hall</span>
                      </div>
                      <div className='bell-item flexSB' style={{ padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span><strong>Period 2</strong> (08:45 - 09:30)</span>
                        <span style={{ color: '#071626', fontWeight: '600' }}>English Studies • Room 3</span>
                      </div>
                      <div className='bell-item flexSB' style={{ padding: '8px 0', borderBottom: '1px solid #e2e8f0', background: '#ecfdf5', borderRadius: '4px', paddingLeft: '8px' }}>
                        <span style={{ color: '#065f46' }}><strong>Period 3</strong> (09:30 - 10:15)</span>
                        <span style={{ color: '#065f46', fontWeight: '700' }}>Science & Digital Skills Lab (NOW)</span>
                      </div>
                      <div className='bell-item flexSB' style={{ padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span><strong>Break</strong> (10:15 - 10:45)</span>
                        <span style={{ color: '#64748b' }}>Morning Recess</span>
                      </div>
                      <div className='bell-item flexSB' style={{ padding: '8px 0' }}>
                        <span><strong>Period 7</strong> (14:00 - 14:45)</span>
                        <span style={{ color: '#2563eb', fontWeight: '600' }}>Wednesday Wear Sports / Lessons</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* STUDENT SUB-TAB: GRADES & RESULTS */}
          {activeTab === "student-grades" && (() => {
            const studentScholar = currentUser && currentUser.role === "student"
              ? students.find((s) => s.id === currentUser.id || s.id === currentUser.studentId || (s.name && s.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim())) || students[0]
              : students[0]
            const scholarScores = studentScholar
              ? gradebookData.filter((g) => g.studentId === studentScholar.id || (g.studentName && g.studentName.toLowerCase().trim() === studentScholar.name.toLowerCase().trim()))
              : []

            return (
              <div className='tab-view student-grades-view'>
                <div className='tab-header flexSB'>
                  <div>
                    <h2>My Continuous Assessment & Exam Results</h2>
                    <p>{studentScholar ? `${studentScholar.name} (${studentScholar.grade}) • 2026/2027 Session` : "Continuous Assessment records."}</p>
                  </div>
                  {studentScholar && (
                    <button className='primary-btn' onClick={() => setReportCardStudent(studentScholar)}>
                      <i className='fas fa-print'></i> Print Official Report Card
                    </button>
                  )}
                </div>

                <div className='portal-card table-card shadow'>
                  <table className='portal-table'>
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>1st Assign (10)</th>
                        <th>2nd Assign (10)</th>
                        <th>1st Test (10)</th>
                        <th>2nd Test (10)</th>
                        <th>Total CA (40)</th>
                        <th>Exam (60)</th>
                        <th>Total Score (100%)</th>
                        <th>Grade</th>
                        <th>Teacher Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scholarScores.length === 0 ? (
                        <tr>
                          <td colSpan='10' style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                            <i className='fas fa-info-circle'></i> No continuous assessment scores recorded yet by subject teachers.
                          </td>
                        </tr>
                      ) : (
                        scholarScores.map((item, idx) => {
                          const { a1, a2, t1, t2, caTotal, examScore, total, letter } = calculateGradeInfo(item)
                          return (
                            <tr key={idx}>
                              <td><strong>{item.subject}</strong></td>
                              <td>{a1}</td>
                              <td>{a2}</td>
                              <td>{t1}</td>
                              <td>{t2}</td>
                              <td><span className='ca-total-badge' style={{ background: '#f0fdfa', color: '#0d9488', padding: '3px 8px', borderRadius: '4px', fontWeight: '700' }}>{caTotal}/40</span></td>
                              <td>{examScore}</td>
                              <td><strong className='total-score-badge'>{total}%</strong></td>
                              <td><span className={`letter-badge grade-${letter}`}>{letter}</span></td>
                              <td>{item.remarks || "Commendable effort."}</td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}

          {/* STUDENT SUB-TAB: PHOENIX HOUSE & MERITS */}
          {activeTab === "student-house" && (() => {
            const studentScholar = currentUser && currentUser.role === "student"
              ? students.find((s) => s.id === currentUser.id || s.id === currentUser.studentId || (s.name && s.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim())) || students[0]
              : students[0]

            return (
              <div className='tab-view student-house-view'>
                <div className='tab-header flexSB'>
                  <div>
                    <h2>House Registry & Standings</h2>
                    <p>Inter-House Championship 2026/2027 • Motto: Rise with Impact</p>
                  </div>
                  <span className={`house-tag ${(studentScholar ? studentScholar.house || "phoenix" : "phoenix").toLowerCase()}`} style={{ fontSize: '15px', padding: '6px 16px' }}>
                    {studentScholar ? `${(studentScholar.house || "Phoenix").toUpperCase()} HOUSE` : "HOUSE SYSTEM"}
                  </span>
                </div>

                <div className='portal-two-col-grid'>
                  <div className='portal-card shadow'>
                    <h3><i className='fas fa-trophy' style={{ color: '#f59e0b' }}></i> Inter-House Points Table</h3>
                    <div style={{ marginTop: '16px' }}>
                      <div className='flexSB' style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span><strong>1. Phoenix House</strong> (Gold)</span>
                        <strong style={{ color: '#00a884', fontSize: '16px' }}>840 Points</strong>
                      </div>
                      <div className='flexSB' style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span><strong>2. Pegasus House</strong> (Blue)</span>
                        <strong>790 Points</strong>
                      </div>
                      <div className='flexSB' style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span><strong>3. Orion House</strong> (Green)</span>
                        <strong>765 Points</strong>
                      </div>
                      <div className='flexSB' style={{ padding: '10px 0' }}>
                        <span><strong>4. Aquila House</strong> (Purple)</span>
                        <strong>720 Points</strong>
                      </div>
                    </div>
                  </div>

                  <div className='portal-card shadow'>
                    <h3><i className='fas fa-star' style={{ color: '#10b981' }}></i> Scholar Merits & Commendations</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0 0', fontSize: '13px' }}>
                      <li className='flexSB' style={{ padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                        <span>Academic Diligence & Homework Presentation:</span>
                        <strong style={{ color: '#00a884' }}>+30 Pts</strong>
                      </li>
                      <li className='flexSB' style={{ padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                        <span>Inter-House Debate & Cultural Presentation:</span>
                        <strong style={{ color: '#00a884' }}>+25 Pts</strong>
                      </li>
                      <li className='flexSB' style={{ padding: '8px 0' }}>
                        <span>Weekly Punctuality & Wednesday Wear Discipline:</span>
                        <strong style={{ color: '#00a884' }}>+20 Pts</strong>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* 2. STUDENT INFORMATION SYSTEM (SIS) */}
          {activeTab === "sis" && (
            <div className='tab-view sis-view'>
              <div className='tab-header flexSB'>
                <div>
                  <h2>Student Information System (SIS)</h2>
                  <p>Official student registry across Crèche, Nursery, Primary, JSS, and SSS.</p>
                </div>
                <button className='primary-btn' onClick={() => setShowAddStudentModal(true)}>
                  <i className='fas fa-plus'></i> Enroll Scholar
                </button>
              </div>

              {/* Search & Filters */}
              <div className='filter-bar flexSB'>
                <div className='search-input-wrap'>
                  <i className='fas fa-search'></i>
                  <input
                    type='text'
                    placeholder='Search scholar by name, student ID, or guardian...'
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>

                <div className='filter-dropdowns flex'>
                  <div className='filter-group'>
                    <label>Filter Division:</label>
                    <select
                      value={studentGradeFilter}
                      onChange={(e) => setStudentGradeFilter(e.target.value)}
                    >
                      <option value='All'>All Classes</option>
                      <option value='Crèche'>Crèche</option>
                      <option value='Nursery'>Nursery 1 & 2</option>
                      <option value='Primary'>Primary 1 – 5</option>
                      <option value='JSS'>JSS 1 – 3</option>
                      <option value='SS'>SS 1 – 2</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Students Table */}
              <div className='portal-card table-card'>
                <table className='portal-table'>
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Scholar Name</th>
                      <th>Class Level</th>
                      <th>House</th>
                      <th>Attendance</th>
                      <th>GPA</th>
                      <th>Fee Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan='8' style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                          <div style={{ maxWidth: '420px', margin: '0 auto' }}>
                            <i className='fas fa-user-graduate' style={{ fontSize: '36px', color: '#94a3b8', marginBottom: '12px', display: 'block' }}></i>
                            <h4 style={{ color: '#071626', margin: '0 0 6px 0' }}>No Scholars Enrolled in SIS</h4>
                            <p style={{ fontSize: '13px', margin: '0 0 16px 0' }}>
                              All student registries start completely clean. Click "Enroll Scholar" above to register your first student.
                            </p>
                            <button className='primary-btn' onClick={() => setShowAddStudentModal(true)}>
                              <i className='fas fa-plus'></i> Enroll First Scholar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((st) => (
                        <tr key={st.id}>
                          <td><span className='id-badge'>{st.id}</span></td>
                        <td>
                          <div className='student-name-col'>
                            <strong>{st.name}</strong>
                            <small>{st.guardian} ({st.phone})</small>
                          </div>
                        </td>
                        <td><strong>{st.grade}</strong></td>
                        <td>
                          <span className={`house-tag ${st.house.toLowerCase()}`}>
                            {st.house}
                          </span>
                        </td>
                        <td>
                          <span className='att-percent'>{st.attendance}%</span>
                        </td>
                        <td>
                          <span className='gpa-badge'>{st.gpa}</span>
                        </td>
                        <td>
                          <span className={`status-pill ${st.feeStatus.toLowerCase()}`}>
                            {st.feeStatus}
                          </span>
                        </td>
                        <td>
                          <div className='action-buttons'>
                            <button
                              className='btn-action'
                              title='View Comprehensive Dossier'
                              onClick={() => setSelectedStudent(st)}
                            >
                              <i className='fas fa-eye'></i> Dossier
                            </button>
                            <button
                              className='btn-action'
                              title='Generate Official Report Card'
                              onClick={() => setReportCardStudent(st)}
                            >
                              <i className='fas fa-file-alt'></i> Report Card
                            </button>
                            <button
                              className='btn-action'
                              title='View Scholar & Parent Login Credentials'
                              style={{ color: '#00a884' }}
                              onClick={() => {
                                const currentUsers = getStoredPortalUsers()
                                const pAcc = currentUsers.find(
                                  (u) =>
                                    u.role === "parent" &&
                                    ((Array.isArray(u.linkedStudentIds) && u.linkedStudentIds.includes(st.id)) ||
                                      (u.phone && st.phone && u.phone.replace(/[^0-9]/g, "") === st.phone.replace(/[^0-9]/g, "")) ||
                                      (u.email && st.email && u.email.toLowerCase().trim() === st.email.toLowerCase().trim()) ||
                                      (u.name && st.guardian && u.name.toLowerCase().trim() === st.guardian.toLowerCase().trim()))
                                )
                                const sAcc = currentUsers.find((u) => u.studentId === st.id || u.id === `USR-STU-${st.id}`)
                                setCreatedStudentCredentials({
                                  studentName: st.name,
                                  studentId: st.id,
                                  grade: st.grade,
                                  studentUsername: sAcc ? sAcc.username : st.name.toLowerCase().replace(/\s+/g, "."),
                                  studentPassword: sAcc ? sAcc.password || "password123" : "password123",
                                  parentName: pAcc ? pAcc.name : (st.guardian || "Guardian"),
                                  parentUsername: pAcc ? pAcc.username : (st.phone || "parent"),
                                  parentEmail: pAcc ? pAcc.email : (st.email || "On File"),
                                  parentPhone: pAcc ? (pAcc.phone || st.phone) : (st.phone || "On File"),
                                  parentPassword: pAcc ? (pAcc.password || "password123") : "password123",
                                })
                              }}
                            >
                              <i className='fas fa-key'></i> Credentials
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. CONTINUOUS ASSESSMENT & TERMINAL REPORTS */}
          {activeTab === "gradebook" && (
            <div className='tab-view gradebook-view'>
              <div className='tab-header flexSB' style={{ flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2>Continuous Assessment & Terminal Result Broadsheet</h2>
                  <p>NERDC / WAEC Evaluation (CA 40% + Terminal Exam 60%) • Class Head Teacher Collation & Principal Endorsement.</p>
                </div>
                <div className='flex' style={{ gap: '10px', flexWrap: 'wrap' }}>
                  {gradebookViewMode === "subject_entry" && (
                    <>
                      <button
                        className='primary-btn'
                        style={{ background: '#2563eb' }}
                        onClick={handleOpenNewScoreModal}
                      >
                        <i className='fas fa-plus'></i> Record Assessment Score
                      </button>
                      <button
                        className='primary-btn'
                        style={{ background: '#00a884', color: '#fff' }}
                        onClick={handleSaveGradebook}
                      >
                        <i className='fas fa-save'></i> Save Continuous Assessment
                      </button>
                    </>
                  )}
                  {gradebookViewMode === "collation_hub" && (
                    <button
                      className='primary-btn'
                      style={{ background: '#059669', color: '#fff' }}
                      onClick={() => handleSubmitCollationToPrincipal(collationSelectedClass)}
                    >
                      <i className='fas fa-paper-plane'></i> Submit Broadsheet to Principal
                    </button>
                  )}
                  {gradebookViewMode === "principal_review" && (
                    <button
                      className='primary-btn'
                      style={{ background: '#1e3a8a', color: '#fff' }}
                      onClick={() => handleBatchApproveClass(principalSelectedClass, true)}
                    >
                      <i className='fas fa-stamp'></i> Apply BLIS Seal & Approve All
                    </button>
                  )}
                </div>
              </div>

              {/* 3-Way Sub-Navigation Bar */}
              <div className='collation-nav-bar'>
                <button
                  type='button'
                  className={`collation-nav-btn ${gradebookViewMode === "subject_entry" ? "active" : ""}`}
                  onClick={() => setGradebookViewMode("subject_entry")}
                >
                  <i className='fas fa-pen-nib' style={{ color: '#2563eb' }}></i> 1. Subject CA Score Entry
                </button>
                <button
                  type='button'
                  className={`collation-nav-btn ${gradebookViewMode === "collation_hub" ? "active" : ""}`}
                  onClick={() => setGradebookViewMode("collation_hub")}
                >
                  <i className='fas fa-user-tie' style={{ color: '#059669' }}></i> 2. Class Head Teacher Collation Hub
                </button>
                <button
                  type='button'
                  className={`collation-nav-btn ${gradebookViewMode === "principal_review" ? "active" : ""}`}
                  onClick={() => setGradebookViewMode("principal_review")}
                >
                  <i className='fas fa-stamp' style={{ color: '#d97706' }}></i> 3. Principal's Final Endorsement & Seal
                </button>
              </div>

              {/* VIEW MODE 1: SUBJECT TEACHER CA SCORE ENTRY */}
              {gradebookViewMode === "subject_entry" && (
                <>
                  {/* Class & Subject Selector */}
                  <div className='filter-bar flexSB'>
                    <div className='filter-group'>
                      <label>Class Division:</label>
                      <select
                        value={gradebookSelectedClass}
                        onChange={(e) => setGradebookSelectedClass(e.target.value)}
                      >
                        {currentUser && currentUser.role === "teacher" ? (
                          (currentUser.assignedClasses || []).map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))
                        ) : (
                          <>
                            <option value='All'>All Class Divisions</option>
                            {availableSchoolClasses.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>

                    <div className='filter-group'>
                      <label>Subject Discipline:</label>
                      <select
                        value={gradebookSelectedSubject}
                        onChange={(e) => setGradebookSelectedSubject(e.target.value)}
                      >
                        <option value='All'>All Subject Disciplines ({getSubjectsForClass(gradebookSelectedClass).length} Subjects)</option>
                        {getSubjectsForClass(gradebookSelectedClass).map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Gradebook Table with Editable Scores */}
                  <div className='portal-card table-card' style={{ overflowX: 'auto' }}>
                    <table className='portal-table editable-table'>
                      <thead>
                        <tr>
                          <th>Scholar</th>
                          <th>1st Assign (10)</th>
                          <th>2nd Assign (10)</th>
                          <th>1st Test (10)</th>
                          <th>2nd Test (10)</th>
                          <th>Total CA (40)</th>
                          <th>Terminal Exam (60)</th>
                          <th>Total Score (100%)</th>
                          <th>Grade</th>
                          <th>GPA Point</th>
                          <th>Report</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const teacherAllowed = currentUser && currentUser.role === "teacher" ? (currentUser.assignedClasses || []) : null
                          const filteredList = gradebookData.filter((item) => {
                            if (teacherAllowed) {
                              if (!teacherAllowed.includes(item.gradeLevel) && !teacherAllowed.includes("All Classes")) return false
                            }
                            const matchesClass = gradebookSelectedClass === "All" || item.gradeLevel === gradebookSelectedClass
                            const matchesSubject =
                              gradebookSelectedSubject === "All" ||
                              item.subject === gradebookSelectedSubject ||
                              (item.subject && item.subject.toLowerCase().trim() === gradebookSelectedSubject.toLowerCase().trim())
                            return matchesClass && matchesSubject
                          })

                          if (filteredList.length === 0) {
                            return (
                              <tr>
                                <td colSpan='11' style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                                  <div style={{ maxWidth: '420px', margin: '0 auto' }}>
                                    <i className='fas fa-clipboard-list' style={{ fontSize: '32px', color: '#94a3b8', marginBottom: '12px', display: 'block' }}></i>
                                    <h4 style={{ color: '#071626', margin: '0 0 6px 0' }}>No Continuous Assessment Records for {gradebookSelectedClass}</h4>
                                    <p style={{ fontSize: '13px', margin: '0 0 16px 0' }}>
                                      No assessment scores have been logged yet for this class division and subject filter. Use the button below to log assignment, test, and terminal examination marks.
                                    </p>
                                    <button
                                      className='primary-btn'
                                      onClick={handleOpenNewScoreModal}
                                    >
                                      <i className='fas fa-plus'></i> Enter Scores for {gradebookSelectedClass === "All" ? "Class" : gradebookSelectedClass}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          }

                          return filteredList.map((item) => {
                            const originalIdx = gradebookData.findIndex(
                              (g) => g.studentId === item.studentId && g.subject === item.subject && g.gradeLevel === item.gradeLevel
                            )
                            const idx = originalIdx >= 0 ? originalIdx : 0
                            const { caTotal, total, letter, gpa } = calculateGradeInfo(item)
                            return (
                              <tr key={`${item.studentId}-${item.subject || "sub"}-${item.gradeLevel}`}>
                                <td>
                                  <strong>{item.studentName}</strong>
                                  <small style={{ display: 'block', color: '#64748b' }}>
                                    {item.gradeLevel} • {item.subject || "Curriculum"} • {item.studentId}
                                  </small>
                                </td>
                                <td>
                                  <input
                                    type='number'
                                    min='0'
                                    max='10'
                                    value={item.assign1 !== undefined ? item.assign1 : 0}
                                    onChange={(e) => handleScoreChange(idx, "assign1", e.target.value)}
                                    className='score-input ca-input'
                                    title='1st Assignment (over 10)'
                                  />
                                </td>
                                <td>
                                  <input
                                    type='number'
                                    min='0'
                                    max='10'
                                    value={item.assign2 !== undefined ? item.assign2 : 0}
                                    onChange={(e) => handleScoreChange(idx, "assign2", e.target.value)}
                                    className='score-input ca-input'
                                    title='2nd Assignment (over 10)'
                                  />
                                </td>
                                <td>
                                  <input
                                    type='number'
                                    min='0'
                                    max='10'
                                    value={item.test1 !== undefined ? item.test1 : 0}
                                    onChange={(e) => handleScoreChange(idx, "test1", e.target.value)}
                                    className='score-input ca-input'
                                    title='1st Test (over 10)'
                                  />
                                </td>
                                <td>
                                  <input
                                    type='number'
                                    min='0'
                                    max='10'
                                    value={item.test2 !== undefined ? item.test2 : 0}
                                    onChange={(e) => handleScoreChange(idx, "test2", e.target.value)}
                                    className='score-input ca-input'
                                    title='2nd Test (over 10)'
                                  />
                                </td>
                                <td>
                                  <span className='ca-total-badge' style={{ background: '#f0fdfa', color: '#0d9488', padding: '4px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '13px', border: '1px solid #ccfbf1', display: 'inline-block', whiteSpace: 'nowrap' }}>
                                    {caTotal}/40
                                  </span>
                                </td>
                                <td>
                                  <input
                                    type='number'
                                    min='0'
                                    max='60'
                                    value={item.exam !== undefined ? item.exam : 0}
                                    onChange={(e) => handleScoreChange(idx, "exam", e.target.value)}
                                    className='score-input exam-input'
                                    title='Terminal Examination (over 60)'
                                  />
                                </td>
                                <td>
                                  <span className='total-score-badge'>{total}%</span>
                                </td>
                                <td>
                                  <span className={`letter-badge grade-${letter}`}>
                                    {letter}
                                  </span>
                                </td>
                                <td>
                                  <strong>{gpa}</strong>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button
                                      className='btn-action-sm'
                                      style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
                                      onClick={() => handleEditScoreRecord(item)}
                                      title='Edit Recorded Scores'
                                    >
                                      <i className='fas fa-edit'></i> Edit
                                    </button>
                                    <button
                                      className='btn-action-sm'
                                      onClick={() => {
                                        const matchedStudent = students.find((s) => s.id === item.studentId) || {
                                          id: item.studentId,
                                          name: item.studentName,
                                          grade: item.gradeLevel,
                                          house: "Phoenix",
                                          attendance: 100,
                                          gpa: gpa,
                                        }
                                        setReportCardStudent(matchedStudent)
                                      }}
                                      title='Generate Official Report Card'
                                    >
                                      <i className='fas fa-file-invoice'></i> Preview
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        })()}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* VIEW MODE 2: CLASS HEAD TEACHER (FORM MASTER) COLLATION HUB */}
              {gradebookViewMode === "collation_hub" && (() => {
                const broadsheet = calculateClassBroadsheet(collationSelectedClass)
                const classScholarsCount = broadsheet.length
                const totalSubsRecorded = broadsheet.reduce((acc, c) => acc + c.subjectCount, 0)
                const overallAvg = classScholarsCount > 0
                  ? (broadsheet.reduce((acc, c) => acc + c.avgScore, 0) / classScholarsCount).toFixed(1)
                  : "0.0"
                const topScholar = broadsheet[0] || null

                return (
                  <div>
                    {/* Class Selector & Header */}
                    <div className='filter-bar flexSB' style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '18px' }}>
                      <div className='filter-group' style={{ flex: 1, maxWidth: '320px' }}>
                        <label style={{ color: '#166534', fontWeight: '700' }}>
                          <i className='fas fa-chalkboard'></i> Select Class for Collation:
                        </label>
                        <select
                          value={collationSelectedClass}
                          onChange={(e) => setCollationSelectedClass(e.target.value)}
                          style={{ border: '1.5px solid #059669', background: '#fff', fontWeight: '700' }}
                        >
                          {availableSchoolClasses.map((cls) => {
                            const isMyFormClass = currentUser && currentUser.headTeacherClass === cls
                            return (
                              <option key={cls} value={cls}>
                                {cls} {isMyFormClass ? "⭐ (Your Assigned Form Class)" : ""}
                              </option>
                            )
                          })}
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'right' }}>
                          <small style={{ color: '#166534', display: 'block', fontWeight: '600' }}>Broadsheet Status:</small>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#065f46' }}>
                            {broadsheet.some(b => b.isSubmitted) ? "✅ Submitted to Principal" : "📝 Active Collation in Progress"}
                          </span>
                        </div>
                        <button
                          type='button'
                          className='primary-btn'
                          style={{ background: '#059669', color: '#fff' }}
                          onClick={() => handleSubmitCollationToPrincipal(collationSelectedClass)}
                        >
                          <i className='fas fa-paper-plane'></i> Submit Broadsheet to Principal
                        </button>
                      </div>
                    </div>

                    {/* Broadsheet Summary KPI Cards */}
                    <div className='metrics-grid' style={{ marginBottom: '20px' }}>
                      <div className='metric-card shadow flex'>
                        <div className='metric-icon emerald'><i className='fas fa-user-graduate'></i></div>
                        <div className='metric-data'>
                          <small>ENROLLED SCHOLARS</small>
                          <h3>{classScholarsCount} Scholars</h3>
                          <span className='trend-badge green'>{collationSelectedClass} Broadsheet Scope</span>
                        </div>
                      </div>

                      <div className='metric-card shadow flex'>
                        <div className='metric-icon blue'><i className='fas fa-book-open'></i></div>
                        <div className='metric-data'>
                          <small>SUBJECT SCORES LOGGED</small>
                          <h3>{totalSubsRecorded} Entries</h3>
                          <span className='trend-badge blue'>Across All Subject Teachers</span>
                        </div>
                      </div>

                      <div className='metric-card shadow flex'>
                        <div className='metric-icon amber'><i className='fas fa-chart-line'></i></div>
                        <div className='metric-data'>
                          <small>CLASS AVERAGE</small>
                          <h3>{overallAvg}%</h3>
                          <span className='trend-badge amber'>Cumulative Performance</span>
                        </div>
                      </div>

                      <div className='metric-card shadow flex'>
                        <div className='metric-icon purple'><i className='fas fa-trophy'></i></div>
                        <div className='metric-data'>
                          <small>1ST POSITION (LEADING)</small>
                          <h3 style={{ fontSize: '15px' }}>{topScholar ? topScholar.student.name : "Awaiting Marks"}</h3>
                          <span className='trend-badge purple'>{topScholar ? `${topScholar.avgScore}% Average` : "—"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Form Master Broadsheet Table */}
                    <div className='portal-card table-card' style={{ overflowX: 'auto' }}>
                      <table className='portal-table'>
                        <thead>
                          <tr>
                            <th style={{ width: '90px' }}>Rank / Pos</th>
                            <th>Scholar Details</th>
                            <th>Subjects</th>
                            <th>Total Marks</th>
                            <th>Average (%)</th>
                            <th>GPA</th>
                            <th style={{ minWidth: '280px' }}>Class Head Teacher's Terminal Remark</th>
                            <th>Report Card</th>
                          </tr>
                        </thead>
                        <tbody>
                          {broadsheet.length === 0 ? (
                            <tr>
                              <td colSpan='8' style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                                <i className='fas fa-users-slash' style={{ fontSize: '32px', color: '#cbd5e1', marginBottom: '10px', display: 'block' }}></i>
                                <h4>No Scholars Enrolled in {collationSelectedClass}</h4>
                                <p style={{ fontSize: '13px', margin: '0 auto 14px', maxWidth: '380px' }}>
                                  Enroll students into {collationSelectedClass} via the SIS tab to begin terminal score collation.
                                </p>
                              </td>
                            </tr>
                          ) : (
                            broadsheet.map((item) => {
                              const s = item.student
                              return (
                                <tr key={s.id}>
                                  <td>
                                    <span
                                      style={{
                                        background: item.rank === 1 ? '#fef3c7' : item.rank === 2 ? '#f1f5f9' : item.rank === 3 ? '#ffedd5' : '#f8fafc',
                                        color: item.rank === 1 ? '#b45309' : item.rank === 2 ? '#475569' : item.rank === 3 ? '#c2410c' : '#64748b',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        fontWeight: '800',
                                        fontSize: '13px',
                                        border: '1px solid #e2e8f0',
                                        display: 'inline-block',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {item.rank === 1 ? "🥇 " : item.rank === 2 ? "🥈 " : item.rank === 3 ? "🥉 " : ""}
                                      {item.rankOrdinal}
                                    </span>
                                  </td>
                                  <td>
                                    <strong>{s.name}</strong>
                                    <small style={{ display: 'block', color: '#64748b' }}>
                                      {s.id} • <span className={`house-tag ${(s.house || "phoenix").toLowerCase()}`}>{s.house || "Phoenix"}</span>
                                    </small>
                                  </td>
                                  <td>
                                    <span style={{ fontWeight: '700', color: item.subjectCount > 0 ? '#059669' : '#ef4444' }}>
                                      {item.subjectCount} Subjects
                                    </span>
                                  </td>
                                  <td>
                                    <strong>{item.totalScore}</strong>
                                    <small style={{ display: 'block', color: '#64748b' }}>out of {item.subjectCount * 100}</small>
                                  </td>
                                  <td>
                                    <strong style={{ fontSize: '15px', color: item.avgScore >= 70 ? '#059669' : item.avgScore >= 50 ? '#2563eb' : '#dc2626' }}>
                                      {item.avgScore}%
                                    </strong>
                                  </td>
                                  <td>
                                    <span className='gpa-badge'>{item.avgGpa}</span>
                                  </td>
                                  <td>
                                    <div>
                                      <textarea
                                        rows='2'
                                        value={item.classTeacherRemark}
                                        onChange={(e) => {
                                          handleSaveStudentRemark(
                                            s.id,
                                            s.name,
                                            s.grade,
                                            e.target.value,
                                            item.principalRemark,
                                            item.isApproved
                                          )
                                        }}
                                        style={{
                                          width: '100%',
                                          fontSize: '12px',
                                          padding: '6px 8px',
                                          borderRadius: '6px',
                                          border: '1px solid #cbd5e1',
                                          resize: 'vertical',
                                          outline: 'none',
                                          background: '#fff',
                                        }}
                                        placeholder='Enter Class Teacher remark...'
                                      />
                                      {/* Quick Preset Remark Chips */}
                                      <div className='remark-presets-wrap'>
                                        <button
                                          type='button'
                                          className='remark-preset-chip'
                                          onClick={() => handleSaveStudentRemark(s.id, s.name, s.grade, "An exceptional, diligent and brilliant scholar with exemplary leadership.", item.principalRemark, item.isApproved)}
                                        >
                                          🌟 Outstanding
                                        </button>
                                        <button
                                          type='button'
                                          className='remark-preset-chip'
                                          onClick={() => handleSaveStudentRemark(s.id, s.name, s.grade, "A disciplined, attentive and well-behaved pupil. Good academic progress.", item.principalRemark, item.isApproved)}
                                        >
                                          👍 Well-Behaved
                                        </button>
                                        <button
                                          type='button'
                                          className='remark-preset-chip'
                                          onClick={() => handleSaveStudentRemark(s.id, s.name, s.grade, "Satisfactory performance. Advised to focus more on quantitative subjects.", item.principalRemark, item.isApproved)}
                                        >
                                          🎯 Focus on Math
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <button
                                      className='btn-action'
                                      onClick={() => setReportCardStudent(s)}
                                      title='View Official Terminal Progress Report Card'
                                    >
                                      <i className='fas fa-file-invoice'></i> Preview Report
                                    </button>
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}

              {/* VIEW MODE 3: PRINCIPAL'S FINAL ENDORSEMENT & OFFICIAL SEAL */}
              {gradebookViewMode === "principal_review" && (() => {
                const broadsheet = calculateClassBroadsheet(principalSelectedClass)
                const isAllApproved = broadsheet.length > 0 && broadsheet.every(b => b.isApproved)

                return (
                  <div>
                    {/* Class Selector & Header */}
                    <div className='filter-bar flexSB' style={{ background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: '18px' }}>
                      <div className='filter-group' style={{ flex: 1, maxWidth: '320px' }}>
                        <label style={{ color: '#1e40af', fontWeight: '700' }}>
                          <i className='fas fa-stamp'></i> Principal Approval for Class:
                        </label>
                        <select
                          value={principalSelectedClass}
                          onChange={(e) => setPrincipalSelectedClass(e.target.value)}
                          style={{ border: '1.5px solid #2563eb', background: '#fff', fontWeight: '700' }}
                        >
                          {availableSchoolClasses.map((cls) => (
                            <option key={cls} value={cls}>{cls}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'right' }}>
                          <small style={{ color: '#1e40af', display: 'block', fontWeight: '600' }}>Principal Approval Status:</small>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: isAllApproved ? '#059669' : '#d97706' }}>
                            {isAllApproved ? "🏛️ Verified & Officially Stamped ✓" : "⏳ Pending Principal Review"}
                          </span>
                        </div>
                        <button
                          type='button'
                          className='primary-btn'
                          style={{ background: isAllApproved ? '#059669' : '#1e3a8a', color: '#fff' }}
                          onClick={() => handleBatchApproveClass(principalSelectedClass, !isAllApproved)}
                        >
                          <i className='fas fa-stamp'></i> {isAllApproved ? "Revoke Seal" : "Apply BLIS Official Seal to Class"}
                        </button>
                      </div>
                    </div>

                    {/* Principal Approval Table */}
                    <div className='portal-card table-card' style={{ overflowX: 'auto' }}>
                      <table className='portal-table'>
                        <thead>
                          <tr>
                            <th style={{ width: '80px' }}>Rank</th>
                            <th>Scholar Name</th>
                            <th>Average</th>
                            <th>Class Teacher's Remark</th>
                            <th style={{ minWidth: '280px' }}>Principal's Final Remark & Promotion Decision</th>
                            <th>Seal Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {broadsheet.length === 0 ? (
                            <tr>
                              <td colSpan='7' style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                                No scholars found in {principalSelectedClass}.
                              </td>
                            </tr>
                          ) : (
                            broadsheet.map((item) => {
                              const s = item.student
                              return (
                                <tr key={s.id}>
                                  <td>
                                    <strong>{item.rankOrdinal}</strong>
                                  </td>
                                  <td>
                                    <strong>{s.name}</strong>
                                    <small style={{ display: 'block', color: '#64748b' }}>{s.id}</small>
                                  </td>
                                  <td>
                                    <strong style={{ color: item.avgScore >= 70 ? '#059669' : '#2563eb' }}>{item.avgScore}%</strong>
                                  </td>
                                  <td>
                                    <small style={{ color: '#334155', fontStyle: 'italic', display: 'block', maxWidth: '240px' }}>
                                      "{item.classTeacherRemark}"
                                    </small>
                                    <small style={{ color: '#059669', fontWeight: 'bold' }}>— {item.classTeacherName}</small>
                                  </td>
                                  <td>
                                    <div>
                                      <textarea
                                        rows='2'
                                        value={item.principalRemark}
                                        onChange={(e) => {
                                          handleSaveStudentRemark(
                                            s.id,
                                            s.name,
                                            s.grade,
                                            item.classTeacherRemark,
                                            e.target.value,
                                            item.isApproved
                                          )
                                        }}
                                        style={{
                                          width: '100%',
                                          fontSize: '12px',
                                          padding: '6px 8px',
                                          borderRadius: '6px',
                                          border: '1px solid #93c5fd',
                                          resize: 'vertical',
                                          outline: 'none',
                                          background: '#fff',
                                        }}
                                        placeholder="Enter Principal's final remark..."
                                      />
                                      {/* Quick Preset Decision Chips */}
                                      <div className='remark-presets-wrap'>
                                        <button
                                          type='button'
                                          className='remark-preset-chip'
                                          onClick={() => handleSaveStudentRemark(s.id, s.name, s.grade, item.classTeacherRemark, "Promoted to next class with Honours & Distinction. Keep up the high standard!", item.isApproved)}
                                        >
                                          👑 Honours
                                        </button>
                                        <button
                                          type='button'
                                          className='remark-preset-chip'
                                          onClick={() => handleSaveStudentRemark(s.id, s.name, s.grade, item.classTeacherRemark, "Promoted to next class in good academic standing.", item.isApproved)}
                                        >
                                          ✅ Good Standing
                                        </button>
                                        <button
                                          type='button'
                                          className='remark-preset-chip'
                                          onClick={() => handleSaveStudentRemark(s.id, s.name, s.grade, item.classTeacherRemark, "Promoted on Trial. Additional academic tutoring advised.", item.isApproved)}
                                        >
                                          ⚠️ On Trial
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <span className={`status-pill ${item.isApproved ? "paid" : "pending"}`}>
                                      {item.isApproved ? "SEALED ✓" : "PENDING"}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      className='btn-action-primary'
                                      style={{ fontSize: '11px', padding: '4px 8px' }}
                                      onClick={() => {
                                        handleSaveStudentRemark(
                                          s.id,
                                          s.name,
                                          s.grade,
                                          item.classTeacherRemark,
                                          item.principalRemark,
                                          !item.isApproved
                                        )
                                      }}
                                    >
                                      {item.isApproved ? "Unseal" : "Approve & Seal"}
                                    </button>
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* 4. DAILY ATTENDANCE & ROLL CALL */}
          {activeTab === "attendance" && (
            <div className='tab-view attendance-view'>
              <div className='tab-header flexSB'>
                <div>
                  <h2>Digital Roll Call & Attendance System</h2>
                  <p>Daily morning and lesson roll call with automated SMS/portal absence dispatch.</p>
                </div>
                <div className='flex' style={{ gap: '12px' }}>
                  <button className='primary-btn' onClick={markAllPresent}>
                    <i className='fas fa-check-double'></i> Mark All Present
                  </button>
                  <button className='outline-btn' onClick={sendAbsenceAlerts}>
                    <i className='fas fa-sms'></i> Send Absence Alerts
                  </button>
                </div>
              </div>

              {/* Class & Date Selector */}
              <div className='filter-bar flexSB'>
                <div className='filter-group'>
                  <label>Roll Call Date:</label>
                  <input
                    type='date'
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                  />
                </div>

                <div className='filter-group'>
                  <label>Class Division:</label>
                  <select
                    value={attendanceClass}
                    onChange={(e) => setAttendanceClass(e.target.value)}
                  >
                    {currentUser && currentUser.role === "teacher" ? (
                      (currentUser.assignedClasses || []).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))
                    ) : (
                      <>
                        <option value='All'>All Classes</option>
                        {availableSchoolClasses.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                <div className='attendance-summary-pill'>
                  <span>Daily Rate: <strong>{dailyAttendanceRate}%</strong></span>
                </div>
              </div>

              {/* Attendance Matrix */}
              <div className='portal-card table-card'>
                <table className='portal-table'>
                  <thead>
                    <tr>
                      <th>Scholar</th>
                      <th>Class & House</th>
                      <th>Guardian Contact</th>
                      <th>Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const teacherAllowed = currentUser && currentUser.role === "teacher" ? (currentUser.assignedClasses || []) : null
                      const filteredAttendance = students.filter((st) => {
                        if (teacherAllowed) {
                          if (!teacherAllowed.includes(st.grade) && !teacherAllowed.includes("All Classes")) return false
                        }
                        return attendanceClass === "All" || st.grade === attendanceClass
                      })

                      if (filteredAttendance.length === 0) {
                        return (
                          <tr>
                            <td colSpan='4' style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                              <i className='fas fa-info-circle' style={{ marginRight: '8px' }}></i>
                              No scholars enrolled in <strong>{attendanceClass}</strong> under your assigned authorization scope.
                            </td>
                          </tr>
                        )
                      }

                      return filteredAttendance.map((st) => {
                        const currentStatus = attendanceRecords[st.id] || "Present"
                        return (
                          <tr key={st.id}>
                            <td>
                              <strong>{st.name}</strong>
                              <small style={{ display: 'block', color: '#64748b' }}>{st.id}</small>
                            </td>
                            <td>
                              <strong>{st.grade}</strong> • <span className={`house-tag ${st.house.toLowerCase()}`}>{st.house}</span>
                            </td>
                            <td>
                              <span>{st.guardian}</span>
                              <small style={{ display: 'block', color: '#64748b' }}>{st.phone}</small>
                            </td>
                            <td>
                              <div className='status-toggle-group'>
                                <button
                                  className={`att-btn present ${currentStatus === "Present" ? "selected" : ""}`}
                                  onClick={() => handleAttendanceChange(st.id, "Present")}
                                >
                                  Present
                                </button>
                                <button
                                  className={`att-btn late ${currentStatus === "Late" ? "selected" : ""}`}
                                  onClick={() => handleAttendanceChange(st.id, "Late")}
                                >
                                  Late
                                </button>
                                <button
                                  className={`att-btn absent ${currentStatus === "Absent" ? "selected" : ""}`}
                                  onClick={() => handleAttendanceChange(st.id, "Absent")}
                                >
                                  Absent
                                </button>
                                <button
                                  className={`att-btn excused ${currentStatus === "Excused" ? "selected" : ""}`}
                                  onClick={() => handleAttendanceChange(st.id, "Excused")}
                                >
                                  Excused
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. BURSAR & TUITION FEE BILLING */}
          {activeTab === "finance" && (
            <div className='tab-view finance-view'>
              <div className='tab-header flexSB'>
                <div>
                  <h2>Bursary & Section A Fee Billing Ledger</h2>
                  <p>Invoicing, First Bank direct reconciliation, and official printable fee receipts.</p>
                </div>
                <div className='bursar-summary-badges flex' style={{ gap: '14px' }}>
                  <div className='finance-pill billed'>
                    <small>TOTAL BILLED</small>
                    <strong>₦{totalBilled.toLocaleString()}</strong>
                  </div>
                  <div className='finance-pill collected'>
                    <small>COLLECTED</small>
                    <strong>₦{totalCollected.toLocaleString()}</strong>
                  </div>
                  <div className='finance-pill outstanding'>
                    <small>OUTSTANDING</small>
                    <strong>₦{totalOutstanding.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Status Filter */}
              <div className='filter-bar flexSB'>
                <div className='filter-group'>
                  <label>Filter Status:</label>
                  <div className='button-filter-group'>
                    {["All", "Paid", "Partial", "Pending"].map((st) => (
                      <button
                        key={st}
                        className={`filter-btn ${invoiceStatusFilter === st ? "active" : ""}`}
                        onClick={() => setInvoiceStatusFilter(st)}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className='flex' style={{ gap: '10px', alignItems: 'center' }}>
                  <button
                    className='btn-action-primary'
                    style={{ fontSize: '13px', padding: '6px 14px' }}
                    onClick={() => setShowProspectusModal(true)}
                  >
                    <i className='fas fa-file-invoice-dollar'></i> Approved Prospectus Schedule
                  </button>
                  <div className='bank-quick-pill' style={{ background: '#ecfdf5', padding: '6px 14px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                    <small style={{ color: '#065f46', fontWeight: '700' }}>
                      <i className='fas fa-university'></i> {schoolAccountDetails.bankName}: <strong>{schoolAccountDetails.accountNumber}</strong>
                    </small>
                  </div>
                </div>
              </div>

              {/* Invoices Table */}
              <div className='portal-card table-card'>
                <table className='portal-table'>
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Scholar & Class</th>
                      <th>Term Period</th>
                      <th>Section A Total</th>
                      <th>Paid Amount</th>
                      <th>Balance Due</th>
                      <th>Status</th>
                      <th>Receipt & Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan='8' style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                          <div style={{ maxWidth: '420px', margin: '0 auto' }}>
                            <i className='fas fa-file-invoice-dollar' style={{ fontSize: '36px', color: '#94a3b8', marginBottom: '12px', display: 'block' }}></i>
                            <h4 style={{ color: '#071626', margin: '0 0 6px 0' }}>Bursary Billing Ledger is Clean (₦0)</h4>
                            <p style={{ fontSize: '13px', margin: '0 0 16px 0' }}>
                              All tuition metrics start at ₦0. When you generate an invoice or enroll scholars, billing and payment records will appear here.
                            </p>
                            <button className='primary-btn' onClick={() => setShowAddInvoiceModal(true)}>
                              <i className='fas fa-plus'></i> Generate Tuition Invoice
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => {
                        const balance = inv.total - inv.amountPaid
                        return (
                          <tr key={inv.invoiceNo}>
                            <td><strong>{inv.invoiceNo}</strong></td>
                          <td>
                            <div>
                              <strong>{inv.studentName}</strong>
                              <small style={{ display: 'block', color: '#64748b' }}>{inv.grade}</small>
                            </div>
                          </td>
                          <td>{inv.term}</td>
                          <td><strong>₦{inv.total.toLocaleString()}</strong></td>
                          <td>
                            <strong style={{ color: '#00a884' }}>₦{inv.amountPaid.toLocaleString()}</strong>
                          </td>
                          <td>
                            <strong style={{ color: balance > 0 ? '#ef4444' : '#10b981' }}>
                              ₦{balance.toLocaleString()}
                            </strong>
                          </td>
                          <td>
                            <span className={`status-pill ${inv.status.toLowerCase()}`}>
                              {inv.status}
                            </span>
                          </td>
                          <td>
                            <div className='action-buttons'>
                              <button
                                className='btn-action'
                                title='Print Official BLIS Fee Receipt'
                                onClick={() => setReceiptInvoice(inv)}
                              >
                                <i className='fas fa-file-invoice-dollar'></i> Official Receipt
                              </button>
                              {balance > 0 && (
                                <button
                                  className='btn-action-primary'
                                  title='Record Payment Transaction'
                                  onClick={() => {
                                    setSelectedInvoiceForPayment(inv)
                                    setPaymentAmount(balance)
                                    setShowPaymentModal(true)
                                  }}
                                >
                                  <i className='fas fa-hand-holding-usd'></i> Pay
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    }))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. ADMISSIONS & ENROLLMENT PIPELINE */}
          {activeTab === "admissions" && (
            <div className='tab-view admissions-view'>
              <div className='tab-header flexSB'>
                <div>
                  <h2>2026/2027 Admissions & Enrollment Pipeline</h2>
                  <p>Track prospective scholars across Crèche, Nursery, Primary, JSS, and SSS.</p>
                </div>
                <div className='flex' style={{ gap: '10px', alignItems: 'center' }}>
                  <span className='kpi-badge'>{applications.length} Candidates Under Review</span>
                  <button className='primary-btn' onClick={() => setShowAddApplicantModal(true)}>
                    <i className='fas fa-plus'></i> Register Candidate
                  </button>
                </div>
              </div>

              {/* Kanban / Pipeline View */}
              <div className='pipeline-board'>
                {applications.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <i className='fas fa-user-plus' style={{ fontSize: '40px', color: '#94a3b8', display: 'block', marginBottom: '12px' }}></i>
                    <h3 style={{ color: '#071626', marginBottom: '6px' }}>Admissions Registry is Fresh & Ready</h3>
                    <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '460px', margin: '0 auto 16px' }}>
                      All previous applicant records have been cleared. New admission applications received will appear here for review and enrollment.
                    </p>
                    <button className='primary-btn' onClick={() => setShowAddApplicantModal(true)}>
                      <i className='fas fa-plus'></i> Register First Candidate
                    </button>
                  </div>
                ) : (
                  applications.map((app) => (
                    <div className='pipeline-card' key={app.appId}>
                      <div className='pipeline-card-head flexSB'>
                        <span className='app-id'>{app.appId}</span>
                        <span className={`stage-badge stage-${app.stage.toLowerCase().replace(" ", "-")}`}>
                          {app.stage}
                        </span>
                      </div>
                      <h4>{app.studentName}</h4>
                      <p className='app-grade'>{app.gradeApplied}</p>
                      <div className='app-details-row'>
                        <span><i className='fas fa-user-tie'></i> {app.parentName}</span>
                        <span><i className='fas fa-phone-alt'></i> {app.phone}</span>
                      </div>
                      <div className='app-score-row'>
                        <strong>Assessment:</strong> <span>{app.assessmentScore}</span>
                      </div>
                      <p className='app-notes'>{app.notes}</p>
                      <div className='pipeline-card-actions'>
                        {app.stage !== "Enrolled" ? (
                          <button
                            className='primary-btn-sm'
                            onClick={() => advanceApplicationStage(app.appId)}
                          >
                            Advance to Next Stage <i className='fas fa-arrow-right'></i>
                          </button>
                        ) : (
                          <span className='enrolled-indicator'><i className='fas fa-check-circle'></i> Fully Enrolled</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 7. CLASS TIMETABLES */}
          {activeTab === "timetable" && (() => {
            const canManageTimetable = currentUser && (currentUser.role === "admin" || currentUser.role === "proprietor")
            const currentSchedule = timetables[selectedTimetableClass] || generateDefaultTimetable(selectedTimetableClass) || []

            // Check if current user is a teacher teaching any subject in this class
            const isTeacher = currentUser && currentUser.role === "teacher"
            const teacherSubjects = (currentUser && currentUser.assignedSubjects ? currentUser.assignedSubjects.toLowerCase().split(/[,&/]/).map(s => s.trim()).filter(Boolean) : [])
            const isAssignedToThisClass = currentUser && currentUser.assignedClasses && (currentUser.assignedClasses.includes(selectedTimetableClass) || currentUser.assignedClasses.includes("All Classes"))

            const isTeacherSubjectCell = (slotSubject) => {
              if (!isTeacher || !slotSubject || !isAssignedToThisClass) return false
              const sLower = slotSubject.toLowerCase()
              if (sLower.includes("recess") || sLower.includes("break") || sLower.includes("lunch") || sLower.includes("snack")) return false
              if (teacherSubjects.length === 0) return true
              return teacherSubjects.some(ts => {
                if (sLower.includes(ts) || ts.includes(sLower)) return true
                const root = ts.replace(/s$/, "")
                return root.length >= 4 && sLower.includes(root)
              })
            }

            return (
              <div className='tab-view timetable-view'>
                <div className='tab-header flexSB' style={{ flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <h2>Class Academic Timetable</h2>
                    <p>Daily period allocations, compulsory lessons, laboratories, and closing reviews.</p>
                  </div>
                  <div className='flex' style={{ gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className='filter-group' style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ margin: 0, fontWeight: 'bold', color: '#334155' }}>Selected Class:</label>
                      <select
                        value={selectedTimetableClass}
                        onChange={(e) => setSelectedTimetableClass(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600', minWidth: '180px' }}
                      >
                        {availableSchoolClasses.map((cls) => {
                          const isAssigned = currentUser && currentUser.assignedClasses && currentUser.assignedClasses.includes(cls)
                          return (
                            <option key={cls} value={cls}>
                              {cls} {isAssigned ? "⭐ (Your Class)" : ""}
                            </option>
                          )
                        })}
                      </select>
                    </div>

                    {canManageTimetable && (
                      <div className='flex' style={{ gap: '8px' }}>
                        <button
                          className='primary-btn'
                          onClick={() => {
                            setEditingPeriodIndex(null)
                            setPeriodFormData({
                              period: `Period ${currentSchedule.length + 1} (14:00 - 14:45)`,
                              mon: "",
                              tue: "",
                              wed: "",
                              thu: "",
                              fri: "",
                            })
                            setShowPeriodModal(true)
                          }}
                        >
                          <i className='fas fa-plus'></i> Add Period
                        </button>
                        <button
                          className='outline-btn'
                          title='Reset this class timetable to BLIS standard curriculum'
                          onClick={() => handleResetClassTimetable(selectedTimetableClass)}
                        >
                          <i className='fas fa-redo'></i> Reset Standard
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isTeacher && isAssignedToThisClass && (
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className='flex' style={{ gap: '8px', alignItems: 'center' }}>
                      <i className='fas fa-check-circle' style={{ color: '#059669', fontSize: '18px' }}></i>
                      <span style={{ fontSize: '13px', color: '#065f46' }}>
                        <strong>{currentUser.name}</strong>: Periods highlighted in <span style={{ background: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>Green</span> are your assigned lessons for <strong>{currentUser.assignedSubjects || "your subjects"}</strong>.
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#059669', fontWeight: '600' }}>{selectedTimetableClass} Scope</span>
                  </div>
                )}

                <div className='portal-card table-card' style={{ overflowX: 'auto' }}>
                  <table className='portal-table timetable-table'>
                    <thead>
                      <tr>
                        <th>Time / Period</th>
                        <th>Monday</th>
                        <th>Tuesday</th>
                        <th>Wednesday</th>
                        <th>Thursday</th>
                        <th>Friday</th>
                        {canManageTimetable && <th style={{ textAlign: 'center', width: '130px' }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {currentSchedule.length === 0 ? (
                        <tr>
                          <td colSpan={canManageTimetable ? 7 : 6} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                            <p style={{ marginBottom: '12px' }}>No period allocations set for {selectedTimetableClass}.</p>
                            {canManageTimetable && (
                              <button className='primary-btn' onClick={() => handleResetClassTimetable(selectedTimetableClass)}>
                                <i className='fas fa-magic'></i> Generate Standard BLIS Schedule
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        currentSchedule.map((row, i) => {
                          const isRecess = row.period.includes("Break") || row.period.includes("Recess") || row.period.includes("Lesson") || row.period.includes("Nap")
                          return (
                            <tr key={i} className={isRecess ? "recess-row" : ""}>
                              <td className='period-time-col'>
                                <strong>{row.period}</strong>
                              </td>
                              <td>
                                <div className={`tt-cell ${isTeacherSubjectCell(row.mon) ? "teacher-slot-highlight" : ""}`}>
                                  {row.mon}
                                  {isTeacherSubjectCell(row.mon) && (
                                    <span style={{ display: 'block', fontSize: '10px', color: '#059669', fontWeight: 'bold' }}>⭐ Your Lesson</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className={`tt-cell ${isTeacherSubjectCell(row.tue) ? "teacher-slot-highlight" : ""}`}>
                                  {row.tue}
                                  {isTeacherSubjectCell(row.tue) && (
                                    <span style={{ display: 'block', fontSize: '10px', color: '#059669', fontWeight: 'bold' }}>⭐ Your Lesson</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className={`tt-cell ${isTeacherSubjectCell(row.wed) ? "teacher-slot-highlight" : ""}`}>
                                  {row.wed}
                                  {isTeacherSubjectCell(row.wed) && (
                                    <span style={{ display: 'block', fontSize: '10px', color: '#059669', fontWeight: 'bold' }}>⭐ Your Lesson</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className={`tt-cell ${isTeacherSubjectCell(row.thu) ? "teacher-slot-highlight" : ""}`}>
                                  {row.thu}
                                  {isTeacherSubjectCell(row.thu) && (
                                    <span style={{ display: 'block', fontSize: '10px', color: '#059669', fontWeight: 'bold' }}>⭐ Your Lesson</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className={`tt-cell ${isTeacherSubjectCell(row.fri) ? "teacher-slot-highlight" : ""}`}>
                                  {row.fri}
                                  {isTeacherSubjectCell(row.fri) && (
                                    <span style={{ display: 'block', fontSize: '10px', color: '#059669', fontWeight: 'bold' }}>⭐ Your Lesson</span>
                                  )}
                                </div>
                              </td>
                              {canManageTimetable && (
                                <td style={{ textAlign: 'center' }}>
                                  <div className='flex' style={{ gap: '6px', justifyContent: 'center' }}>
                                    <button
                                      className='btn-action-sm'
                                      title='Edit Period'
                                      onClick={() => {
                                        setEditingPeriodIndex(i)
                                        setPeriodFormData({
                                          period: row.period,
                                          mon: row.mon || "",
                                          tue: row.tue || "",
                                          wed: row.wed || "",
                                          thu: row.thu || "",
                                          fri: row.fri || "",
                                        })
                                        setShowPeriodModal(true)
                                      }}
                                    >
                                      <i className='fas fa-pen'></i> Edit
                                    </button>
                                    <button
                                      className='btn-action-sm'
                                      style={{ color: '#ef4444' }}
                                      title='Delete Period'
                                      onClick={() => handleDeletePeriod(selectedTimetableClass, i)}
                                    >
                                      <i className='fas fa-trash'></i>
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}

          {/* 8. CIRCULARS & NOTICES */}
          {activeTab === "notices" && (
            <div className='tab-view notices-view'>
              <div className='tab-header flexSB'>
                <div>
                  <h2>Official Circulars & Community Notices</h2>
                  <p>Broadcast communications for parents, staff, and scholars.</p>
                </div>
                <div className='flex' style={{ gap: '10px' }}>
                  {notices && notices.length > 0 && (
                    <button
                      type='button'
                      className='outline-btn'
                      style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                      onClick={() => {
                        if (window.confirm("Are you sure you want to clear all circulars to start afresh?")) {
                          setNotices([])
                          try {
                            localStorage.setItem("blis_announcements", JSON.stringify([]))
                          } catch (e) {}
                          saveToCloud("announcements", [])
                          showToast("All circulars have been cleared. Ready to start afresh!")
                        }
                      }}
                    >
                      <i className='fas fa-trash-alt'></i> Clear All
                    </button>
                  )}
                  <button className='primary-btn' onClick={() => setShowNewNoticeModal(true)}>
                    <i className='fas fa-plus'></i> Compose Circular
                  </button>
                </div>
              </div>

              <div className='notices-grid'>
                {notices && notices.length > 0 ? (
                  notices.map((n) => (
                    <div className='notice-card' key={n.id}>
                      <div className='notice-head flexSB'>
                        <span className={`priority-tag ${n.priority.toLowerCase()}`}>
                          {n.priority} Priority
                        </span>
                        <div className='flex' style={{ gap: '8px', alignItems: 'center' }}>
                          <small><i className='fas fa-calendar-alt'></i> {n.date}</small>
                          <button
                            type='button'
                            title='Delete Circular'
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 6px', fontSize: '13px' }}
                            onClick={() => {
                              if (window.confirm(`Delete circular "${n.title}"?`)) {
                                const updated = notices.filter((item) => item.id !== n.id)
                                setNotices(updated)
                                try {
                                  localStorage.setItem("blis_announcements", JSON.stringify(updated))
                                } catch (e) {}
                                saveToCloud("announcements", updated)
                                showToast(`Circular "${n.title}" deleted.`)
                              }
                            }}
                          >
                            <i className='fas fa-trash'></i>
                          </button>
                        </div>
                      </div>
                      <h3>{n.title}</h3>
                      <p className='notice-content'>{n.content}</p>
                      <div className='notice-footer flexSB'>
                        <span><i className='fas fa-user-edit'></i> {n.author}</span>
                        <span className='audience-tag'><i className='fas fa-users'></i> {n.audience}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <i className='fas fa-bullhorn' style={{ fontSize: '44px', color: '#94a3b8', marginBottom: '14px', display: 'inline-block' }}></i>
                    <h3 style={{ color: '#071626', marginBottom: '8px' }}>Noticeboard Is Clean & Ready</h3>
                    <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px' }}>
                      All previous notices have been removed. Click below to compose your first fresh circular for the school community.
                    </p>
                    <button className='primary-btn' onClick={() => setShowNewNoticeModal(true)}>
                      <i className='fas fa-plus'></i> Compose First Circular
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 9. CAMPUS TRANSPORT & LOGISTICS */}
          {activeTab === "transport" && (
            <div className='tab-view transport-view'>
              <div className='tab-header flexSB'>
                <div>
                  <h2>School Bus Fleet & Transit Logistics</h2>
                  <p>Daily morning and afternoon bus routes, assigned drivers, and arrival status.</p>
                </div>
                <span className='badge-pill green'>Fleet Operational</span>
              </div>

              <div className='bus-grid'>
                {busFleet.map((b, i) => (
                  <div className='bus-card' key={i}>
                    <div className='bus-head flexSB'>
                      <div>
                        <h3>{b.busNo}</h3>
                        <span className='bus-route-name'>{b.route}</span>
                      </div>
                      <span className={`bus-status ${b.status.toLowerCase().replace(" ", "-")}`}>
                        {b.status}
                      </span>
                    </div>
                    <div className='bus-info-body'>
                      <div className='info-row'>
                        <span>Driver:</span>
                        <strong>{b.driver} ({b.phone})</strong>
                      </div>
                      <div className='info-row'>
                        <span>Passenger Load:</span>
                        <strong>{b.capacity} Students</strong>
                      </div>
                      <div className='info-row'>
                        <span>Current Location:</span>
                        <strong>{b.currentLocation}</strong>
                      </div>
                      <div className='info-row'>
                        <span>Estimated Arrival:</span>
                        <strong style={{ color: '#00a884' }}>{b.etaSchool}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* --- MODAL 1: ADD NEW SCHOLAR MODAL --- */}
      {showAddStudentModal && (
        <div className='blis-modal-overlay' onClick={() => setShowAddStudentModal(false)}>
          <div className='blis-modal-card' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <div>
                <h3>Enroll New Scholar in SIS</h3>
                <small>Official Student Information Registry</small>
              </div>
              <button className='modal-close' onClick={() => setShowAddStudentModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddStudentSubmit} className='modal-form'>
              <div className='form-row'>
                <div className='form-group'>
                  <label>Scholar Full Name *</label>
                  <input
                    type='text'
                    required
                    placeholder='e.g. Chimamanda Okafor'
                    value={newStudentForm.name}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                  />
                </div>
                <div className='form-group'>
                  <label>Date of Birth *</label>
                  <input
                    type='date'
                    required
                    value={newStudentForm.dob}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, dob: e.target.value })}
                  />
                </div>
              </div>

              <div className='form-row'>
                <div className='form-group'>
                  <label>Class Division *</label>
                  <select
                    value={newStudentForm.grade}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, grade: e.target.value })}
                  >
                    <option value='Crèche'>Crèche (Infants & Toddlers)</option>
                    <option value='Nursery 1'>Nursery 1</option>
                    <option value='Nursery 2'>Nursery 2</option>
                    <option value='Primary 1'>Primary 1 (Basic 1)</option>
                    <option value='Primary 2'>Primary 2 (Basic 2)</option>
                    <option value='Primary 3'>Primary 3 (Basic 3)</option>
                    <option value='Primary 4'>Primary 4 (Basic 4)</option>
                    <option value='Primary 5'>Primary 5 (Basic 5)</option>
                    <option value='JSS 1'>JSS 1 (Junior Secondary 1)</option>
                    <option value='JSS 2'>JSS 2 (Junior Secondary 2)</option>
                    <option value='JSS 3'>JSS 3 (Junior Secondary 3)</option>
                    <option value='SS 1'>SS 1 (Senior Secondary 1)</option>
                    <option value='SS 2'>SS 2 (Senior Secondary 2)</option>
                  </select>
                </div>
                <div className='form-group'>
                  <label>School House *</label>
                  <select
                    value={newStudentForm.house}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, house: e.target.value })}
                  >
                    <option value='Phoenix'>Phoenix House (Gold)</option>
                    <option value='Pegasus'>Pegasus House (Blue)</option>
                    <option value='Orion'>Orion House (Green)</option>
                    <option value='Aquila'>Aquila House (Purple)</option>
                  </select>
                </div>
              </div>

              <div className='form-row'>
                <div className='form-group'>
                  <label>Guardian Name *</label>
                  <input
                    type='text'
                    required
                    placeholder='e.g. Dr. Chukwuma Okafor'
                    value={newStudentForm.guardian}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, guardian: e.target.value })}
                  />
                </div>
                <div className='form-group'>
                  <label>Guardian Phone *</label>
                  <input
                    type='tel'
                    required
                    placeholder='e.g. 0803 456 7891'
                    value={newStudentForm.phone}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className='form-group'>
                <label>Guardian Email Address *</label>
                <input
                  type='email'
                  required
                  placeholder='e.g. chukwuma.okafor@example.com'
                  value={newStudentForm.email}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                />
              </div>

              <div className='form-group'>
                <label>Medical / First Aid Alerts</label>
                <input
                  type='text'
                  placeholder='e.g. Asthmatic, allergy, dietary notes...'
                  value={newStudentForm.medical}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, medical: e.target.value })}
                />
              </div>

              <div className='modal-actions'>
                <button type='button' className='outline-btn' onClick={() => setShowAddStudentModal(false)}>CANCEL</button>
                <button type='submit' className='primary-btn'>CONFIRM ENROLLMENT</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: STUDENT PROFILE DOSSIER --- */}
      {selectedStudent && (
        <div className='blis-modal-overlay' onClick={() => setSelectedStudent(null)}>
          <div className='blis-modal-card dossier-modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <div>
                <h3>Scholar Dossier & Biodata</h3>
                <small>{selectedStudent.id}</small>
              </div>
              <button className='modal-close' onClick={() => setSelectedStudent(null)}>×</button>
            </div>
            <div className='dossier-body'>
              <div className='dossier-hero flexSB'>
                <div className='dossier-info'>
                  <h2>{selectedStudent.name}</h2>
                  <p><strong>{selectedStudent.grade}</strong> • <span className={`house-tag ${selectedStudent.house.toLowerCase()}`}>{selectedStudent.house} House</span></p>
                </div>
                <div className='dossier-stats flex'>
                  <div className='dossier-stat'>
                    <small>CUMULATIVE GPA</small>
                    <strong>{selectedStudent.gpa}</strong>
                  </div>
                  <div className='dossier-stat'>
                    <small>ATTENDANCE</small>
                    <strong style={{ color: '#00a884' }}>{selectedStudent.attendance}%</strong>
                  </div>
                </div>
              </div>

              <div className='dossier-grid'>
                <div className='dossier-box'>
                  <h4>Guardian & Contact Details</h4>
                  <p><strong>Guardian:</strong> {selectedStudent.guardian}</p>
                  <p><strong>Email:</strong> {selectedStudent.email}</p>
                  <p><strong>Telephone:</strong> {selectedStudent.phone}</p>
                  <p><strong>Date of Birth:</strong> {selectedStudent.dob}</p>
                </div>

                <div className='dossier-box'>
                  <h4>First Aid & Health Protocol</h4>
                  <p><strong>Medical Notes:</strong></p>
                  <p className='medical-alert-box'><i className='fas fa-heartbeat'></i> {selectedStudent.medical}</p>
                  <p><strong>Status:</strong> First Aid verified by School Nurse</p>
                </div>
              </div>

              <div className='dossier-subjects'>
                <h4>Enrolled Academic Subjects</h4>
                <div className='subject-chips flex'>
                  {selectedStudent.enrolledSubjects.map((sub, i) => (
                    <span className='subject-chip' key={i}><i className='fas fa-book'></i> {sub}</span>
                  ))}
                </div>
              </div>

              <div className='modal-actions' style={{ marginTop: '24px' }}>
                <button className='outline-btn' onClick={() => setSelectedStudent(null)}>Close</button>
                <button
                  className='primary-btn'
                  onClick={() => {
                    setReportCardStudent(selectedStudent)
                    setSelectedStudent(null)
                  }}
                >
                  <i className='fas fa-print'></i> View Terminal Report Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: OFFICIAL BLIS REPORT CARD GENERATOR --- */}
      {reportCardStudent && (
        <div className='blis-modal-overlay' onClick={() => setReportCardStudent(null)}>
          <div className='blis-modal-card report-card-modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header no-print'>
              <div>
                <h3>Official Terminal Academic Progress Report</h3>
                <small>Brighter Land International School Assessment Registry</small>
              </div>
              <div className='flex' style={{ gap: '10px' }}>
                <button className='btn-action-primary' onClick={() => window.print()}>
                  <i className='fas fa-print'></i> Print / Export PDF
                </button>
                <button className='modal-close' onClick={() => setReportCardStudent(null)}>×</button>
              </div>
            </div>

            {/* Formatted Official Report Card Paper */}
            <div className='report-paper'>
              <div className='report-header flexSB'>
                <div className='school-crest-report' style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '3px' }}>
                  <img src='/images/logo.png' alt="Brighter Land Int'l School" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div className='report-school-meta'>
                  <h2>BRIGHTER LAND INTERNATIONAL SCHOOL</h2>
                  <p>Motto: <em>"Study to Make Impact"</em> • Crèche to Senior Secondary</p>
                  <small>Gura-suga, Opposite Police Staff College Jos, Jos-South LGA, Plateau State</small>
                </div>
                <div className='report-qr'>
                  <i className='fas fa-qrcode'></i>
                  <span>VERIFIED RECORD</span>
                </div>
              </div>

              <div className='report-title-bar'>
                <h3>OFFICIAL STUDENT TERMINAL PROGRESS REPORT</h3>
                <span>2026/2027 Academic Session • Term 1 Evaluation</span>
              </div>

              {(() => {
                const scholarScores = gradebookData.filter(
                  (g) =>
                    (reportCardStudent.id && g.studentId === reportCardStudent.id) ||
                    (reportCardStudent.name &&
                      g.studentName &&
                      g.studentName.toLowerCase().trim() === reportCardStudent.name.toLowerCase().trim())
                )
                const avgTotal =
                  scholarScores.length > 0
                    ? Math.round(
                        scholarScores.reduce((acc, curr) => acc + calculateGradeInfo(curr).total, 0) /
                          scholarScores.length
                      )
                    : null
                const avgGpa =
                  scholarScores.length > 0
                    ? (
                        scholarScores.reduce(
                          (acc, curr) => acc + parseFloat(calculateGradeInfo(curr).gpa),
                          0
                        ) / scholarScores.length
                      ).toFixed(2)
                    : "—"

                const classBroadsheet = calculateClassBroadsheet(reportCardStudent.grade)
                const studentCollation = classBroadsheet.find(
                  (b) =>
                    (reportCardStudent.id && b.student.id === reportCardStudent.id) ||
                    (reportCardStudent.name && b.student.name && b.student.name.toLowerCase().trim() === reportCardStudent.name.toLowerCase().trim())
                )
                const classRankStr = studentCollation ? `${studentCollation.rankOrdinal} of ${classBroadsheet.length} Scholars` : "—"
                const classAverageStr = classBroadsheet.length > 0 ? `${(classBroadsheet.reduce((acc, c) => acc + c.avgScore, 0) / classBroadsheet.length).toFixed(1)}%` : "—"
                const classTeacherName = studentCollation ? studentCollation.classTeacherName : "Form Master"
                const classTeacherRemark = studentCollation && studentCollation.classTeacherRemark
                  ? studentCollation.classTeacherRemark
                  : scholarScores.length > 0
                  ? "A diligent, attentive, and well-behaved scholar. Good academic performance."
                  : "Continuous assessment in progress."
                const principalRemark = studentCollation && studentCollation.principalRemark
                  ? studentCollation.principalRemark
                  : scholarScores.length > 0
                  ? "Promoted to next class in good academic standing. Commendable diligence."
                  : "Assessment records under compilation."
                const isApproved = studentCollation ? studentCollation.isApproved : false

                return (
                  <>
                    <div className='report-student-meta-grid'>
                      <div><strong>Scholar Name:</strong> {reportCardStudent.name}</div>
                      <div><strong>Student ID:</strong> {reportCardStudent.id}</div>
                      <div><strong>Class Level:</strong> {reportCardStudent.grade}</div>
                      <div><strong>Class Position:</strong> <span style={{ color: '#059669', fontWeight: '800' }}>{classRankStr}</span></div>
                      <div><strong>Class Average:</strong> {classAverageStr}</div>
                      <div><strong>Scholar Average:</strong> <strong style={{ color: '#2563eb' }}>{avgTotal !== null ? `${avgTotal}%` : "—"}</strong></div>
                      <div><strong>Cumulative GPA:</strong> {avgGpa} / 4.00</div>
                      <div><strong>Term Attendance:</strong> {reportCardStudent.attendance || 100}%</div>
                      <div><strong>School House:</strong> {reportCardStudent.house || "Phoenix"} House</div>
                      <div><strong>Term Session:</strong> Term 1 (2026/2027)</div>
                    </div>

                    <table className='report-grades-table'>
                      <thead>
                        <tr>
                          <th>Subject Discipline</th>
                          <th>Continuous Ass. (40%)</th>
                          <th>Exam (60%)</th>
                          <th>Total</th>
                          <th>Grade</th>
                          <th>Subject Teacher Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scholarScores.length === 0 ? (
                          <tr>
                            <td colSpan='6' style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                              <i className='fas fa-info-circle' style={{ marginRight: '8px' }}></i>
                              No continuous assessment scores recorded yet by subject teachers for {reportCardStudent.name}.
                              <br />
                              <small>Use the <strong>Continuous Assessment Gradebook</strong> to record assignment, test, and exam scores.</small>
                            </td>
                          </tr>
                        ) : (
                          scholarScores.map((scoreItem, idx) => {
                            const { caTotal, examScore, total, letter } = calculateGradeInfo(scoreItem)
                            return (
                              <tr key={idx}>
                                <td><strong>{scoreItem.subject || "General Subject"}</strong></td>
                                <td>{caTotal}/40</td>
                                <td>{examScore}/60</td>
                                <td><strong>{total}%</strong></td>
                                <td><strong className={`grade-${letter}`}>{letter}</strong></td>
                                <td>{scoreItem.remarks || "Commendable academic effort."}</td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>

                    {/* Class Head Teacher Remark Box */}
                    <div className='report-evaluation-box' style={{ background: '#f0fdf4', border: '1.5px solid #a7f3d0', marginBottom: '14px' }}>
                      <div className='flexSB' style={{ marginBottom: '6px' }}>
                        <h4 style={{ color: '#065f46', margin: 0 }}>
                          <i className='fas fa-user-tie' style={{ color: '#059669', marginRight: '6px' }}></i>
                          Class Head Teacher's Terminal Remark ({reportCardStudent.grade} Form Master)
                        </h4>
                        <small style={{ color: '#047857', fontWeight: '700' }}>Tutor: {classTeacherName}</small>
                      </div>
                      <p style={{ margin: '4px 0 0 0', color: '#166534', fontSize: '13.5px', fontStyle: 'italic', lineHeight: '1.5' }}>
                        "{classTeacherRemark}"
                      </p>
                    </div>

                    {/* Principal's Final Endorsement & Promotion Decision Box */}
                    <div className='report-evaluation-box' style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1' }}>
                      <div className='flexSB' style={{ marginBottom: '6px' }}>
                        <h4 style={{ color: '#0f172a', margin: 0 }}>
                          <i className='fas fa-stamp' style={{ color: '#2563eb', marginRight: '6px' }}></i>
                          Principal's Final Remark & Promotion Endorsement
                        </h4>
                        <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px', background: isApproved ? '#dcfce7' : '#fef3c7', color: isApproved ? '#166534' : '#92400e', border: isApproved ? '1px solid #86efac' : '1px solid #fde68a' }}>
                          {isApproved ? "OFFICIALLY SEALED ✓" : "PREVIEW DRAFT"}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', color: '#334155', fontSize: '13.5px', fontStyle: 'italic', lineHeight: '1.5' }}>
                        "{principalRemark}"
                      </p>
                    </div>
                  </>
                )
              })()}

              <div className='report-signatures flexSB'>
                <div className='sig-block'>
                  <div className='sig-line'></div>
                  <strong>Form Master / Head Teacher</strong>
                  <small>{reportCardStudent.grade} Class Tutor</small>
                </div>

                <div className='seal-block'>
                  <div className='seal-circle'>
                    <i className='fas fa-stamp'></i>
                    <span>BLIS OFFICIAL SEAL</span>
                  </div>
                </div>

                <div className='sig-block'>
                  <div className='sig-line'></div>
                  <strong>Tangai Gamaliel Samuel</strong>
                  <small>Principal / Head of School</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: OFFICIAL FEE RECEIPT MODAL --- */}
      {receiptInvoice && (
        <div className='blis-modal-overlay' onClick={() => setReceiptInvoice(null)}>
          <div className='blis-modal-card receipt-modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header no-print'>
              <div>
                <h3>Official Bursar Fee Receipt</h3>
                <small>{receiptInvoice.invoiceNo}</small>
              </div>
              <div className='flex' style={{ gap: '10px' }}>
                <button className='btn-action-primary' onClick={() => window.print()}>
                  <i className='fas fa-print'></i> Print Receipt
                </button>
                <button className='modal-close' onClick={() => setReceiptInvoice(null)}>×</button>
              </div>
            </div>

            <div className='receipt-paper'>
              <div className='receipt-header flexSB'>
                <div className='receipt-logo flex' style={{ gap: '14px', alignItems: 'center' }}>
                  <div className='school-crest-report' style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '3px' }}>
                    <img src='/images/logo.png' alt="Brighter Land Int'l School" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div>
                    <h2>BRIGHTER LAND INTERNATIONAL SCHOOL</h2>
                    <small>Gura-suga, Opposite Police Staff College Jos, Plateau State • Official Bursar Payment Receipt</small>
                  </div>
                </div>
                <div className='receipt-meta text-right'>
                  <span className='receipt-stamp'>OFFICIAL RECEIPT</span>
                  <p><strong>Receipt #:</strong> {receiptInvoice.invoiceNo}</p>
                  <p><strong>Payment Date:</strong> {receiptInvoice.paymentDate !== "N/A" ? receiptInvoice.paymentDate : "2026-10-01"}</p>
                </div>
              </div>

              <div className='receipt-student-box'>
                <div className='flexSB'>
                  <div>
                    <strong>Received From:</strong>
                    <p style={{ fontSize: '15px', margin: '2px 0', color: '#071626' }}><strong>{receiptInvoice.studentName}</strong> ({receiptInvoice.studentId})</p>
                    <small>Class Level: <strong>{receiptInvoice.grade}</strong></small>
                  </div>
                  <div className='text-right'>
                    <strong>Term Period:</strong>
                    <p>{receiptInvoice.term}</p>
                    <small>Payment Mode: <strong>{receiptInvoice.method}</strong></small>
                  </div>
                </div>
              </div>

              <table className='receipt-items-table'>
                <thead>
                  <tr>
                    <th>Section A Item Description</th>
                    <th>Schedule Classification</th>
                    <th className='text-right'>Amount (₦)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Tuition Fees</td>
                    <td>Payable to School</td>
                    <td className='text-right'>₦{receiptInvoice.tuition.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Examination Fee</td>
                    <td>Terminal Examination Assessment</td>
                    <td className='text-right'>₦{(receiptInvoice.examFee || 2000).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Lesson Fee</td>
                    <td>After-School Academic Lesson</td>
                    <td className='text-right'>₦{(receiptInvoice.lessonFee || 2000).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Development Levy</td>
                    <td>School Infrastructure & Maintenance</td>
                    <td className='text-right'>₦{(receiptInvoice.devLevy || 1000).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>PTA Levy</td>
                    <td>Parent Teacher Association</td>
                    <td className='text-right'>₦{(receiptInvoice.ptaLevy || 1000).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>First Aid Clinic Fee</td>
                    <td>Health & Infirmary Services</td>
                    <td className='text-right'>₦{(receiptInvoice.firstAid || 1000).toLocaleString()}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan='2'><strong>TOTAL SECTION A INVOICED:</strong></td>
                    <td className='text-right'><strong>₦{receiptInvoice.total.toLocaleString()}</strong></td>
                  </tr>
                  <tr className='paid-row'>
                    <td colSpan='2'><strong>AMOUNT PAID:</strong></td>
                    <td className='text-right'><strong style={{ color: '#00a884' }}>₦{receiptInvoice.amountPaid.toLocaleString()}</strong></td>
                  </tr>
                  <tr>
                    <td colSpan='2'><strong>BALANCE OUTSTANDING:</strong></td>
                    <td className='text-right'><strong>₦{(receiptInvoice.total - receiptInvoice.amountPaid).toLocaleString()}</strong></td>
                  </tr>
                </tfoot>
              </table>

              <div className='receipt-bank-footer'>
                <div className='flexSB' style={{ alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#071626' }}>Bank Verification:</strong>
                    <p style={{ margin: '2px 0', fontSize: '12px' }}>
                      Paid into: <strong>{schoolAccountDetails.bankName}</strong> | Account Name: <strong>{schoolAccountDetails.accountName}</strong> | Acc No: <strong>{schoolAccountDetails.accountNumber}</strong>
                    </p>
                    <small style={{ color: '#64748b' }}>Bank Reference: {receiptInvoice.bankRef || "FB-2043561832-VERIFIED"}</small>
                  </div>
                  <div className='bursar-sign text-center'>
                    <div className='sig-line'></div>
                    <small>Authorized Signature • Bursar's Office</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 5: RECORD PAYMENT MODAL --- */}
      {showPaymentModal && selectedInvoiceForPayment && (
        <div className='blis-modal-overlay' onClick={() => setShowPaymentModal(false)}>
          <div className='blis-modal-card' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <div>
                <h3>Record School Fee Payment</h3>
                <small>{selectedInvoiceForPayment.invoiceNo} • {selectedInvoiceForPayment.studentName} ({selectedInvoiceForPayment.grade})</small>
              </div>
              <button className='modal-close' onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            <form onSubmit={handleRecordPayment} className='modal-form'>
              <div className='form-group'>
                <label>Outstanding Balance Due</label>
                <div className='form-static-val' style={{ color: '#ef4444', fontSize: '18px', fontWeight: '800' }}>
                  ₦{(selectedInvoiceForPayment.total - selectedInvoiceForPayment.amountPaid).toLocaleString()}
                </div>
              </div>

              <div className='form-group'>
                <label>Payment Amount Received (₦) *</label>
                <input
                  type='number'
                  required
                  min='1'
                  max={selectedInvoiceForPayment.total - selectedInvoiceForPayment.amountPaid}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>

              <div className='form-group'>
                <label>Payment Destination Account *</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value='First Bank Direct Deposit (Acc: 2043561832)'>First Bank Direct Deposit (Acc: 2043561832)</option>
                  <option value='First Bank Mobile App Transfer'>First Bank Mobile App Transfer</option>
                  <option value='First Bank POS Terminal at Bursar Desk'>First Bank POS Terminal at Bursar Desk</option>
                  <option value='Bank Wire / Electronic Settlement'>Bank Wire / Electronic Settlement</option>
                </select>
              </div>

              <div className='modal-actions'>
                <button type='button' className='outline-btn' onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button type='submit' className='primary-btn'>Confirm Payment & Issue Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 6: COMPOSE NEW NOTICE MODAL --- */}
      {showNewNoticeModal && (
        <div className='blis-modal-overlay' onClick={() => setShowNewNoticeModal(false)}>
          <div className='blis-modal-card' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <div>
                <h3>Broadcast Official School Circular</h3>
                <small>Registry Noticeboard</small>
              </div>
              <button className='modal-close' onClick={() => setShowNewNoticeModal(false)}>×</button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const title = e.target.title.value
                const content = e.target.content.value
                const priority = e.target.priority.value
                const audience = e.target.audience.value

                const newNotice = {
                  id: Date.now(),
                  title,
                  content,
                  priority,
                  audience,
                  date: "2026-10-01",
                  author: "Executive Head of School",
                  category: "Academic",
                }
                const updatedNotices = [newNotice, ...notices]
                setNotices(updatedNotices)
                try {
                  localStorage.setItem("blis_announcements", JSON.stringify(updatedNotices))
                } catch (err) {}
                saveToCloud("announcements", updatedNotices)
                setShowNewNoticeModal(false)
                showToast("Circular published across student, parent, and faculty portals.")
              }}
              className='modal-form'
            >
              <div className='form-group'>
                <label>Circular Headline *</label>
                <input name='title' type='text' required placeholder='e.g. Wednesday Wear Collection & Uniforms...' />
              </div>

              <div className='form-row'>
                <div className='form-group'>
                  <label>Priority Tag</label>
                  <select name='priority' defaultValue='Normal'>
                    <option value='High'>High (Urgent Broadcast)</option>
                    <option value='Important'>Important (Action Required)</option>
                    <option value='Normal'>Normal Information</option>
                  </select>
                </div>
                <div className='form-group'>
                  <label>Target Audience</label>
                  <select name='audience' defaultValue='All Parents & Staff'>
                    <option value='All Parents & Staff'>All Parents & Staff</option>
                    <option value='JSS & SSS Parents'>JSS & SSS Parents</option>
                    <option value='Primary School Parents'>Primary School Parents</option>
                    <option value='Crèche & Nursery Parents'>Crèche & Nursery Parents</option>
                  </select>
                </div>
              </div>

              <div className='form-group'>
                <label>Notice Content *</label>
                <textarea name='content' rows='4' required placeholder='Enter detailed message or schedule...'></textarea>
              </div>

              <div className='modal-actions'>
                <button type='button' className='outline-btn' onClick={() => setShowNewNoticeModal(false)}>Cancel</button>
                <button type='submit' className='primary-btn'>Broadcast Circular</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 6: APPROVED PROSPECTUS SCHEDULE MODAL --- */}
      {showProspectusModal && (
        <div className='blis-modal-overlay' onClick={() => setShowProspectusModal(false)}>
          <div className='blis-modal-card prospectus-modal' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px' }}>
            <div className='modal-header no-print'>
              <div>
                <h3>Official 2026/2027 Academic Session Prospectus</h3>
                <small>Approved by Management • {schoolAccountDetails.bankName}: {schoolAccountDetails.accountNumber}</small>
              </div>
              <div className='flex' style={{ gap: '10px' }}>
                <button className='btn-action-primary' onClick={() => window.print()}>
                  <i className='fas fa-print'></i> Print Prospectus
                </button>
                <button className='modal-close' onClick={() => setShowProspectusModal(false)}>×</button>
              </div>
            </div>

            <div className='prospectus-print-paper'>
              <div className='prospectus-print-header flexSB'>
                <div className='flex' style={{ gap: '14px', alignItems: 'center' }}>
                  <div style={{ width: '60px', height: '60px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '3px', flexShrink: 0 }}>
                    <img src='/images/logo.png' alt="BLIS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div>
                    <h2>BRIGHTER LAND INTERNATIONAL SCHOOL</h2>
                    <p>2026/ 2027 Academic Session Prospectus • <em>Study to Make Impact</em></p>
                    <small>
                      Bank: {schoolAccountDetails.bankName} | Account Name: {schoolAccountDetails.accountName} | Account No: {schoolAccountDetails.accountNumber}
                    </small>
                  </div>
                </div>
                <div className='level-badge-large'>
                  BLIS BURSARY
                </div>
              </div>

              <div className='portal-prospectus-list'>
                {prospectusData.map((sec, idx) => (
                  <div key={idx} style={{ marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
                    <div className='flexSB' style={{ alignItems: 'baseline', marginBottom: '10px' }}>
                      <h3 style={{ color: '#071626', fontSize: '18px', margin: 0 }}>{sec.level}</h3>
                      <span style={{ fontSize: '13px', background: '#ecfdf5', color: '#065f46', padding: '3px 10px', borderRadius: '12px', fontWeight: '700' }}>
                        Section A: ₦{sec.sectionA.total.toLocaleString()} | Section B: ₦{sec.sectionB.total.toLocaleString()}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
                      <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <strong style={{ fontSize: '12px', color: '#00a884', display: 'block', marginBottom: '6px' }}>{sec.sectionA.title}</strong>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '12px' }}>
                          {sec.sectionA.items.map((it, i) => (
                            <li key={i} className='flexSB' style={{ padding: '3px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span>{it.name}</span>
                              <strong>₦{it.amount.toLocaleString()}</strong>
                            </li>
                          ))}
                          <li className='flexSB' style={{ paddingTop: '6px', fontWeight: 'bold' }}>
                            <span>Total Section A:</span>
                            <span>₦{sec.sectionA.total.toLocaleString()}</span>
                          </li>
                        </ul>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <strong style={{ fontSize: '12px', color: '#2563eb', display: 'block', marginBottom: '6px' }}>{sec.sectionB.title}</strong>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '12px' }}>
                          {sec.sectionB.items.map((it, i) => (
                            <li key={i} className='flexSB' style={{ padding: '3px 0', borderBottom: '1px dashed #e2e8f0' }}>
                              <span>{it.name}</span>
                              <strong>₦{it.amount.toLocaleString()}</strong>
                            </li>
                          ))}
                          <li className='flexSB' style={{ paddingTop: '6px', fontWeight: 'bold' }}>
                            <span>Total Section B:</span>
                            <span>₦{sec.sectionB.total.toLocaleString()}</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {sec.bookNote && (
                      <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                        <i className='fas fa-info-circle'></i> {sec.bookNote}
                      </p>
                    )}

                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#b45309', background: '#fffbeb', padding: '6px 10px', borderRadius: '6px' }}>
                      <i className='fas fa-exclamation-circle'></i> <strong>Additional Requirement:</strong> {sec.additionalRequirements}
                    </div>
                  </div>
                ))}
              </div>

              <div className='prospectus-print-footer flexSB'>
                <div>
                  <strong>Approved Account:</strong>
                  <p>{schoolAccountDetails.bankName} • {schoolAccountDetails.accountNumber} • {schoolAccountDetails.accountName}</p>
                </div>
                <div className='text-right'>
                  <p><strong>Bursary & Accounts Directorate</strong></p>
                  <small>Brighter Land International School</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS: ADMIN, STAFF, ASSESSMENT, INVOICES, CREDENTIALS --- */}
      {renderAddStaffModal()}
      {renderCreatedAccountModal()}
      {renderCreatedStudentCredentialsModal()}
      {renderAddScoreModal()}
      {renderAddInvoiceModal()}
      {renderAddApplicantModal()}
      {renderPeriodModal()}
    </div>
  )
}

export default SchoolPortal

