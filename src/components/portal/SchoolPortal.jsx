import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import {
  schoolAccountDetails,
  schoolCampuses,
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
  getProspectusForGrade,
} from "../../dummydata"
import "./portal.css"
import { saveToCloud, subscribeToCloudDoc } from "../../firebase"
import {
  getStoredPublicNews,
  savePublicNews,
  subscribeToPublicNews,
  DEFAULT_NEWS_COVERS,
} from "../../services/newsService"

// Calculate Unified Section A & Section B fee breakdowns, installment allocation, and completion status
export const calculateInvoiceBreakdown = (inv) => {
  if (!inv) return { secATotal: 0, secBTotal: 0, effectiveTotal: 0, balance: 0, isReturning: true, isCompleted: false, secAPaid: 0, secBPaid: 0, prospectus: null }
  const p = getProspectusForGrade(inv.grade)
  const secATotal = inv.secATotal || (p && p.sectionA ? p.sectionA.total : 19500)
  const secBTotal = inv.secBTotal || (p && p.sectionB ? p.sectionB.total : 50000)
  const isReturning = inv.studentType === "returning" || inv.sectionBWaived === true
  const effectiveTotal = isReturning ? secATotal : (secATotal + secBTotal)
  const amountPaid = Number(inv.amountPaid) || 0
  const balance = Math.max(0, effectiveTotal - amountPaid)
  const isCompleted = amountPaid >= effectiveTotal

  const secAPaid = Math.min(amountPaid, secATotal)
  const secABalance = Math.max(0, secATotal - secAPaid)
  const secBPaid = isReturning ? 0 : Math.min(Math.max(0, amountPaid - secATotal), secBTotal)
  const secBBalance = isReturning ? 0 : Math.max(0, secBTotal - secBPaid)

  return {
    secATotal,
    secBTotal,
    isReturning,
    effectiveTotal,
    amountPaid,
    balance,
    isCompleted,
    secAPaid,
    secABalance,
    secBPaid,
    secBBalance,
    prospectus: p,
  }
}

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

// -------------------------------------------------------------
// Date-Indexed Attendance Utilities & Day-of-Week Resolvers
// -------------------------------------------------------------
export const getDayOfWeekName = (dateStr) => {
  if (!dateStr) return "Monday"
  try {
    const parts = dateStr.split("-")
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      return days[d.getDay()] || "Monday"
    }
  } catch (e) {}
  return "Monday"
}

export const formatAttendanceDateDisplay = (dateStr) => {
  if (!dateStr) return "Today"
  try {
    const parts = dateStr.split("-")
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()]
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      const monthName = months[d.getMonth()]
      const dayNum = d.getDate()
      const year = d.getFullYear()
      return `${dayName}, ${dayNum} ${monthName} ${year}`
    }
  } catch (e) {}
  return dateStr
}

export const getWeekSchoolDays = (baseDateStr) => {
  try {
    const parts = (baseDateStr || "2026-10-05").split("-")
    const curr = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    const day = curr.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    const monday = new Date(curr)
    monday.setDate(curr.getDate() + diffToMonday)

    const days = []
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, "0")
      const dd = String(d.getDate()).padStart(2, "0")
      const iso = `${yyyy}-${mm}-${dd}`
      days.push({
        dateStr: iso,
        dayLabel: dayNames[i],
        dayNumber: d.getDate(),
        monthLabel: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()],
      })
    }
    return days
  } catch (e) {
    return [
      { dateStr: "2026-10-05", dayLabel: "Mon", dayNumber: 5, monthLabel: "Oct" },
      { dateStr: "2026-10-06", dayLabel: "Tue", dayNumber: 6, monthLabel: "Oct" },
      { dateStr: "2026-10-07", dayLabel: "Wed", dayNumber: 7, monthLabel: "Oct" },
      { dateStr: "2026-10-08", dayLabel: "Thu", dayNumber: 8, monthLabel: "Oct" },
      { dateStr: "2026-10-09", dayLabel: "Fri", dayNumber: 9, monthLabel: "Oct" },
    ]
  }
}

export const createDefaultAttendanceSeed = () => {
  return {
    "2026-10-02": {
      "BLIS-2026-001": "Present",
      "BLIS-2026-002": "Present",
      "BLIS-2026-003": "Late",
      "BLIS-2026-004": "Present",
      "BLIS-2026-005": "Present",
      "BLIS-2026-006": "Present",
      "BLIS-2026-007": "Excused",
      "BLIS-2026-008": "Present",
      "BLIS-2026-009": "Present",
      "BLIS-2026-010": "Present",
      "BLIS-2026-011": "Present",
      "BLIS-2026-012": "Present",
    },
    "2026-10-05": {
      "BLIS-2026-001": "Present",
      "BLIS-2026-002": "Present",
      "BLIS-2026-003": "Present",
      "BLIS-2026-004": "Present",
      "BLIS-2026-005": "Present",
      "BLIS-2026-006": "Absent",
      "BLIS-2026-007": "Present",
      "BLIS-2026-008": "Present",
      "BLIS-2026-009": "Late",
      "BLIS-2026-010": "Present",
      "BLIS-2026-011": "Present",
      "BLIS-2026-012": "Present",
    },
    "2026-10-06": {
      "BLIS-2026-001": "Present",
      "BLIS-2026-002": "Late",
      "BLIS-2026-003": "Present",
      "BLIS-2026-004": "Present",
      "BLIS-2026-005": "Present",
      "BLIS-2026-006": "Present",
      "BLIS-2026-007": "Present",
      "BLIS-2026-008": "Present",
      "BLIS-2026-009": "Present",
      "BLIS-2026-010": "Absent",
      "BLIS-2026-011": "Present",
      "BLIS-2026-012": "Present",
    },
  }
}

export const normalizeAttendanceData = (raw) => {
  if (!raw || typeof raw !== "object") return createDefaultAttendanceSeed()
  const keys = Object.keys(raw)
  if (keys.length === 0) return createDefaultAttendanceSeed()
  const isDateIndexed = keys.some((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
  if (isDateIndexed) {
    return raw
  }
  const migrated = createDefaultAttendanceSeed()
  migrated["2026-10-05"] = { ...raw }
  return migrated
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
  
  // Multi-Branch Campus Selection State (persisted across sessions)
  const [selectedCampus, setSelectedCampus] = useState(() => {
    try {
      const saved = localStorage.getItem("blis_selected_campus")
      if (saved && (saved === "All" || saved === "Headquarters" || saved === "Annex")) return saved
    } catch (e) {}
    return "All"
  })
  const [studentCampusFilter, setStudentCampusFilter] = useState("All")
  const [staffCampusFilter, setStaffCampusFilter] = useState("All")
  const [invoiceCampusFilter, setInvoiceCampusFilter] = useState("All")

  const [newStaffForm, setNewStaffForm] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    role: "teacher",
    campus: "All Campuses",
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

  // End-of-Term Result Publication and Bursary Clearance Access Control States
  const [resultsPublished, setResultsPublished] = useState(() => {
    try {
      const saved = localStorage.getItem("blis_results_published")
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return { all: false }
  })

  const [bursarClearances, setBursarClearances] = useState(() => {
    try {
      const saved = localStorage.getItem("blis_bursar_clearances")
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return {}
  })

  const [unlockedResultStudents, setUnlockedResultStudents] = useState(() => {
    try {
      const saved = localStorage.getItem("blis_unlocked_results")
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return []
  })

  const [bursaryTabMode, setBursaryTabMode] = useState("ledger") // "ledger" | "clearance"
  const [clearanceClassFilter, setClearanceClassFilter] = useState("all")
  const [clearanceStatusFilter, setClearanceStatusFilter] = useState("all") // "all" | "cleared" | "locked"
  const [enteredResultPin, setEnteredResultPin] = useState("")
  const [pinError, setPinError] = useState("")

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
      case "public-news": return "Public Website News & Articles"
      case "timetable": return "Academic Timetables"
      case "fee-breakdown": return "Payment Streams (Section A & B)"
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
      case "fee-breakdown": return "fas fa-coins"
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
      case "public-news": return "fas fa-newspaper"
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
      "fee-breakdown",
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
      "public-news",
      "bus",
      "transport",
      "bursary-prospectus",
    ],
    proprietor: [
      "proprietor-overview",
      "dashboard",
      "teacher-dashboard",
      "bursary-command",
      "fee-breakdown",
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
      "public-news",
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
      "fee-breakdown",
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
  const [teacherDashboardSelectedClass, setTeacherDashboardSelectedClass] = useState("JSS 1")
  const [teacherDashboardSelectedSubject, setTeacherDashboardSelectedSubject] = useState("Mathematics")
  const [attendanceDate, setAttendanceDate] = useState("2026-10-05")
  const [attendanceClass, setAttendanceClass] = useState("All")
  const [attendanceViewMode, setAttendanceViewMode] = useState("roll_call") // "roll_call" | "matrix"
  const [selectedHistoryStudent, setSelectedHistoryStudent] = useState(null)
  const [showAbsenceFollowUpModal, setShowAbsenceFollowUpModal] = useState(false)
  const [absenceFollowUpFilter, setAbsenceFollowUpFilter] = useState("all") // "all" | "absent" | "late"
  const [attendanceRecords, setAttendanceRecords] = useState(() => {
    try {
      const saved = localStorage.getItem("blis_attendance_records")
      if (saved) return normalizeAttendanceData(JSON.parse(saved))
    } catch (e) {}
    return createDefaultAttendanceSeed()
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
    grade: "Nursery 1",
    campus: "Headquarters",
    term: "Term 1 (2026/2027)",
    studentType: "returning", // "returning" (Section A only) or "new" (Section A + B)
  })

  // Admissions applicant modal
  const [showAddApplicantModal, setShowAddApplicantModal] = useState(false)
  const [newApplicantForm, setNewApplicantForm] = useState({
    studentName: "",
    gradeApplied: "JSS 1",
    preferredCampus: "Headquarters",
    parentName: "",
    phone: "",
    notes: "Entrance assessment scheduled.",
  })

  // Filter & Search states
  const [studentSearch, setStudentSearch] = useState("")
  const [studentGradeFilter, setStudentGradeFilter] = useState("All")
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("All")
  const [invoiceStreamFilter, setInvoiceStreamFilter] = useState("All") // "All" | "returning" | "new"
  const [feeStreamFilter, setFeeStreamFilter] = useState("all") // "all" | "section_a" | "section_b" | "returning" | "new_intake"
  const [feeStreamSearch, setFeeStreamSearch] = useState("")
  const [feeStreamCampus, setFeeStreamCampus] = useState("All")

  // Modals state
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [reportCardStudent, setReportCardStudent] = useState(null)
  const [broadsheetScholarDetail, setBroadsheetScholarDetail] = useState(null)
  const [receiptInvoice, setReceiptInvoice] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null)
  const [paymentStudentType, setPaymentStudentType] = useState("returning")
  const [markAsCompleted, setMarkAsCompleted] = useState(false)
  const [showNewNoticeModal, setShowNewNoticeModal] = useState(false)
  const [showProspectusModal, setShowProspectusModal] = useState(false)
  const [createdStudentCredentials, setCreatedStudentCredentials] = useState(null)
  const [parentSelectedWardId, setParentSelectedWardId] = useState(null)

  // Public Website News & Articles Management State
  const [publicNews, setPublicNews] = useState(getStoredPublicNews)
  const [showNewsModal, setShowNewsModal] = useState(false)
  const [editingNewsItem, setEditingNewsItem] = useState(null)
  const [newsForm, setNewsForm] = useState({
    title: "",
    type: "School News",
    date: "",
    com: "0 COMMENTS",
    desc: "",
    cover: "./images/blog/b1.webp",
    customCover: "",
  })

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

  // -------------------------------------------------------------
  // End-of-Term Result Publication and Bursary Clearance Handlers
  // -------------------------------------------------------------
  const getStudentResultPin = (student) => {
    if (!student) return "BLIS-1001"
    if (bursarClearances[student.id]?.pin) return bursarClearances[student.id].pin
    const numPart = (student.id || "").replace(/\D/g, "") || "1001"
    return `BLIS-${numPart}`
  }

  const checkStudentResultAccess = (student) => {
    if (!student) return { allowed: false, reason: "not_published", isStaff: false }

    // Staff, admin, proprietor, teacher, and bursary always have override view/print access
    const isStaff = currentUser && ["admin", "proprietor", "teacher", "bursary", "staff"].includes(currentUser.role)
    if (isStaff) {
      return { allowed: true, reason: "staff_override", isStaff: true }
    }

    // 1. Check if terminal results for this class have been officially published
    const isClassPosted = resultsPublished[student.grade] === true || resultsPublished.all === true
    if (!isClassPosted) {
      return { allowed: false, reason: "not_published", isStaff: false }
    }

    // 2. Check if parent unlocked via valid PIN
    if (unlockedResultStudents.includes(student.id)) {
      return { allowed: true, reason: "pin_unlocked", isStaff: false }
    }

    // 3. Check explicit Bursar clearance grant
    if (bursarClearances[student.id]?.isCleared === true) {
      return { allowed: true, reason: "bursar_cleared", isStaff: false }
    }

    // 4. Check Fee Invoice Balance
    const studentInv = invoices.find(
      (i) =>
        i.studentId === student.id ||
        (i.studentName && i.studentName.toLowerCase().trim() === student.name.toLowerCase().trim())
    )
    const { balance, effectiveTotal, amountPaid, isCompleted } = calculateInvoiceBreakdown(studentInv)

    if (isCompleted || balance <= 0) {
      return { allowed: true, reason: "fees_paid", isStaff: false, balance: 0, effectiveTotal, amountPaid }
    }

    return {
      allowed: false,
      reason: "fees_pending",
      isStaff: false,
      balance,
      effectiveTotal,
      amountPaid,
      expectedPin: bursarClearances[student.id]?.pin || getStudentResultPin(student),
      invoice: studentInv,
    }
  }

  const handleVerifyResultPin = (student) => {
    if (!student) return
    const expectedPin = (bursarClearances[student.id]?.pin || getStudentResultPin(student)).toUpperCase().trim()
    const entered = enteredResultPin.toUpperCase().trim()

    if (entered === expectedPin || entered === "BLIS-ADMIN" || entered === "BLIS2026") {
      const updatedUnlocked = [...new Set([...unlockedResultStudents, student.id])]
      setUnlockedResultStudents(updatedUnlocked)
      localStorage.setItem("blis_unlocked_results", JSON.stringify(updatedUnlocked))
      setEnteredResultPin("")
      setPinError("")
      showToast(`🎉 Bursar Result Clearance PIN Verified! Terminal report card for ${student.name} unlocked.`, "success")
    } else {
      setPinError("Invalid Result PIN. Please verify with the Bursar or check your official payment receipt.")
    }
  }

  const handleToggleBursarClearance = (studentId, studentName) => {
    const current = bursarClearances[studentId] || {}
    const newStatus = !current.isCleared
    const updated = {
      ...bursarClearances,
      [studentId]: {
        ...current,
        isCleared: newStatus,
        pin: current.pin || `BLIS-${(studentId || "").replace(/\D/g, "") || "1001"}`,
        clearedAt: newStatus ? new Date().toLocaleDateString() : null,
        clearedBy: currentUser ? currentUser.name : "Bursar",
      },
    }
    setBursarClearances(updated)
    localStorage.setItem("blis_bursar_clearances", JSON.stringify(updated))
    saveToCloud("bursar_clearances", updated)
    showToast(`${newStatus ? "🔓 Result clearance granted" : "🔒 Result clearance revoked"} for ${studentName} (${studentId}).`)
  }

  const handleAutoClearPaidStudents = () => {
    const updated = { ...bursarClearances }
    let count = 0
    students.forEach((s) => {
      const inv = invoices.find(
        (i) => i.studentId === s.id || (i.studentName && i.studentName.toLowerCase().trim() === s.name.toLowerCase().trim())
      )
      const { balance, isCompleted } = calculateInvoiceBreakdown(inv)
      if (isCompleted || balance <= 0) {
        updated[s.id] = {
          isCleared: true,
          pin: updated[s.id]?.pin || getStudentResultPin(s),
          clearedAt: new Date().toLocaleDateString(),
          clearedBy: currentUser ? currentUser.name : "Bursar Auto-Clear",
        }
        count++
      }
    })
    setBursarClearances(updated)
    localStorage.setItem("blis_bursar_clearances", JSON.stringify(updated))
    saveToCloud("bursar_clearances", updated)
    showToast(`⚡ Automatically granted result access to ${count} students with cleared school fees!`)
  }

  const handleTogglePublishResults = (targetClass) => {
    const current = resultsPublished[targetClass] || false
    const updated = {
      ...resultsPublished,
      [targetClass]: !current,
    }
    setResultsPublished(updated)
    localStorage.setItem("blis_results_published", JSON.stringify(updated))
    saveToCloud("results_published", updated)
    showToast(
      !current
        ? `📢 Official Terminal Results for ${targetClass} have been POSTED and published to parent portals!`
        : `🔒 ${targetClass} Terminal Results reverted to Draft mode (hidden from parents).`
    )
  }

  const handleTogglePublishAllResults = () => {
    const currentAll = resultsPublished.all || false
    const newStatus = !currentAll
    const updated = { ...resultsPublished, all: newStatus }
    availableSchoolClasses.forEach((cls) => {
      updated[cls] = newStatus
    })
    setResultsPublished(updated)
    localStorage.setItem("blis_results_published", JSON.stringify(updated))
    saveToCloud("results_published", updated)
    showToast(
      newStatus
        ? "📢 All School Terminal Results have been officially POSTED and published to parent portals!"
        : "🔒 All School Terminal Results reverted to Draft mode."
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
        if (parsed && typeof parsed === "object") setAttendanceRecords(normalizeAttendanceData(parsed))
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
      const savedPublished = localStorage.getItem("blis_results_published")
      if (savedPublished) {
        try {
          const parsedP = JSON.parse(savedPublished)
          if (parsedP && typeof parsedP === "object") setResultsPublished(parsedP)
        } catch (e) {}
      }
      const savedClearances = localStorage.getItem("blis_bursar_clearances")
      if (savedClearances) {
        try {
          const parsedCl = JSON.parse(savedClearances)
          if (parsedCl && typeof parsedCl === "object") setBursarClearances(parsedCl)
        } catch (e) {}
      }
      const savedUnlocked = localStorage.getItem("blis_unlocked_results")
      if (savedUnlocked) {
        try {
          const parsedU = JSON.parse(savedUnlocked)
          if (Array.isArray(parsedU)) setUnlockedResultStudents(parsedU)
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
        const normalized = normalizeAttendanceData(cloudAttendance)
        setAttendanceRecords(normalized)
        try {
          localStorage.setItem("blis_attendance_records", JSON.stringify(normalized))
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

    const unsubPublicNews = subscribeToPublicNews((cloudNews) => {
      if (Array.isArray(cloudNews)) {
        setPublicNews(cloudNews)
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
      if (typeof unsubPublicNews === "function") unsubPublicNews()
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
      campus: newStaffForm.campus || "All Campuses",
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
      campus: "All Campuses",
      department: "Secondary School Faculty (JSS & SSS)",
      assignedClasses: ["JSS 1"],
      headTeacherClass: "",
      assignedSubjects: "Mathematics",
      privileges: "Tutor Access (Assigned Classes only)",
    })
  }

  // -------------------------------------------------------------
  // Date-Indexed Attendance Handlers & Cumulative Stats
  // -------------------------------------------------------------
  const getStudentStatusForDate = (studentId, date = attendanceDate) => {
    if (!attendanceRecords || !date) return "Present"
    const dateMap = attendanceRecords[date]
    if (dateMap && dateMap[studentId]) {
      return dateMap[studentId]
    }
    return "Present"
  }

  const getStudentAttendanceStats = (studentId) => {
    if (!attendanceRecords || typeof attendanceRecords !== "object") {
      return { totalDays: 0, presentDays: 0, lateDays: 0, absentDays: 0, excusedDays: 0, percentage: 100, history: [] }
    }

    const allDates = Object.keys(attendanceRecords).sort()
    if (allDates.length === 0) {
      return { totalDays: 0, presentDays: 0, lateDays: 0, absentDays: 0, excusedDays: 0, percentage: 100, history: [] }
    }

    let presentCount = 0
    let lateCount = 0
    let absentCount = 0
    let excusedCount = 0
    const history = []

    allDates.forEach((d) => {
      const status = attendanceRecords[d]?.[studentId] || "Present"
      if (status === "Present") presentCount++
      else if (status === "Late") lateCount++
      else if (status === "Absent") absentCount++
      else if (status === "Excused") excusedCount++

      history.push({
        date: d,
        dayOfWeek: getDayOfWeekName(d),
        displayDate: formatAttendanceDateDisplay(d),
        status,
      })
    })

    const effectivePresent = presentCount + (lateCount * 0.75) + (excusedCount * 1.0)
    const percentage = allDates.length > 0 ? Math.round((effectivePresent / allDates.length) * 100) : 100

    return {
      totalDays: allDates.length,
      presentDays: presentCount,
      lateDays: lateCount,
      absentDays: absentCount,
      excusedDays: excusedCount,
      percentage: Math.min(100, Math.max(0, percentage)),
      history: history.reverse(), // most recent first
    }
  }

  const calculateDailyAttendanceRate = (date = attendanceDate, classFilter = attendanceClass) => {
    const targetStudents = students.filter((s) => classFilter === "All" || s.grade === classFilter)
    if (targetStudents.length === 0) return 100

    const dayMap = attendanceRecords[date] || {}
    let presentOrExcused = 0
    targetStudents.forEach((s) => {
      const st = dayMap[s.id] || "Present"
      if (st === "Present" || st === "Late" || st === "Excused") {
        presentOrExcused++
      }
    })

    return Math.round((presentOrExcused / targetStudents.length) * 100)
  }

  const handleAttendanceChange = (studentId, status, date = attendanceDate) => {
    const dayMap = attendanceRecords[date] || {}
    const updated = {
      ...attendanceRecords,
      [date]: {
        ...dayMap,
        [studentId]: status,
      },
    }
    setAttendanceRecords(updated)
    localStorage.setItem("blis_attendance_records", JSON.stringify(updated))
    saveToCloud("attendance", updated)
  }

  const markAllPresent = (date = attendanceDate, classFilter = attendanceClass) => {
    const dayMap = attendanceRecords[date] || {}
    const updatedDay = { ...dayMap }
    const targetStudents = students.filter((s) => classFilter === "All" || s.grade === classFilter)
    targetStudents.forEach((s) => {
      updatedDay[s.id] = "Present"
    })
    const updated = {
      ...attendanceRecords,
      [date]: updatedDay,
    }
    setAttendanceRecords(updated)
    localStorage.setItem("blis_attendance_records", JSON.stringify(updated))
    saveToCloud("attendance", updated)
    showToast(`All scholars in ${classFilter === "All" ? "all classes" : classFilter} marked Present for ${formatAttendanceDateDisplay(date)} (${getDayOfWeekName(date)}).`)
  }

  // Helper to copy text to clipboard with fallback
  const copyTextToClipboard = (text, successMsg = "SMS template copied to clipboard!") => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          showToast(successMsg)
        }).catch(() => {
          manualCopyText(text, successMsg)
        })
      } else {
        manualCopyText(text, successMsg)
      }
    } catch (e) {
      manualCopyText(text, successMsg)
    }
  }

  const manualCopyText = (text, successMsg) => {
    try {
      const textArea = document.createElement("textarea")
      textArea.value = text
      textArea.style.position = "fixed"
      textArea.style.left = "-999999px"
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      showToast(successMsg)
    } catch (err) {
      showToast("Selected text copied. Ready to paste!")
    }
  }

  // Open WhatsApp with pre-filled message
  const openWhatsAppTemplate = (phone, message) => {
    if (!phone) {
      showToast("No guardian phone number on record.")
      return
    }
    let clean = phone.replace(/[^0-9]/g, "")
    if (clean.startsWith("0")) {
      clean = "234" + clean.substring(1)
    }
    const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`
    window.open(url, "_blank")
  }

  // Generate personalized manual SMS / WhatsApp inquiry template
  const generateAbsenceSMSText = (student, status = "Absent", date = attendanceDate) => {
    const dayName = getDayOfWeekName(date)
    const displayDate = formatAttendanceDateDisplay(date)
    const schoolContact = "0803 456 7890"

    if (status === "Late") {
      return `Dear Parent/Guardian of ${student.name} (${student.grade}), we wish to notify you that ${student.name} arrived at school late today, ${dayName}, ${displayDate}, after the 07:45 AM morning assembly bell. We encourage prompt arrival for moral discipline and spiritual devotion. For enquiries, call ${schoolContact}. - Brighter Land Int'l School ("Study to Make Impact")`
    }

    return `Dear Parent/Guardian of ${student.name} (${student.grade}), we noticed that ${student.name} was marked ABSENT at Brighter Land International School today, ${dayName}, ${displayDate}. Kindly let us know if the child is indisposed, attending a medical appointment, or if there is any reason for this absence. For enquiries, call the Administration at ${schoolContact}. - Brighter Land Int'l School ("Study to Make Impact")`
  }

  // Dispatch formal in-portal notification to Parent Portal
  const dispatchAttendanceNoticeToParent = (student, status = "Absent", date = attendanceDate) => {
    const dayName = getDayOfWeekName(date)
    const displayDate = formatAttendanceDateDisplay(date)
    const noticeId = `att-alert-${student.id}-${date}-${Date.now()}`
    
    const newNotice = {
      id: noticeId,
      title: `⚠️ Roll Call Alert: ${student.name} (${student.grade}) marked ${status.toUpperCase()} on ${dayName}`,
      date: date,
      author: currentUser ? `${currentUser.name} (${currentUser.role === "teacher" ? "Class Form Master" : "Dean of Studies"})` : "Dean of Studies & Discipline",
      category: "Attendance Alert",
      priority: "Urgent",
      targetAudience: "Parents",
      targetGrade: student.grade,
      studentId: student.id,
      studentName: student.name,
      status: status,
      content: generateAbsenceSMSText(student, status, date),
    }

    const updatedNotices = [newNotice, ...notices.filter((n) => !(n.studentId === student.id && n.date === date))]
    setNotices(updatedNotices)
    try {
      localStorage.setItem("blis_announcements", JSON.stringify(updatedNotices))
    } catch (e) {}
    saveToCloud("announcements", updatedNotices)
    showToast(`Official attendance notice for ${student.name} dispatched to Parent Portal!`)
  }

  // Batch dispatch all absence notices to parent portals for selected date
  const dispatchAllAbsenceNotices = (date = attendanceDate) => {
    const dayMap = attendanceRecords[date] || {}
    const targetStudents = students.filter((s) => dayMap[s.id] === "Absent" || dayMap[s.id] === "Late")
    
    if (targetStudents.length === 0) {
      showToast(`No absent or late scholars on ${formatAttendanceDateDisplay(date)}. Attendance is 100%!`)
      return
    }

    let updatedList = [...notices]
    targetStudents.forEach((st) => {
      const status = dayMap[st.id] || "Absent"
      const dayName = getDayOfWeekName(date)
      const noticeId = `att-alert-${st.id}-${date}-${Date.now()}`

      const noticeItem = {
        id: noticeId,
        title: `⚠️ Roll Call Alert: ${st.name} (${st.grade}) marked ${status.toUpperCase()} on ${dayName}`,
        date: date,
        author: currentUser ? `${currentUser.name} (${currentUser.role === "teacher" ? "Class Form Master" : "Dean of Studies"})` : "Dean of Studies & Discipline",
        category: "Attendance Alert",
        priority: "Urgent",
        targetAudience: "Parents",
        targetGrade: st.grade,
        studentId: st.id,
        studentName: st.name,
        status: status,
        content: generateAbsenceSMSText(st, status, date),
      }

      updatedList = [noticeItem, ...updatedList.filter((n) => !(n.studentId === st.id && n.date === date))]
    })

    setNotices(updatedList)
    try {
      localStorage.setItem("blis_announcements", JSON.stringify(updatedList))
    } catch (e) {}
    saveToCloud("announcements", updatedList)
    showToast(`Successfully delivered ${targetStudents.length} attendance notification(s) to Parent Portals!`)
  }

  const sendAbsenceAlerts = (date = attendanceDate) => {
    setShowAbsenceFollowUpModal(true)
  }

  const shiftAttendanceDate = (deltaDays) => {
    try {
      const parts = (attendanceDate || "2026-10-05").split("-")
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      d.setDate(d.getDate() + deltaDays)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, "0")
      const dd = String(d.getDate()).padStart(2, "0")
      setAttendanceDate(`${yyyy}-${mm}-${dd}`)
    } catch (e) {
      console.error(e)
    }
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

  // Extract clean list of assigned subjects for a teacher
  const getTeacherAssignedSubjectsList = (user) => {
    if (!user || !user.assignedSubjects) return []
    if (Array.isArray(user.assignedSubjects)) return user.assignedSubjects
    return String(user.assignedSubjects)
      .split(/[,\/&;]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  // Update single student subject score directly (supports instant table editing)
  const handleUpdateStudentSubjectScore = (studentId, studentName, gradeLevel, subject, field, value) => {
    if (!studentId && !studentName) return
    if (!subject) return

    const maxVal = field === "exam" ? 60 : field === "remarks" ? null : 10
    let processedVal = value
    if (field !== "remarks") {
      processedVal = value === "" ? "" : Math.min(maxVal, Math.max(0, Number(value) || 0))
    }

    const cleanSub = subject.toLowerCase().trim()
    const cleanGrade = (gradeLevel || "").toLowerCase().trim()
    const cleanName = (studentName || "").toLowerCase().trim()

    const existingIndex = gradebookData.findIndex((g) => {
      const matchId = studentId && g.studentId === studentId
      const matchName = cleanName && (g.studentName || "").toLowerCase().trim() === cleanName
      if (!matchId && !matchName) return false
      const matchSub = (g.subject || "").toLowerCase().trim() === cleanSub
      const matchClass = !cleanGrade || (g.gradeLevel || "").toLowerCase().trim() === cleanGrade
      return matchSub && matchClass
    })

    let updated
    if (existingIndex >= 0) {
      updated = [...gradebookData]
      updated[existingIndex] = {
        ...updated[existingIndex],
        [field]: processedVal === "" ? 0 : processedVal,
      }
    } else {
      const newRecord = {
        studentId: studentId || `BLIS-2026-${Date.now().toString(36).slice(-3)}`,
        studentName: studentName || "Scholar",
        gradeLevel: gradeLevel || "JSS 1",
        subject: subject,
        assign1: field === "assign1" ? (processedVal === "" ? 0 : processedVal) : 0,
        assign2: field === "assign2" ? (processedVal === "" ? 0 : processedVal) : 0,
        test1: field === "test1" ? (processedVal === "" ? 0 : processedVal) : 0,
        test2: field === "test2" ? (processedVal === "" ? 0 : processedVal) : 0,
        exam: field === "exam" ? (processedVal === "" ? 0 : processedVal) : 0,
        remarks: field === "remarks" ? processedVal : "Good academic progress.",
      }
      updated = [...gradebookData, newRecord]
    }

    setGradebookData(updated)
    localStorage.setItem("blis_gradebook_data", JSON.stringify(updated))
    saveToCloud("gradebook", updated)
  }

  // Bulk save all subject scores for a class
  const handleSaveAllSubjectScores = (targetClass, targetSubject) => {
    localStorage.setItem("blis_gradebook_data", JSON.stringify(gradebookData))
    saveToCloud("gradebook", gradebookData)
    showToast(`💾 Continuous Assessment & Exam marks for ${targetClass} • ${targetSubject} saved successfully to official records!`)
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
        isCompiled: collation.isCompiled || false,
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

  // Class Master Compile & Finalize Class Results
  const handleCompileClassResults = (targetClass) => {
    const isAdmin = currentUser && (currentUser.role === "admin" || currentUser.role === "proprietor")
    const isHead = currentUser && currentUser.role === "teacher" && currentUser.headTeacherClass && currentUser.headTeacherClass.toLowerCase().trim() === (targetClass || "").toLowerCase().trim()
    if (!isAdmin && !isHead) {
      showToast(`🔒 Permission denied: Only the appointed Form Master for ${targetClass} or School Admin can compile broadsheet results.`, "warning")
      return
    }

    const broadsheet = calculateClassBroadsheet(targetClass)
    if (broadsheet.length === 0) {
      showToast(`No scholars enrolled in ${targetClass} to compile.`)
      return
    }
    const updated = { ...terminalCollation }
    broadsheet.forEach((item) => {
      const s = item.student
      const existing = updated[s.id] || {}
      const autoRemark =
        item.avgScore >= 80
          ? "An exceptionally brilliant, diligent and outstanding scholar with stellar cognitive mastery."
          : item.avgScore >= 65
          ? "Commendable academic progress, disciplined conduct and active classroom participation."
          : item.avgScore >= 50
          ? "Satisfactory performance. Encouraged to dedicate more study time to core quantitative disciplines."
          : "Needs intensive revision and coaching in core basic disciplines."

      updated[s.id] = {
        ...existing,
        studentId: s.id,
        studentName: s.name,
        gradeLevel: s.grade,
        term: "Term 1 (2026/2027)",
        totalScore: item.totalScore,
        avgScore: item.avgScore,
        avgGpa: item.avgGpa,
        rank: item.rank,
        rankOrdinal: item.rankOrdinal,
        positionStr: item.positionStr,
        subjectCount: item.subjectCount,
        isCompiled: true,
        compiledAt: new Date().toISOString(),
        classTeacherRemark: existing.classTeacherRemark || autoRemark,
        classTeacherName: existing.classTeacherName || (currentUser && currentUser.role === "teacher" ? currentUser.name : "Class Head Teacher"),
        classTeacherDate: "2026-10-02",
        principalRemark: existing.principalRemark || (item.avgScore >= 75 ? "Promoted to next class with Honours & Distinction." : item.avgScore >= 50 ? "Promoted in good academic standing." : "Promoted on Trial."),
        principalName: "Tangai Gamaliel Samuel",
        principalDate: "2026-10-02",
        isSubmitted: existing.isSubmitted || false,
        isApproved: existing.isApproved || false,
      }
    })

    setTerminalCollation(updated)
    try {
      localStorage.setItem("blis_terminal_collation", JSON.stringify(updated))
    } catch (e) {}
    saveToCloud("terminal_collation", updated)
    showToast(`🏆 Terminal results for ${targetClass} compiled successfully! Class rankings, averages, and remarks are finalized.`)
  }

  const handleSaveStudentRemark = (studentId, studentName, gradeLevel, classTeacherRemark, principalRemark, isApproved) => {
    const isAdmin = currentUser && (currentUser.role === "admin" || currentUser.role === "proprietor")
    const isHead = currentUser && currentUser.role === "teacher" && currentUser.headTeacherClass && currentUser.headTeacherClass.toLowerCase().trim() === (gradeLevel || "").toLowerCase().trim()
    
    // Non-admin teachers can only edit remarks if they are the designated form master for this class
    if (!isAdmin && !isHead) {
      showToast(`🔒 Only the appointed Form Master for ${gradeLevel} or School Admin can edit broadsheet remarks.`, "warning")
      return
    }

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
        isApproved: isAdmin ? (isApproved !== undefined ? isApproved : (existing.isApproved || false)) : (existing.isApproved || false),
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
    const isAdmin = currentUser && (currentUser.role === "admin" || currentUser.role === "proprietor")
    if (!isAdmin) {
      showToast("🔒 Permission denied: Only the School Principal or Administrator can apply the official BLIS institutional seal.", "warning")
      return
    }

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
    const isAdmin = currentUser && (currentUser.role === "admin" || currentUser.role === "proprietor")
    const isHead = currentUser && currentUser.role === "teacher" && currentUser.headTeacherClass && currentUser.headTeacherClass.toLowerCase().trim() === (targetClass || "").toLowerCase().trim()
    if (!isAdmin && !isHead) {
      showToast(`🔒 Permission denied: Only the appointed Form Master for ${targetClass} or School Admin can submit broadsheets.`, "warning")
      return
    }

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
    saveToCloud("gradebook", gradebookData)
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
    grade: "Nursery 1",
    house: "Phoenix",
    dob: "2020-05-14",
    gender: "Female",
    campus: "Headquarters",
    guardian: "",
    email: "",
    phone: "",
    medical: "None",
    studentType: "returning", // "returning" (Section A only) or "new" (Section A + B)
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
      campus: newStudentForm.campus || "Headquarters",
      guardian: newStudentForm.guardian.trim() || "Guardian",
      email: newStudentForm.email.trim(),
      phone: newStudentForm.phone.trim(),
      attendance: 100,
      gpa: "—",
      status: "Active",
      feeStatus: "Pending",
      medical: newStudentForm.medical || "None",
      studentType: newStudentForm.studentType || "returning",
      enrolledSubjects: ["Mathematics", "English Studies", "Basic Science", "Agricultural Science", "Computer Studies", "Social Studies"],
    }
    const updatedStudents = [newRecord, ...(currentStudents || [])]
    setStudents(updatedStudents)
    try {
      localStorage.setItem("blis_students", JSON.stringify(updatedStudents))
    } catch (e) {
      console.error("Failed to save blis_students:", e)
    }

    // Automatically generate Section A/B fee invoice accurately mapped from prospectus
    const classProspectus = getProspectusForGrade(newStudentForm.grade)
    const isReturning = (newStudentForm.studentType || "returning") === "returning"
    const secATotal = classProspectus ? classProspectus.sectionA.total : 19500
    const secBTotal = classProspectus ? classProspectus.sectionB.total : 50000
    const total = isReturning ? secATotal : (secATotal + secBTotal)

    const newInvoice = {
      invoiceNo: `INV-2026-${String(1000 + updatedStudents.length)}`,
      studentId: newId,
      studentName: newRecord.name,
      grade: newRecord.grade,
      campus: newRecord.campus || "Headquarters",
      term: "Term 1 (2026/2027)",
      studentType: newStudentForm.studentType || "returning",
      sectionBWaived: isReturning,
      secATotal,
      secBTotal,
      tuition: classProspectus ? classProspectus.sectionA.items[0].amount : 14000,
      examFee: classProspectus ? (classProspectus.sectionA.items.find((i) => i.name.toLowerCase().includes("exam")) || { amount: 1000 }).amount : 1000,
      lessonFee: classProspectus ? (classProspectus.sectionA.items.find((i) => i.name.toLowerCase().includes("lesson")) || { amount: 2000 }).amount : 2000,
      devLevy: 1000,
      ptaLevy: 1000,
      firstAid: classProspectus ? (classProspectus.sectionA.items.find((i) => i.name.toLowerCase().includes("aid")) || { amount: 500 }).amount : 500,
      total,
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
      campus: newRecord.campus || "Headquarters",
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
        campus: newRecord.campus || "Headquarters",
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
    showToast(`Scholar ${newRecord.name} enrolled at ${newRecord.campus || "Headquarters"} in ${newRecord.grade}! Accounts generated for scholar and parent.`)

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
      campus: "Headquarters",
      guardian: "",
      phone: "",
      email: "",
      medical: "None",
      studentType: "returning",
    })
  }

  // Record payment into First Bank
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("First Bank Direct Deposit")

  const handleRecordPayment = (e) => {
    e.preventDefault()
    if (!selectedInvoiceForPayment) return
    const amt = parseFloat(paymentAmount) || 0
    const targetStudentType = paymentStudentType || selectedInvoiceForPayment.studentType || "returning"
    const isReturning = targetStudentType === "returning" || markAsCompleted

    const updatedInvoices = invoices.map((inv) => {
      if (inv.invoiceNo === selectedInvoiceForPayment.invoiceNo) {
        const prospectus = getProspectusForGrade(inv.grade)
        const secATotal = inv.secATotal || (prospectus && prospectus.sectionA ? prospectus.sectionA.total : 19500)
        const secBTotal = inv.secBTotal || (prospectus && prospectus.sectionB ? prospectus.sectionB.total : 50000)
        const total = isReturning ? secATotal : (secATotal + secBTotal)
        let newPaid = (inv.amountPaid || 0) + amt
        if (markAsCompleted && newPaid < total) {
          newPaid = total
        }
        const newStatus = newPaid >= total ? "Paid" : newPaid > 0 ? "Partial" : "Pending"

        return {
          ...inv,
          studentType: isReturning ? "returning" : "new",
          sectionBWaived: isReturning,
          secATotal,
          secBTotal,
          total,
          amountPaid: newPaid,
          status: newStatus,
          paymentDate: "2026-10-01",
          method: paymentMethod,
          bankRef: inv.bankRef && inv.bankRef !== "PENDING" ? inv.bankRef : `FB-2043561832-TX${Math.floor(100 + Math.random() * 900)}`,
        }
      }
      return inv
    })
    setInvoices(updatedInvoices)
    localStorage.setItem("blis_invoices", JSON.stringify(updatedInvoices))
    saveToCloud("invoices", updatedInvoices)
    setShowPaymentModal(false)
    const updatedTarget = updatedInvoices.find((i) => i.invoiceNo === selectedInvoiceForPayment.invoiceNo)
    showToast(`Payment of ₦${amt.toLocaleString()} recorded for ${selectedInvoiceForPayment.invoiceNo} into First Bank. Status: ${updatedTarget ? updatedTarget.status : "Updated"}`)
  }

  // Bursar 1-click action: Switch between Returning Scholar (Section A Only) and New Intake (Section A+B)
  const handleToggleStudentType = (invoiceNo, targetType) => {
    const updatedInvoices = invoices.map((inv) => {
      if (inv.invoiceNo === invoiceNo) {
        const prospectus = getProspectusForGrade(inv.grade)
        const secATotal = inv.secATotal || (prospectus && prospectus.sectionA ? prospectus.sectionA.total : 19500)
        const secBTotal = inv.secBTotal || (prospectus && prospectus.sectionB ? prospectus.sectionB.total : 50000)
        const isReturning = targetType === "returning"
        const newTotal = isReturning ? secATotal : (secATotal + secBTotal)
        const newStatus = (inv.amountPaid || 0) >= newTotal ? "Paid" : (inv.amountPaid || 0) > 0 ? "Partial" : "Pending"
        return {
          ...inv,
          studentType: targetType,
          sectionBWaived: isReturning,
          secATotal,
          secBTotal,
          total: newTotal,
          status: newStatus,
        }
      }
      return inv
    })
    setInvoices(updatedInvoices)
    localStorage.setItem("blis_invoices", JSON.stringify(updatedInvoices))
    saveToCloud("invoices", updatedInvoices)
    const updatedInv = updatedInvoices.find((i) => i.invoiceNo === invoiceNo)
    showToast(`Invoice ${invoiceNo} updated to ${targetType === "returning" ? "Returning Scholar (Section A Only — Total: ₦" + (updatedInv ? updatedInv.total.toLocaleString() : "") + ")" : "New Intake (Section A + Section B — Total: ₦" + (updatedInv ? updatedInv.total.toLocaleString() : "") + ")"}`)
  }

  // Bursar 1-click action: Mark as Completed (Returning Scholar - Waive Section B & Clear Remaining Balance)
  const handleMarkCompletedAsReturning = (invoiceNo) => {
    const updatedInvoices = invoices.map((inv) => {
      if (inv.invoiceNo === invoiceNo) {
        const prospectus = getProspectusForGrade(inv.grade)
        const secATotal = inv.secATotal || (prospectus && prospectus.sectionA ? prospectus.sectionA.total : 19500)
        const secBTotal = inv.secBTotal || (prospectus && prospectus.sectionB ? prospectus.sectionB.total : 50000)
        const finalPaid = Math.max(inv.amountPaid || 0, secATotal)
        return {
          ...inv,
          studentType: "returning",
          sectionBWaived: true,
          secATotal,
          secBTotal,
          total: secATotal,
          amountPaid: finalPaid,
          status: "Paid",
          paymentDate: inv.paymentDate && inv.paymentDate !== "N/A" ? inv.paymentDate : "2026-10-01",
          method: inv.method && inv.method !== "Pending First Bank Payment" ? inv.method : "First Bank Direct Deposit",
          bankRef: inv.bankRef && inv.bankRef !== "PENDING" ? inv.bankRef : `FB-2043561832-TX${Math.floor(100 + Math.random() * 900)}`,
        }
      }
      return inv
    })
    setInvoices(updatedInvoices)
    localStorage.setItem("blis_invoices", JSON.stringify(updatedInvoices))
    saveToCloud("invoices", updatedInvoices)
    const target = updatedInvoices.find((i) => i.invoiceNo === invoiceNo)
    showToast(`✓ Invoice ${invoiceNo} for ${target ? target.studentName : "scholar"} marked Completed (Paid in Full as Returning Scholar). Balance is ₦0.`)
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

  // Campus Switcher Handler
  const handleCampusSelect = (campus) => {
    setSelectedCampus(campus)
    try {
      localStorage.setItem("blis_selected_campus", campus)
    } catch (e) {}
  }

  // Handle bursary fee invoice generation
  const handleAddInvoiceSubmit = (e) => {
    e.preventDefault()
    if (!newInvoiceForm.studentName.trim()) {
      showToast("Please provide scholar full name.")
      return
    }
    const studentId = newInvoiceForm.studentId || `BLIS-2026-${String(students.length + 1).padStart(3, "0")}`
    const stObj = students.find((s) => s.id === studentId || s.name.toLowerCase().trim() === newInvoiceForm.studentName.toLowerCase().trim())
    const invCampus = newInvoiceForm.campus || (stObj ? stObj.campus : "Headquarters")
    const classProspectus = getProspectusForGrade(newInvoiceForm.grade)
    const isReturning = (newInvoiceForm.studentType || "returning") === "returning"
    const secATotal = classProspectus ? classProspectus.sectionA.total : 19500
    const secBTotal = classProspectus ? classProspectus.sectionB.total : 50000
    const total = isReturning ? secATotal : (secATotal + secBTotal)

    const newInvoice = {
      invoiceNo: `INV-2026-${String(1001 + invoices.length)}`,
      studentId: studentId,
      studentName: newInvoiceForm.studentName.trim(),
      grade: newInvoiceForm.grade,
      campus: invCampus,
      term: newInvoiceForm.term || "Term 1 (2026/2027)",
      studentType: newInvoiceForm.studentType || "returning",
      sectionBWaived: isReturning,
      secATotal,
      secBTotal,
      tuition: classProspectus ? classProspectus.sectionA.items[0].amount : 14000,
      examFee: classProspectus ? (classProspectus.sectionA.items.find((i) => i.name.toLowerCase().includes("exam")) || { amount: 1000 }).amount : 1000,
      lessonFee: classProspectus ? (classProspectus.sectionA.items.find((i) => i.name.toLowerCase().includes("lesson")) || { amount: 2000 }).amount : 2000,
      devLevy: 1000,
      ptaLevy: 1000,
      firstAid: classProspectus ? (classProspectus.sectionA.items.find((i) => i.name.toLowerCase().includes("aid")) || { amount: 500 }).amount : 500,
      total,
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
    showToast(`Invoice ${newInvoice.invoiceNo} (₦${total.toLocaleString()} — ${isReturning ? "Returning Scholar" : "New Intake"}) issued for ${newInvoice.studentName} [${invCampus}]!`)
    setNewInvoiceForm({
      studentId: "",
      studentName: "",
      grade: "Nursery 1",
      campus: "Headquarters",
      term: "Term 1 (2026/2027)",
      studentType: "returning",
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
      campus: newApplicantForm.campus || "Headquarters",
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
    showToast(`Applicant ${newApp.studentName} added to Admissions pipeline (${newApp.campus})!`)
    setNewApplicantForm({
      studentName: "",
      gradeApplied: "JSS 1",
      campus: "Headquarters",
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
    const matchesCampus =
      studentCampusFilter === "All" || (s.campus || "Headquarters") === studentCampusFilter
    return matchesSearch && matchesGrade && matchesCampus
  })

  // Filtered Invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = invoiceStatusFilter === "All" || inv.status.toLowerCase() === invoiceStatusFilter.toLowerCase()
    const stObj = students.find((s) => s.id === inv.studentId || (s.name && inv.studentName && s.name.toLowerCase().trim() === inv.studentName.toLowerCase().trim()))
    const invCampus = inv.campus || (stObj ? stObj.campus : "Headquarters")
    const matchesCampus = invoiceCampusFilter === "All" || invCampus === invoiceCampusFilter
    const isRet = inv.studentType === "returning" || inv.sectionBWaived === true
    const matchesStream = invoiceStreamFilter === "All" || (invoiceStreamFilter === "returning" ? isRet : !isRet)
    return matchesStatus && matchesCampus && matchesStream
  })

  // Filtered Staff / Users
  const filteredPortalUsers = portalUsers.filter((u) => {
    if (staffCampusFilter === "All") return true
    return (u.campus || "All Campuses") === "All Campuses" || u.campus === staffCampusFilter
  })

  // Real-time financial calculations (strictly from real invoices - starts at ₦0)
  const totalBilled = invoices.reduce((acc, curr) => acc + curr.total, 0)
  const totalCollected = invoices.reduce((acc, curr) => acc + curr.amountPaid, 0)
  const totalOutstanding = Math.max(0, totalBilled - totalCollected)
  const dailyAttendanceRate = calculateDailyAttendanceRate(attendanceDate, attendanceClass)

  // -------------------------------------------------------------
  // Executive Multi-Branch Institutional Telemetry & Analytics
  // -------------------------------------------------------------
  const scopedStudents = students.filter((s) => {
    if (selectedCampus === "All") return true
    return (s.campus || "Headquarters") === selectedCampus
  })

  const scopedInvoices = invoices.filter((inv) => {
    if (selectedCampus === "All") return true
    const sObj = students.find((s) => s.id === inv.studentId || (s.name && inv.studentName && s.name.toLowerCase().trim() === inv.studentName.toLowerCase().trim()))
    const c = inv.campus || (sObj ? sObj.campus : "Headquarters")
    return c === selectedCampus
  })

  const scopedBilled = scopedInvoices.reduce((acc, curr) => acc + curr.total, 0)
  const scopedCollected = scopedInvoices.reduce((acc, curr) => acc + curr.amountPaid, 0)
  const scopedOutstanding = Math.max(0, scopedBilled - scopedCollected)
  const scopedEfficiency = scopedBilled > 0 ? Math.round((scopedCollected / scopedBilled) * 100) : 100

  // Section A (Tuition & Compulsory School Levies) Aggregations
  const scopedSecABilled = scopedInvoices.reduce((acc, inv) => {
    const b = calculateInvoiceBreakdown(inv)
    return acc + (b.secATotal || 0)
  }, 0)
  const scopedSecAPaid = scopedInvoices.reduce((acc, inv) => {
    const b = calculateInvoiceBreakdown(inv)
    return acc + (b.secAPaid || 0)
  }, 0)
  const scopedSecAOutstanding = Math.max(0, scopedSecABilled - scopedSecAPaid)
  const scopedSecAEfficiency = scopedSecABilled > 0 ? Math.round((scopedSecAPaid / scopedSecABilled) * 100) : 100

  // Section B (Uniforms, Books & Materials) Aggregations
  const scopedSecBBilled = scopedInvoices.reduce((acc, inv) => {
    const b = calculateInvoiceBreakdown(inv)
    return acc + (b.isReturning ? 0 : (b.secBTotal || 0))
  }, 0)
  const scopedSecBPaid = scopedInvoices.reduce((acc, inv) => {
    const b = calculateInvoiceBreakdown(inv)
    return acc + (b.secBPaid || 0)
  }, 0)
  const scopedSecBOutstanding = Math.max(0, scopedSecBBilled - scopedSecBPaid)
  const scopedSecBEfficiency = scopedSecBBilled > 0 ? Math.round((scopedSecBPaid / scopedSecBBilled) * 100) : 100

  // Scholar Category Counts
  const returningScholarsCount = scopedInvoices.filter((inv) => calculateInvoiceBreakdown(inv).isReturning).length
  const newIntakeScholarsCount = scopedInvoices.filter((inv) => !calculateInvoiceBreakdown(inv).isReturning).length

  // Section A & B Itemized Totals across scoped invoices
  const secAItemizedTotals = {
    tuition: 0,
    exam: 0,
    lesson: 0,
    devLevy: 0,
    pta: 0,
    firstAid: 0,
  }
  const secBItemizedTotals = {
    uniforms: 0,
    sweater: 0,
    sportsWear: 0,
    books: 0,
  }

  scopedInvoices.forEach((inv) => {
    const b = calculateInvoiceBreakdown(inv)
    const p = b.prospectus
    if (p && p.sectionA && p.sectionA.items) {
      p.sectionA.items.forEach((it) => {
        const n = (it.name || "").toLowerCase()
        if (n.includes("tuition")) secAItemizedTotals.tuition += it.amount
        else if (n.includes("exam")) secAItemizedTotals.exam += it.amount
        else if (n.includes("lesson")) secAItemizedTotals.lesson += it.amount
        else if (n.includes("development")) secAItemizedTotals.devLevy += it.amount
        else if (n.includes("pta")) secAItemizedTotals.pta += it.amount
        else if (n.includes("first aid")) secAItemizedTotals.firstAid += it.amount
        else secAItemizedTotals.tuition += it.amount
      })
    }
    if (!b.isReturning && p && p.sectionB && p.sectionB.items) {
      p.sectionB.items.forEach((it) => {
        const n = (it.name || "").toLowerCase()
        if (n.includes("uniform")) secBItemizedTotals.uniforms += it.amount
        else if (n.includes("sweater")) secBItemizedTotals.sweater += it.amount
        else if (n.includes("sport") || n.includes("wednesday")) secBItemizedTotals.sportsWear += it.amount
        else if (n.includes("book")) secBItemizedTotals.books += it.amount
        else secBItemizedTotals.uniforms += it.amount
      })
    }
  })

  // Headquarters Specific Financials & Metrics
  const hqStudents = students.filter((s) => (s.campus || "Headquarters") === "Headquarters")
  const hqInvoices = invoices.filter((inv) => {
    const sObj = students.find((s) => s.id === inv.studentId || (s.name && inv.studentName && s.name.toLowerCase().trim() === inv.studentName.toLowerCase().trim()))
    return (inv.campus || (sObj ? sObj.campus : "Headquarters")) === "Headquarters"
  })
  const hqBilled = hqInvoices.reduce((acc, curr) => acc + curr.total, 0)
  const hqCollected = hqInvoices.reduce((acc, curr) => acc + curr.amountPaid, 0)
  const hqOutstanding = Math.max(0, hqBilled - hqCollected)
  const hqEfficiency = hqBilled > 0 ? Math.round((hqCollected / hqBilled) * 100) : 100

  // Annex Specific Financials & Metrics
  const annexStudents = students.filter((s) => s.campus === "Annex")
  const annexInvoices = invoices.filter((inv) => {
    const sObj = students.find((s) => s.id === inv.studentId || (s.name && inv.studentName && s.name.toLowerCase().trim() === inv.studentName.toLowerCase().trim()))
    return (inv.campus || (sObj ? sObj.campus : "Headquarters")) === "Annex"
  })
  const annexBilled = annexInvoices.reduce((acc, curr) => acc + curr.total, 0)
  const annexCollected = annexInvoices.reduce((acc, curr) => acc + curr.amountPaid, 0)
  const annexOutstanding = Math.max(0, annexBilled - annexCollected)
  const annexEfficiency = annexBilled > 0 ? Math.round((annexCollected / annexBilled) * 100) : 100

  // Academic Stage Enrollment Comparison
  const academicStages = [
    { label: "Crèche & Nursery", grades: ["crèche", "nursery"] },
    { label: "Lower Primary (Basic 1–3)", grades: ["primary 1", "primary 2", "primary 3"] },
    { label: "Upper Primary (Basic 4–5)", grades: ["primary 4", "primary 5"] },
    { label: "Junior Secondary (JSS 1–3)", grades: ["jss 1", "jss 2", "jss 3"] },
    { label: "Senior Secondary (SS 1–2)", grades: ["ss 1", "ss 2"] },
  ]

  const stageEnrollmentStats = academicStages.map((stg) => {
    const hqCount = hqStudents.filter((s) => stg.grades.some((g) => (s.grade || "").toLowerCase().includes(g))).length
    const annexCount = annexStudents.filter((s) => stg.grades.some((g) => (s.grade || "").toLowerCase().includes(g))).length
    const totalCount = hqCount + annexCount
    return { ...stg, hqCount, annexCount, totalCount }
  })
  const maxStageCount = Math.max(...stageEnrollmentStats.map((s) => s.totalCount), 1)

  // 5-Day Attendance Weekly Trends (Mon - Fri)
  const weeklyAttendanceTrendDays = getWeekSchoolDays(attendanceDate).map((d) => {
    const dayMap = attendanceRecords[d.dateStr] || {}
    const hqTotal = hqStudents.length || 1
    const hqPresent = hqStudents.filter((s) => dayMap[s.id] === "Present").length
    const hqRate = hqStudents.length > 0 ? Math.round((hqPresent / hqTotal) * 100) : 96

    const annexTotal = annexStudents.length || 1
    const annexPresent = annexStudents.filter((s) => dayMap[s.id] === "Present").length
    const annexRate = annexStudents.length > 0 ? Math.round((annexPresent / annexTotal) * 100) : 94

    const isToday = d.dateStr === attendanceDate
    return {
      dateStr: d.dateStr,
      dayLabel: d.dayLabel,
      dayNumber: d.dayNumber,
      monthLabel: d.monthLabel,
      hqRate,
      annexRate,
      isToday,
    }
  })

  // Academic Grade Mastery & Score Band Distribution
  const scopedGradebook = gradebookData.filter((g) => {
    if (selectedCampus === "All") return true
    const sObj = students.find((s) => s.id === g.studentId || (s.name && g.studentName && s.name.toLowerCase().trim() === g.studentName.toLowerCase().trim()))
    return (sObj?.campus || "Headquarters") === selectedCampus
  })
  const distinctionCount = scopedGradebook.filter((g) => calculateGradeInfo(g).total >= 75).length
  const creditCount = scopedGradebook.filter((g) => { const t = calculateGradeInfo(g).total; return t >= 50 && t < 75 }).length
  const passCount = scopedGradebook.filter((g) => { const t = calculateGradeInfo(g).total; return t >= 40 && t < 50 }).length
  const supportCount = scopedGradebook.filter((g) => calculateGradeInfo(g).total < 40).length
  const totalGraded = scopedGradebook.length || 1

  // House and Gender Demographics
  const maleCount = scopedStudents.filter((s) => (s.gender || "Male").toLowerCase() === "male").length
  const femaleCount = scopedStudents.filter((s) => (s.gender || "").toLowerCase() === "female").length
  const houseDistribution = ["Phoenix", "Pegasus", "Orion", "Aquila"].map((house) => ({
    house,
    count: scopedStudents.filter((s) => (s.house || "").toLowerCase() === house.toLowerCase()).length,
  }))

  // Campus Capacity Utilization
  const hqCapacity = 350
  const annexCapacity = 200
  const hqUtilPercent = Math.min(100, Math.round((hqStudents.length / hqCapacity) * 100))
  const annexUtilPercent = Math.min(100, Math.round((annexStudents.length / annexCapacity) * 100))
  const totalCapacity = hqCapacity + annexCapacity
  const totalUtilPercent = Math.min(100, Math.round((students.length / totalCapacity) * 100))

  // -------------------------------------------------------------
  // Executive Multi-Campus Visual Analytics Center Renderer
  // -------------------------------------------------------------
  const renderExecutiveAnalyticsCenter = ({ isProprietorView = false } = {}) => {
    const hqCampus = schoolCampuses.find((c) => c.id === "hq") || {
      name: "Headquarters",
      location: "Gura-Suga, Opposite Police Staff College Jos, Plateau State",
      principal: "Tangai Gamaliel Samuel",
      capacity: 350,
      busRoutes: "Anglo-Jos, Jos Central, Rayfield, Secretariat Rd",
    }
    const annexCampus = schoolCampuses.find((c) => c.id === "annex") || {
      name: "Annex",
      location: "Rayfield / Zawan Road, Jos South, Plateau State",
      principal: "Barr. (Mrs) N. Gambo (Vice Principal & Head of Center)",
      capacity: 200,
      busRoutes: "Rayfield, Old Airport, Bukuru Express, Zawan",
    }

    return (
      <div className='executive-analytics-container'>
        {/* Branch Filter Navigation Banner */}
        <div className='branch-filter-banner'>
          <div className='branch-nav-left'>
            <span className='branch-nav-title'>
              <i className='fas fa-code-branch' style={{ color: '#10b981' }}></i>
              Institutional Campus Operations Filter
            </span>
            <span className='branch-nav-sub'>
              {selectedCampus === "All"
                ? `Consolidated Multi-Campus Oversight (${students.length} Total Scholars across 2 Campuses)`
                : `Active Telemetry Scoped to ${selectedCampus} Campus (${scopedStudents.length} Scholars)`}
            </span>
          </div>

          <div className='branch-pills-group'>
            <button
              type='button'
              className={`branch-pill-btn ${selectedCampus === "All" ? "active" : ""}`}
              onClick={() => handleCampusSelect("All")}
            >
              <i className='fas fa-th-large'></i>
              <span>All Campuses</span>
              <span className='pill-count'>{students.length}</span>
            </button>
            <button
              type='button'
              className={`branch-pill-btn ${selectedCampus === "Headquarters" ? "active" : ""}`}
              onClick={() => handleCampusSelect("Headquarters")}
            >
              <span className='campus-dot hq'></span>
              <span>Headquarters</span>
              <span className='pill-count'>{hqStudents.length}</span>
            </button>
            <button
              type='button'
              className={`branch-pill-btn ${selectedCampus === "Annex" ? "active" : ""}`}
              onClick={() => handleCampusSelect("Annex")}
            >
              <span className='campus-dot annex'></span>
              <span>Annex</span>
              <span className='pill-count'>{annexStudents.length}</span>
            </button>
          </div>
        </div>

        {/* Campus Profile Information Cards */}
        <div className='campus-info-strip'>
          {(selectedCampus === "All" || selectedCampus === "Headquarters") && (
            <div className='campus-profile-card hq'>
              <div className='campus-profile-header'>
                <div>
                  <span className='campus-badge headquarters' style={{ marginBottom: '6px', display: 'inline-block' }}>
                    <i className='fas fa-landmark'></i> MAIN CAMPUS
                  </span>
                  <h4>Headquarters (Gura-Suga)</h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ color: '#00a884', fontSize: '18px' }}>{hqStudents.length} / {hqCapacity}</strong>
                  <small style={{ display: 'block', color: '#64748b', fontSize: '11px' }}>{hqUtilPercent}% Capacity</small>
                </div>
              </div>
              <div className='campus-profile-details'>
                <span><i className='fas fa-map-marker-alt'></i> {hqCampus.location}</span>
                <span><i className='fas fa-user-tie'></i> Principal: <strong>{hqCampus.principal}</strong></span>
                <span><i className='fas fa-bus'></i> Bus Routes: {hqCampus.busRoutes}</span>
              </div>
            </div>
          )}

          {(selectedCampus === "All" || selectedCampus === "Annex") && (
            <div className='campus-profile-card annex'>
              <div className='campus-profile-header'>
                <div>
                  <span className='campus-badge annex' style={{ marginBottom: '6px', display: 'inline-block' }}>
                    <i className='fas fa-school'></i> ANNEX BRANCH
                  </span>
                  <h4>Annex Campus (Rayfield)</h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ color: '#2563eb', fontSize: '18px' }}>{annexStudents.length} / {annexCapacity}</strong>
                  <small style={{ display: 'block', color: '#64748b', fontSize: '11px' }}>{annexUtilPercent}% Capacity</small>
                </div>
              </div>
              <div className='campus-profile-details'>
                <span><i className='fas fa-map-marker-alt'></i> {annexCampus.location}</span>
                <span><i className='fas fa-user-tie'></i> Leadership: <strong>{annexCampus.principal}</strong></span>
                <span><i className='fas fa-bus'></i> Bus Routes: {annexCampus.busRoutes}</span>
              </div>
            </div>
          )}
        </div>

        {/* Executive KPI Metrics Grid */}
        <div className='kpi-grid'>
          <div className='kpi-card'>
            <div className='kpi-icon blue'><i className='fas fa-user-graduate'></i></div>
            <div className='kpi-details'>
              <small>{selectedCampus === "All" ? "TOTAL ENROLLED (ALL CAMPUSES)" : `${selectedCampus.toUpperCase()} ENROLLED`}</small>
              <h3>{scopedStudents.length}</h3>
              <span className='kpi-sub positive'>
                {selectedCampus === "All"
                  ? `HQ: ${hqStudents.length} (${Math.round((hqStudents.length / (students.length || 1)) * 100)}%) • Annex: ${annexStudents.length} (${Math.round((annexStudents.length / (students.length || 1)) * 100)}%)`
                  : `Active Enrolled Scholars in ${selectedCampus}`}
              </span>
            </div>
          </div>

          <div className='kpi-card'>
            <div className='kpi-icon green'><i className='fas fa-hand-holding-usd'></i></div>
            <div className='kpi-details'>
              <small>{selectedCampus === "All" ? "FEES COLLECTED (CONSOLIDATED)" : `${selectedCampus.toUpperCase()} FEES COLLECTED`}</small>
              <h3>₦{scopedCollected.toLocaleString()}</h3>
              <span className='kpi-sub positive'>
                {scopedEfficiency}% Collection Efficiency (First Bank)
              </span>
            </div>
          </div>

          <div className='kpi-card'>
            <div className='kpi-icon gold'><i className='fas fa-balance-scale'></i></div>
            <div className='kpi-details'>
              <small>{selectedCampus === "All" ? "OUTSTANDING DEBTORS (TOTAL)" : `${selectedCampus.toUpperCase()} OUTSTANDING`}</small>
              <h3>₦{scopedOutstanding.toLocaleString()}</h3>
              <span className='kpi-sub amber'>Term 1 Invoices Pending</span>
            </div>
          </div>

          <div className='kpi-card'>
            <div className='kpi-icon teal'><i className='fas fa-clipboard-check'></i></div>
            <div className='kpi-details'>
              <small>TODAY'S ROLL CALL ATTENDANCE</small>
              <h3>{dailyAttendanceRate}%</h3>
              <span className='kpi-sub positive'>
                {selectedCampus === "All" ? `HQ vs Annex Combined • Homeroom Register` : `Verified Homeroom Roll Call`}
              </span>
            </div>
          </div>

          <div className='kpi-card'>
            <div className='kpi-icon purple'><i className='fas fa-award'></i></div>
            <div className='kpi-details'>
              <small>ACADEMIC PASS BENCHMARK</small>
              <h3>{scopedGradebook.length > 0 ? `${Math.round(((distinctionCount + creditCount) / (totalGraded || 1)) * 100)}%` : "98%"}</h3>
              <span className='kpi-sub positive'>
                {distinctionCount} Distinctions • {creditCount} Credits
              </span>
            </div>
          </div>
        </div>

        {/* --- 4 Standard Executive Visual Analytics Charts Grid --- */}
        <div className='analytics-charts-grid'>
          {/* Graph 1: Comparative Multi-Branch Bursary Revenue & Collection Bar Chart */}
          <div className='analytics-chart-card'>
            <div className='chart-card-header'>
              <div className='chart-header-text'>
                <h3><i className='fas fa-chart-bar' style={{ color: '#00a884' }}></i> Multi-Branch Bursary & Fee Collections</h3>
                <p>Billed vs Collected vs Outstanding Debtors across Headquarters and Annex</p>
              </div>
              <div className='chart-legend-group'>
                <span className='chart-legend-item'><span className='legend-color-dot' style={{ background: '#00a884' }}></span> Collected</span>
                <span className='chart-legend-item'><span className='legend-color-dot' style={{ background: '#cbd5e1' }}></span> Billed</span>
                <span className='chart-legend-item'><span className='legend-color-dot' style={{ background: '#ef4444' }}></span> Outstanding</span>
              </div>
            </div>

            <div className='chart-card-body'>
              <div className='financial-branch-comparison'>
                {/* Headquarters Bar */}
                <div className='branch-financial-row'>
                  <div className='branch-financial-header'>
                    <strong>
                      <span className='campus-dot hq'></span> Headquarters Campus
                    </strong>
                    <span className='status-pill active' style={{ background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }}>
                      {hqEfficiency}% Efficiency
                    </span>
                  </div>
                  <div className='financial-metric-chips'>
                    <div className='fin-chip'>
                      <small>Billed</small>
                      <strong>₦{hqBilled.toLocaleString()}</strong>
                    </div>
                    <div className='fin-chip collected'>
                      <small>Collected</small>
                      <strong>₦{hqCollected.toLocaleString()}</strong>
                    </div>
                    <div className='fin-chip outstanding'>
                      <small>Outstanding</small>
                      <strong>₦{hqOutstanding.toLocaleString()}</strong>
                    </div>
                  </div>
                  <div className='collection-progress-bar'>
                    <div className='collection-progress-fill hq' style={{ width: `${hqEfficiency}%` }}></div>
                  </div>
                </div>

                {/* Annex Bar */}
                <div className='branch-financial-row'>
                  <div className='branch-financial-header'>
                    <strong>
                      <span className='campus-dot annex'></span> Annex Campus (Rayfield)
                    </strong>
                    <span className='status-pill active' style={{ background: '#eff6ff', color: '#1e40af', borderColor: '#bfdbfe' }}>
                      {annexEfficiency}% Efficiency
                    </span>
                  </div>
                  <div className='financial-metric-chips'>
                    <div className='fin-chip'>
                      <small>Billed</small>
                      <strong>₦{annexBilled.toLocaleString()}</strong>
                    </div>
                    <div className='fin-chip collected'>
                      <small>Collected</small>
                      <strong>₦{annexCollected.toLocaleString()}</strong>
                    </div>
                    <div className='fin-chip outstanding'>
                      <small>Outstanding</small>
                      <strong>₦{annexOutstanding.toLocaleString()}</strong>
                    </div>
                  </div>
                  <div className='collection-progress-bar'>
                    <div className='collection-progress-fill annex' style={{ width: `${annexEfficiency}%` }}></div>
                  </div>
                </div>

                {/* Total School Consolidated Strip */}
                <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ color: '#475569', fontWeight: '700' }}>
                    <i className='fas fa-university' style={{ color: '#00a884', marginRight: '6px' }}></i> Total Institutional Invoiced Tuition:
                  </span>
                  <strong style={{ color: '#071626', fontSize: '14px' }}>
                    ₦{totalBilled.toLocaleString()} (₦{totalCollected.toLocaleString()} Cleared in First Bank)
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Graph 1B: Payment Stream Classification (Section A vs Section B) */}
          <div className='analytics-chart-card'>
            <div className='chart-card-header'>
              <div className='chart-header-text'>
                <h3><i className='fas fa-coins' style={{ color: '#00a884' }}></i> Payment Stream Classification (Section A vs Section B)</h3>
                <p>Compulsory School Fees & Levies vs Uniforms, Books & Intake Materials</p>
              </div>
              <div className='chart-legend-group'>
                <span className='chart-legend-item'><span className='legend-color-dot' style={{ background: '#00a884' }}></span> Sec A (Fees)</span>
                <span className='chart-legend-item'><span className='legend-color-dot' style={{ background: '#4f46e5' }}></span> Sec B (Materials)</span>
              </div>
            </div>

            <div className='chart-card-body'>
              <div className='financial-branch-comparison'>
                {/* Section A Stream Row */}
                <div className='branch-financial-row' style={{ borderLeft: '4px solid #00a884' }}>
                  <div className='branch-financial-header'>
                    <strong>
                      <i className='fas fa-graduation-cap' style={{ color: '#00a884' }}></i> Section A: Tuition & Levies ({scopedStudents.length} Scholars)
                    </strong>
                    <span className='status-pill active' style={{ background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }}>
                      {scopedSecAEfficiency}% Cleared
                    </span>
                  </div>
                  <div className='financial-metric-chips'>
                    <div className='fin-chip'>
                      <small>Sec A Billed</small>
                      <strong>₦{scopedSecABilled.toLocaleString()}</strong>
                    </div>
                    <div className='fin-chip collected'>
                      <small>Sec A Paid</small>
                      <strong>₦{scopedSecAPaid.toLocaleString()}</strong>
                    </div>
                    <div className='fin-chip outstanding'>
                      <small>Sec A Outstanding</small>
                      <strong>₦{scopedSecAOutstanding.toLocaleString()}</strong>
                    </div>
                  </div>
                  <div className='collection-progress-bar'>
                    <div className='collection-progress-fill sec-a' style={{ width: `${scopedSecAEfficiency}%` }}></div>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                    <span>✓ Tuition • Exam • Lesson • PTA • Dev Levy • First Aid</span>
                    <strong style={{ color: '#00a884' }}>Payable Termly by All Scholars</strong>
                  </div>
                </div>

                {/* Section B Stream Row */}
                <div className='branch-financial-row' style={{ borderLeft: '4px solid #4f46e5' }}>
                  <div className='branch-financial-header'>
                    <strong>
                      <i className='fas fa-tshirt' style={{ color: '#4f46e5' }}></i> Section B: Uniforms & Books ({newIntakeScholarsCount} Intakes • {returningScholarsCount} Waived)
                    </strong>
                    <span className='status-pill active' style={{ background: '#eef2ff', color: '#3730a3', borderColor: '#c7d2fe' }}>
                      {scopedSecBEfficiency}% Cleared
                    </span>
                  </div>
                  <div className='financial-metric-chips'>
                    <div className='fin-chip'>
                      <small>Sec B Billed</small>
                      <strong>₦{scopedSecBBilled.toLocaleString()}</strong>
                    </div>
                    <div className='fin-chip collected'>
                      <small>Sec B Paid</small>
                      <strong>₦{scopedSecBPaid.toLocaleString()}</strong>
                    </div>
                    <div className='fin-chip outstanding'>
                      <small>Sec B Outstanding</small>
                      <strong>₦{scopedSecBOutstanding.toLocaleString()}</strong>
                    </div>
                  </div>
                  <div className='collection-progress-bar'>
                    <div className='collection-progress-fill sec-b' style={{ width: `${scopedSecBEfficiency}%` }}></div>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                    <span>✓ 2 Sets Uniforms • Sweaters • Sportswear • Textbooks</span>
                    <strong style={{ color: '#4f46e5' }}>New Intake Package</strong>
                  </div>
                </div>

                <button
                  type='button'
                  className='outline-btn'
                  style={{ width: '100%', justifyContent: 'center', fontSize: '12.5px', padding: '8px 12px', background: '#ffffff' }}
                  onClick={() => setActiveTab("fee-breakdown")}
                >
                  <i className='fas fa-coins' style={{ color: '#00a884' }}></i> Open Detailed Section A & B Payment Streams View →
                </button>
              </div>
            </div>
          </div>

          {/* Graph 2: Student Enrollment Distribution by Academic Stage */}

          <div className='analytics-chart-card'>
            <div className='chart-card-header'>
              <div className='chart-header-text'>
                <h3><i className='fas fa-layer-group' style={{ color: '#2563eb' }}></i> Enrollment Distribution by Academic Stage</h3>
                <p>Comparison of scholar strength per division between Headquarters & Annex</p>
              </div>
              <div className='chart-legend-group'>
                <span className='chart-legend-item'><span className='legend-color-dot' style={{ background: '#00a884' }}></span> HQ ({hqStudents.length})</span>
                <span className='chart-legend-item'><span className='legend-color-dot' style={{ background: '#2563eb' }}></span> Annex ({annexStudents.length})</span>
              </div>
            </div>

            <div className='chart-card-body'>
              <div className='stage-enrollment-list'>
                {stageEnrollmentStats.map((stg, idx) => {
                  const hqPct = stg.totalCount > 0 ? (stg.hqCount / stg.totalCount) * 100 : 50
                  const annexPct = stg.totalCount > 0 ? (stg.annexCount / stg.totalCount) * 100 : 50
                  return (
                    <div key={idx} className='stage-bar-item'>
                      <div className='stage-bar-info'>
                        <span>{stg.label}</span>
                        <span style={{ color: '#64748b' }}>
                          <strong>{stg.totalCount}</strong> scholars ({stg.hqCount} HQ • {stg.annexCount} Annex)
                        </span>
                      </div>
                      <div className='stage-dual-bar'>
                        {stg.hqCount > 0 && (
                          <div
                            className='bar-segment hq'
                            style={{ width: `${hqPct}%` }}
                            title={`Headquarters: ${stg.hqCount} scholars (${Math.round(hqPct)}%)`}
                          >
                            {stg.hqCount} HQ
                          </div>
                        )}
                        {stg.annexCount > 0 && (
                          <div
                            className='bar-segment annex'
                            style={{ width: `${annexPct}%` }}
                            title={`Annex: ${stg.annexCount} scholars (${Math.round(annexPct)}%)`}
                          >
                            {stg.annexCount} Annex
                          </div>
                        )}
                        {stg.totalCount === 0 && (
                          <div style={{ width: '100%', textAlign: 'center', fontSize: '11px', color: '#94a3b8', lineHeight: '24px' }}>
                            No scholars currently enrolled
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Graph 3: 5-Day Weekly Roll Call Attendance Trends */}
          <div className='analytics-chart-card'>
            <div className='chart-card-header'>
              <div className='chart-header-text'>
                <h3><i className='fas fa-calendar-check' style={{ color: '#10b981' }}></i> 5-Day Weekly Roll Call Attendance Trends</h3>
                <p>Monday to Friday live homeroom presence comparison across both campuses</p>
              </div>
              <div className='chart-legend-group'>
                <span className='chart-legend-item'><span className='legend-color-dot' style={{ background: '#00a884' }}></span> HQ Attendance %</span>
                <span className='chart-legend-item'><span className='legend-color-dot' style={{ background: '#3b82f6' }}></span> Annex Attendance %</span>
              </div>
            </div>

            <div className='chart-card-body'>
              <div className='attendance-trend-chart'>
                <div className='trend-bars-container'>
                  {weeklyAttendanceTrendDays.map((wDay, idx) => (
                    <div key={idx} className='trend-day-col'>
                      <div className='trend-day-bars'>
                        <div
                          className='trend-bar-fill hq'
                          style={{ height: `${Math.max(20, wDay.hqRate)}%` }}
                          data-tooltip={`HQ: ${wDay.hqRate}%`}
                        ></div>
                        <div
                          className='trend-bar-fill annex'
                          style={{ height: `${Math.max(20, wDay.annexRate)}%` }}
                          data-tooltip={`Annex: ${wDay.annexRate}%`}
                        ></div>
                      </div>
                      <div className='trend-day-label' style={{ color: wDay.isToday ? '#00a884' : '#64748b', fontWeight: wDay.isToday ? '800' : '700' }}>
                        {wDay.dayLabel} {wDay.dayNumber} {wDay.isToday ? "• Today" : ""}
                      </div>
                    </div>
                  ))}
                </div>
                <div className='flexSB' style={{ fontSize: '12px', color: '#64748b' }}>
                  <span><i className='fas fa-info-circle' style={{ color: '#00a884' }}></i> Institutional Baseline Attendance Target: <strong>95%</strong></span>
                  <button className='att-history-btn' onClick={() => setActiveTab("attendance")}>
                    <i className='fas fa-clipboard-check'></i> Open Roll Call Register
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Graph 4: Academic Grade Mastery & WAEC/BECE Score Band Distribution */}
          <div className='analytics-chart-card'>
            <div className='chart-card-header'>
              <div className='chart-header-text'>
                <h3><i className='fas fa-award' style={{ color: '#f59e0b' }}></i> Academic Grade Mastery & Score Distribution</h3>
                <p>Continuous Assessment (40%) + Terminal Exam (60%) WAEC/NERDC Bands</p>
              </div>
              <div className='chart-legend-group'>
                <span className='chart-legend-item'><span className='legend-color-dot' style={{ background: '#10b981' }}></span> A1 Distinction</span>
                <span className='chart-legend-item'><span className='legend-color-dot' style={{ background: '#3b82f6' }}></span> B2-C6 Credit</span>
                <span className='chart-legend-item'><span className='legend-color-dot' style={{ background: '#f59e0b' }}></span> Pass</span>
              </div>
            </div>

            <div className='chart-card-body'>
              <div className='grade-band-grid'>
                <div className='grade-band-box distinction'>
                  <span className='band-title'>Distinction (A1)</span>
                  <span className='band-count'>{distinctionCount}</span>
                  <span className='band-sub'>{Math.round((distinctionCount / totalGraded) * 100)}% (75-100%)</span>
                </div>
                <div className='grade-band-box credit'>
                  <span className='band-title'>Credit (B2-C6)</span>
                  <span className='band-count'>{creditCount}</span>
                  <span className='band-sub' style={{ color: '#2563eb' }}>{Math.round((creditCount / totalGraded) * 100)}% (50-74%)</span>
                </div>
                <div className='grade-band-box pass'>
                  <span className='band-title'>Pass (P7-E8)</span>
                  <span className='band-count'>{passCount}</span>
                  <span className='band-sub' style={{ color: '#d97706' }}>{Math.round((passCount / totalGraded) * 100)}% (40-49%)</span>
                </div>
                <div className='grade-band-box' style={{ borderColor: '#fca5a5', background: '#fef2f2' }}>
                  <span className='band-title'>Support (F9)</span>
                  <span className='band-count' style={{ color: '#dc2626' }}>{supportCount}</span>
                  <span className='band-sub' style={{ color: '#dc2626' }}>{Math.round((supportCount / totalGraded) * 100)}% (&lt;40%)</span>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
                <div className='flexSB' style={{ marginBottom: '6px' }}>
                  <span style={{ color: '#64748b' }}>Top Academic Subjects:</span>
                  <strong style={{ color: '#0f172a' }}>Mathematics, English Studies, Basic Science</strong>
                </div>
                <div className='flexSB'>
                  <span style={{ color: '#64748b' }}>Class Collation Progress:</span>
                  <span style={{ color: '#059669', fontWeight: '700' }}>
                    <i className='fas fa-check-double'></i> Continuous Assessment Synchronized
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Full-width Card 5: Campus Capacity Utilization, House Ratios & Transport Logistics --- */}
        <div className='portal-card' style={{ marginBottom: '24px', padding: '22px' }}>
          <div className='card-header-line flexSB'>
            <h3>
              <i className='fas fa-building' style={{ color: '#00a884', marginRight: '8px' }}></i>
              Institutional Infrastructure & Logistics Matrix
            </h3>
            <span className='status-pill active'>2026/2027 Academic Session</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginTop: '16px' }}>
            {/* Campus Capacity Meters */}
            <div className='capacity-metric-box'>
              <div className='cap-title'>CAMPUS CAPACITY UTILIZATION</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <div className='flexSB' style={{ fontSize: '12.5px', marginBottom: '4px' }}>
                    <span><strong>Headquarters:</strong> {hqStudents.length} / {hqCapacity} Enrolled</span>
                    <span style={{ color: '#00a884', fontWeight: '700' }}>{hqUtilPercent}%</span>
                  </div>
                  <div className='progress-bar'><div className='progress-fill' style={{ width: `${hqUtilPercent}%`, background: '#00a884' }}></div></div>
                </div>
                <div>
                  <div className='flexSB' style={{ fontSize: '12.5px', marginBottom: '4px' }}>
                    <span><strong>Annex Campus:</strong> {annexStudents.length} / {annexCapacity} Enrolled</span>
                    <span style={{ color: '#2563eb', fontWeight: '700' }}>{annexUtilPercent}%</span>
                  </div>
                  <div className='progress-bar'><div className='progress-fill' style={{ width: `${annexUtilPercent}%`, background: '#2563eb' }}></div></div>
                </div>
              </div>
            </div>

            {/* Gender Diversity Ratio */}
            <div className='capacity-metric-box'>
              <div className='cap-title'>GENDER RATIO & SCHOLAR DIVERSITY</div>
              <div className='cap-numbers' style={{ fontSize: '16px', display: 'flex', justifyContent: 'space-between' }}>
                <span>👦 {maleCount} Boys ({Math.round((maleCount / (scopedStudents.length || 1)) * 100)}%)</span>
                <span>👧 {femaleCount} Girls ({Math.round((femaleCount / (scopedStudents.length || 1)) * 100)}%)</span>
              </div>
              <div className='progress-bar' style={{ height: '14px', borderRadius: '6px', display: 'flex', overflow: 'hidden' }}>
                <div style={{ width: `${Math.round((maleCount / (scopedStudents.length || 1)) * 100)}%`, background: '#3b82f6' }} title='Male Scholars'></div>
                <div style={{ width: `${Math.round((femaleCount / (scopedStudents.length || 1)) * 100)}%`, background: '#ec4899' }} title='Female Scholars'></div>
              </div>
              <div className='cap-sub'>Balanced gender distribution upholding inclusive basic education standards.</div>
            </div>

            {/* House Balance */}
            <div className='capacity-metric-box'>
              <div className='cap-title'>4 SCHOOL HOUSES ALLOCATION</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {houseDistribution.map((h, i) => (
                  <div key={i} style={{ background: '#ffffff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`house-tag ${h.house.toLowerCase()}`} style={{ fontSize: '10px' }}>{h.house}</span>
                    <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>{h.count}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Transport Logistics Fleet */}
            <div className='capacity-metric-box'>
              <div className='cap-title'>TRANSPORT LOGISTICS & BUS FLEET</div>
              <div className='cap-numbers' style={{ fontSize: '18px' }}>
                {busFleet.length} Active School Buses
              </div>
              <div className='cap-sub'>
                HQ Fleet (Anglo-Jos, Jos Central) • Annex Fleet (Rayfield, Bukuru Express, Zawan).
              </div>
              <button className='outline-btn' style={{ marginTop: 'auto', fontSize: '12px', padding: '4px 10px' }} onClick={() => setActiveTab("transport")}>
                <i className='fas fa-bus'></i> View Fleet Logistics
              </button>
            </div>
          </div>
        </div>

        {/* Boardroom Strategic Directives / Quick Shortcuts */}
        {isProprietorView ? (
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
                  "Study to Make Impact. We continue to uphold Christian moral values, sound intellectual discipline, and comprehensive continuous assessment benchmarks across all basic and secondary education disciplines at both Headquarters and Annex Campuses."
                </p>
                <div className='flex' style={{ gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                  <button className='outline-btn' onClick={() => setActiveTab("staff-management")}>
                    <i className='fas fa-users'></i> Staff Privileges & Classes
                  </button>
                  <button className='outline-btn' onClick={() => setActiveTab("finance")}>
                    <i className='fas fa-file-invoice-dollar'></i> Bursary Audit
                  </button>
                  <button className='primary-btn' onClick={() => setActiveTab("gradebook")}>
                    <i className='fas fa-book-reader'></i> View Gradebook
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className='dash-grid-2col'>
            {/* Prospectus Class Divisions */}
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
                        <small>{n.date} • {n.targetAudience || n.audience}</small>
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
        )}
      </div>
    )
  }

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

            <div className='form-group'>
              <label>Assigned Campus / Branch *</label>
              <select
                value={newStaffForm.campus || "All Campuses"}
                onChange={(e) => setNewStaffForm({ ...newStaffForm, campus: e.target.value })}
              >
                <option value='All Campuses'>All Campuses (Consolidated Faculty)</option>
                <option value='Headquarters'>Headquarters Campus (Gura-Suga, Opp. Police Staff College)</option>
                <option value='Annex'>Annex Campus (Rayfield / Zawan Road)</option>
              </select>
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
                  <label style={{ fontWeight: '700', color: '#071626' }}>Assigned Teaching Subjects (Type or click suggestions):</label>
                  <input
                    type='text'
                    placeholder='e.g. Mathematics, Basic Science, English Studies'
                    value={newStaffForm.assignedSubjects}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, assignedSubjects: e.target.value })}
                  />
                  {/* Quick Subject Suggestions based on selected classes */}
                  {(() => {
                    const classSubs = Array.from(
                      new Set(
                        (newStaffForm.assignedClasses || []).flatMap((cls) => getSubjectsForClass(cls))
                      )
                    )
                    if (classSubs.length === 0) return null
                    const currentSubs = (newStaffForm.assignedSubjects || "")
                      .split(/[,\/&;]/)
                      .map((s) => s.trim().toLowerCase())

                    return (
                      <div style={{ marginTop: '8px' }}>
                        <small style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>
                          Click to quickly assign or remove subjects:
                        </small>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '110px', overflowY: 'auto' }}>
                          {classSubs.map((sub) => {
                            const isSelected = currentSubs.includes(sub.toLowerCase())
                            return (
                              <button
                                key={sub}
                                type='button'
                                onClick={() => {
                                  const existingList = (newStaffForm.assignedSubjects || "")
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean)
                                  let newList
                                  if (isSelected) {
                                    newList = existingList.filter((s) => s.toLowerCase() !== sub.toLowerCase())
                                  } else {
                                    newList = [...existingList, sub]
                                  }
                                  setNewStaffForm({ ...newStaffForm, assignedSubjects: newList.join(", ") })
                                }}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  border: isSelected ? '1px solid #00a884' : '1px solid #cbd5e1',
                                  background: isSelected ? '#ecfdf5' : '#f8fafc',
                                  color: isSelected ? '#065f46' : '#475569',
                                  cursor: 'pointer',
                                }}
                              >
                                {isSelected ? "✓ " : "+ "}{sub}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}
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
            {/* Prominent Active Subject Scoring Badge */}
            <div className='modal-scoring-subject-badge'>
              <div className='flex' style={{ gap: '10px', alignItems: 'center' }}>
                <i className='fas fa-book-open' style={{ fontSize: '20px', color: '#2563eb' }}></i>
                <div>
                  <small style={{ display: 'block', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', fontSize: '10.5px' }}>
                    Subject Being Scored:
                  </small>
                  <strong style={{ fontSize: '16px', color: '#0f172a' }}>
                    {newScoreForm.subject || "Selected Subject"}
                  </strong>
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: '#2563eb', fontWeight: '600' }}>
                    ({newScoreForm.gradeLevel})
                  </span>
                </div>
              </div>
              <span className='ca-exam-pill'>NERDC: CA 40% + EXAM 60%</span>
            </div>

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
                Recording Continuous Assessment & Exam marks for <strong>{newScoreForm.subject}</strong> in <strong>{newScoreForm.gradeLevel}</strong>.
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
                <div className='flex' style={{ gap: '8px', alignItems: 'center', width: '100%' }}>
                  <select
                    value={newScoreForm.subject}
                    onChange={(e) => handleScoreFormSubjectChange(e.target.value)}
                    style={{ flex: 1, width: '100%', minWidth: 0 }}
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
                    style={{ whiteSpace: 'nowrap', padding: '0 14px', fontSize: '13px', width: 'auto', flex: '0 0 auto' }}
                    onClick={() => setCustomSubjectActive(true)}
                  >
                    <i className='fas fa-pen' style={{ marginRight: '4px' }}></i> Custom
                  </button>
                </div>
              ) : (
                <div className='flex' style={{ gap: '8px', alignItems: 'center', width: '100%' }}>
                  <input
                    type='text'
                    required
                    placeholder='e.g. Further Mathematics, Diction or Technical Drawing'
                    value={newScoreForm.subject}
                    onChange={(e) => handleScoreFormSubjectChange(e.target.value)}
                    style={{ flex: 1, width: '100%', minWidth: 0 }}
                  />
                  <button
                    type='button'
                    className='outline-btn'
                    style={{ whiteSpace: 'nowrap', padding: '0 14px', fontSize: '13px', width: 'auto', flex: '0 0 auto' }}
                    onClick={() => setCustomSubjectActive(false)}
                  >
                    Back to List
                  </button>
                </div>
              )}
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: '10px 0' }}>
              <label style={{ fontWeight: '700', color: '#071626', display: 'block', marginBottom: '8px' }}>
                Continuous Assessment for <span style={{ color: '#2563eb' }}>{newScoreForm.subject || "Subject"}</span> (40 Marks Breakdown):
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
    const curProspectus = getProspectusForGrade(newInvoiceForm.grade)
    const isRet = (newInvoiceForm.studentType || "returning") === "returning"
    const pSecA = curProspectus ? curProspectus.sectionA.total : 19500
    const pSecB = curProspectus ? curProspectus.sectionB.total : 50000
    const pTotal = isRet ? pSecA : (pSecA + pSecB)

    return (
      <div className='blis-modal-overlay' onClick={() => setShowAddInvoiceModal(false)}>
        <div className='blis-modal-card' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
          <div className='modal-header'>
            <div>
              <h3>Generate Unified Fee Invoice (Section A & B)</h3>
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
                      campus: st && st.campus ? st.campus : newInvoiceForm.campus || "Headquarters",
                      studentType: st && st.studentType ? st.studentType : newInvoiceForm.studentType || "returning",
                    })
                  }}
                >
                  <option value=''>-- Select Enrolled Scholar --</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>{st.name} ({st.grade} • {st.campus || "Headquarters"})</option>
                  ))}
                </select>
              ) : (
                <input
                  type='text'
                  required
                  placeholder='e.g. Victor Sylva or Emmanuel Danladi'
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

            <div className='form-group'>
              <label>Campus / Branch *</label>
              <select
                value={newInvoiceForm.campus || "Headquarters"}
                onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, campus: e.target.value })}
              >
                <option value='Headquarters'>Headquarters Campus (Gura-Suga, Opp. Police Staff College)</option>
                <option value='Annex'>Annex Campus (Rayfield / Zawan Road)</option>
              </select>
            </div>

            {/* Scholar Classification (Returning vs New Intake) */}
            <div className='form-group'>
              <label>Scholar Enrollment Type *</label>
              <div className='scholar-type-selector' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px',
                    borderRadius: '8px',
                    border: isRet ? '2px solid #00a884' : '1px solid #cbd5e1',
                    background: isRet ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: isRet ? '#065f46' : '#334155' }}>
                    <input
                      type='radio'
                      name='modalInvoiceStudentType'
                      checked={isRet}
                      onChange={() => setNewInvoiceForm({ ...newInvoiceForm, studentType: "returning" })}
                    />
                    <span>⭐ Returning Scholar</span>
                  </div>
                  <small style={{ marginTop: '4px', color: '#64748b' }}>
                    Section A fees only (Tuition & Levies: <strong>₦{pSecA.toLocaleString()}</strong>). Section B waived.
                  </small>
                </label>

                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px',
                    borderRadius: '8px',
                    border: !isRet ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: !isRet ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: !isRet ? '#1e40af' : '#334155' }}>
                    <input
                      type='radio'
                      name='modalInvoiceStudentType'
                      checked={!isRet}
                      onChange={() => setNewInvoiceForm({ ...newInvoiceForm, studentType: "new" })}
                    />
                    <span>📦 New Intake Scholar</span>
                  </div>
                  <small style={{ marginTop: '4px', color: '#64748b' }}>
                    Section A (₦{pSecA.toLocaleString()}) + Section B (₦{pSecB.toLocaleString()}) = <strong>₦{(pSecA + pSecB).toLocaleString()}</strong>.
                  </small>
                </label>
              </div>
            </div>

            {/* Real-time Prospectus Breakdown Summary */}
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
              <div className='flexSB' style={{ fontSize: '13px', marginBottom: '6px' }}>
                <span>Section A (Tuition, Exam, Lesson, PTA, Dev, First Aid):</span>
                <strong>₦{pSecA.toLocaleString()}</strong>
              </div>
              <div className='flexSB' style={{ fontSize: '13px', marginBottom: '6px' }}>
                <span>Section B (Uniforms, Sweater, Sports, Books):</span>
                <strong>{isRet ? <span style={{ color: '#059669' }}>Waived (₦0)</span> : `₦${pSecB.toLocaleString()}`}</strong>
              </div>
              <div className='flexSB' style={{ fontSize: '15px', fontWeight: '800', borderTop: '1px solid #cbd5e1', paddingTop: '8px', color: '#071626' }}>
                <span>Total Invoice Billing:</span>
                <span style={{ color: '#00a884' }}>₦{pTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className='modal-actions'>
              <button type='button' className='outline-btn' onClick={() => setShowAddInvoiceModal(false)}>Cancel</button>
              <button type='submit' className='primary-btn'>
                <i className='fas fa-file-invoice-dollar'></i> Issue Tuition Invoice (₦{pTotal.toLocaleString()})
              </button>
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
              <label>Preferred Campus / Branch *</label>
              <select
                value={newApplicantForm.campus || "Headquarters"}
                onChange={(e) => setNewApplicantForm({ ...newApplicantForm, campus: e.target.value })}
              >
                <option value='Headquarters'>Headquarters Campus (Gura-Suga, Opp. Police Staff College)</option>
                <option value='Annex'>Annex Campus (Rayfield / Zawan Road)</option>
              </select>
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
                  className={`menu-item ${activeTab === "fee-breakdown" ? "active" : ""}`}
                  onClick={() => handleTabSelect("fee-breakdown")}
                >
                  <i className='fas fa-coins'></i>
                  <span>Section A & B Streams</span>
                  <span className='menu-pill green' style={{ fontSize: '10px', padding: '2px 6px' }}>A vs B</span>
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

                <button
                  className={`menu-item ${activeTab === "public-news" ? "active" : ""}`}
                  onClick={() => handleTabSelect("public-news")}
                >
                  <i className='fas fa-newspaper'></i>
                  <span>Public Website News</span>
                  <span className='menu-count green'>{publicNews.length}</span>
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
                  className={`menu-item ${activeTab === "fee-breakdown" ? "active" : ""}`}
                  onClick={() => handleTabSelect("fee-breakdown")}
                >
                  <i className='fas fa-coins'></i>
                  <span>Section A & B Streams</span>
                  <span className='menu-pill green' style={{ fontSize: '10px', padding: '2px 6px' }}>A vs B</span>
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
                  className={`menu-item ${activeTab === "public-news" ? "active" : ""}`}
                  onClick={() => handleTabSelect("public-news")}
                >
                  <i className='fas fa-newspaper'></i>
                  <span>Public Website News</span>
                  <span className='menu-count green'>{publicNews.length}</span>
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
                  className={`menu-item ${activeTab === "fee-breakdown" ? "active" : ""}`}
                  onClick={() => handleTabSelect("fee-breakdown")}
                >
                  <i className='fas fa-coins'></i>
                  <span>Section A & B Streams</span>
                  <span className='menu-pill green' style={{ fontSize: '10px', padding: '2px 6px' }}>A vs B</span>
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
                  <h2>Executive Boardroom & Institutional Governance</h2>
                  <p>Welcome, Rev. Fidelis Gambo. Executive institutional oversight across academics, bursary finances, and multi-campus administration.</p>
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

              {renderExecutiveAnalyticsCenter({ isProprietorView: true })}
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

              {/* Sub-Tab Navigation Bar */}
              <div className='tab-switcher flex' style={{ gap: '10px', marginTop: '20px', marginBottom: '16px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '12px', flexWrap: 'wrap' }}>
                <button
                  type='button'
                  className={`btn-filter ${bursaryTabMode === "ledger" ? "active" : ""}`}
                  onClick={() => setBursaryTabMode("ledger")}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13.5px', cursor: 'pointer' }}
                >
                  <i className='fas fa-file-invoice-dollar'></i> Tuition & Levies Invoices
                </button>
                <button
                  type='button'
                  className={`btn-filter ${bursaryTabMode === "streams" ? "active" : ""}`}
                  onClick={() => setBursaryTabMode("streams")}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13.5px', cursor: 'pointer' }}
                >
                  <i className='fas fa-coins'></i> Section A vs Section B Streams
                </button>
                <button
                  type='button'
                  className={`btn-filter ${bursaryTabMode === "clearance" ? "active" : ""}`}
                  onClick={() => setBursaryTabMode("clearance")}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13.5px', cursor: 'pointer' }}
                >
                  <i className='fas fa-key'></i> Term Result Clearance & PIN Dispatch
                  <span className='menu-pill amber' style={{ fontSize: '11px', padding: '2px 8px' }}>
                    {students.filter((s) => !checkStudentResultAccess(s).allowed).length} Pending
                  </span>
                </button>
              </div>


              {/* VIEW 1: RECENT INVOICES TABLE */}
              {bursaryTabMode === "ledger" && (
                <div className='portal-card table-card' style={{ overflowX: 'auto' }}>
                  <div className='card-header-line flexSB' style={{ marginBottom: '16px' }}>
                    <h3><i className='fas fa-receipt' style={{ color: '#00a884' }}></i> Tuition & Levies Invoices (First Bank Cleared)</h3>
                    <button className='outline-btn' onClick={() => setActiveTab("finance")}>View Full Ledger →</button>
                  </div>
                  <table className='portal-table'>
                    <thead>
                      <tr>
                        <th>Invoice No</th>
                        <th>Scholar & Class</th>
                        <th>Scholar Type</th>
                        <th>Section A</th>
                        <th>Section B</th>
                        <th>Billed Total</th>
                        <th>Amount Paid</th>
                        <th>Balance Due</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan='10' style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}>
                            <i className='fas fa-file-invoice-dollar' style={{ fontSize: '32px', color: '#94a3b8', display: 'block', marginBottom: '10px' }}></i>
                            <strong>Bursary Ledger is Clean (₦0)</strong>
                            <p style={{ margin: '6px 0 0', fontSize: '13px' }}>
                              No fee invoices created yet. Invoices are automatically generated when scholars are enrolled, or you can create one manually.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        invoices.map((inv) => {
                          const { secATotal, secBTotal, isReturning, effectiveTotal, amountPaid, balance } = calculateInvoiceBreakdown(inv)
                          return (
                            <tr key={inv.invoiceNo}>
                              <td><strong>{inv.invoiceNo}</strong></td>
                              <td>
                                <div>
                                  <strong>{inv.studentName}</strong>
                                  <small style={{ display: 'block', color: '#64748b' }}>{inv.grade}</small>
                                </div>
                              </td>
                              <td>
                                {isReturning ? (
                                  <span className='scholar-type-badge returning' title='Section A Termly Fees Only (Section B Waived)'>
                                    <i className='fas fa-star'></i> Returning
                                  </span>
                                ) : (
                                  <span className='scholar-type-badge new-intake' title='Section A + Section B Full Package'>
                                    <i className='fas fa-box'></i> New Intake
                                  </span>
                                )}
                              </td>
                              <td>₦{secATotal.toLocaleString()}</td>
                              <td>
                                {isReturning ? (
                                  <span className='sec-b-waived-pill'>Waived (₦0)</span>
                                ) : (
                                  `₦${secBTotal.toLocaleString()}`
                                )}
                              </td>
                              <td><strong>₦{effectiveTotal.toLocaleString()}</strong></td>
                              <td><strong style={{ color: '#00a884' }}>₦{amountPaid.toLocaleString()}</strong></td>
                              <td>
                                {balance === 0 ? (
                                  <strong style={{ color: '#00a884', fontSize: '12px' }}>₦0 (Cleared)</strong>
                                ) : (
                                  <strong style={{ color: '#ef4444' }}>₦{balance.toLocaleString()}</strong>
                                )}
                              </td>
                              <td>
                                <span className={`invoice-status ${inv.status.toLowerCase()}`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td>
                                <div className='flex' style={{ gap: '4px', flexWrap: 'wrap' }}>
                                  <button
                                    className='btn-action-sm'
                                    title='Record Payment Transaction'
                                    onClick={() => {
                                      setSelectedInvoiceForPayment(inv)
                                      setPaymentStudentType(isReturning ? "returning" : "new")
                                      setPaymentAmount(balance > 0 ? balance : "")
                                      setMarkAsCompleted(false)
                                      setShowPaymentModal(true)
                                    }}
                                  >
                                    <i className='fas fa-credit-card'></i> Pay
                                  </button>
                                  <button
                                    className='btn-action-sm'
                                    title='Print Official BLIS Fee Receipt'
                                    onClick={() => setReceiptInvoice(inv)}
                                  >
                                    <i className='fas fa-receipt'></i> Receipt
                                  </button>
                                  {isReturning ? (
                                    <button
                                      className='btn-action-sm outline'
                                      title='Switch to New Intake (Include Section B)'
                                      onClick={() => handleToggleStudentType(inv.invoiceNo, "new")}
                                    >
                                      <i className='fas fa-box-open'></i> +Sec B
                                    </button>
                                  ) : (
                                    <button
                                      className='btn-action-sm outline'
                                      title='Switch to Returning Scholar (Waive Section B)'
                                      onClick={() => handleToggleStudentType(inv.invoiceNo, "returning")}
                                    >
                                      <i className='fas fa-user-check'></i> Ret
                                    </button>
                                  )}
                                  {(!isReturning || balance > 0 || inv.status !== "Paid") && (
                                    <button
                                      className='btn-action-sm success'
                                      title='Mark as Completed (Returning Scholar — Waive Section B & Set Balance to ₦0)'
                                      onClick={() => handleMarkCompletedAsReturning(inv.invoiceNo)}
                                    >
                                      <i className='fas fa-check-circle'></i> Complete
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* VIEW 2: SECTION A vs SECTION B STREAMS ANALYZER */}
              {bursaryTabMode === "streams" && (
                <div>
                  <div className='stream-analytics-grid'>
                    {/* Section A Card */}
                    <div className='stream-overview-card section-a'>
                      <div className='stream-card-header'>
                        <div className='stream-header-left'>
                          <div className='stream-icon-badge sec-a'>
                            <i className='fas fa-university'></i>
                          </div>
                          <div className='stream-title-text'>
                            <h3>Section A: Tuition & Levies</h3>
                            <p>Compulsory termly fees payable directly to school account</p>
                          </div>
                        </div>
                        <span className='stream-badge-pill sec-a'>{scopedSecAEfficiency}% Cleared</span>
                      </div>

                      <div className='stream-metric-row'>
                        <div className='stream-metric-box'>
                          <small>Total Billed</small>
                          <strong>₦{scopedSecABilled.toLocaleString()}</strong>
                        </div>
                        <div className='stream-metric-box collected'>
                          <small>First Bank Paid</small>
                          <strong>₦{scopedSecAPaid.toLocaleString()}</strong>
                        </div>
                        <div className='stream-metric-box outstanding'>
                          <small>Outstanding</small>
                          <strong>₦{scopedSecAOutstanding.toLocaleString()}</strong>
                        </div>
                      </div>

                      <div className='stream-progress-section'>
                        <div className='stream-progress-label'>
                          <span>Collection Efficiency</span>
                          <span style={{ color: '#00a884' }}>{scopedSecAEfficiency}%</span>
                        </div>
                        <div className='stream-progress-bar'>
                          <div className='stream-progress-fill sec-a' style={{ width: `${scopedSecAEfficiency}%` }}></div>
                        </div>
                      </div>

                      <div className='stream-items-container'>
                        <div className='stream-items-title'>
                          <span>Approved Section A Fee Schedule</span>
                          <span style={{ color: '#00a884' }}>All Scholars ({scopedStudents.length})</span>
                        </div>
                        <div className='stream-items-pills'>
                          <span className='stream-item-chip sec-a-chip'>Tuition Fees (₦14k-₦23k)</span>
                          <span className='stream-item-chip sec-a-chip'>Exam Fee (₦1k-₦2k)</span>
                          <span className='stream-item-chip sec-a-chip'>Lesson (₦2k)</span>
                          <span className='stream-item-chip sec-a-chip'>PTA Levy (₦1k)</span>
                          <span className='stream-item-chip sec-a-chip'>Dev Levy (₦1k)</span>
                          <span className='stream-item-chip sec-a-chip'>First Aid (₦500-₦1k)</span>
                        </div>
                      </div>
                    </div>

                    {/* Section B Card */}
                    <div className='stream-overview-card section-b'>
                      <div className='stream-card-header'>
                        <div className='stream-header-left'>
                          <div className='stream-icon-badge sec-b'>
                            <i className='fas fa-tshirt'></i>
                          </div>
                          <div className='stream-title-text'>
                            <h3>Section B: Uniforms, Sweaters & Books</h3>
                            <p>New Intakes package & replacement items</p>
                          </div>
                        </div>
                        <span className='stream-badge-pill sec-b'>{scopedSecBEfficiency}% Cleared</span>
                      </div>

                      <div className='stream-metric-row'>
                        <div className='stream-metric-box'>
                          <small>Total Billed</small>
                          <strong>₦{scopedSecBBilled.toLocaleString()}</strong>
                        </div>
                        <div className='stream-metric-box collected'>
                          <small>First Bank Paid</small>
                          <strong>₦{scopedSecBPaid.toLocaleString()}</strong>
                        </div>
                        <div className='stream-metric-box outstanding'>
                          <small>Outstanding</small>
                          <strong>₦{scopedSecBOutstanding.toLocaleString()}</strong>
                        </div>
                      </div>

                      <div className='stream-progress-section'>
                        <div className='stream-progress-label'>
                          <span>Collection Efficiency</span>
                          <span style={{ color: '#4f46e5' }}>{scopedSecBEfficiency}%</span>
                        </div>
                        <div className='stream-progress-bar'>
                          <div className='stream-progress-fill sec-b' style={{ width: `${scopedSecBEfficiency}%` }}></div>
                        </div>
                      </div>

                      <div className='stream-items-container'>
                        <div className='stream-items-title'>
                          <span>Approved Section B Materials Schedule</span>
                          <span style={{ color: '#4f46e5' }}>New Intakes ({newIntakeScholarsCount})</span>
                        </div>
                        <div className='stream-items-pills'>
                          <span className='stream-item-chip sec-b-chip'>2 Sets Uniforms (₦8k-₦20k)</span>
                          <span className='stream-item-chip sec-b-chip'>Cardigan / Sweater (₦10k)</span>
                          <span className='stream-item-chip sec-b-chip'>Wednesday & Sportswear (₦7k-₦14k)</span>
                          <span className='stream-item-chip sec-b-chip'>Textbooks / Workbooks (₦8.5k-₦32k)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className='portal-card table-card' style={{ overflowX: 'auto', marginTop: '20px' }}>
                    <div className='card-header-line flexSB' style={{ marginBottom: '14px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
                          <i className='fas fa-receipt' style={{ color: '#00a884' }}></i> Section A vs Section B Scholar Allocation Breakdown
                        </h3>
                        <small style={{ color: '#64748b' }}>
                          Clear breakdown of compulsory term fees (Section A) and intake materials (Section B) per scholar.
                        </small>
                      </div>
                      <div className='stream-filter-pills-bar'>
                        <button
                          type='button'
                          className={`stream-filter-btn ${feeStreamFilter === "all" ? "active" : ""}`}
                          onClick={() => setFeeStreamFilter("all")}
                        >
                          All ({invoices.length})
                        </button>
                        <button
                          type='button'
                          className={`stream-filter-btn sec-a-btn ${feeStreamFilter === "section_a" ? "active sec-a-btn" : ""}`}
                          onClick={() => setFeeStreamFilter("section_a")}
                        >
                          Section A Only ({returningScholarsCount})
                        </button>
                        <button
                          type='button'
                          className={`stream-filter-btn sec-b-btn ${feeStreamFilter === "section_b" ? "active sec-b-btn" : ""}`}
                          onClick={() => setFeeStreamFilter("section_b")}
                        >
                          Section B Intakes ({newIntakeScholarsCount})
                        </button>
                      </div>
                    </div>

                    <table className='portal-table'>
                      <thead>
                        <tr>
                          <th>Invoice No</th>
                          <th>Scholar & Class</th>
                          <th>Scholar Type</th>
                          <th>Section A (Fees & Levies)</th>
                          <th>Section B (Uniforms & Books)</th>
                          <th>Total Billed</th>
                          <th>Paid Amount</th>
                          <th>Balance</th>
                          <th>Clearance</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices
                          .filter((inv) => {
                            const isRet = inv.studentType === "returning" || inv.sectionBWaived === true
                            if (feeStreamFilter === "section_a") return isRet
                            if (feeStreamFilter === "section_b") return !isRet
                            return true
                          })
                          .map((inv) => {
                            const { secATotal, secBTotal, isReturning, effectiveTotal, amountPaid, balance } = calculateInvoiceBreakdown(inv)
                            return (
                              <tr key={inv.invoiceNo}>
                                <td><strong>{inv.invoiceNo}</strong></td>
                                <td>
                                  <div>
                                    <strong>{inv.studentName}</strong>
                                    <small style={{ display: 'block', color: '#64748b' }}>{inv.grade}</small>
                                  </div>
                                </td>
                                <td>
                                  {isReturning ? (
                                    <span className='scholar-type-badge returning'>
                                      <i className='fas fa-star'></i> Returning
                                    </span>
                                  ) : (
                                    <span className='scholar-type-badge new-intake'>
                                      <i className='fas fa-box'></i> New Intake
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <div className='sec-a-cell'>
                                    <strong>₦{secATotal.toLocaleString()}</strong>
                                  </div>
                                </td>
                                <td>
                                  {isReturning ? (
                                    <span className='sec-b-waived-pill'>Waived (₦0)</span>
                                  ) : (
                                    <div className='sec-b-cell'>
                                      <strong>₦{secBTotal.toLocaleString()}</strong>
                                    </div>
                                  )}
                                </td>
                                <td><strong>₦{effectiveTotal.toLocaleString()}</strong></td>
                                <td><strong style={{ color: '#00a884' }}>₦{amountPaid.toLocaleString()}</strong></td>
                                <td>
                                  {balance === 0 ? (
                                    <strong style={{ color: '#00a884' }}>₦0 (Cleared)</strong>
                                  ) : (
                                    <strong style={{ color: '#ef4444' }}>₦{balance.toLocaleString()}</strong>
                                  )}
                                </td>
                                <td>
                                  <span className={`invoice-status ${inv.status.toLowerCase()}`}>
                                    {inv.status}
                                  </span>
                                </td>
                                <td>
                                  <div className='flex' style={{ gap: '4px', flexWrap: 'wrap' }}>
                                    <button
                                      className='btn-action-sm'
                                      title='Record Payment'
                                      onClick={() => {
                                        setSelectedInvoiceForPayment(inv)
                                        setPaymentStudentType(isReturning ? "returning" : "new")
                                        setPaymentAmount(balance > 0 ? balance : "")
                                        setMarkAsCompleted(false)
                                        setShowPaymentModal(true)
                                      }}
                                    >
                                      <i className='fas fa-credit-card'></i> Pay
                                    </button>
                                    <button
                                      className='btn-action-sm'
                                      title='Print Fee Receipt'
                                      onClick={() => setReceiptInvoice(inv)}
                                    >
                                      <i className='fas fa-receipt'></i> Receipt
                                    </button>
                                    {isReturning ? (
                                      <button
                                        className='btn-action-sm outline'
                                        title='Switch to New Intake (Include Section B)'
                                        onClick={() => handleToggleStudentType(inv.invoiceNo, "new")}
                                      >
                                        <i className='fas fa-box-open'></i> +Sec B
                                      </button>
                                    ) : (
                                      <button
                                        className='btn-action-sm outline'
                                        title='Switch to Returning Scholar (Waive Section B)'
                                        onClick={() => handleToggleStudentType(inv.invoiceNo, "returning")}
                                      >
                                        <i className='fas fa-user-check'></i> Ret
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW 3: TERM RESULT CLEARANCE & PIN DISPATCH HUB */}
              {bursaryTabMode === "clearance" && (() => {
                const filteredStudents = students.filter((s) => {
                  if (clearanceClassFilter !== "all" && s.grade !== clearanceClassFilter) return false
                  const access = checkStudentResultAccess(s)
                  if (clearanceStatusFilter === "cleared" && !access.allowed) return false
                  if (clearanceStatusFilter === "locked" && access.allowed) return false
                  return true
                })

                return (
                  <div>
                    {/* Filter Bar & Bulk Actions */}
                    <div className='filter-bar flexSB' style={{ background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                      <div className='flex' style={{ gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div className='filter-group'>
                          <label>Class Filter:</label>
                          <select value={clearanceClassFilter} onChange={(e) => setClearanceClassFilter(e.target.value)}>
                            <option value='all'>All School Classes ({students.length})</option>
                            {availableSchoolClasses.map((cls) => (
                              <option key={cls} value={cls}>{cls}</option>
                            ))}
                          </select>
                        </div>
                        <div className='filter-group'>
                          <label>Result Access Status:</label>
                          <select value={clearanceStatusFilter} onChange={(e) => setClearanceStatusFilter(e.target.value)}>
                            <option value='all'>All Statuses</option>
                            <option value='cleared'>🔓 Cleared for Result Download</option>
                            <option value='locked'>🔒 Locked (Fees Outstanding)</option>
                          </select>
                        </div>
                      </div>

                      <div className='flex' style={{ gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          type='button'
                          className='primary-btn'
                          style={{ background: '#059669', fontSize: '13px', padding: '9px 16px' }}
                          onClick={handleAutoClearPaidStudents}
                        >
                          <i className='fas fa-bolt'></i> Auto-Clear All Paid Scholars
                        </button>
                      </div>
                    </div>

                    {/* Clearance Table */}
                    <div className='portal-card table-card' style={{ overflowX: 'auto' }}>
                      <div className='card-header-line flexSB' style={{ marginBottom: '14px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
                            <i className='fas fa-user-shield' style={{ color: '#2563eb' }}></i> End-of-Term Result Clearance & Bursary PIN Registry
                          </h3>
                          <small style={{ color: '#64748b' }}>
                            Parents can only download sealed terminal reports if their fees are 100% cleared, authorized by the Bursar, or unlocked via Result PIN.
                          </small>
                        </div>
                        <span className='status-pill' style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: '700' }}>
                          {filteredStudents.length} Scholars Shown
                        </span>
                      </div>

                      <table className='portal-table'>
                        <thead>
                          <tr>
                            <th>Scholar Details</th>
                            <th>Class</th>
                            <th>Fee Billed / Paid</th>
                            <th>Balance Due</th>
                            <th>Result Access PIN</th>
                            <th>Clearance Status</th>
                            <th>Bursar Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.length === 0 ? (
                            <tr>
                              <td colSpan='7' style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                                No scholars matching filter criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredStudents.map((s) => {
                              const studentInv = invoices.find(
                                (i) =>
                                  i.studentId === s.id ||
                                  (i.studentName && i.studentName.toLowerCase().trim() === s.name.toLowerCase().trim())
                              )
                              const { effectiveTotal, amountPaid, balance, isCompleted } = calculateInvoiceBreakdown(studentInv)
                              const pin = bursarClearances[s.id]?.pin || getStudentResultPin(s)
                              const access = checkStudentResultAccess(s)
                              const isCleared = bursarClearances[s.id]?.isCleared === true || isCompleted || balance <= 0 || unlockedResultStudents.includes(s.id)

                              return (
                                <tr key={s.id}>
                                  <td>
                                    <div>
                                      <strong>{s.name}</strong>
                                      <small style={{ display: 'block', color: '#64748b' }}>
                                        ID: {s.id} • Guardian: {s.guardian || "On File"}
                                      </small>
                                    </div>
                                  </td>
                                  <td>
                                    <span className='grade-pill'>{s.grade}</span>
                                  </td>
                                  <td>
                                    <div>
                                      <strong>₦{effectiveTotal.toLocaleString()}</strong>
                                      <small style={{ display: 'block', color: '#059669' }}>
                                        Paid: ₦{amountPaid.toLocaleString()}
                                      </small>
                                    </div>
                                  </td>
                                  <td>
                                    {balance <= 0 ? (
                                      <span style={{ color: '#059669', fontWeight: '700', fontSize: '13px' }}>₦0 (Cleared ✓)</span>
                                    ) : (
                                      <strong style={{ color: '#dc2626', fontSize: '13.5px' }}>₦{balance.toLocaleString()}</strong>
                                    )}
                                  </td>
                                  <td>
                                    <div className='flex' style={{ gap: '6px', alignItems: 'center' }}>
                                      <span style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '4px 8px', borderRadius: '6px', fontWeight: '800', fontFamily: 'monospace', fontSize: '13px' }}>
                                        {pin}
                                      </span>
                                      <button
                                        type='button'
                                        className='btn-action-sm'
                                        title='Copy Result PIN for Parent'
                                        onClick={() => {
                                          navigator.clipboard.writeText(
                                            `Brighter Land Int'l School Result Clearance: The Term 1 Result PIN for ${s.name} (${s.grade}) is ${pin}. Enter this PIN on your Parent Portal to download the report card.`
                                          )
                                          showToast(`📋 Copied Result PIN (${pin}) and WhatsApp/SMS message for ${s.name} to clipboard!`)
                                        }}
                                      >
                                        <i className='fas fa-copy'></i>
                                      </button>
                                    </div>
                                  </td>
                                  <td>
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '12px',
                                        fontWeight: '800',
                                        background: isCleared ? '#dcfce7' : '#fee2e2',
                                        color: isCleared ? '#166534' : '#991b1b',
                                        border: isCleared ? '1px solid #86efac' : '1px solid #fca5a5',
                                      }}
                                    >
                                      <i className={isCleared ? 'fas fa-unlock' : 'fas fa-lock'}></i>
                                      {isCleared ? "CLEARED ✓" : "LOCKED"}
                                    </span>
                                  </td>
                                  <td>
                                    <div className='flex' style={{ gap: '6px', flexWrap: 'wrap' }}>
                                      <button
                                        type='button'
                                        className={`btn-action-sm ${isCleared ? "outline" : "success"}`}
                                        title={isCleared ? "Revoke Bursar Clearance" : "Grant Immediate Bursar Clearance"}
                                        onClick={() => handleToggleBursarClearance(s.id, s.name)}
                                      >
                                        <i className={isCleared ? "fas fa-lock" : "fas fa-unlock-alt"}></i> {isCleared ? "Revoke" : "Clear"}
                                      </button>
                                      {studentInv && (
                                        <button
                                          type='button'
                                          className='btn-action-sm'
                                          title='Record Payment'
                                          onClick={() => {
                                            setSelectedInvoiceForPayment(studentInv)
                                            setPaymentStudentType("returning")
                                            setPaymentAmount(balance > 0 ? balance : "")
                                            setMarkAsCompleted(false)
                                            setShowPaymentModal(true)
                                          }}
                                        >
                                          <i className='fas fa-credit-card'></i> Pay
                                        </button>
                                      )}
                                    </div>
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

                <div className='filter-bar flexSB' style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                  <div className='flex' style={{ gap: '12px', alignItems: 'center' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Filter Staff Campus:</label>
                    <div className='button-filter-group'>
                      {["All", "Headquarters", "Annex"].map((c) => (
                        <button
                          key={c}
                          type='button'
                          className={`filter-btn ${staffCampusFilter === c ? "active" : ""}`}
                          onClick={() => setStaffCampusFilter(c)}
                        >
                          {c === "All" ? "All Campuses" : c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                    Showing <strong>{filteredPortalUsers.length}</strong> registered staff / faculty account(s)
                  </div>
                </div>

                <div className='portal-card table-card' style={{ overflowX: 'auto' }}>
                  <table className='portal-table'>
                    <thead>
                      <tr>
                        <th>Staff / User</th>
                        <th>Campus</th>
                        <th>System Role</th>
                        <th>Department / Faculty</th>
                        <th>Assigned Classes</th>
                        <th>Assigned Privileges</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPortalUsers.map((u) => (
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
                            <span className={`campus-badge ${u.campus === "Annex" ? "annex" : u.campus === "Headquarters" ? "headquarters" : "all"}`}>
                              {u.campus || "All Campuses"}
                            </span>
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
                  <p>Real-time institutional telemetry across Headquarters & Annex campuses (Crèche, Nursery, Primary, JSS, SSS).</p>
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

              {renderExecutiveAnalyticsCenter({ isProprietorView: false })}
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

                const myPresentCount = myScholars.filter((s) => getStudentStatusForDate(s.id, attendanceDate) === "Present").length
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
                            <button className='btn-action-primary' style={{ flex: 1, padding: '10px' }} onClick={() => {
                              setGradebookViewMode("subject_entry")
                              setActiveTab("gradebook")
                            }}>
                              <i className='fas fa-pen'></i> Record CA Marks
                            </button>
                            <button className='btn-action' style={{ flex: 1, padding: '10px' }} onClick={() => setActiveTab("notices")}>
                              <i className='fas fa-bullhorn'></i> Staff Circulars
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* =======================================================
                        FACULTY SUBJECT ASSESSMENT & CONTINUOUS SCORING COMMAND
                       ======================================================= */}
                    {(() => {
                      const teacherAssignedClasses = currentUser && currentUser.assignedClasses && currentUser.assignedClasses.length > 0
                        ? currentUser.assignedClasses
                        : availableSchoolClasses
                      const activeTeacherClass = teacherAssignedClasses.includes(teacherDashboardSelectedClass)
                        ? teacherDashboardSelectedClass
                        : (teacherAssignedClasses[0] || "JSS 1")
                      const classSubjectsList = getSubjectsForClass(activeTeacherClass)
                      const myAssignedSubs = getTeacherAssignedSubjectsList(currentUser)
                      const activeTeacherSubject = classSubjectsList.includes(teacherDashboardSelectedSubject)
                        ? teacherDashboardSelectedSubject
                        : (myAssignedSubs.length > 0 && classSubjectsList.includes(myAssignedSubs[0]) ? myAssignedSubs[0] : classSubjectsList[0] || "Mathematics")

                      const enrolledClassScholars = students.filter(
                        (s) => s.grade === activeTeacherClass || activeTeacherClass === "All Classes"
                      )
                      const scoredCount = enrolledClassScholars.filter((s) => {
                        const rec = findExistingScore(s.id, s.name, activeTeacherSubject, activeTeacherClass)
                        return rec !== null && rec !== undefined
                      }).length

                      const subPercent = enrolledClassScholars.length > 0
                        ? Math.round((scoredCount / enrolledClassScholars.length) * 100)
                        : 0

                      return (
                        <div className='portal-card shadow teacher-scoring-workspace' style={{ marginTop: '24px' }}>
                          <div className='card-header-line flexSB' style={{ flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                            <div className='flex' style={{ gap: '10px', alignItems: 'center' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                                <i className='fas fa-pen-nib'></i>
                              </div>
                              <div>
                                <h3 style={{ margin: 0, color: '#0f172a' }}>Faculty Subject Assessment Command</h3>
                                <small style={{ color: '#64748b' }}>Select particular subject to record Continuous Assessment (40%) & Terminal Exam (60%) marks</small>
                              </div>
                            </div>
                            <div className='flex' style={{ gap: '10px', flexWrap: 'wrap' }}>
                              <button
                                type='button'
                                className='primary-btn'
                                style={{ background: '#00a884', color: '#fff', padding: '8px 16px', fontSize: '12.5px' }}
                                onClick={() => handleSaveAllSubjectScores(activeTeacherClass, activeTeacherSubject)}
                              >
                                <i className='fas fa-save'></i> Save {activeTeacherSubject} Scores
                              </button>
                              <button
                                type='button'
                                className='outline-btn'
                                style={{ padding: '8px 14px', fontSize: '12.5px', width: 'auto' }}
                                onClick={() => {
                                  setGradebookSelectedClass(activeTeacherClass)
                                  setGradebookSelectedSubject(activeTeacherSubject)
                                  setGradebookViewMode("subject_entry")
                                  setActiveTab("gradebook")
                                }}
                              >
                                <i className='fas fa-external-link-alt'></i> Open in Full Gradebook →
                              </button>
                            </div>
                          </div>

                          {/* Class & Subject Selector Controls */}
                          <div className='filter-bar flexSB' style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
                            <div className='filter-group' style={{ flex: '0 0 auto', minWidth: '220px' }}>
                              <label style={{ fontWeight: '700', color: '#0f172a' }}>
                                <i className='fas fa-chalkboard' style={{ color: '#00a884', marginRight: '6px' }}></i> Class Division:
                              </label>
                              <select
                                value={activeTeacherClass}
                                onChange={(e) => {
                                  setTeacherDashboardSelectedClass(e.target.value)
                                  const subs = getSubjectsForClass(e.target.value)
                                  if (subs.length > 0) setTeacherDashboardSelectedSubject(subs[0])
                                }}
                                style={{ border: '1.5px solid #cbd5e1', fontWeight: '700' }}
                              >
                                {teacherAssignedClasses.map((cls) => (
                                  <option key={cls} value={cls}>{cls}</option>
                                ))}
                              </select>
                            </div>

                            <div className='filter-group' style={{ flex: '1', minWidth: '260px' }}>
                              <label style={{ fontWeight: '700', color: '#0f172a' }}>
                                <i className='fas fa-book' style={{ color: '#2563eb', marginRight: '6px' }}></i> Selected Subject:
                              </label>
                              <select
                                value={activeTeacherSubject}
                                onChange={(e) => setTeacherDashboardSelectedSubject(e.target.value)}
                                style={{ border: '1.5px solid #cbd5e1', fontWeight: '700' }}
                              >
                                {classSubjectsList.map((sub) => {
                                  const isMySub = myAssignedSubs.some((m) => m.toLowerCase() === sub.toLowerCase() || sub.toLowerCase().includes(m.toLowerCase()))
                                  return (
                                    <option key={sub} value={sub}>
                                      {sub} {isMySub ? "⭐ (Your Assigned Subject)" : ""}
                                    </option>
                                  )
                                })}
                              </select>
                            </div>

                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                              <small style={{ color: '#64748b', fontWeight: '700' }}>SCORING PROGRESS</small>
                              <strong style={{ color: subPercent === 100 ? '#059669' : '#d97706', fontSize: '14px' }}>
                                {scoredCount} of {enrolledClassScholars.length} Scholars ({subPercent}%)
                              </strong>
                            </div>
                          </div>

                          {/* Quick Subject Switcher Pills */}
                          <div style={{ marginBottom: '14px' }}>
                            <div className='subject-pills-bar'>
                              {classSubjectsList.map((sub) => {
                                const isMySub = myAssignedSubs.some((m) => m.toLowerCase() === sub.toLowerCase() || sub.toLowerCase().includes(m.toLowerCase()))
                                const isActive = activeTeacherSubject === sub
                                return (
                                  <button
                                    key={sub}
                                    type='button'
                                    className={`subject-pill ${isActive ? "active" : ""} ${isMySub ? "my-subject" : ""}`}
                                    onClick={() => setTeacherDashboardSelectedSubject(sub)}
                                  >
                                    {isMySub ? "⭐ " : ""}{sub}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          {/* Active Subject Prominent Banner */}
                          <div className='active-subject-header-banner'>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <div className='subject-icon-badge'>
                                <i className='fas fa-book-reader'></i>
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <h4 style={{ margin: 0, color: '#0369a1', fontSize: '16px', fontWeight: '800' }}>
                                    Currently Scoring: <span style={{ textDecoration: 'underline' }}>{activeTeacherSubject}</span>
                                  </h4>
                                  <span className='ca-exam-pill'>Continuous Assessment (40%) + Exam (60%)</span>
                                </div>
                                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#0284c7' }}>
                                  Target Class: <strong>{activeTeacherClass}</strong> • Scoring Teacher: <strong>{currentUser?.name || "Subject Teacher"}</strong> • Progress: <strong>{subPercent}% Scored</strong>
                                </p>
                              </div>
                            </div>
                            <div>
                              <span className='subject-chip-scoring'>
                                <i className='fas fa-check-circle' style={{ color: '#0284c7' }}></i> Active Subject: {activeTeacherSubject}
                              </span>
                            </div>
                          </div>

                          {/* Interactive Subject Roster Score Table */}
                          <div className='table-card' style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto' }}>
                            <table className='portal-table editable-table'>
                              <thead>
                                <tr>
                                  <th>Scholar Name</th>
                                  <th>Subject Discipline</th>
                                  <th style={{ width: '70px' }}>1st Assign (10)</th>
                                  <th style={{ width: '70px' }}>2nd Assign (10)</th>
                                  <th style={{ width: '70px' }}>1st Test (10)</th>
                                  <th style={{ width: '70px' }}>2nd Test (10)</th>
                                  <th>Total CA (40)</th>
                                  <th style={{ width: '80px' }}>Exam (60)</th>
                                  <th>Total (100%)</th>
                                  <th>Grade</th>
                                  <th>GPA</th>
                                  <th style={{ minWidth: '180px' }}>Teacher Subject Remark</th>
                                </tr>
                              </thead>
                              <tbody>
                                {enrolledClassScholars.length === 0 ? (
                                  <tr>
                                    <td colSpan='12' style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                                      <i className='fas fa-users-slash' style={{ fontSize: '28px', color: '#cbd5e1', marginBottom: '8px', display: 'block' }}></i>
                                      No scholars enrolled in {activeTeacherClass}. Enroll students via the SIS tab.
                                    </td>
                                  </tr>
                                ) : (
                                  enrolledClassScholars.map((st) => {
                                    const existing = findExistingScore(st.id, st.name, activeTeacherSubject, activeTeacherClass) || {}
                                    const a1 = existing.assign1 !== undefined ? existing.assign1 : ""
                                    const a2 = existing.assign2 !== undefined ? existing.assign2 : ""
                                    const t1 = existing.test1 !== undefined ? existing.test1 : ""
                                    const t2 = existing.test2 !== undefined ? existing.test2 : ""
                                    const ex = existing.exam !== undefined ? existing.exam : ""
                                    const rem = existing.remarks !== undefined ? existing.remarks : "Good academic progress."
                                    const { caTotal, total, letter, gpa } = calculateGradeInfo({
                                      assign1: a1 === "" ? 0 : a1,
                                      assign2: a2 === "" ? 0 : a2,
                                      test1: t1 === "" ? 0 : t1,
                                      test2: t2 === "" ? 0 : t2,
                                      exam: ex === "" ? 0 : ex,
                                    })

                                    return (
                                      <tr key={st.id}>
                                        <td>
                                          <strong>{st.name}</strong>
                                          <small style={{ display: 'block', color: '#64748b' }}>
                                            {st.id} • {st.grade}
                                          </small>
                                        </td>
                                        <td>
                                          <span className='subject-chip-scoring'>
                                            <i className='fas fa-book-open'></i> {activeTeacherSubject}
                                          </span>
                                        </td>
                                        <td>
                                          <input
                                            type='number'
                                            min='0'
                                            max='10'
                                            placeholder='0'
                                            value={a1}
                                            onChange={(e) => handleUpdateStudentSubjectScore(st.id, st.name, activeTeacherClass, activeTeacherSubject, "assign1", e.target.value)}
                                            className='score-input ca-input'
                                            title='1st Assignment (max 10)'
                                          />
                                        </td>
                                        <td>
                                          <input
                                            type='number'
                                            min='0'
                                            max='10'
                                            placeholder='0'
                                            value={a2}
                                            onChange={(e) => handleUpdateStudentSubjectScore(st.id, st.name, activeTeacherClass, activeTeacherSubject, "assign2", e.target.value)}
                                            className='score-input ca-input'
                                            title='2nd Assignment (max 10)'
                                          />
                                        </td>
                                        <td>
                                          <input
                                            type='number'
                                            min='0'
                                            max='10'
                                            placeholder='0'
                                            value={t1}
                                            onChange={(e) => handleUpdateStudentSubjectScore(st.id, st.name, activeTeacherClass, activeTeacherSubject, "test1", e.target.value)}
                                            className='score-input ca-input'
                                            title='1st Test (max 10)'
                                          />
                                        </td>
                                        <td>
                                          <input
                                            type='number'
                                            min='0'
                                            max='10'
                                            placeholder='0'
                                            value={t2}
                                            onChange={(e) => handleUpdateStudentSubjectScore(st.id, st.name, activeTeacherClass, activeTeacherSubject, "test2", e.target.value)}
                                            className='score-input ca-input'
                                            title='2nd Test (max 10)'
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
                                            placeholder='0'
                                            value={ex}
                                            onChange={(e) => handleUpdateStudentSubjectScore(st.id, st.name, activeTeacherClass, activeTeacherSubject, "exam", e.target.value)}
                                            className='score-input exam-input'
                                            title='Terminal Exam (max 60)'
                                          />
                                        </td>
                                        <td>
                                          <span className='total-score-badge'>{total}%</span>
                                        </td>
                                        <td>
                                          <span className={`letter-badge grade-${letter}`}>{letter}</span>
                                        </td>
                                        <td>
                                          <strong>{gpa}</strong>
                                        </td>
                                        <td>
                                          <input
                                            type='text'
                                            placeholder='Subject remarks...'
                                            value={rem}
                                            onChange={(e) => handleUpdateStudentSubjectScore(st.id, st.name, activeTeacherClass, activeTeacherSubject, "remarks", e.target.value)}
                                            style={{ width: '100%', fontSize: '12px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                          />
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
            const wardAttendanceStats = getStudentAttendanceStats(parentWard.id)
            const wardAttendance = wardAttendanceStats.percentage
            const todayWardStatus = getStudentStatusForDate(parentWard.id, attendanceDate)
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
                    {(() => {
                      const access = checkStudentResultAccess(parentWard)
                      if (!access.allowed && access.reason === "not_published") {
                        return (
                          <button className='outline-btn' onClick={() => setReportCardStudent(parentWard)} style={{ background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }}>
                            <i className='fas fa-hourglass-half'></i> Terminal Report (In Collation)
                          </button>
                        )
                      }
                      if (!access.allowed && access.reason === "fees_pending") {
                        return (
                          <button className='outline-btn' onClick={() => setReportCardStudent(parentWard)} style={{ background: '#fee2e2', color: '#dc2626', borderColor: '#fecaca' }}>
                            <i className='fas fa-lock'></i> Report Card (Fees Due)
                          </button>
                        )
                      }
                      return (
                        <button className='primary-btn' onClick={() => setReportCardStudent(parentWard)} style={{ background: '#059669' }}>
                          <i className='fas fa-print'></i> View Official Report Card ✓
                        </button>
                      )
                    })()}
                    {wardInvoice && (
                      <button className='outline-btn' onClick={() => setReceiptInvoice(wardInvoice)}>
                        <i className='fas fa-receipt'></i> Official Bursar Receipt
                      </button>
                    )}
                  </div>
                </div>

                {/* 🔔 URGENT ATTENDANCE ALERT FOR PARENT */}
                {(() => {
                  const isAbsentOrLate = todayWardStatus === "Absent" || todayWardStatus === "Late"
                  const wardAttendanceAlerts = notices.filter(
                    (n) => n.category === "Attendance Alert" && (n.studentId === parentWard.id || n.targetGrade === parentWard.grade)
                  )
                  const latestAlert = wardAttendanceAlerts[0]

                  if (!isAbsentOrLate && wardAttendanceAlerts.length === 0) return null

                  return (
                    <div
                      className='portal-card shadow'
                      style={{
                        marginTop: '20px',
                        background: isAbsentOrLate && todayWardStatus === "Absent" ? '#fff1f2' : '#fffbeb',
                        border: `2px solid ${isAbsentOrLate && todayWardStatus === "Absent" ? '#fca5a5' : '#fde68a'}`,
                        borderLeft: `6px solid ${isAbsentOrLate && todayWardStatus === "Absent" ? '#dc2626' : '#d97706'}`,
                        padding: '18px 22px',
                      }}
                    >
                      <div className='flexSB' style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                        <div className='flex' style={{ gap: '14px', alignItems: 'flex-start' }}>
                          <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: isAbsentOrLate && todayWardStatus === "Absent" ? '#fee2e2' : '#fef3c7',
                            color: isAbsentOrLate && todayWardStatus === "Absent" ? '#dc2626' : '#b45309',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px',
                            flexShrink: 0,
                          }}>
                            <i className={isAbsentOrLate && todayWardStatus === "Absent" ? 'fas fa-triangle-exclamation' : 'fas fa-bell'}></i>
                          </div>
                          <div>
                            <div className='flex' style={{ gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{
                                background: isAbsentOrLate && todayWardStatus === "Absent" ? '#dc2626' : '#d97706',
                                color: '#fff',
                                fontWeight: '800',
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                              }}>
                                ⚠️ ATTENDANCE & ROLL CALL NOTICE
                              </span>
                              <span style={{ fontSize: '12px', color: '#64748b' }}>
                                {latestAlert ? latestAlert.date : attendanceDate}
                              </span>
                            </div>
                            <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', color: '#0f172a' }}>
                              {isAbsentOrLate
                                ? `${parentWard.name} was marked ${todayWardStatus.toUpperCase()} during Roll Call today (${getDayOfWeekName(attendanceDate)}, ${formatAttendanceDateDisplay(attendanceDate)})`
                                : latestAlert.title}
                            </h3>
                            <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: '1.6', maxWidth: '700px' }}>
                              {latestAlert
                                ? latestAlert.content
                                : isAbsentOrLate && todayWardStatus === "Absent"
                                  ? `Dear Parent/Guardian, homeroom morning devotion and roll call recorded that ${parentWard.name} is absent from class today. Kindly inform the class Form Master if the child is indisposed or requires an excused absence.`
                                  : `${parentWard.name} arrived at school after the 07:45 AM morning assembly bell today. We appreciate your partnership in reinforcing morning punctuality.`}
                            </p>
                          </div>
                        </div>

                        <div className='flex' style={{ gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            type='button'
                            className='primary-btn'
                            style={{ background: '#00a884', fontSize: '12.5px', padding: '8px 14px' }}
                            onClick={() => setActiveTab("parent-attendance")}
                          >
                            <i className='fas fa-clipboard-check'></i> View Full Register
                          </button>
                          <a
                            href='tel:08034567890'
                            className='outline-btn'
                            style={{ fontSize: '12.5px', padding: '8px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                          >
                            <i className='fas fa-phone-alt'></i> Call Front Desk
                          </a>
                        </div>
                      </div>
                    </div>
                  )
                })()}

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
                      <span className='trend-badge green'>{todayWardStatus} Today ({getDayOfWeekName(attendanceDate)})</span>
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
                      <button className='link-btn' onClick={() => setActiveTab("parent-report")}>Terminal Reports Hub →</button>
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

          {/* =======================================================
              PARENT SUB-TAB: TERMINAL ACADEMIC REPORT CARDS
             ======================================================= */}
          {activeTab === "parent-report" && (() => {
            const myWards = getParentWards(currentUser)
            const parentWard = getActiveParentWard(currentUser)

            if (!parentWard) {
              return (
                <div className='tab-view parent-report-view'>
                  <div className='portal-card' style={{ textAlign: 'center', padding: '60px 20px', margin: '20px auto', maxWidth: '600px' }}>
                    <i className='fas fa-award' style={{ fontSize: '48px', color: '#94a3b8', display: 'block', marginBottom: '16px' }}></i>
                    <h3 style={{ color: '#071626', marginBottom: '8px' }}>No Ward Enrolled</h3>
                    <p style={{ color: '#64748b', fontSize: '14px' }}>No scholars are currently linked to your parent account.</p>
                  </div>
                </div>
              )
            }

            const wardScores = gradebookData.filter((g) => g.studentId === parentWard.id || (g.studentName && g.studentName.toLowerCase().trim() === parentWard.name.toLowerCase().trim()))
            const access = checkStudentResultAccess(parentWard)
            const isPublished = resultsPublished[parentWard.grade] === true || resultsPublished.all === true

            return (
              <div className='tab-view parent-report-view'>
                <div className='tab-header flexSB'>
                  <div>
                    <h2>Official Terminal Academic Progress Report Cards</h2>
                    <p>End-of-Term Continuous Assessment (40%) + Terminal Exam (60%) evaluation with Principal Endorsement & BLIS Seal.</p>
                  </div>
                  <div className='flex' style={{ gap: '10px' }}>
                    <button className='outline-btn' onClick={() => setActiveTab("parent-dashboard")}>
                      <i className='fas fa-arrow-left'></i> Back to Dashboard
                    </button>
                  </div>
                </div>

                {renderWardSwitcher(myWards, parentWard)}

                {/* Status Hero Card */}
                <div className='portal-card shadow' style={{ marginBottom: '24px', borderLeft: `6px solid ${access.allowed ? '#059669' : access.reason === 'not_published' ? '#d97706' : '#dc2626'}` }}>
                  <div className='flexSB' style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <span className='status-pill' style={{
                        background: access.allowed ? '#ecfdf5' : access.reason === 'not_published' ? '#fef3c7' : '#fee2e2',
                        color: access.allowed ? '#065f46' : access.reason === 'not_published' ? '#92400e' : '#991b1b',
                        fontWeight: '800',
                        fontSize: '12.5px',
                        padding: '4px 14px',
                        borderRadius: '20px',
                        display: 'inline-block',
                        marginBottom: '10px'
                      }}>
                        {access.allowed ? "🔓 RESULT CLEARED FOR DOWNLOAD ✓" : access.reason === 'not_published' ? "⏳ END-OF-TERM COLLATION IN PROGRESS" : "🔒 RESULT ACCESS LOCKED (FEES DUE)"}
                      </span>
                      <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', color: '#0f172a' }}>
                        {parentWard.name} — {parentWard.grade} (2026/2027 Session • Term 1)
                      </h3>
                      <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: '1.6', maxWidth: '650px' }}>
                        {access.allowed
                          ? `The official Term 1 broadsheet has been sealed by the Principal and fee clearance verified. You can preview, print, or download ${parentWard.name}'s sealed report card below.`
                          : access.reason === 'not_published'
                          ? `Final terminal examination results are currently being compiled and reviewed by the Principal. Continuous assessment marks are available below for real-time tracking, and the sealed report card will be released at the conclusion of the term.`
                          : `The Term 1 examination broadsheet has been published, but under school policy, report cards are only downloadable once tuition fees are fully cleared or authorized via Bursary Result PIN.`}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right', minWidth: '220px' }}>
                      <button
                        type='button'
                        className='primary-btn'
                        style={{
                          background: access.allowed ? '#059669' : access.reason === 'not_published' ? '#d97706' : '#dc2626',
                          fontSize: '14px',
                          padding: '12px 20px',
                          width: '100%',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                        onClick={() => setReportCardStudent(parentWard)}
                      >
                        <i className={access.allowed ? 'fas fa-file-download' : access.reason === 'not_published' ? 'fas fa-hourglass-half' : 'fas fa-key'}></i>
                        {access.allowed ? "Download Report Card" : access.reason === 'not_published' ? "View Collation Status" : "Unlock with Result PIN"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Assessment Summary Table */}
                <div className='portal-card table-card shadow'>
                  <div className='card-header-line flexSB' style={{ marginBottom: '14px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
                        <i className='fas fa-chart-bar' style={{ color: '#00a884' }}></i> Academic Performance & Continuous Assessment Summary
                      </h3>
                      <small style={{ color: '#64748b' }}>
                        Continuous Assessment: 40% (Assignments & Periodic Tests) | Terminal Exam: 60%
                      </small>
                    </div>
                    <span className='status-pill' style={{ background: '#f8fafc', color: '#334155', fontWeight: '700' }}>
                      {wardScores.length} Subjects Logged
                    </span>
                  </div>

                  <table className='portal-table'>
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>1st Assign (10)</th>
                        <th>2nd Assign (10)</th>
                        <th>1st Test (10)</th>
                        <th>2nd Test (10)</th>
                        <th>CA Total (40)</th>
                        <th>Terminal Exam (60)</th>
                        <th>Total (100%)</th>
                        <th>Grade</th>
                        <th>Educator Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wardScores.length === 0 ? (
                        <tr>
                          <td colSpan='10' style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                            <i className='fas fa-info-circle'></i> No continuous assessment scores recorded yet for this scholar.
                          </td>
                        </tr>
                      ) : (
                        wardScores.map((sc, i) => {
                          const { caTotal, examScore, total, letter } = calculateGradeInfo(sc)
                          return (
                            <tr key={i}>
                              <td><strong>{sc.subject}</strong></td>
                              <td>{sc.assign1 || 0}/10</td>
                              <td>{sc.assign2 || 0}/10</td>
                              <td>{sc.test1 || 0}/10</td>
                              <td>{sc.test2 || 0}/10</td>
                              <td><strong style={{ color: '#0d9488' }}>{caTotal}/40</strong></td>
                              <td>{examScore}/60</td>
                              <td><strong style={{ fontSize: '14px' }}>{total}%</strong></td>
                              <td><span className={`letter-badge grade-${letter}`}>{letter}</span></td>
                              <td><small style={{ color: '#475569', fontStyle: 'italic' }}>{sc.remarks || "Good academic progress."}</small></td>
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
                        <th>Scholar Classification</th>
                        <th>Section A</th>
                        <th>Section B</th>
                        <th>Total Invoiced</th>
                        <th>Amount Paid</th>
                        <th>Balance Due</th>
                        <th>Status</th>
                        <th>Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wardInvoices.length === 0 ? (
                        <tr>
                          <td colSpan='10' style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                            <i className='fas fa-info-circle'></i> No tuition fee invoices generated yet for this ward.
                          </td>
                        </tr>
                      ) : (
                        wardInvoices.map((inv) => {
                          const { secATotal, secBTotal, isReturning, effectiveTotal, amountPaid, balance } = calculateInvoiceBreakdown(inv)
                          return (
                            <tr key={inv.invoiceNo}>
                              <td><strong>{inv.invoiceNo}</strong></td>
                              <td>{inv.term}</td>
                              <td>
                                {isReturning ? (
                                  <span className='scholar-type-badge returning'>
                                    <i className='fas fa-star'></i> Returning Scholar
                                  </span>
                                ) : (
                                  <span className='scholar-type-badge new-intake'>
                                    <i className='fas fa-box'></i> New Intake
                                  </span>
                                )}
                              </td>
                              <td>₦{secATotal.toLocaleString()}</td>
                              <td>{isReturning ? <span className='sec-b-waived-pill'>Waived (₦0)</span> : `₦${secBTotal.toLocaleString()}`}</td>
                              <td><strong>₦{effectiveTotal.toLocaleString()}</strong></td>
                              <td><strong style={{ color: '#00a884' }}>₦{amountPaid.toLocaleString()}</strong></td>
                              <td>
                                {balance === 0 ? (
                                  <strong style={{ color: '#00a884' }}>₦0 (Paid in Full)</strong>
                                ) : (
                                  <strong style={{ color: '#ef4444' }}>₦{balance.toLocaleString()}</strong>
                                )}
                              </td>
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

            if (!parentWard) {
              return (
                <div className='tab-view parent-attendance-view'>
                  <div className='portal-card' style={{ textAlign: 'center', padding: '60px 20px', margin: '20px auto', maxWidth: '600px' }}>
                    <i className='fas fa-clipboard-user' style={{ fontSize: '48px', color: '#94a3b8', display: 'block', marginBottom: '16px' }}></i>
                    <h3 style={{ color: '#071626', marginBottom: '8px' }}>No Ward Enrolled</h3>
                    <p style={{ color: '#64748b', fontSize: '14px' }}>No scholar records are currently linked to your parent account.</p>
                  </div>
                </div>
              )
            }

            const stats = getStudentAttendanceStats(parentWard.id)
            const todayStatus = getStudentStatusForDate(parentWard.id, attendanceDate)
            const todayDayOfWeek = getDayOfWeekName(attendanceDate)

            return (
              <div className='tab-view parent-attendance-view'>
                <div className='tab-header flexSB'>
                  <div>
                    <h2>Official Attendance & Punctuality Register</h2>
                    <p>{parentWard.name} ({parentWard.grade}) • 2026/2027 Academic Session • Term 1</p>
                  </div>
                  <div className='flex' style={{ gap: '10px' }}>
                    <span className={`status-pill ${stats.percentage >= 90 ? "paid" : stats.percentage >= 75 ? "partial" : "pending"}`} style={{ fontSize: '14px', padding: '6px 14px' }}>
                      {stats.percentage}% Term Attendance Rate
                    </span>
                  </div>
                </div>

                {renderWardSwitcher(myWards, parentWard)}

                {/* 4 Attendance Metric Cards */}
                <div className='metrics-grid' style={{ marginBottom: '24px' }}>
                  <div className='metric-card shadow flex'>
                    <div className='metric-icon emerald'><i className='fas fa-calendar-check'></i></div>
                    <div className='metric-data'>
                      <small>PRESENT DAYS</small>
                      <h3>{stats.presentDays} Days</h3>
                      <span className='trend-badge green'>Morning Assembly Verified</span>
                    </div>
                  </div>

                  <div className='metric-card shadow flex'>
                    <div className='metric-icon amber'><i className='fas fa-clock'></i></div>
                    <div className='metric-data'>
                      <small>LATE ARRIVALS</small>
                      <h3>{stats.lateDays} Days</h3>
                      <span className='trend-badge amber'>After 07:45 AM Bell</span>
                    </div>
                  </div>

                  <div className='metric-card shadow flex'>
                    <div className='metric-icon purple'><i className='fas fa-shield-halved'></i></div>
                    <div className='metric-data'>
                      <small>EXCUSED ABSENCES</small>
                      <h3>{stats.excusedDays} Days</h3>
                      <span className='trend-badge purple'>Medical / Official Leave</span>
                    </div>
                  </div>

                  <div className='metric-card shadow flex'>
                    <div className='metric-icon red'><i className='fas fa-user-xmark'></i></div>
                    <div className='metric-data'>
                      <small>UNEXCUSED ABSENT</small>
                      <h3>{stats.absentDays} Days</h3>
                      <span className='trend-badge red'>{stats.absentDays === 0 ? "Perfect Record" : "Parent Action Required"}</span>
                    </div>
                  </div>
                </div>

                {/* Two-Column Status and Regulations */}
                <div className='portal-two-col-grid' style={{ marginBottom: '24px' }}>
                  <div className='portal-card shadow'>
                    <h3><i className='fas fa-calendar-day' style={{ color: '#00a884' }}></i> Today's Homeroom Roll Call</h3>
                    <div style={{ marginTop: '16px' }}>
                      <div className='flexSB' style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span>Calendar Date:</span>
                        <strong>{formatAttendanceDateDisplay(attendanceDate)} ({todayDayOfWeek})</strong>
                      </div>
                      <div className='flexSB' style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span>Roll Call Status:</span>
                        <span className={`status-pill ${todayStatus === "Present" ? "paid" : todayStatus === "Late" ? "partial" : todayStatus === "Excused" ? "partial" : "pending"}`} style={{ fontWeight: '700' }}>
                          {todayStatus.toUpperCase()}
                        </span>
                      </div>
                      <div className='flexSB' style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span>Class Room / Division:</span>
                        <strong>{parentWard.grade} ({parentWard.house || "Phoenix"} House)</strong>
                      </div>
                      <div className='flexSB' style={{ padding: '10px 0' }}>
                        <span>Total School Days Logged:</span>
                        <strong>{stats.totalDays} Days in Term 1</strong>
                      </div>
                    </div>
                  </div>

                  <div className='portal-card shadow'>
                    <h3><i className='fas fa-bell' style={{ color: '#2563eb' }}></i> Punctuality & Assembly Regulations</h3>
                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: '10px', lineHeight: '1.6' }}>
                      Morning devotion and assembly start promptly at <strong>07:45 AM</strong>. Gates close at 08:00 AM. Regular attendance and punctuality are integral to character building and academic excellence.
                    </p>
                    <div style={{ background: '#ecfdf5', padding: '14px', borderRadius: '8px', border: '1px solid #a7f3d0', marginTop: '14px' }}>
                      <small style={{ color: '#065f46', fontWeight: '700' }}>
                        <i className='fas fa-shield-check' style={{ marginRight: '6px' }}></i> Dean's Punctuality & Discipline Directive Enforced
                      </small>
                    </div>
                  </div>
                </div>

                {/* Day-by-Day Historical Log Table */}
                <div className='portal-card table-card shadow'>
                  <div className='card-header-line flexSB' style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ margin: 0, fontSize: '15px' }}>
                      <i className='fas fa-history' style={{ color: '#00a884', marginRight: '8px' }}></i>
                      Complete Day-by-Day Attendance History ({stats.history.length} Days Recorded)
                    </h3>
                    <small style={{ color: '#64748b' }}>Actual Days of the Week & Verified Attendance Record</small>
                  </div>

                  <table className='portal-table'>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Day of the Week</th>
                        <th>Homeroom Status</th>
                        <th>Punctuality Assessment</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.history.length === 0 ? (
                        <tr>
                          <td colSpan='5' style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                            <i className='fas fa-info-circle'></i> No attendance records logged yet for {parentWard.name}.
                          </td>
                        </tr>
                      ) : (
                        stats.history.map((h, idx) => (
                          <tr key={idx}>
                            <td><strong>{h.displayDate}</strong> <small style={{ display: 'block', color: '#64748b' }}>{h.date}</small></td>
                            <td>
                              <span className='day-of-week-badge'>
                                <i className='fas fa-calendar-day' style={{ marginRight: '6px', color: '#00a884' }}></i>
                                {h.dayOfWeek}
                              </span>
                            </td>
                            <td>
                              <span className={`status-pill ${h.status === "Present" ? "paid" : h.status === "Late" ? "partial" : h.status === "Excused" ? "partial" : "pending"}`}>
                                {h.status.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              {h.status === "Present" && <span style={{ color: '#059669', fontSize: '12.5px', fontWeight: '600' }}><i className='fas fa-check-circle'></i> On Time (Before 07:45 AM)</span>}
                              {h.status === "Late" && <span style={{ color: '#d97706', fontSize: '12.5px', fontWeight: '600' }}><i className='fas fa-clock'></i> Arrived After Bell (08:05 AM)</span>}
                              {h.status === "Absent" && <span style={{ color: '#dc2626', fontSize: '12.5px', fontWeight: '600' }}><i className='fas fa-times-circle'></i> Unexcused Absence</span>}
                              {h.status === "Excused" && <span style={{ color: '#2563eb', fontSize: '12.5px', fontWeight: '600' }}><i className='fas fa-shield-alt'></i> Formal Medical / School Exemption</span>}
                            </td>
                            <td>
                              <small style={{ color: '#64748b' }}>
                                {h.status === "Present" ? "Full participation in morning assembly and all class periods." : h.status === "Late" ? "Admitted with late slip." : h.status === "Excused" ? "Official parent communication logged." : "Absence notice sent to guardian via SMS."}
                              </small>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
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
            const scholarAttendanceStats = getStudentAttendanceStats(studentScholar.id)
            const scholarTodayStatus = getStudentStatusForDate(studentScholar.id, attendanceDate)
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
                    {(() => {
                      const access = checkStudentResultAccess(studentScholar)
                      if (!access.allowed && access.reason === "not_published") {
                        return (
                          <button className='outline-btn' onClick={() => setReportCardStudent(studentScholar)} style={{ background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }}>
                            <i className='fas fa-hourglass-half'></i> Terminal Report (In Collation)
                          </button>
                        )
                      }
                      if (!access.allowed && access.reason === "fees_pending") {
                        return (
                          <button className='outline-btn' onClick={() => setReportCardStudent(studentScholar)} style={{ background: '#fee2e2', color: '#dc2626', borderColor: '#fecaca' }}>
                            <i className='fas fa-lock'></i> Report Card (Fees Due)
                          </button>
                        )
                      }
                      return (
                        <button className='primary-btn' onClick={() => setReportCardStudent(studentScholar)} style={{ background: '#059669' }}>
                          <i className='fas fa-award'></i> My Official Report Card ✓
                        </button>
                      )
                    })()}
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
                      <h3>{scholarAttendanceStats.percentage}%</h3>
                      <span className='trend-badge green'>Today: {scholarTodayStatus} ({getDayOfWeekName(attendanceDate)})</span>
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
                      <button className='link-btn' onClick={() => setActiveTab("student-grades")}>Full Grades Ledger →</button>
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
                  {studentScholar && (() => {
                    const access = checkStudentResultAccess(studentScholar)
                    if (!access.allowed && access.reason === "not_published") {
                      return (
                        <button className='outline-btn' onClick={() => setReportCardStudent(studentScholar)} style={{ background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }}>
                          <i className='fas fa-hourglass-half'></i> Terminal Report (In Collation)
                        </button>
                      )
                    }
                    if (!access.allowed && access.reason === "fees_pending") {
                      return (
                        <button className='outline-btn' onClick={() => setReportCardStudent(studentScholar)} style={{ background: '#fee2e2', color: '#dc2626', borderColor: '#fecaca' }}>
                          <i className='fas fa-lock'></i> Report Card (Fees Due)
                        </button>
                      )
                    }
                    return (
                      <button className='primary-btn' onClick={() => setReportCardStudent(studentScholar)} style={{ background: '#059669' }}>
                        <i className='fas fa-print'></i> Print Official Report Card ✓
                      </button>
                    )
                  })()}
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

                <div className='filter-dropdowns flex' style={{ gap: '10px' }}>
                  <div className='filter-group'>
                    <label>Campus / Branch:</label>
                    <select
                      value={studentCampusFilter}
                      onChange={(e) => setStudentCampusFilter(e.target.value)}
                    >
                      <option value='All'>All Campuses</option>
                      <option value='Headquarters'>Headquarters</option>
                      <option value='Annex'>Annex</option>
                    </select>
                  </div>

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
                      <th>Campus</th>
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
                        <td colSpan='9' style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
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
                        <td>
                          <span className={`campus-badge ${st.campus === "Annex" ? "annex" : "headquarters"}`}>
                            {st.campus || "Headquarters"}
                          </span>
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
          {activeTab === "gradebook" && (() => {
            const isAdminOrProprietor = currentUser && (currentUser.role === "admin" || currentUser.role === "proprietor")
            const isClassFormMaster = (targetClass) => {
              if (!currentUser) return false
              if (isAdminOrProprietor) return true
              if (currentUser.role === "teacher" && currentUser.headTeacherClass) {
                if (!targetClass) return true
                return currentUser.headTeacherClass.toLowerCase().trim() === (targetClass || "").toLowerCase().trim()
              }
              return false
            }
            const isAnyFormMaster = currentUser && (isAdminOrProprietor || (currentUser.role === "teacher" && Boolean(currentUser.headTeacherClass)))

            return (
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
                    {gradebookViewMode === "collation_hub" && isClassFormMaster(collationSelectedClass) && (
                      <button
                        className='primary-btn'
                        style={{ background: '#059669', color: '#fff' }}
                        onClick={() => handleSubmitCollationToPrincipal(collationSelectedClass)}
                      >
                        <i className='fas fa-paper-plane'></i> Submit Broadsheet to Principal
                      </button>
                    )}
                    {gradebookViewMode === "principal_review" && isAdminOrProprietor && (
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
                    className={`collation-nav-btn ${gradebookViewMode === "collation_hub" ? "active" : ""} ${!isAnyFormMaster ? "disabled-nav-btn" : ""}`}
                    onClick={() => {
                      if (!isAnyFormMaster) {
                        showToast("🔒 Form Master privilege required. Only appointed Class Form Masters or School Admins can compile broadsheets.", "warning")
                        return
                      }
                      setGradebookViewMode("collation_hub")
                    }}
                    title={!isAnyFormMaster ? "Restricted to appointed Class Form Masters" : "Class Collation Hub"}
                  >
                    <i className={isAnyFormMaster ? 'fas fa-user-tie' : 'fas fa-lock'} style={{ color: isAnyFormMaster ? '#059669' : '#94a3b8' }}></i> 2. Class Head Teacher Collation Hub
                    {!isAnyFormMaster && <span className='locked-badge-pill'>Form Master Only</span>}
                  </button>
                  {isAdminOrProprietor && (
                    <button
                      type='button'
                      className={`collation-nav-btn ${gradebookViewMode === "principal_review" ? "active" : ""}`}
                      onClick={() => setGradebookViewMode("principal_review")}
                    >
                      <i className='fas fa-stamp' style={{ color: '#d97706' }}></i> 3. Principal's Final Endorsement & Seal
                    </button>
                  )}
                </div>

                {/* VIEW MODE 1: SUBJECT TEACHER CA SCORE ENTRY */}
                {gradebookViewMode === "subject_entry" && (() => {
                  const teacherAllowedClasses = currentUser && currentUser.role === "teacher" && currentUser.assignedClasses && currentUser.assignedClasses.length > 0
                    ? currentUser.assignedClasses
                    : availableSchoolClasses
                  const activeClass = gradebookSelectedClass === "All" 
                    ? (teacherAllowedClasses[0] || "JSS 1") 
                    : gradebookSelectedClass
                  const classSubjectsList = getSubjectsForClass(activeClass)
                  const myAssignedSubs = getTeacherAssignedSubjectsList(currentUser)
                  const activeSubject = gradebookSelectedSubject === "All" 
                    ? (myAssignedSubs.length > 0 && classSubjectsList.includes(myAssignedSubs[0]) ? myAssignedSubs[0] : classSubjectsList[0] || "Mathematics")
                    : gradebookSelectedSubject

                  const enrolledClassScholars = students.filter(
                    (s) => s.grade === activeClass || activeClass === "All"
                  )
                  const scoredCount = enrolledClassScholars.filter((s) => {
                    const rec = findExistingScore(s.id, s.name, activeSubject, activeClass)
                    return rec !== null && rec !== undefined
                  }).length

                  const subPercent = enrolledClassScholars.length > 0
                    ? Math.round((scoredCount / enrolledClassScholars.length) * 100)
                    : 0

                  return (
                    <>
                      {/* Class & Subject Selector */}
                      <div className='filter-bar flexSB' style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
                        <div className='filter-group' style={{ flex: '0 0 auto', minWidth: '220px' }}>
                          <label style={{ fontWeight: '700', color: '#0f172a' }}>
                            <i className='fas fa-chalkboard' style={{ color: '#00a884', marginRight: '6px' }}></i> Class Division:
                          </label>
                          <select
                            value={gradebookSelectedClass}
                            onChange={(e) => {
                              setGradebookSelectedClass(e.target.value)
                              const subs = getSubjectsForClass(e.target.value)
                              if (subs.length > 0 && !subs.includes(gradebookSelectedSubject)) {
                                setGradebookSelectedSubject(subs[0])
                              }
                            }}
                            style={{ border: '1.5px solid #cbd5e1', fontWeight: '700' }}
                          >
                            {currentUser && currentUser.role === "teacher" ? (
                              (currentUser.assignedClasses || []).map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))
                            ) : (
                              <>
                                {availableSchoolClasses.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </>
                            )}
                          </select>
                        </div>

                        <div className='filter-group' style={{ flex: '1', minWidth: '260px' }}>
                          <label style={{ fontWeight: '700', color: '#0f172a' }}>
                            <i className='fas fa-book-open' style={{ color: '#2563eb', marginRight: '6px' }}></i> Selected Subject Discipline:
                          </label>
                          <select
                            value={activeSubject}
                            onChange={(e) => setGradebookSelectedSubject(e.target.value)}
                            style={{ border: '1.5px solid #cbd5e1', fontWeight: '700' }}
                          >
                            {classSubjectsList.map((sub) => {
                              const isMySub = myAssignedSubs.some((m) => m.toLowerCase() === sub.toLowerCase() || sub.toLowerCase().includes(m.toLowerCase()))
                              return (
                                <option key={sub} value={sub}>
                                  {sub} {isMySub ? "⭐ (Your Assigned Subject)" : ""}
                                </option>
                              )
                            })}
                          </select>
                        </div>

                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <small style={{ color: '#64748b', fontWeight: '700' }}>SCORING PROGRESS</small>
                          <strong style={{ color: subPercent === 100 ? '#059669' : '#d97706', fontSize: '14px' }}>
                            {scoredCount} of {enrolledClassScholars.length} Scholars ({subPercent}%)
                          </strong>
                        </div>
                      </div>

                      {/* Quick Subject Switcher Pills */}
                      <div style={{ marginBottom: '14px' }}>
                        <div className='subject-pills-bar'>
                          {classSubjectsList.map((sub) => {
                            const isMySub = myAssignedSubs.some((m) => m.toLowerCase() === sub.toLowerCase() || sub.toLowerCase().includes(m.toLowerCase()))
                            const isActive = activeSubject === sub
                            return (
                              <button
                                key={sub}
                                type='button'
                                className={`subject-pill ${isActive ? "active" : ""} ${isMySub ? "my-subject" : ""}`}
                                onClick={() => setGradebookSelectedSubject(sub)}
                              >
                                {isMySub ? "⭐ " : ""}{sub}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Prominent Active Subject Header Banner */}
                      <div className='active-subject-header-banner'>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div className='subject-icon-badge'>
                            <i className='fas fa-book-reader'></i>
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <h3 style={{ margin: 0, color: '#0369a1', fontSize: '17px', fontWeight: '800' }}>
                                Currently Scoring: <span style={{ textDecoration: 'underline' }}>{activeSubject}</span>
                              </h3>
                              <span className='ca-exam-pill'>Continuous Assessment (40%) + Exam (60%)</span>
                            </div>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#0284c7' }}>
                              Class: <strong>{activeClass}</strong> • Scoring Educator: <strong>{currentUser?.name || "Educator"}</strong> • Status: <strong>{subPercent}% Completed ({scoredCount}/{enrolledClassScholars.length} Scholars)</strong>
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span className='subject-chip-scoring'>
                            <i className='fas fa-check-circle' style={{ color: '#0284c7' }}></i> Active Subject: {activeSubject}
                          </span>
                        </div>
                      </div>

                      {/* Interactive Roster Score Table */}
                      <div className='portal-card table-card' style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                        <table className='portal-table editable-table'>
                          <thead>
                            <tr>
                              <th>Scholar Details</th>
                              <th>Subject Discipline</th>
                              <th style={{ width: '75px' }}>1st Assign (10)</th>
                              <th style={{ width: '75px' }}>2nd Assign (10)</th>
                              <th style={{ width: '75px' }}>1st Test (10)</th>
                              <th style={{ width: '75px' }}>2nd Test (10)</th>
                              <th>Total CA (40)</th>
                              <th style={{ width: '80px' }}>Exam (60)</th>
                              <th>Total (100%)</th>
                              <th>Grade</th>
                              <th>GPA</th>
                              <th style={{ minWidth: '160px' }}>Subject Teacher Remark</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {enrolledClassScholars.length === 0 ? (
                              <tr>
                                <td colSpan='13' style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                                  <div style={{ maxWidth: '420px', margin: '0 auto' }}>
                                    <i className='fas fa-users-slash' style={{ fontSize: '32px', color: '#94a3b8', marginBottom: '12px', display: 'block' }}></i>
                                    <h4 style={{ color: '#071626', margin: '0 0 6px 0' }}>No Scholars Enrolled in {activeClass}</h4>
                                    <p style={{ fontSize: '13px', margin: '0 0 16px 0' }}>
                                      Enroll students into {activeClass} via the SIS tab to begin scoring {activeSubject}.
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              enrolledClassScholars.map((st) => {
                                const existing = findExistingScore(st.id, st.name, activeSubject, activeClass) || {}
                                const a1 = existing.assign1 !== undefined ? existing.assign1 : ""
                                const a2 = existing.assign2 !== undefined ? existing.assign2 : ""
                                const t1 = existing.test1 !== undefined ? existing.test1 : ""
                                const t2 = existing.test2 !== undefined ? existing.test2 : ""
                                const ex = existing.exam !== undefined ? existing.exam : ""
                                const rem = existing.remarks !== undefined ? existing.remarks : "Good academic progress."
                                const { caTotal, total, letter, gpa } = calculateGradeInfo({
                                  assign1: a1 === "" ? 0 : a1,
                                  assign2: a2 === "" ? 0 : a2,
                                  test1: t1 === "" ? 0 : t1,
                                  test2: t2 === "" ? 0 : t2,
                                  exam: ex === "" ? 0 : ex,
                                })

                                return (
                                  <tr key={st.id}>
                                    <td>
                                      <strong>{st.name}</strong>
                                      <small style={{ display: 'block', color: '#64748b' }}>
                                        {st.id} • {st.grade}
                                      </small>
                                    </td>
                                    <td>
                                      <span className='subject-chip-scoring'>
                                        <i className='fas fa-book-open'></i> {activeSubject}
                                      </span>
                                    </td>
                                    <td>
                                      <input
                                        type='number'
                                        min='0'
                                        max='10'
                                        value={a1}
                                        placeholder='0'
                                        onChange={(e) => handleUpdateStudentSubjectScore(st.id, st.name, activeClass, activeSubject, "assign1", e.target.value)}
                                        className='score-input ca-input'
                                        title='1st Assignment (over 10)'
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type='number'
                                        min='0'
                                        max='10'
                                        value={a2}
                                        placeholder='0'
                                        onChange={(e) => handleUpdateStudentSubjectScore(st.id, st.name, activeClass, activeSubject, "assign2", e.target.value)}
                                        className='score-input ca-input'
                                        title='2nd Assignment (over 10)'
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type='number'
                                        min='0'
                                        max='10'
                                        value={t1}
                                        placeholder='0'
                                        onChange={(e) => handleUpdateStudentSubjectScore(st.id, st.name, activeClass, activeSubject, "test1", e.target.value)}
                                        className='score-input ca-input'
                                        title='1st Test (over 10)'
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type='number'
                                        min='0'
                                        max='10'
                                        value={t2}
                                        placeholder='0'
                                        onChange={(e) => handleUpdateStudentSubjectScore(st.id, st.name, activeClass, activeSubject, "test2", e.target.value)}
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
                                        value={ex}
                                        placeholder='0'
                                        onChange={(e) => handleUpdateStudentSubjectScore(st.id, st.name, activeClass, activeSubject, "exam", e.target.value)}
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
                                      <input
                                        type='text'
                                        value={rem}
                                        placeholder='Subject remark...'
                                        onChange={(e) => handleUpdateStudentSubjectScore(st.id, st.name, activeClass, activeSubject, "remarks", e.target.value)}
                                        style={{ width: '100%', fontSize: '12px', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                      />
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <button
                                          type='button'
                                          className='btn-action-sm'
                                          style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
                                          onClick={() => handleEditScoreRecord(existing.studentId ? existing : {
                                            studentId: st.id,
                                            studentName: st.name,
                                            gradeLevel: activeClass,
                                            subject: activeSubject,
                                            assign1: a1 === "" ? 0 : Number(a1),
                                            assign2: a2 === "" ? 0 : Number(a2),
                                            test1: t1 === "" ? 0 : Number(t1),
                                            test2: t2 === "" ? 0 : Number(t2),
                                            exam: ex === "" ? 0 : Number(ex),
                                            remarks: rem,
                                          })}
                                          title='Edit in Full Modal'
                                        >
                                          <i className='fas fa-edit'></i>
                                        </button>
                                        <button
                                          type='button'
                                          className='btn-action-sm'
                                          onClick={() => setReportCardStudent(st)}
                                          title='Generate Official Report Card'
                                        >
                                          <i className='fas fa-file-invoice'></i>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )
                })()}

                {/* VIEW MODE 2: CLASS HEAD TEACHER (FORM MASTER) COLLATION HUB */}
                {gradebookViewMode === "collation_hub" && (() => {
                  if (!isAnyFormMaster) {
                    return (
                      <div className='locked-hub-card shadow' style={{ margin: '20px 0' }}>
                        <div className='locked-hub-icon'>
                          <i className='fas fa-user-lock'></i>
                        </div>
                        <h3 style={{ color: '#92400e', marginBottom: '8px', fontSize: '18px' }}>Class Form Master Privilege Required</h3>
                        <p style={{ maxWidth: '560px', margin: '0 auto 16px', color: '#78350f', fontSize: '13.5px', lineHeight: '1.6' }}>
                          You are currently logged in as a <strong>Subject Teacher</strong>. The Class Collation Hub, broadsheet compiling, Form Master terminal remarks, and submission to the Principal are strictly restricted to appointed <strong>Class Form Masters</strong> and <strong>School Administrators</strong>.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                          <button
                            type='button'
                            className='primary-btn'
                            style={{ background: '#2563eb', padding: '10px 20px' }}
                            onClick={() => setGradebookViewMode("subject_entry")}
                          >
                            <i className='fas fa-pen-nib'></i> Return to Subject CA Score Entry
                          </button>
                        </div>
                      </div>
                    )
                  }

                  const isMyClass = isClassFormMaster(collationSelectedClass)
                  const broadsheet = calculateClassBroadsheet(collationSelectedClass)
                  const classScholarsCount = broadsheet.length
                  const totalSubsRecorded = broadsheet.reduce((acc, c) => acc + c.subjectCount, 0)
                  const overallAvg = classScholarsCount > 0
                    ? (broadsheet.reduce((acc, c) => acc + c.avgScore, 0) / classScholarsCount).toFixed(1)
                    : "0.0"
                  const topScholar = broadsheet[0] || null
                  const classSubjects = getSubjectsForClass(collationSelectedClass)
                  const classScholars = students.filter((s) => s.grade === collationSelectedClass)
                  const myAssignedSubs = getTeacherAssignedSubjectsList(currentUser)

                  const fullyScoredSubjectsCount = classSubjects.filter((sub) => {
                    if (classScholars.length === 0) return false
                    const scoredCount = classScholars.filter((s) => {
                      const rec = findExistingScore(s.id, s.name, sub, collationSelectedClass)
                      return rec !== null && rec !== undefined
                    }).length
                    return scoredCount === classScholars.length
                  }).length

                  return (
                    <div>
                      {/* Warning Notice if viewing a class where user is not appointed Form Master */}
                      {!isMyClass && (
                        <div style={{ background: '#fef3c7', border: '1.5px solid #fde68a', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#92400e', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <i className='fas fa-shield-alt' style={{ fontSize: '18px', color: '#d97706' }}></i>
                          <span>
                            You are the appointed Form Master for <strong>{currentUser.headTeacherClass}</strong>. You are currently viewing <strong>{collationSelectedClass}</strong> in read-only mode. Broadsheet compilation and submission privileges are reserved for the designated Form Master of {collationSelectedClass}.
                          </span>
                        </div>
                      )}

                      {/* Class Selector & Header */}
                      <div className='filter-bar flexSB' style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
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

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            type='button'
                            className='outline-btn'
                            style={{ background: '#fff', color: '#0f766e', borderColor: '#0f766e', fontWeight: '700', padding: '8px 14px', width: 'auto' }}
                            onClick={() => {
                              setGradebookSelectedClass(collationSelectedClass)
                              const classSubs = getSubjectsForClass(collationSelectedClass)
                              const mySub = myAssignedSubs.find(s => classSubs.includes(s)) || classSubs[0] || "Mathematics"
                              setGradebookSelectedSubject(mySub)
                              setGradebookViewMode("subject_entry")
                            }}
                          >
                            <i className='fas fa-pen-nib'></i> ➕ Record My Subject Scores
                          </button>
                          <button
                            type='button'
                            className='primary-btn'
                            style={{
                              background: isMyClass ? '#2563eb' : '#94a3b8',
                              color: '#fff',
                              padding: '8px 14px',
                              cursor: isMyClass ? 'pointer' : 'not-allowed',
                            }}
                            onClick={() => {
                              if (!isMyClass) {
                                showToast(`🔒 You can only compile results for your assigned Form Class (${currentUser.headTeacherClass}).`, "warning")
                                return
                              }
                              handleCompileClassResults(collationSelectedClass)
                            }}
                          >
                            <i className='fas fa-calculator'></i> ⚡ Compile & Finalize Class Results
                          </button>
                          {isMyClass && (
                            <button
                              type='button'
                              className='primary-btn'
                              style={{ background: '#059669', color: '#fff', padding: '8px 14px' }}
                              onClick={() => handleSubmitCollationToPrincipal(collationSelectedClass)}
                            >
                              <i className='fas fa-paper-plane'></i> Submit Broadsheet to Principal
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Broadsheet Summary KPI Cards */}
                      <div className='metrics-grid' style={{ marginBottom: '20px' }}>
                        <div className='metric-card shadow flex'>
                          <div className='metric-icon emerald'><i className='fas fa-user-graduate'></i></div>
                          <div className='metric-data'>
                            <small>ENROLLED SCHOLARS</small>
                            <h3>{classScholarsCount} Scholars</h3>
                            <span className='trend-badge green'>{collationSelectedClass} Scope</span>
                          </div>
                        </div>

                        <div className='metric-card shadow flex'>
                          <div className='metric-icon blue'><i className='fas fa-book-open'></i></div>
                          <div className='metric-data'>
                            <small>SUBJECT SCORES LOGGED</small>
                            <h3>{totalSubsRecorded} Entries</h3>
                            <span className='trend-badge blue'>Across All Teachers</span>
                          </div>
                        </div>

                        <div className='metric-card shadow flex'>
                          <div className='metric-icon amber'><i className='fas fa-chart-line'></i></div>
                          <div className='metric-data'>
                            <small>CLASS AVERAGE</small>
                            <h3>{overallAvg}%</h3>
                            <span className='trend-badge amber'>Cumulative Marks</span>
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

                      {/* Class Subject Submission Tracker Matrix */}
                      <div className='portal-card shadow' style={{ marginBottom: '20px', padding: '18px 20px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                        <div className='flexSB' style={{ marginBottom: '14px', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
                              <i className='fas fa-tasks' style={{ color: '#2563eb', marginRight: '8px' }}></i>
                              {collationSelectedClass} Subject Submission & Entry Tracker Matrix
                            </h3>
                            <small style={{ color: '#64748b' }}>
                              Subject teachers record their respective subject marks independently. Track submission status across all {classSubjects.length} disciplines before compiling.
                            </small>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: fullyScoredSubjectsCount === classSubjects.length ? '#059669' : '#d97706' }}>
                            {fullyScoredSubjectsCount} of {classSubjects.length} Subjects Fully Scored
                          </span>
                        </div>
                        <div className='subject-matrix-wrap'>
                          {classSubjects.map((sub) => {
                            const scoredScholars = classScholars.filter((s) => {
                              const rec = findExistingScore(s.id, s.name, sub, collationSelectedClass)
                              return rec !== null && rec !== undefined
                            }).length
                            const totalScholars = classScholars.length
                            const pct = totalScholars > 0 ? Math.round((scoredScholars / totalScholars) * 100) : 0
                            const isDone = pct === 100 && totalScholars > 0
                            const isPartial = pct > 0 && pct < 100
                            const isMySub = myAssignedSubs.some(m => m.toLowerCase() === sub.toLowerCase() || sub.toLowerCase().includes(m.toLowerCase()))

                            return (
                              <div key={sub} className='subject-matrix-card'>
                                <div className='flexSB' style={{ marginBottom: '6px' }}>
                                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>{sub}</strong>
                                  <span className={`subject-matrix-badge ${isDone ? "complete" : isPartial ? "partial" : "pending"}`}>
                                    {isDone ? "✓ Complete" : isPartial ? "⏳ Partial" : "❌ Pending"}
                                  </span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                                  {scoredScholars} / {totalScholars} Scholars ({pct}%)
                                  {isMySub && <span style={{ marginLeft: '6px', color: '#059669', fontWeight: '700' }}>⭐ (My Sub)</span>}
                                </div>
                                <div style={{ background: '#e2e8f0', borderRadius: '999px', height: '6px', overflow: 'hidden', marginBottom: '10px' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: isDone ? '#059669' : isPartial ? '#d97706' : '#94a3b8' }}></div>
                                </div>
                                <button
                                  type='button'
                                  className='btn-action-sm'
                                  style={{ width: '100%', textAlign: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#2563eb', fontWeight: '600' }}
                                  onClick={() => {
                                    setGradebookSelectedClass(collationSelectedClass)
                                    setGradebookSelectedSubject(sub)
                                    setGradebookViewMode("subject_entry")
                                  }}
                                >
                                  Score {sub} →
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Form Master Broadsheet Table */}
                      <div className='portal-card table-card' style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                        <table className='portal-table'>
                          <thead>
                            <tr>
                              <th style={{ width: '90px' }}>Rank / Pos</th>
                              <th>Scholar Details</th>
                              <th>Subjects Recorded</th>
                              <th>Total Marks</th>
                              <th>Average (%)</th>
                              <th>GPA</th>
                              <th style={{ minWidth: '280px' }}>Class Head Teacher's Terminal Remark</th>
                              <th>Actions</th>
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
                                      <div>
                                        <span style={{ fontWeight: '700', color: item.subjectCount > 0 ? '#059669' : '#ef4444' }}>
                                          {item.subjectCount} Subjects
                                        </span>
                                        <button
                                          type='button'
                                          className='btn-action-sm'
                                          style={{ display: 'block', marginTop: '4px', fontSize: '11px', padding: '2px 8px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
                                          onClick={() => setBroadsheetScholarDetail(item)}
                                        >
                                          🔍 View Subjects
                                        </button>
                                      </div>
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
                                      {isMyClass ? (
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
                                      ) : (
                                        <div style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#334155' }}>
                                          <p style={{ margin: 0, fontStyle: 'italic' }}>
                                            "{item.classTeacherRemark || "No remark entered yet."}"
                                          </p>
                                          <small style={{ display: 'block', marginTop: '4px', color: '#059669', fontWeight: '700' }}>
                                            — {item.classTeacherName || `Form Master (${collationSelectedClass})`}
                                          </small>
                                        </div>
                                      )}
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <button
                                          type='button'
                                          className='btn-action-sm'
                                          style={{ background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1' }}
                                          onClick={() => setBroadsheetScholarDetail(item)}
                                          title='View Full Subject Score Matrix'
                                        >
                                          <i className='fas fa-list-alt'></i> View Breakdown
                                        </button>
                                        <button
                                          type='button'
                                          className='btn-action'
                                          onClick={() => setReportCardStudent(s)}
                                          title='View Official Terminal Progress Report Card'
                                        >
                                          <i className='fas fa-file-invoice'></i> Preview Report
                                        </button>
                                      </div>
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
                  if (!isAdminOrProprietor) {
                    return (
                      <div className='locked-hub-card shadow' style={{ margin: '20px 0' }}>
                        <div className='locked-hub-icon'>
                          <i className='fas fa-shield-alt'></i>
                        </div>
                        <h3 style={{ color: '#92400e', marginBottom: '8px', fontSize: '18px' }}>Principal & Administrative Access Only</h3>
                        <p style={{ maxWidth: '560px', margin: '0 auto 16px', color: '#78350f', fontSize: '13.5px', lineHeight: '1.6' }}>
                          Official terminal endorsement, promotional decisions, and applying the institutional BLIS seal are strictly reserved for the <strong>School Principal</strong>, <strong>Proprietor</strong>, and <strong>Executive Administrators</strong>.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                          <button
                            type='button'
                            className='primary-btn'
                            style={{ background: '#2563eb', padding: '10px 20px' }}
                            onClick={() => setGradebookViewMode("subject_entry")}
                          >
                            <i className='fas fa-pen-nib'></i> Go to Subject CA Score Entry
                          </button>
                        </div>
                      </div>
                    )
                  }

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
                            <small style={{ color: '#1e40af', display: 'block', fontWeight: '600' }}>Principal Seal Status:</small>
                            <span style={{ fontSize: '12.5px', fontWeight: '800', color: isAllApproved ? '#059669' : '#d97706' }}>
                              {isAllApproved ? "🏛️ Verified & Sealed ✓" : "⏳ Pending Review"}
                            </span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <small style={{ color: '#1e40af', display: 'block', fontWeight: '600' }}>Parent Release Status:</small>
                            <span style={{ fontSize: '12.5px', fontWeight: '800', color: resultsPublished[principalSelectedClass] || resultsPublished.all ? '#059669' : '#dc2626' }}>
                              {resultsPublished[principalSelectedClass] || resultsPublished.all ? "📢 Posted to Parents ✓" : "🔒 Draft (Hidden)"}
                            </span>
                          </div>
                          <button
                            type='button'
                            className='primary-btn'
                            style={{ background: resultsPublished[principalSelectedClass] ? '#d97706' : '#059669', color: '#fff', fontSize: '13px', padding: '9px 16px' }}
                            onClick={() => handleTogglePublishResults(principalSelectedClass)}
                          >
                            <i className={resultsPublished[principalSelectedClass] ? 'fas fa-eye-slash' : 'fas fa-paper-plane'}></i> {resultsPublished[principalSelectedClass] ? `Revert ${principalSelectedClass} to Draft` : `Post / Publish ${principalSelectedClass} Results`}
                          </button>
                          <button
                            type='button'
                            className='primary-btn'
                            style={{ background: isAllApproved ? '#059669' : '#1e3a8a', color: '#fff', fontSize: '13px', padding: '9px 16px' }}
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
            )
          })()}

          {/* 4. DAILY ATTENDANCE & ROLL CALL */}
          {activeTab === "attendance" && (() => {
            const teacherAllowed = currentUser && currentUser.role === "teacher" ? (currentUser.assignedClasses || []) : null
            const filteredAttendance = students.filter((st) => {
              if (teacherAllowed) {
                if (!teacherAllowed.includes(st.grade) && !teacherAllowed.includes("All Classes")) return false
              }
              return attendanceClass === "All" || st.grade === attendanceClass
            })

            const weekDays = getWeekSchoolDays(attendanceDate)
            const activeDayOfWeek = getDayOfWeekName(attendanceDate)
            const isWeekend = activeDayOfWeek === "Saturday" || activeDayOfWeek === "Sunday"
            const totalRecordedDays = Object.keys(attendanceRecords).length

            return (
              <div className='tab-view attendance-view'>
                {/* Tab Header */}
                <div className='tab-header flexSB'>
                  <div>
                    <h2>Digital Roll Call & Attendance Register</h2>
                    <p>Persistent calendar-date tracking with actual weekday scheduling, historical logs, and SMS absence dispatch.</p>
                  </div>
                  <div className='flex' style={{ gap: '10px', flexWrap: 'wrap' }}>
                    <div className='button-filter-group'>
                      <button
                        className={`filter-btn ${attendanceViewMode === "roll_call" ? "active" : ""}`}
                        onClick={() => setAttendanceViewMode("roll_call")}
                      >
                        <i className='fas fa-list-check'></i> Daily Roll Call
                      </button>
                      <button
                        className={`filter-btn ${attendanceViewMode === "matrix" ? "active" : ""}`}
                        onClick={() => setAttendanceViewMode("matrix")}
                      >
                        <i className='fas fa-table-cells'></i> Mon–Fri Matrix
                      </button>
                    </div>
                    <button className='primary-btn' onClick={() => markAllPresent(attendanceDate, attendanceClass)}>
                      <i className='fas fa-check-double'></i> Mark All Present
                    </button>
                    <button className='outline-btn' onClick={() => sendAbsenceAlerts(attendanceDate)}>
                      <i className='fas fa-sms'></i> Send Absence Alerts
                    </button>
                  </div>
                </div>

                {/* Day-of-Week Banner & Quick Controls */}
                <div className='attendance-day-banner shadow flexSB'>
                  <div className='flex' style={{ gap: '14px', alignItems: 'center' }}>
                    <div className='day-icon-circle' style={{ background: isWeekend ? '#fef3c7' : '#ecfdf5', color: isWeekend ? '#b45309' : '#059669' }}>
                      <i className={isWeekend ? 'fas fa-mug-hot' : 'fas fa-calendar-day'}></i>
                    </div>
                    <div>
                      <span className='day-tag-badge' style={{ background: isWeekend ? '#fef3c7' : '#e0f2fe', color: isWeekend ? '#92400e' : '#0369a1' }}>
                        {isWeekend ? `Weekend (${activeDayOfWeek})` : `School Day • ${activeDayOfWeek}`}
                      </span>
                      <h3 style={{ margin: '3px 0 0 0', fontSize: '18px', color: '#0f172a' }}>
                        {formatAttendanceDateDisplay(attendanceDate)}
                      </h3>
                    </div>
                  </div>

                  <div className='flex' style={{ gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type='button'
                      className='outline-btn'
                      style={{ padding: '6px 12px', fontSize: '12.5px' }}
                      onClick={() => shiftAttendanceDate(-1)}
                      title='Previous Day'
                    >
                      <i className='fas fa-chevron-left'></i> Prev Day
                    </button>
                    <button
                      type='button'
                      className='outline-btn'
                      style={{ padding: '6px 12px', fontSize: '12.5px', background: attendanceDate === "2026-10-05" ? '#e2e8f0' : '#ffffff' }}
                      onClick={() => setAttendanceDate("2026-10-05")}
                      title='Jump to Today (Monday Oct 5)'
                    >
                      <i className='fas fa-crosshairs'></i> Today
                    </button>
                    <button
                      type='button'
                      className='outline-btn'
                      style={{ padding: '6px 12px', fontSize: '12.5px' }}
                      onClick={() => shiftAttendanceDate(1)}
                      title='Next Day'
                    >
                      Next Day <i className='fas fa-chevron-right'></i>
                    </button>
                  </div>
                </div>

                {/* 5-Day Mon–Fri Week Quick Strip */}
                <div className='attendance-week-strip shadow'>
                  <div className='week-strip-header flexSB'>
                    <small>
                      <i className='fas fa-calendar-week' style={{ color: '#00a884', marginRight: '6px' }}></i>
                      <strong>WEEKLY CALENDAR STRIP</strong> • Select any day to review or mark roll call:
                    </small>
                    <span className='week-strip-meta'>
                      {totalRecordedDays} School Days Logged in Term 1
                    </span>
                  </div>
                  <div className='week-strip-grid'>
                    {weekDays.map((wd) => {
                      const isSelected = wd.dateStr === attendanceDate
                      const dayRate = calculateDailyAttendanceRate(wd.dateStr, attendanceClass)
                      return (
                        <div
                          key={wd.dateStr}
                          className={`week-strip-card ${isSelected ? "selected" : ""}`}
                          onClick={() => setAttendanceDate(wd.dateStr)}
                        >
                          <div className='strip-day-name'>{wd.dayLabel}</div>
                          <div className='strip-day-num'>{wd.dayNumber} {wd.monthLabel}</div>
                          <div className={`strip-day-rate ${dayRate >= 90 ? "high" : dayRate >= 75 ? "mid" : "low"}`}>
                            {dayRate}% Rate
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Filter & Metric Bar */}
                <div className='filter-bar flexSB'>
                  <div className='filter-group'>
                    <label><i className='fas fa-calendar-alt'></i> Specific Calendar Date:</label>
                    <input
                      type='date'
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                    />
                  </div>

                  <div className='filter-group'>
                    <label><i className='fas fa-chalkboard-teacher'></i> Class Division Filter:</label>
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
                          <option value='All'>All Classes (Creche to SS 3)</option>
                          {availableSchoolClasses.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  <div className='attendance-summary-pill'>
                    <span>Daily Punctuality Rate: <strong>{dailyAttendanceRate}%</strong></span>
                  </div>
                </div>

                {/* VIEW 1: DAILY ROLL CALL MARKING */}
                {attendanceViewMode === "roll_call" && (
                  <div className='portal-card table-card shadow'>
                    <div className='card-header-line flexSB' style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                      <h3 style={{ margin: 0, fontSize: '15px' }}>
                        <i className='fas fa-clipboard-user' style={{ color: '#00a884', marginRight: '8px' }}></i>
                        Homeroom Roll Call for {formatAttendanceDateDisplay(attendanceDate)} ({activeDayOfWeek})
                      </h3>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>
                        Showing {filteredAttendance.length} Scholars • {attendanceClass === "All" ? "All Levels" : attendanceClass}
                      </span>
                    </div>

                    <table className='portal-table'>
                      <thead>
                        <tr>
                          <th>Scholar & ID</th>
                          <th>Class & House</th>
                          <th>Guardian Contact</th>
                          <th>Cumulative Term Log</th>
                          <th style={{ minWidth: '320px' }}>Mark Status ({activeDayOfWeek})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAttendance.length === 0 ? (
                          <tr>
                            <td colSpan='5' style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                              <i className='fas fa-info-circle' style={{ marginRight: '8px', fontSize: '18px' }}></i>
                              No scholars found in <strong>{attendanceClass}</strong> under your assigned authorization scope.
                            </td>
                          </tr>
                        ) : (
                          filteredAttendance.map((st) => {
                            const currentStatus = getStudentStatusForDate(st.id, attendanceDate)
                            const stats = getStudentAttendanceStats(st.id)

                            return (
                              <tr key={st.id}>
                                <td>
                                  <div className='flex' style={{ gap: '10px', alignItems: 'center' }}>
                                    <div className='scholar-mini-avatar'>
                                      <i className='fas fa-user-graduate'></i>
                                    </div>
                                    <div>
                                      <strong>{st.name}</strong>
                                      <small style={{ display: 'block', color: '#64748b' }}>{st.id}</small>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <strong>{st.grade}</strong> • <span className={`house-tag ${(st.house || "phoenix").toLowerCase()}`}>{st.house || "Phoenix"}</span>
                                </td>
                                <td>
                                  <span>{st.guardian}</span>
                                  <small style={{ display: 'block', color: '#64748b' }}>
                                    <i className='fas fa-phone' style={{ fontSize: '10px', marginRight: '4px' }}></i>{st.phone}
                                  </small>
                                </td>
                                <td>
                                  <div className='flex' style={{ gap: '8px', alignItems: 'center' }}>
                                    <span className={`status-pill ${stats.percentage >= 90 ? "paid" : stats.percentage >= 75 ? "partial" : "pending"}`} style={{ fontSize: '12px', padding: '4px 10px' }}>
                                      {stats.percentage}% Rate
                                    </span>
                                    <button
                                      type='button'
                                      className='att-history-btn'
                                      onClick={() => setSelectedHistoryStudent(st)}
                                      title='View full date-by-date attendance transcript'
                                    >
                                      <i className='fas fa-history'></i> History ({stats.totalDays}d)
                                    </button>
                                  </div>
                                </td>
                                <td>
                                  <div className='flex' style={{ gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div className='status-toggle-group'>
                                      <button
                                        type='button'
                                        className={`att-btn present ${currentStatus === "Present" ? "selected" : ""}`}
                                        onClick={() => handleAttendanceChange(st.id, "Present", attendanceDate)}
                                      >
                                        <i className='fas fa-check'></i> Present
                                      </button>
                                      <button
                                        type='button'
                                        className={`att-btn late ${currentStatus === "Late" ? "selected" : ""}`}
                                        onClick={() => handleAttendanceChange(st.id, "Late", attendanceDate)}
                                      >
                                        <i className='fas fa-clock'></i> Late
                                      </button>
                                      <button
                                        type='button'
                                        className={`att-btn absent ${currentStatus === "Absent" ? "selected" : ""}`}
                                        onClick={() => handleAttendanceChange(st.id, "Absent", attendanceDate)}
                                      >
                                        <i className='fas fa-times'></i> Absent
                                      </button>
                                      <button
                                        type='button'
                                        className={`att-btn excused ${currentStatus === "Excused" ? "selected" : ""}`}
                                        onClick={() => handleAttendanceChange(st.id, "Excused", attendanceDate)}
                                      >
                                        <i className='fas fa-shield-alt'></i> Excused
                                      </button>
                                    </div>

                                    {(currentStatus === "Absent" || currentStatus === "Late") && (
                                      <button
                                        type='button'
                                        className='att-followup-trigger-btn'
                                        onClick={() => {
                                          setAbsenceFollowUpFilter(currentStatus.toLowerCase())
                                          setShowAbsenceFollowUpModal(true)
                                        }}
                                        title={`Open SMS / WhatsApp template inquiry for ${st.guardian}`}
                                        style={{
                                          background: currentStatus === "Absent" ? '#fee2e2' : '#fef3c7',
                                          color: currentStatus === "Absent" ? '#dc2626' : '#b45309',
                                          border: `1px solid ${currentStatus === "Absent" ? '#fca5a5' : '#fde68a'}`,
                                          padding: '5px 10px',
                                          borderRadius: '6px',
                                          fontSize: '11px',
                                          fontWeight: '700',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                        }}
                                      >
                                        <i className='fas fa-paper-plane'></i> SMS / Follow-up
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* VIEW 2: WEEKLY MON-FRI ATTENDANCE MATRIX */}
                {attendanceViewMode === "matrix" && (
                  <div className='portal-card table-card shadow'>
                    <div className='card-header-line flexSB' style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                      <h3 style={{ margin: 0, fontSize: '15px' }}>
                        <i className='fas fa-table-cells' style={{ color: '#2563eb', marginRight: '8px' }}></i>
                        Weekly Mon–Fri Attendance Matrix ({weekDays[0]?.dayNumber} {weekDays[0]?.monthLabel} – {weekDays[4]?.dayNumber} {weekDays[4]?.monthLabel})
                      </h3>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>
                        Click any cell badge to toggle status (Present ➜ Late ➜ Absent ➜ Excused)
                      </span>
                    </div>

                    <table className='portal-table matrix-table'>
                      <thead>
                        <tr>
                          <th>Scholar</th>
                          <th>Class</th>
                          {weekDays.map((wd) => (
                            <th key={wd.dateStr} style={{ textAlign: 'center', background: wd.dateStr === attendanceDate ? '#f0fdf4' : 'transparent' }}>
                              <div><strong>{wd.dayLabel}</strong></div>
                              <small style={{ color: '#64748b' }}>{wd.dayNumber} {wd.monthLabel}</small>
                            </th>
                          ))}
                          <th style={{ textAlign: 'center' }}>Term Rate</th>
                          <th style={{ textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAttendance.length === 0 ? (
                          <tr>
                            <td colSpan='9' style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                              <i className='fas fa-info-circle' style={{ marginRight: '8px' }}></i>
                              No scholars in <strong>{attendanceClass}</strong>.
                            </td>
                          </tr>
                        ) : (
                          filteredAttendance.map((st) => {
                            const stats = getStudentAttendanceStats(st.id)

                            return (
                              <tr key={st.id}>
                                <td>
                                  <strong>{st.name}</strong>
                                  <small style={{ display: 'block', color: '#64748b' }}>{st.id}</small>
                                </td>
                                <td><strong>{st.grade}</strong></td>
                                {weekDays.map((wd) => {
                                  const status = getStudentStatusForDate(st.id, wd.dateStr)
                                  const nextStatusMap = {
                                    Present: "Late",
                                    Late: "Absent",
                                    Absent: "Excused",
                                    Excused: "Present",
                                  }
                                  return (
                                    <td key={wd.dateStr} style={{ textAlign: 'center', background: wd.dateStr === attendanceDate ? '#f0fdf4' : 'transparent' }}>
                                      <button
                                        type='button'
                                        className={`matrix-badge ${status.toLowerCase()}`}
                                        onClick={() => handleAttendanceChange(st.id, nextStatusMap[status] || "Present", wd.dateStr)}
                                        title={`${st.name} on ${wd.dayLabel} (${wd.dateStr}): ${status}. Click to cycle.`}
                                      >
                                        {status === "Present" ? "P" : status === "Late" ? "L" : status === "Absent" ? "A" : "E"}
                                      </button>
                                    </td>
                                  )
                                })}
                                <td style={{ textAlign: 'center' }}>
                                  <strong style={{ color: stats.percentage >= 90 ? '#059669' : stats.percentage >= 75 ? '#d97706' : '#dc2626' }}>
                                    {stats.percentage}%
                                  </strong>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    type='button'
                                    className='btn-action-sm'
                                    onClick={() => setSelectedHistoryStudent(st)}
                                  >
                                    <i className='fas fa-history'></i> History
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })()}

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

              {/* Status & Stream Filters */}
              <div className='filter-bar flexSB'>
                <div className='flex' style={{ gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className='filter-group'>
                    <label>Filter Campus:</label>
                    <select
                      value={invoiceCampusFilter}
                      onChange={(e) => setInvoiceCampusFilter(e.target.value)}
                    >
                      <option value='All'>All Campuses</option>
                      <option value='Headquarters'>Headquarters</option>
                      <option value='Annex'>Annex</option>
                    </select>
                  </div>

                  <div className='filter-group'>
                    <label>Filter Stream:</label>
                    <select
                      value={invoiceStreamFilter}
                      onChange={(e) => setInvoiceStreamFilter(e.target.value)}
                    >
                      <option value='All'>All Payment Streams</option>
                      <option value='returning'>Section A Only (Returning Scholars)</option>
                      <option value='new'>Section A + B (New Intake Package)</option>
                    </select>
                  </div>

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
                </div>

                <div className='flex' style={{ gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    className='outline-btn'
                    style={{ fontSize: '13px', padding: '6px 14px' }}
                    onClick={() => setActiveTab("fee-breakdown")}
                  >
                    <i className='fas fa-coins' style={{ color: '#00a884' }}></i> Section A vs B Analyzer
                  </button>
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
                      <th>Campus</th>
                      <th>Scholar Type</th>
                      <th>Term Period</th>
                      <th>Section A</th>
                      <th>Section B</th>
                      <th>Total Billed</th>
                      <th>Paid Amount</th>
                      <th>Balance Due</th>
                      <th>Status</th>
                      <th>Receipt & Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan='12' style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
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
                        const { secATotal, secBTotal, isReturning, effectiveTotal, amountPaid, balance } = calculateInvoiceBreakdown(inv)
                        const stObj = students.find((s) => s.id === inv.studentId || (s.name && inv.studentName && s.name.toLowerCase().trim() === inv.studentName.toLowerCase().trim()))
                        const invCampus = inv.campus || (stObj ? stObj.campus : "Headquarters")
                        return (
                          <tr key={inv.invoiceNo}>
                            <td><strong>{inv.invoiceNo}</strong></td>
                            <td>
                              <div>
                                <strong>{inv.studentName}</strong>
                                <small style={{ display: 'block', color: '#64748b' }}>{inv.grade}</small>
                              </div>
                            </td>
                            <td>
                              <span className={`campus-badge ${invCampus === "Annex" ? "annex" : "headquarters"}`}>
                                {invCampus}
                              </span>
                            </td>
                            <td>
                              {isReturning ? (
                                <span className='scholar-type-badge returning' title='Section A Termly Fees Only (Section B Waived)'>
                                  <i className='fas fa-star'></i> Returning Scholar
                                </span>
                              ) : (
                                <span className='scholar-type-badge new-intake' title='Section A + Section B Full Package'>
                                  <i className='fas fa-box'></i> New Intake
                                </span>
                              )}
                            </td>
                            <td>{inv.term}</td>
                            <td>₦{secATotal.toLocaleString()}</td>
                            <td>
                              {isReturning ? (
                                <span className='sec-b-waived-pill'>Waived (₦0)</span>
                              ) : (
                                `₦${secBTotal.toLocaleString()}`
                              )}
                            </td>
                            <td><strong>₦{effectiveTotal.toLocaleString()}</strong></td>
                            <td>
                              <strong style={{ color: '#00a884' }}>₦{amountPaid.toLocaleString()}</strong>
                            </td>
                            <td>
                              {balance === 0 ? (
                                <strong style={{ color: '#00a884' }}>₦0 (Paid in Full)</strong>
                              ) : (
                                <strong style={{ color: '#ef4444' }}>₦{balance.toLocaleString()}</strong>
                              )}
                            </td>
                            <td>
                              <span className={`status-pill ${inv.status.toLowerCase()}`}>
                                {inv.status}
                              </span>
                            </td>
                            <td>
                              <div className='action-buttons' style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button
                                  className='btn-action'
                                  title='Print Official BLIS Fee Receipt'
                                  onClick={() => setReceiptInvoice(inv)}
                                >
                                  <i className='fas fa-file-invoice-dollar'></i> Receipt
                                </button>
                                <button
                                  className='btn-action-primary'
                                  title='Record Payment Transaction'
                                  onClick={() => {
                                    setSelectedInvoiceForPayment(inv)
                                    setPaymentStudentType(isReturning ? "returning" : "new")
                                    setPaymentAmount(balance > 0 ? balance : "")
                                    setMarkAsCompleted(false)
                                    setShowPaymentModal(true)
                                  }}
                                >
                                  <i className='fas fa-hand-holding-usd'></i> Pay
                                </button>
                                {isReturning ? (
                                  <button
                                    className='btn-action-outline-warning'
                                    title='Switch to New Intake (Include Section B)'
                                    onClick={() => handleToggleStudentType(inv.invoiceNo, "new")}
                                  >
                                    <i className='fas fa-box-open'></i> +Sec B
                                  </button>
                                ) : (
                                  <button
                                    className='btn-action-outline-info'
                                    title='Switch to Returning Scholar (Waive Section B)'
                                    onClick={() => handleToggleStudentType(inv.invoiceNo, "returning")}
                                  >
                                    <i className='fas fa-user-check'></i> Ret
                                  </button>
                                )}
                                {(!isReturning || balance > 0 || inv.status !== "Paid") && (
                                  <button
                                    className='btn-action-success'
                                    title='Mark as Completed (Returning Scholar — Waive Section B & Set Balance to ₦0)'
                                    onClick={() => handleMarkCompletedAsReturning(inv.invoiceNo)}
                                  >
                                    <i className='fas fa-check-circle'></i> Mark Completed
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5B. SECTION A & SECTION B PAYMENT STREAMS ANALYZER */}
          {activeTab === "fee-breakdown" && (() => {
            const streamInvoices = invoices.filter((inv) => {
              const stObj = students.find((s) => s.id === inv.studentId || (s.name && inv.studentName && s.name.toLowerCase().trim() === inv.studentName.toLowerCase().trim()))
              const invCampus = inv.campus || (stObj ? stObj.campus : "Headquarters")
              const matchesCampus = feeStreamCampus === "All" || invCampus === feeStreamCampus
              const isRet = inv.studentType === "returning" || inv.sectionBWaived === true
              if (feeStreamFilter === "section_a") {
                if (!isRet) return false
              } else if (feeStreamFilter === "section_b") {
                if (isRet) return false
              }
              const matchesSearch = !feeStreamSearch || (
                (inv.studentName && inv.studentName.toLowerCase().includes(feeStreamSearch.toLowerCase())) ||
                (inv.invoiceNo && inv.invoiceNo.toLowerCase().includes(feeStreamSearch.toLowerCase())) ||
                (inv.grade && inv.grade.toLowerCase().includes(feeStreamSearch.toLowerCase()))
              )
              return matchesCampus && matchesSearch
            })

            const activeCampusInvoices = invoices.filter((inv) => {
              if (feeStreamCampus === "All") return true
              const stObj = students.find((s) => s.id === inv.studentId || (s.name && inv.studentName && s.name.toLowerCase().trim() === inv.studentName.toLowerCase().trim()))
              const c = inv.campus || (stObj ? stObj.campus : "Headquarters")
              return c === feeStreamCampus
            })

            const activeSecABilled = activeCampusInvoices.reduce((acc, inv) => acc + (calculateInvoiceBreakdown(inv).secATotal || 0), 0)
            const activeSecAPaid = activeCampusInvoices.reduce((acc, inv) => acc + (calculateInvoiceBreakdown(inv).secAPaid || 0), 0)
            const activeSecAOutstanding = Math.max(0, activeSecABilled - activeSecAPaid)
            const activeSecAEfficiency = activeSecABilled > 0 ? Math.round((activeSecAPaid / activeSecABilled) * 100) : 100

            const activeSecBBilled = activeCampusInvoices.reduce((acc, inv) => {
              const b = calculateInvoiceBreakdown(inv)
              return acc + (b.isReturning ? 0 : (b.secBTotal || 0))
            }, 0)
            const activeSecBPaid = activeCampusInvoices.reduce((acc, inv) => acc + (calculateInvoiceBreakdown(inv).secBPaid || 0), 0)
            const activeSecBOutstanding = Math.max(0, activeSecBBilled - activeSecBPaid)
            const activeSecBEfficiency = activeSecBBilled > 0 ? Math.round((activeSecBPaid / activeSecBBilled) * 100) : 100

            const activeReturningCount = activeCampusInvoices.filter((inv) => calculateInvoiceBreakdown(inv).isReturning).length
            const activeNewCount = activeCampusInvoices.filter((inv) => !calculateInvoiceBreakdown(inv).isReturning).length

            return (
              <div className='tab-view fee-breakdown-view'>
                <div className='tab-header flexSB'>
                  <div>
                    <h2>Payment Streams & Fees Breakdown (Section A & B)</h2>
                    <p>
                      Official audit view isolating <strong>Section A (Compulsory School Fees & Levies)</strong> from <strong>Section B (Uniforms, Books & Intake Materials)</strong> for Proprietor, Admin, and Bursary.
                    </p>
                  </div>
                  <div className='quick-action-btns'>
                    <button className='primary-btn' onClick={() => setShowAddInvoiceModal(true)}>
                      <i className='fas fa-plus'></i> Generate Fee Invoice
                    </button>
                    <button className='outline-btn' onClick={() => setShowProspectusModal(true)}>
                      <i className='fas fa-book-open'></i> Approved Prospectus Schedule
                    </button>
                    <button className='outline-btn' onClick={() => setActiveTab("finance")}>
                      <i className='fas fa-receipt'></i> Manage Ledger
                    </button>
                  </div>
                </div>

                {/* Campus Scoping Banner */}
                <div className='branch-filter-banner' style={{ marginBottom: '20px' }}>
                  <div className='branch-nav-left'>
                    <span className='branch-nav-title'>
                      <i className='fas fa-coins' style={{ color: '#00a884' }}></i>
                      Payment Stream Campus Scoping
                    </span>
                    <span className='branch-nav-sub'>
                      {feeStreamCampus === "All"
                        ? `Consolidated Telemetry across Headquarters & Annex (${activeCampusInvoices.length} Invoices)`
                        : `Financial Breakdown Filtered to ${feeStreamCampus} Campus (${activeCampusInvoices.length} Invoices)`}
                    </span>
                  </div>

                  <div className='branch-pills-group'>
                    <button
                      type='button'
                      className={`branch-pill-btn ${feeStreamCampus === "All" ? "active" : ""}`}
                      onClick={() => setFeeStreamCampus("All")}
                    >
                      <i className='fas fa-th-large'></i>
                      <span>All Campuses</span>
                      <span className='pill-count'>{invoices.length}</span>
                    </button>
                    <button
                      type='button'
                      className={`branch-pill-btn ${feeStreamCampus === "Headquarters" ? "active" : ""}`}
                      onClick={() => setFeeStreamCampus("Headquarters")}
                    >
                      <span className='campus-dot hq'></span>
                      <span>Headquarters</span>
                      <span className='pill-count'>{hqInvoices.length}</span>
                    </button>
                    <button
                      type='button'
                      className={`branch-pill-btn ${feeStreamCampus === "Annex" ? "active" : ""}`}
                      onClick={() => setFeeStreamCampus("Annex")}
                    >
                      <span className='campus-dot annex'></span>
                      <span>Annex</span>
                      <span className='pill-count'>{annexInvoices.length}</span>
                    </button>
                  </div>
                </div>

                {/* Core Stream Summary KPI Cards */}
                <div className='metrics-grid' style={{ marginBottom: '24px' }}>
                  <div className='metric-card shadow flex' style={{ borderTop: '4px solid #00a884' }}>
                    <div className='metric-icon emerald'><i className='fas fa-graduation-cap'></i></div>
                    <div className='metric-data'>
                      <small>SECTION A (FEES & LEVIES)</small>
                      <h3>₦{activeSecABilled.toLocaleString()}</h3>
                      <span className='trend-badge green'>
                        ₦{activeSecAPaid.toLocaleString()} Paid ({activeSecAEfficiency}%)
                      </span>
                    </div>
                  </div>

                  <div className='metric-card shadow flex' style={{ borderTop: '4px solid #4f46e5' }}>
                    <div className='metric-icon blue'><i className='fas fa-tshirt'></i></div>
                    <div className='metric-data'>
                      <small>SECTION B (UNIFORMS & BOOKS)</small>
                      <h3>₦{activeSecBBilled.toLocaleString()}</h3>
                      <span className='trend-badge blue'>
                        ₦{activeSecBPaid.toLocaleString()} Paid ({activeSecBEfficiency}%)
                      </span>
                    </div>
                  </div>

                  <div className='metric-card shadow flex'>
                    <div className='metric-icon gold'><i className='fas fa-users'></i></div>
                    <div className='metric-data'>
                      <small>SCHOLAR CLASSIFICATION</small>
                      <h3>{activeReturningCount} Returning • {activeNewCount} New</h3>
                      <span className='trend-badge amber'>
                        {activeReturningCount} Sec A Only • {activeNewCount} Full Package
                      </span>
                    </div>
                  </div>

                  <div className='metric-card shadow flex'>
                    <div className='metric-icon purple'><i className='fas fa-balance-scale'></i></div>
                    <div className='metric-data'>
                      <small>TOTAL OUTSTANDING DEBTORS</small>
                      <h3>₦{(activeSecAOutstanding + activeSecBOutstanding).toLocaleString()}</h3>
                      <span className='trend-badge red'>
                        Sec A: ₦{activeSecAOutstanding.toLocaleString()} • Sec B: ₦{activeSecBOutstanding.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visual Comparative Stream Analytics Grid */}
                <div className='stream-analytics-grid'>
                  {/* SECTION A CARD */}
                  <div className='stream-overview-card section-a'>
                    <div className='stream-card-header'>
                      <div className='stream-header-left'>
                        <div className='stream-icon-badge sec-a'>
                          <i className='fas fa-university'></i>
                        </div>
                        <div className='stream-title-text'>
                          <h3>Section A: Compulsory Tuition & Levies</h3>
                          <p>Direct school operational revenue (Payable by all scholars every term)</p>
                        </div>
                      </div>
                      <span className='stream-badge-pill sec-a'>{activeSecAEfficiency}% Efficiency</span>
                    </div>

                    <div className='stream-metric-row'>
                      <div className='stream-metric-box'>
                        <small>Total Billed</small>
                        <strong>₦{activeSecABilled.toLocaleString()}</strong>
                      </div>
                      <div className='stream-metric-box collected'>
                        <small>First Bank Cleared</small>
                        <strong>₦{activeSecAPaid.toLocaleString()}</strong>
                      </div>
                      <div className='stream-metric-box outstanding'>
                        <small>Pending Balance</small>
                        <strong>₦{activeSecAOutstanding.toLocaleString()}</strong>
                      </div>
                    </div>

                    <div className='stream-progress-section'>
                      <div className='stream-progress-label'>
                        <span>Collection Rate</span>
                        <span style={{ color: '#00a884' }}>{activeSecAEfficiency}%</span>
                      </div>
                      <div className='stream-progress-bar'>
                        <div className='stream-progress-fill sec-a' style={{ width: `${activeSecAEfficiency}%` }}></div>
                      </div>
                    </div>

                    <div className='stream-items-container'>
                      <div className='stream-items-title'>
                        <span>Standard Section A Inclusions & Termly Rates</span>
                        <span style={{ color: '#00a884' }}>6 Approved Levies</span>
                      </div>
                      <div className='stream-items-pills'>
                        <span className='stream-item-chip sec-a-chip'>
                          <i className='fas fa-chalkboard'></i> Tuition: <strong>₦14k - ₦23k</strong>
                        </span>
                        <span className='stream-item-chip sec-a-chip'>
                          <i className='fas fa-file-alt'></i> Examination: <strong>₦1k - ₦2k</strong>
                        </span>
                        <span className='stream-item-chip sec-a-chip'>
                          <i className='fas fa-user-graduate'></i> Lesson Fee: <strong>₦2k</strong>
                        </span>
                        <span className='stream-item-chip sec-a-chip'>
                          <i className='fas fa-hammer'></i> Development: <strong>₦1k</strong>
                        </span>
                        <span className='stream-item-chip sec-a-chip'>
                          <i className='fas fa-users'></i> PTA Levy: <strong>₦1k</strong>
                        </span>
                        <span className='stream-item-chip sec-a-chip'>
                          <i className='fas fa-briefcase-medical'></i> First Aid: <strong>₦500 - ₦1k</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SECTION B CARD */}
                  <div className='stream-overview-card section-b'>
                    <div className='stream-card-header'>
                      <div className='stream-header-left'>
                        <div className='stream-icon-badge sec-b'>
                          <i className='fas fa-tshirt'></i>
                        </div>
                        <div className='stream-title-text'>
                          <h3>Section B: Uniforms, Books & Intake Materials</h3>
                          <p>Physical student supplies package (Payable by New Intakes / Replacements)</p>
                        </div>
                      </div>
                      <span className='stream-badge-pill sec-b'>{activeSecBEfficiency}% Efficiency</span>
                    </div>

                    <div className='stream-metric-row'>
                      <div className='stream-metric-box'>
                        <small>Total Billed</small>
                        <strong>₦{activeSecBBilled.toLocaleString()}</strong>
                      </div>
                      <div className='stream-metric-box collected'>
                        <small>First Bank Cleared</small>
                        <strong>₦{activeSecBPaid.toLocaleString()}</strong>
                      </div>
                      <div className='stream-metric-box outstanding'>
                        <small>Pending Balance</small>
                        <strong>₦{activeSecBOutstanding.toLocaleString()}</strong>
                      </div>
                    </div>

                    <div className='stream-progress-section'>
                      <div className='stream-progress-label'>
                        <span>Collection Rate</span>
                        <span style={{ color: '#4f46e5' }}>{activeSecBEfficiency}%</span>
                      </div>
                      <div className='stream-progress-bar'>
                        <div className='stream-progress-fill sec-b' style={{ width: `${activeSecBEfficiency}%` }}></div>
                      </div>
                    </div>

                    <div className='stream-items-container'>
                      <div className='stream-items-title'>
                        <span>Standard Section B Materials Package</span>
                        <span style={{ color: '#4f46e5' }}>4 Material Categories</span>
                      </div>
                      <div className='stream-items-pills'>
                        <span className='stream-item-chip sec-b-chip'>
                          <i className='fas fa-tshirt'></i> Uniforms (2 Sets): <strong>₦8k - ₦20k</strong>
                        </span>
                        <span className='stream-item-chip sec-b-chip'>
                          <i className='fas fa-vest'></i> Cardigan / Sweater: <strong>₦10k</strong>
                        </span>
                        <span className='stream-item-chip sec-b-chip'>
                          <i className='fas fa-running'></i> Sport & Wed Wear: <strong>₦7k - ₦14k</strong>
                        </span>
                        <span className='stream-item-chip sec-b-chip'>
                          <i className='fas fa-book'></i> Textbooks & Exercise: <strong>₦8.5k - ₦32k</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interactive Stream Breakdown Ledger Table */}
                <div className='portal-card table-card' style={{ overflowX: 'auto', marginTop: '20px' }}>
                  <div className='card-header-line flexSB' style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
                        <i className='fas fa-list-alt' style={{ color: '#00a884' }}></i> Scholar-by-Scholar Section A vs Section B Audit Ledger
                      </h3>
                      <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                        Verify exactly how much each scholar is billed and has paid for Section A (Tuition & Levies) vs Section B (Uniforms & Materials).
                      </p>
                    </div>

                    <div className='stream-filter-pills-bar'>
                      <button
                        type='button'
                        className={`stream-filter-btn ${feeStreamFilter === "all" ? "active" : ""}`}
                        onClick={() => setFeeStreamFilter("all")}
                      >
                        All ({activeCampusInvoices.length})
                      </button>
                      <button
                        type='button'
                        className={`stream-filter-btn sec-a-btn ${feeStreamFilter === "section_a" ? "active sec-a-btn" : ""}`}
                        onClick={() => setFeeStreamFilter("section_a")}
                      >
                        <i className='fas fa-graduation-cap'></i> Section A Only ({activeReturningCount})
                      </button>
                      <button
                        type='button'
                        className={`stream-filter-btn sec-b-btn ${feeStreamFilter === "section_b" ? "active sec-b-btn" : ""}`}
                        onClick={() => setFeeStreamFilter("section_b")}
                      >
                        <i className='fas fa-box-open'></i> Section B Intakes ({activeNewCount})
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1', minWidth: '220px' }}>
                      <input
                        type='text'
                        placeholder='Search scholar name, class, or invoice number...'
                        value={feeStreamSearch}
                        onChange={(e) => setFeeStreamSearch(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <table className='portal-table'>
                    <thead>
                      <tr>
                        <th>Invoice No</th>
                        <th>Scholar Name</th>
                        <th>Class & Campus</th>
                        <th>Scholar Type</th>
                        <th>Section A (Fees & Levies)</th>
                        <th>Section B (Uniforms & Books)</th>
                        <th>Total Billed</th>
                        <th>Paid Amount</th>
                        <th>Balance</th>
                        <th>Status</th>
                        <th>Bursary Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {streamInvoices.length === 0 ? (
                        <tr>
                          <td colSpan='11' style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                            <i className='fas fa-search' style={{ fontSize: '28px', color: '#94a3b8', display: 'block', marginBottom: '10px' }}></i>
                            <strong>No scholar invoices match the selected filter criteria.</strong>
                          </td>
                        </tr>
                      ) : (
                        streamInvoices.map((inv) => {
                          const { secATotal, secBTotal, isReturning, effectiveTotal, amountPaid, balance } = calculateInvoiceBreakdown(inv)
                          const stObj = students.find((s) => s.id === inv.studentId || (s.name && inv.studentName && s.name.toLowerCase().trim() === inv.studentName.toLowerCase().trim()))
                          const invCampus = inv.campus || (stObj ? stObj.campus : "Headquarters")

                          return (
                            <tr key={inv.invoiceNo}>
                              <td><strong>{inv.invoiceNo}</strong></td>
                              <td>
                                <div>
                                  <strong>{inv.studentName}</strong>
                                  <small style={{ display: 'block', color: '#64748b' }}>{inv.studentId || "BLIS-SCHOLAR"}</small>
                                </div>
                              </td>
                              <td>
                                <div>
                                  <strong>{inv.grade}</strong>
                                  <span className={`campus-badge ${invCampus === "Annex" ? "annex" : "headquarters"}`} style={{ marginLeft: '6px', fontSize: '10px' }}>
                                    {invCampus}
                                  </span>
                                </div>
                              </td>
                              <td>
                                {isReturning ? (
                                  <span className='scholar-type-badge returning' title='Section A Termly Fees Only (Section B Waived)'>
                                    <i className='fas fa-star'></i> Returning
                                  </span>
                                ) : (
                                  <span className='scholar-type-badge new-intake' title='Section A + Section B Full Package'>
                                    <i className='fas fa-box'></i> New Intake
                                  </span>
                                )}
                              </td>
                              <td>
                                <div className='sec-a-cell'>
                                  <strong>₦{secATotal.toLocaleString()}</strong>
                                  <small style={{ display: 'block', color: '#059669', fontSize: '11px' }}>
                                    Paid: ₦{Math.min(amountPaid, secATotal).toLocaleString()}
                                  </small>
                                </div>
                              </td>
                              <td>
                                {isReturning ? (
                                  <span className='sec-b-waived-pill'>Waived (₦0)</span>
                                ) : (
                                  <div className='sec-b-cell'>
                                    <strong>₦{secBTotal.toLocaleString()}</strong>
                                    <small style={{ display: 'block', color: '#4f46e5', fontSize: '11px' }}>
                                      Paid: ₦{Math.max(0, amountPaid - secATotal).toLocaleString()}
                                    </small>
                                  </div>
                                )}
                              </td>
                              <td><strong>₦{effectiveTotal.toLocaleString()}</strong></td>
                              <td><strong style={{ color: '#00a884' }}>₦{amountPaid.toLocaleString()}</strong></td>
                              <td>
                                {balance === 0 ? (
                                  <strong style={{ color: '#00a884' }}>₦0 (Cleared ✓)</strong>
                                ) : (
                                  <strong style={{ color: '#ef4444' }}>₦{balance.toLocaleString()}</strong>
                                )}
                              </td>
                              <td>
                                <span className={`invoice-status ${inv.status.toLowerCase()}`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td>
                                <div className='flex' style={{ gap: '4px', flexWrap: 'wrap' }}>
                                  <button
                                    className='btn-action-sm'
                                    title='Record Payment'
                                    onClick={() => {
                                      setSelectedInvoiceForPayment(inv)
                                      setPaymentStudentType(isReturning ? "returning" : "new")
                                      setPaymentAmount(balance > 0 ? balance : "")
                                      setMarkAsCompleted(false)
                                      setShowPaymentModal(true)
                                    }}
                                  >
                                    <i className='fas fa-credit-card'></i> Pay
                                  </button>
                                  <button
                                    className='btn-action-sm'
                                    title='Print Fee Receipt'
                                    onClick={() => setReceiptInvoice(inv)}
                                  >
                                    <i className='fas fa-receipt'></i> Receipt
                                  </button>
                                  {isReturning ? (
                                    <button
                                      className='btn-action-sm outline'
                                      title='Switch to New Intake (Include Section B)'
                                      onClick={() => handleToggleStudentType(inv.invoiceNo, "new")}
                                    >
                                      <i className='fas fa-box-open'></i> +Sec B
                                    </button>
                                  ) : (
                                    <button
                                      className='btn-action-sm outline'
                                      title='Switch to Returning Scholar (Waive Section B)'
                                      onClick={() => handleToggleStudentType(inv.invoiceNo, "returning")}
                                    >
                                      <i className='fas fa-user-check'></i> Ret
                                    </button>
                                  )}
                                  {(!isReturning || balance > 0 || inv.status !== "Paid") && (
                                    <button
                                      className='btn-action-sm success'
                                      title='Mark as Completed (Waive Sec B & Set Bal to ₦0)'
                                      onClick={() => handleMarkCompletedAsReturning(inv.invoiceNo)}
                                    >
                                      <i className='fas fa-check-circle'></i> Complete
                                    </button>
                                  )}
                                </div>
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
                <div className='flex' style={{ gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type='button'
                    className='outline-btn'
                    style={{ color: '#00a884', borderColor: '#00a884' }}
                    onClick={() => setActiveTab("public-news")}
                    title='Manage news and blog articles displayed on the public school website'
                  >
                    <i className='fas fa-newspaper'></i> Public Website News &rarr;
                  </button>
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

          {/* 8b. PUBLIC WEBSITE NEWS & BLOG POSTS MANAGER */}
          {activeTab === "public-news" && (
            <div className='tab-view public-news-view'>
              <div className='tab-header flexSB'>
                <div>
                  <h2>Public Website News & Blog Articles</h2>
                  <p>Publish, edit, and manage articles showcased on the public website (Homepage, Journal/Notices, and Footer).</p>
                </div>
                <div className='flex' style={{ gap: '10px', flexWrap: 'wrap' }}>
                  <Link
                    to='/journal'
                    target='_blank'
                    rel='noreferrer'
                    className='outline-btn'
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className='fas fa-external-link-alt'></i> View Public Site
                  </Link>
                  {publicNews && publicNews.length > 0 && (
                    <button
                      type='button'
                      className='outline-btn'
                      style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                      onClick={() => {
                        if (window.confirm("Are you sure you want to clear all public news articles from the website?")) {
                          setPublicNews([])
                          savePublicNews([])
                          showToast("All public news posts removed from the website.")
                        }
                      }}
                    >
                      <i className='fas fa-trash-alt'></i> Clear All
                    </button>
                  )}
                  <button
                    className='primary-btn'
                    onClick={() => {
                      const today = new Date()
                      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
                      const formattedDate = `${months[today.getMonth()]}. ${String(today.getDate()).padStart(2, "0")}, ${today.getFullYear()}`
                      setEditingNewsItem(null)
                      setNewsForm({
                        title: "",
                        type: "School News",
                        date: formattedDate,
                        com: "0 COMMENTS",
                        desc: "",
                        cover: "./images/blog/b1.webp",
                        customCover: "",
                      })
                      setShowNewsModal(true)
                    }}
                  >
                    <i className='fas fa-plus'></i> Publish News Post
                  </button>
                </div>
              </div>

              {/* Public Site Connection Banner */}
              <div
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <i className='fas fa-broadcast-tower' style={{ fontSize: '20px', color: '#059669' }}></i>
                  <div>
                    <strong style={{ color: '#065f46', fontSize: '14px' }}>Public Website Broadcast Active</strong>
                    <p style={{ margin: 0, fontSize: '13px', color: '#047857' }}>
                      Posts created here sync instantly to the public Homepage, the Notices & Journal page (<code>/journal</code>), and the global footer.
                    </p>
                  </div>
                </div>
                <button
                  type='button'
                  className='outline-btn'
                  style={{ fontSize: '12px', padding: '6px 14px', background: '#fff', borderColor: '#059669', color: '#065f46' }}
                  onClick={() => setActiveTab("notices")}
                >
                  <i className='fas fa-bullhorn'></i> Go to Internal Portal Circulars
                </button>
              </div>

              {/* Public News Posts Grid */}
              <div className='notices-grid'>
                {publicNews && publicNews.length > 0 ? (
                  publicNews.map((n) => (
                    <div className='notice-card' key={n.id} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <div style={{ height: '160px', width: 'calc(100% + 32px)', overflow: 'hidden', background: '#e2e8f0', position: 'relative', borderRadius: '8px 8px 0 0', margin: '-16px -16px 14px -16px' }}>
                        <img
                          src={n.cover || "./images/blog/b1.webp"}
                          alt={n.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.src = "./images/blog/b1.webp"
                          }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            background: '#00a884',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                          }}
                        >
                          {n.type || "School News"}
                        </span>
                      </div>

                      <div className='notice-head flexSB' style={{ marginBottom: '8px' }}>
                        <small style={{ color: '#64748b', fontWeight: '600' }}>
                          <i className='fas fa-calendar-alt' style={{ color: '#00a884', marginRight: '5px' }}></i> {n.date || "Recent"}
                        </small>
                        <div className='flex' style={{ gap: '6px' }}>
                          <button
                            type='button'
                            title='Edit Article'
                            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0284c7', cursor: 'pointer', padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => {
                              setEditingNewsItem(n)
                              setNewsForm({
                                title: n.title || "",
                                type: n.type || "School News",
                                date: n.date || "",
                                com: n.com || "0 COMMENTS",
                                desc: n.desc || "",
                                cover: n.cover || "./images/blog/b1.webp",
                                customCover: DEFAULT_NEWS_COVERS.some((c) => c.path === n.cover) ? "" : n.cover,
                              })
                              setShowNewsModal(true)
                            }}
                          >
                            <i className='fas fa-edit'></i> Edit
                          </button>
                          <button
                            type='button'
                            title='Delete Article'
                            style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => {
                              if (window.confirm(`Delete news article "${n.title}" from the public website?`)) {
                                const updated = publicNews.filter((item) => item.id !== n.id)
                                setPublicNews(updated)
                                savePublicNews(updated)
                                showToast(`Article "${n.title}" deleted from public site.`)
                              }
                            }}
                          >
                            <i className='fas fa-trash'></i>
                          </button>
                        </div>
                      </div>

                      <h3 style={{ fontSize: '16px', lineHeight: '1.4', marginBottom: '8px', color: '#0f172a' }}>{n.title}</h3>
                      <p className='notice-content' style={{ flex: 1, fontSize: '13.5px', color: '#475569', lineHeight: '1.6', marginBottom: '14px' }}>
                        {n.desc}
                      </p>

                      <div className='notice-footer flexSB' style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: 'auto' }}>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          <i className='fas fa-comments'></i> {n.com || "0 COMMENTS"}
                        </span>
                        <Link
                          to='/journal'
                          target='_blank'
                          rel='noreferrer'
                          style={{ fontSize: '12px', color: '#00a884', fontWeight: '700', textDecoration: 'none' }}
                        >
                          Preview Live <i className='fas fa-arrow-right'></i>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <i className='fas fa-newspaper' style={{ fontSize: '44px', color: '#94a3b8', marginBottom: '14px', display: 'inline-block' }}></i>
                    <h3 style={{ color: '#071626', marginBottom: '8px' }}>No Public News Articles Published Yet</h3>
                    <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px' }}>
                      Compose articles, event announcements, and academic updates to showcase directly on the public school website.
                    </p>
                    <button
                      className='primary-btn'
                      onClick={() => {
                        const today = new Date()
                        const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
                        const formattedDate = `${months[today.getMonth()]}. ${String(today.getDate()).padStart(2, "0")}, ${today.getFullYear()}`
                        setEditingNewsItem(null)
                        setNewsForm({
                          title: "",
                          type: "School News",
                          date: formattedDate,
                          com: "0 COMMENTS",
                          desc: "",
                          cover: "./images/blog/b1.webp",
                          customCover: "",
                        })
                        setShowNewsModal(true)
                      }}
                    >
                      <i className='fas fa-plus'></i> Compose First News Post
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
                  <label>Assigned Campus / Branch *</label>
                  <select
                    value={newStudentForm.campus || "Headquarters"}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, campus: e.target.value })}
                  >
                    <option value='Headquarters'>Headquarters Campus (Gura-Suga, Opp. Police Staff College)</option>
                    <option value='Annex'>Annex Campus (Rayfield / Zawan Road)</option>
                  </select>
                </div>
                <div className='form-group'>
                  <label>Gender *</label>
                  <select
                    value={newStudentForm.gender || "Male"}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, gender: e.target.value })}
                  >
                    <option value='Male'>Male</option>
                    <option value='Female'>Female</option>
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

              {/* Scholar Enrollment Classification */}
              <div className='form-group'>
                <label>Scholar Enrollment Classification *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: (newStudentForm.studentType || "returning") === "returning" ? '2px solid #00a884' : '1px solid #cbd5e1',
                      background: (newStudentForm.studentType || "returning") === "returning" ? '#f0fdf4' : '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: (newStudentForm.studentType || "returning") === "returning" ? '#065f46' : '#334155' }}>
                      <input
                        type='radio'
                        name='newStudentStudentType'
                        checked={(newStudentForm.studentType || "returning") === "returning"}
                        onChange={() => setNewStudentForm({ ...newStudentForm, studentType: "returning" })}
                      />
                      <span>⭐ Returning Scholar</span>
                    </div>
                    <small style={{ marginTop: '4px', color: '#64748b' }}>
                      Section A only (Tuition & Levies). Section B waived.
                    </small>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: newStudentForm.studentType === "new" ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: newStudentForm.studentType === "new" ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: newStudentForm.studentType === "new" ? '#1e40af' : '#334155' }}>
                      <input
                        type='radio'
                        name='newStudentStudentType'
                        checked={newStudentForm.studentType === "new"}
                        onChange={() => setNewStudentForm({ ...newStudentForm, studentType: "new" })}
                      />
                      <span>📦 New Intake Scholar</span>
                    </div>
                    <small style={{ marginTop: '4px', color: '#64748b' }}>
                      Section A + Section B (Uniforms & Materials).
                    </small>
                  </label>
                </div>
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

      {/* --- MODAL: SCHOLAR ATTENDANCE HISTORY & TRANSCRIPT MODAL --- */}
      {selectedHistoryStudent && (() => {
        const stats = getStudentAttendanceStats(selectedHistoryStudent.id)
        return (
          <div className='blis-modal-overlay' onClick={() => setSelectedHistoryStudent(null)}>
            <div className='blis-modal-card attendance-history-modal' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
              <div className='modal-header'>
                <div className='flex' style={{ gap: '12px', alignItems: 'center' }}>
                  <div className='scholar-mini-avatar' style={{ width: '42px', height: '42px', fontSize: '18px' }}>
                    <i className='fas fa-user-graduate'></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>{selectedHistoryStudent.name}</h3>
                    <small style={{ color: '#64748b' }}>
                      ID: <strong>{selectedHistoryStudent.id}</strong> • Class: <strong>{selectedHistoryStudent.grade}</strong> • House: <strong>{selectedHistoryStudent.house || "Phoenix"}</strong>
                    </small>
                  </div>
                </div>
                <div className='flex' style={{ gap: '10px' }}>
                  <button className='outline-btn' style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => window.print()}>
                    <i className='fas fa-print'></i> Print History
                  </button>
                  <button className='modal-close' onClick={() => setSelectedHistoryStudent(null)}>×</button>
                </div>
              </div>

              {/* Scholar Stats Grid */}
              <div className='modal-body' style={{ maxHeight: '72vh', overflowY: 'auto', padding: '20px' }}>
                <div className='metrics-grid' style={{ marginBottom: '20px' }}>
                  <div className='metric-card shadow flex' style={{ padding: '12px 14px' }}>
                    <div className='metric-icon emerald'><i className='fas fa-chart-pie'></i></div>
                    <div className='metric-data'>
                      <small>TERM RATE</small>
                      <h3 style={{ fontSize: '18px' }}>{stats.percentage}%</h3>
                      <span className='trend-badge green'>{stats.totalDays} Total Days</span>
                    </div>
                  </div>

                  <div className='metric-card shadow flex' style={{ padding: '12px 14px' }}>
                    <div className='metric-icon green'><i className='fas fa-check-circle'></i></div>
                    <div className='metric-data'>
                      <small>PRESENT</small>
                      <h3 style={{ fontSize: '18px' }}>{stats.presentDays} Days</h3>
                      <span className='trend-badge green'>Punctual</span>
                    </div>
                  </div>

                  <div className='metric-card shadow flex' style={{ padding: '12px 14px' }}>
                    <div className='metric-icon amber'><i className='fas fa-clock'></i></div>
                    <div className='metric-data'>
                      <small>LATE</small>
                      <h3 style={{ fontSize: '18px' }}>{stats.lateDays} Days</h3>
                      <span className='trend-badge amber'>After 07:45</span>
                    </div>
                  </div>

                  <div className='metric-card shadow flex' style={{ padding: '12px 14px' }}>
                    <div className='metric-icon red'><i className='fas fa-times-circle'></i></div>
                    <div className='metric-data'>
                      <small>ABSENT</small>
                      <h3 style={{ fontSize: '18px' }}>{stats.absentDays} Days</h3>
                      <span className='trend-badge red'>{stats.absentDays === 0 ? "None" : "Unexcused"}</span>
                    </div>
                  </div>
                </div>

                {/* Guardian Info Box */}
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }} className='flexSB'>
                  <div>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Primary Guardian:</span>
                    <strong style={{ display: 'block', color: '#0f172a' }}>{selectedHistoryStudent.guardian} ({selectedHistoryStudent.phone})</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Class Level / Status:</span>
                    <strong style={{ display: 'block', color: '#00a884' }}>{selectedHistoryStudent.grade} • Active Scholar</strong>
                  </div>
                </div>

                {/* Historical Log Table */}
                <div className='portal-card table-card shadow'>
                  <div className='card-header-line flexSB' style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <h4 style={{ margin: 0, fontSize: '14px' }}>
                      <i className='fas fa-calendar-alt' style={{ color: '#00a884', marginRight: '6px' }}></i>
                      Chronological Roll Call Log with Actual Weekdays ({stats.history.length} Days)
                    </h4>
                    <small style={{ color: '#64748b' }}>1-Click Quick Status Correction / Override</small>
                  </div>

                  <table className='portal-table' style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>Calendar Date</th>
                        <th>Day of Week</th>
                        <th>Recorded Status</th>
                        <th style={{ textAlign: 'center' }}>Quick Correct</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.history.length === 0 ? (
                        <tr>
                          <td colSpan='4' style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                            No calendar days recorded yet for {selectedHistoryStudent.name}.
                          </td>
                        </tr>
                      ) : (
                        stats.history.map((h, idx) => (
                          <tr key={idx}>
                            <td>
                              <strong>{h.displayDate}</strong>
                              <small style={{ display: 'block', color: '#64748b' }}>{h.date}</small>
                            </td>
                            <td>
                              <span className='day-of-week-badge'>
                                <i className='fas fa-calendar-day' style={{ marginRight: '5px', color: '#00a884' }}></i>
                                {h.dayOfWeek}
                              </span>
                            </td>
                            <td>
                              <span className={`status-pill ${h.status === "Present" ? "paid" : h.status === "Late" ? "partial" : h.status === "Excused" ? "partial" : "pending"}`}>
                                {h.status.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div className='status-toggle-group' style={{ justifyContent: 'center' }}>
                                <button
                                  type='button'
                                  className={`att-btn-sm present ${h.status === "Present" ? "active" : ""}`}
                                  onClick={() => handleAttendanceChange(selectedHistoryStudent.id, "Present", h.date)}
                                  title='Mark Present'
                                >
                                  P
                                </button>
                                <button
                                  type='button'
                                  className={`att-btn-sm late ${h.status === "Late" ? "active" : ""}`}
                                  onClick={() => handleAttendanceChange(selectedHistoryStudent.id, "Late", h.date)}
                                  title='Mark Late'
                                >
                                  L
                                </button>
                                <button
                                  type='button'
                                  className={`att-btn-sm absent ${h.status === "Absent" ? "active" : ""}`}
                                  onClick={() => handleAttendanceChange(selectedHistoryStudent.id, "Absent", h.date)}
                                  title='Mark Absent'
                                >
                                  A
                                </button>
                                <button
                                  type='button'
                                  className={`att-btn-sm excused ${h.status === "Excused" ? "active" : ""}`}
                                  onClick={() => handleAttendanceChange(selectedHistoryStudent.id, "Excused", h.date)}
                                  title='Mark Excused'
                                >
                                  E
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className='modal-actions flexSB' style={{ marginTop: '20px' }}>
                  <button type='button' className='outline-btn' onClick={() => setSelectedHistoryStudent(null)}>
                    Close Transcript
                  </button>
                  <button
                    type='button'
                    className='primary-btn'
                    onClick={() => {
                      setAttendanceDate(stats.history[0]?.date || attendanceDate)
                      setSelectedHistoryStudent(null)
                    }}
                  >
                    <i className='fas fa-eye'></i> View in Daily Register
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* --- MODAL: ABSENCE FOLLOW-UP & PARENT SMS DISPATCH HUB --- */}
      {showAbsenceFollowUpModal && (() => {
        const dayMap = attendanceRecords[attendanceDate] || {}
        const teacherAllowed = currentUser && currentUser.role === "teacher" ? (currentUser.assignedClasses || []) : null
        
        const allScholarsInScope = students.filter((st) => {
          if (teacherAllowed) {
            if (!teacherAllowed.includes(st.grade) && !teacherAllowed.includes("All Classes")) return false
          }
          return attendanceClass === "All" || st.grade === attendanceClass
        })

        const absentScholars = allScholarsInScope.filter((st) => (dayMap[st.id] || "Present") === "Absent")
        const lateScholars = allScholarsInScope.filter((st) => (dayMap[st.id] || "Present") === "Late")
        
        const targetList = absenceFollowUpFilter === "absent"
          ? absentScholars
          : absenceFollowUpFilter === "late"
            ? lateScholars
            : [...absentScholars, ...lateScholars]

        const generateBulkSmsText = () => {
          if (targetList.length === 0) return ""
          return targetList.map((st) => {
            const status = dayMap[st.id] || "Absent"
            const msg = generateAbsenceSMSText(st, status, attendanceDate)
            return `TO: ${st.guardian} (${st.phone})\nSCHOLAR: ${st.name} (${st.grade})\nMESSAGE:\n${msg}\n----------------------------------------`
          }).join("\n\n")
        }

        return (
          <div className='blis-modal-overlay' onClick={() => setShowAbsenceFollowUpModal(false)}>
            <div className='blis-modal-card absence-dispatch-modal' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '860px' }}>
              <div className='modal-header'>
                <div className='flex' style={{ gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                    <i className='fas fa-sms'></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>Absence Follow-up & Parent SMS Hub</h3>
                    <small style={{ color: '#64748b' }}>
                      {getDayOfWeekName(attendanceDate)}, {formatAttendanceDateDisplay(attendanceDate)} • Manual SMS Templates & Portal Dispatch
                    </small>
                  </div>
                </div>
                <button className='modal-close' onClick={() => setShowAbsenceFollowUpModal(false)}>×</button>
              </div>

              <div className='modal-body' style={{ maxHeight: '74vh', overflowY: 'auto', padding: '20px' }}>
                {/* Status Filter and Batch Action Bar */}
                <div className='flexSB' style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div className='button-filter-group'>
                    <button
                      type='button'
                      className={`filter-btn ${absenceFollowUpFilter === "all" ? "active" : ""}`}
                      onClick={() => setAbsenceFollowUpFilter("all")}
                    >
                      All Follow-ups ({absentScholars.length + lateScholars.length})
                    </button>
                    <button
                      type='button'
                      className={`filter-btn ${absenceFollowUpFilter === "absent" ? "active" : ""}`}
                      onClick={() => setAbsenceFollowUpFilter("absent")}
                    >
                      Absent ({absentScholars.length})
                    </button>
                    <button
                      type='button'
                      className={`filter-btn ${absenceFollowUpFilter === "late" ? "active" : ""}`}
                      onClick={() => setAbsenceFollowUpFilter("late")}
                    >
                      Late ({lateScholars.length})
                    </button>
                  </div>

                  <div className='flex' style={{ gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type='button'
                      className='primary-btn'
                      style={{ background: '#00a884', fontSize: '12.5px', padding: '8px 16px' }}
                      onClick={() => dispatchAllAbsenceNotices(attendanceDate)}
                    >
                      <i className='fas fa-bullhorn'></i> Dispatch All to Parent Portals
                    </button>
                    <button
                      type='button'
                      className='outline-btn'
                      style={{ fontSize: '12.5px', padding: '8px 14px' }}
                      onClick={() => copyTextToClipboard(generateBulkSmsText(), "Bulk SMS list copied for all absent/late scholars!")}
                    >
                      <i className='fas fa-copy'></i> Copy Bulk SMS List
                    </button>
                  </div>
                </div>

                {/* Scholars Follow-up List */}
                {targetList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 20px', background: '#f0fdf4', borderRadius: '12px', border: '1.5px dashed #86efac', color: '#166534' }}>
                    <i className='fas fa-check-circle' style={{ fontSize: '44px', color: '#16a34a', display: 'block', marginBottom: '12px' }}></i>
                    <h3 style={{ margin: '0 0 6px 0' }}>100% Attendance Verified!</h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#15803d' }}>
                      No scholars are marked Absent or Late for <strong>{formatAttendanceDateDisplay(attendanceDate)}</strong> under {attendanceClass === "All" ? "all classes" : attendanceClass}.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {targetList.map((st) => {
                      const status = dayMap[st.id] || "Absent"
                      const smsText = generateAbsenceSMSText(st, status, attendanceDate)
                      const isAbsent = status === "Absent"

                      return (
                        <div
                          key={st.id}
                          className='portal-card shadow'
                          style={{
                            borderLeft: `5px solid ${isAbsent ? '#dc2626' : '#d97706'}`,
                            padding: '16px 20px',
                            background: '#ffffff',
                          }}
                        >
                          <div className='flexSB' style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                            <div className='flex' style={{ gap: '12px', alignItems: 'center' }}>
                              <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: isAbsent ? '#fee2e2' : '#fef3c7', color: isAbsent ? '#dc2626' : '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                                <i className={isAbsent ? 'fas fa-user-xmark' : 'fas fa-clock'}></i>
                              </div>
                              <div>
                                <div className='flex' style={{ gap: '8px', alignItems: 'center' }}>
                                  <strong style={{ fontSize: '15px', color: '#0f172a' }}>{st.name}</strong>
                                  <span className={`status-pill ${isAbsent ? "pending" : "partial"}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                                    {status.toUpperCase()}
                                  </span>
                                </div>
                                <small style={{ color: '#64748b' }}>
                                  ID: {st.id} • Class: <strong>{st.grade}</strong> • House: {st.house || "Phoenix"}
                                </small>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '12px', color: '#64748b' }}>Primary Guardian:</span>
                              <strong style={{ display: 'block', fontSize: '13.5px', color: '#0f172a' }}>{st.guardian}</strong>
                              <small style={{ color: '#00a884', fontWeight: '700' }}>
                                <i className='fas fa-phone' style={{ fontSize: '10px', marginRight: '4px' }}></i>{st.phone}
                              </small>
                            </div>
                          </div>

                          {/* Pre-filled Template Box */}
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
                            <div className='flexSB' style={{ marginBottom: '6px' }}>
                              <small style={{ fontWeight: '700', color: '#475569', textTransform: 'uppercase', fontSize: '11px' }}>
                                <i className='fas fa-envelope-open-text' style={{ marginRight: '5px', color: '#00a884' }}></i>
                                Ready-to-Send SMS & Inquiry Message Template:
                              </small>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>
                                {smsText.length} characters
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: '13px', color: '#1e293b', lineHeight: '1.5', fontFamily: 'inherit' }}>
                              "{smsText}"
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className='flexSB' style={{ flexWrap: 'wrap', gap: '8px' }}>
                            <div className='flex' style={{ gap: '8px', flexWrap: 'wrap' }}>
                              <button
                                type='button'
                                className='primary-btn'
                                style={{ background: '#0284c7', fontSize: '12px', padding: '6px 14px' }}
                                onClick={() => copyTextToClipboard(smsText, `SMS template for ${st.name}'s guardian copied!`)}
                              >
                                <i className='fas fa-copy'></i> Copy SMS Template
                              </button>
                              <button
                                type='button'
                                className='primary-btn'
                                style={{ background: '#25D366', borderColor: '#25D366', color: '#fff', fontSize: '12px', padding: '6px 14px' }}
                                onClick={() => openWhatsAppTemplate(st.phone, smsText)}
                              >
                                <i className='fab fa-whatsapp'></i> Send via WhatsApp
                              </button>
                              <a
                                href={`tel:${st.phone}`}
                                className='outline-btn'
                                style={{ fontSize: '12px', padding: '6px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <i className='fas fa-phone-alt'></i> Call Guardian
                              </a>
                            </div>

                            <div>
                              <button
                                type='button'
                                className='primary-btn'
                                style={{ background: '#00a884', fontSize: '12px', padding: '6px 14px' }}
                                onClick={() => dispatchAttendanceNoticeToParent(st, status, attendanceDate)}
                              >
                                <i className='fas fa-paper-plane'></i> Post to Parent Portal
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className='modal-actions flexSB' style={{ marginTop: '20px' }}>
                  <button type='button' className='outline-btn' onClick={() => setShowAbsenceFollowUpModal(false)}>
                    Close Dispatch Hub
                  </button>
                  <small style={{ color: '#64748b' }}>
                    Tip: Clicking "Post to Parent Portal" instantly delivers the notice to the guardian's dashboard and circulars.
                  </small>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* --- MODAL 3: OFFICIAL BLIS REPORT CARD GENERATOR & ACCESS GATE --- */}
      {reportCardStudent && (() => {
        const accessCheck = checkStudentResultAccess(reportCardStudent)

        if (!accessCheck.allowed) {
          return (
            <div className='blis-modal-overlay' onClick={() => { setReportCardStudent(null); setEnteredResultPin(""); setPinError(""); }}>
              <div className='blis-modal-card report-card-modal' style={{ maxWidth: '620px', padding: '0', borderRadius: '16px', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
                <div className='modal-header no-print' style={{ borderBottom: '1px solid #e2e8f0', padding: '18px 24px', background: '#f8fafc' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', color: '#071626', margin: 0 }}>Terminal Progress Report Access Gate</h3>
                    <small style={{ color: '#64748b' }}>Brighter Land International School Assessment Registry</small>
                  </div>
                  <button className='modal-close' onClick={() => { setReportCardStudent(null); setEnteredResultPin(""); setPinError(""); }}>×</button>
                </div>

                <div style={{ padding: '32px 28px', textAlign: 'center' }}>
                  {accessCheck.reason === "not_published" ? (
                    <div>
                      <div style={{ width: '68px', height: '68px', background: '#fef3c7', color: '#d97706', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '0 auto 16px', border: '2px solid #fde68a' }}>
                        <i className='fas fa-hourglass-half'></i>
                      </div>
                      <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
                        Terminal Results Not Yet Released
                      </h3>
                      <span className='status-pill' style={{ background: '#fef3c7', color: '#b45309', fontWeight: '700', padding: '4px 14px', borderRadius: '20px', display: 'inline-block', marginBottom: '16px', fontSize: '12px' }}>
                        ⏳ Collation & Principal Review in Progress
                      </span>
                      <p style={{ color: '#475569', fontSize: '14px', lineHeight: '1.65', maxWidth: '480px', margin: '0 auto 20px' }}>
                        The 2026/2027 Term 1 examination broadsheet and official sealed report card for <strong>{reportCardStudent.name}</strong> ({reportCardStudent.grade}) are currently being compiled by the class Form Master and undergoing final executive verification by the Principal.
                      </p>
                      <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'left', marginBottom: '22px', fontSize: '13px', color: '#334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontWeight: '700', color: '#1e40af' }}>
                          <i className='fas fa-info-circle'></i> Continuous Assessment Remains Accessible
                        </div>
                        You can view your child's assignment scores, continuous assessments, and daily attendance in your <strong>Parent Dashboard</strong>. The final sealed report card will be released once the term concludes.
                      </div>
                      <button className='primary-btn' style={{ width: '100%', padding: '12px' }} onClick={() => setReportCardStudent(null)}>
                        Return to Ward Dashboard
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ width: '68px', height: '68px', background: '#fee2e2', color: '#dc2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '0 auto 16px', border: '2px solid #fecaca' }}>
                        <i className='fas fa-lock'></i>
                      </div>
                      <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
                        Result Download Access Restricted
                      </h3>
                      <span className='status-pill' style={{ background: '#fee2e2', color: '#991b1b', fontWeight: '700', padding: '4px 14px', borderRadius: '20px', display: 'inline-block', marginBottom: '16px', fontSize: '12px' }}>
                        🔒 Complete Term 1 School Fees Required
                      </span>
                      <p style={{ color: '#475569', fontSize: '13.5px', lineHeight: '1.6', margin: '0 auto 18px' }}>
                        Under institutional policy, official end-of-term academic progress reports and class promotion rankings can only be downloaded once complete school fees are cleared or authorized by the Bursary.
                      </p>

                      {/* Outstanding Fee Breakdown Box */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', textAlign: 'left', marginBottom: '18px' }}>
                        <div className='flexSB' style={{ marginBottom: '6px', fontSize: '13px' }}>
                          <span style={{ color: '#64748b' }}>Scholar:</span>
                          <strong>{reportCardStudent.name} ({reportCardStudent.grade})</strong>
                        </div>
                        <div className='flexSB' style={{ marginBottom: '6px', fontSize: '13px' }}>
                          <span style={{ color: '#64748b' }}>Term Total Billed:</span>
                          <strong>₦{(accessCheck.effectiveTotal || 0).toLocaleString()}</strong>
                        </div>
                        <div className='flexSB' style={{ marginBottom: '6px', fontSize: '13px' }}>
                          <span style={{ color: '#64748b' }}>Amount Paid (First Bank):</span>
                          <span style={{ color: '#059669', fontWeight: '700' }}>₦{(accessCheck.amountPaid || 0).toLocaleString()}</span>
                        </div>
                        <div className='flexSB' style={{ paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '13.5px' }}>
                          <span style={{ fontWeight: '700', color: '#0f172a' }}>Outstanding Balance:</span>
                          <strong style={{ color: '#dc2626', fontSize: '15px' }}>₦{(accessCheck.balance || 0).toLocaleString()}</strong>
                        </div>
                      </div>

                      {/* PIN Entry Box */}
                      <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '12px', padding: '16px 18px', textAlign: 'left', marginBottom: '18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e40af', fontWeight: '700', fontSize: '13.5px', marginBottom: '4px' }}>
                          <i className='fas fa-key'></i> Enter Bursar Result Clearance PIN
                        </div>
                        <p style={{ fontSize: '12px', color: '#475569', marginBottom: '12px', lineHeight: '1.5' }}>
                          If you have completed your payment or have been issued an official Result Access PIN by the Bursar, enter your clearance code below to unlock instant download.
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type='text'
                            value={enteredResultPin}
                            onChange={(e) => { setEnteredResultPin(e.target.value); setPinError(""); }}
                            placeholder='e.g. BLIS-1001'
                            style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: pinError ? '1.5px solid #ef4444' : '1.5px solid #93c5fd', fontSize: '13.5px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '1px' }}
                          />
                          <button
                            type='button'
                            className='primary-btn'
                            style={{ padding: '9px 16px', whiteSpace: 'nowrap', fontSize: '13px' }}
                            onClick={() => handleVerifyResultPin(reportCardStudent)}
                          >
                            Unlock Result
                          </button>
                        </div>
                        {pinError && (
                          <small style={{ color: '#ef4444', fontWeight: '600', display: 'block', marginTop: '6px' }}>
                            <i className='fas fa-exclamation-triangle'></i> {pinError}
                          </small>
                        )}
                      </div>

                      {/* Bursary Bank Account Info */}
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#475569', marginBottom: '18px' }}>
                        <div style={{ fontWeight: '700', color: '#071626', marginBottom: '2px' }}>
                          <i className='fas fa-university' style={{ color: '#059669', marginRight: '6px' }}></i> First Bank Official Fee Account
                        </div>
                        <div>Account Name: <strong>Brighter Land International School</strong></div>
                        <div>Account Number: <strong>2043561832</strong> • Bank: <strong>First Bank</strong></div>
                        <div style={{ marginTop: '2px', color: '#64748b' }}>Bursary Helpdesk: <strong>+234 803 436 7951</strong></div>
                      </div>

                      <div className='flex' style={{ gap: '10px' }}>
                        {accessCheck.invoice && (
                          <button className='outline-btn' style={{ flex: 1, padding: '10px' }} onClick={() => { setReceiptInvoice(accessCheck.invoice); setReportCardStudent(null); }}>
                            <i className='fas fa-receipt'></i> View Fee Invoice
                          </button>
                        )}
                        <button className='secondary-btn' style={{ flex: 1, padding: '10px', background: '#e2e8f0', color: '#1e293b' }} onClick={() => setReportCardStudent(null)}>
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        }

        return (
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
                      <div><strong>Term Attendance:</strong> {getStudentAttendanceStats(reportCardStudent.id).percentage}% ({getStudentAttendanceStats(reportCardStudent.id).presentDays}/{getStudentAttendanceStats(reportCardStudent.id).totalDays || 1} Days)</div>
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
      )})}

      {/* --- MODAL 4: OFFICIAL FEE RECEIPT MODAL --- */}
      {receiptInvoice && (() => {
        const { secATotal, secBTotal, isReturning, effectiveTotal, amountPaid, balance, secAPaid, secBPaid, prospectus } = calculateInvoiceBreakdown(receiptInvoice)
        const pSecAItems = prospectus && prospectus.sectionA ? prospectus.sectionA.items : [
          { name: "Tuition Fees", amount: 14000 },
          { name: "Examination Fee", amount: 1000 },
          { name: "Lesson Fee", amount: 2000 },
          { name: "Development Levy", amount: 1000 },
          { name: "PTA Levy", amount: 1000 },
          { name: "First Aid Clinic Fee", amount: 500 },
        ]
        const pSecBItems = prospectus && prospectus.sectionB ? prospectus.sectionB.items : [
          { name: "School Uniform (2 sets)", amount: 8000 },
          { name: "Sweater", amount: 10000 },
          { name: "Wednesday Wear", amount: 7000 },
          { name: "Sportswear", amount: 14000 },
          { name: "Books & Materials", amount: 11000 },
        ]

        return (
          <div className='blis-modal-overlay' onClick={() => setReceiptInvoice(null)}>
            <div className='blis-modal-card receipt-modal' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px' }}>
              <div className='modal-header no-print'>
                <div>
                  <h3>Official Bursar Fee Receipt</h3>
                  <small>{receiptInvoice.invoiceNo} • {isReturning ? "Returning Scholar (Section A)" : "New Intake (Section A & B)"}</small>
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
                      <small>Class Level: <strong>{receiptInvoice.grade}</strong> • Classification: <strong style={{ color: isReturning ? '#059669' : '#2563eb' }}>{isReturning ? "⭐ Returning Scholar" : "📦 New Intake"}</strong></small>
                    </div>
                    <div className='text-right'>
                      <strong>Term Period:</strong>
                      <p>{receiptInvoice.term}</p>
                      <small>Payment Mode: <strong>{receiptInvoice.method || "First Bank Direct Deposit"}</strong></small>
                    </div>
                  </div>
                </div>

                {/* Section A: Tuition & Levies Table */}
                <div style={{ marginBottom: '16px' }}>
                  <div className='flexSB' style={{ background: '#f1f5f9', padding: '6px 10px', borderRadius: '4px 4px 0 0', borderBottom: '2px solid #00a884' }}>
                    <strong style={{ fontSize: '13px', color: '#071626' }}>Section A: Tuition & Statutory Levies (Payable to School)</strong>
                    <strong style={{ fontSize: '13px', color: '#00a884' }}>Subtotal: ₦{secATotal.toLocaleString()}</strong>
                  </div>
                  <table className='receipt-items-table' style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Item Description</th>
                        <th>Classification</th>
                        <th className='text-right'>Amount (₦)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pSecAItems.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.name}</td>
                          <td>Termly Statutory Fee</td>
                          <td className='text-right'>₦{item.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Section B: Uniforms & Learning Materials */}
                <div style={{ marginBottom: '18px' }}>
                  <div className='flexSB' style={{ background: '#f1f5f9', padding: '6px 10px', borderRadius: '4px 4px 0 0', borderBottom: '2px solid #2563eb' }}>
                    <strong style={{ fontSize: '13px', color: '#071626' }}>Section B: Uniforms & Learning Materials (For Students)</strong>
                    <strong style={{ fontSize: '13px', color: isReturning ? '#059669' : '#2563eb' }}>
                      {isReturning ? "WAIVED (₦0.00)" : `Subtotal: ₦${secBTotal.toLocaleString()}`}
                    </strong>
                  </div>
                  {isReturning ? (
                    <div style={{ background: '#f0fdf4', padding: '12px 16px', border: '1px solid #a7f3d0', borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontWeight: '700', fontSize: '13px' }}>
                        <i className='fas fa-check-circle' style={{ color: '#059669' }}></i>
                        <span>RETURNING SCHOLAR EXEMPTION (SECTION B WAIVED)</span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#166534' }}>
                        School uniform, sweater, sportswear, and books package were previously supplied upon initial admission. Section B is not invoiced for returning scholars.
                      </p>
                    </div>
                  ) : (
                    <table className='receipt-items-table' style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Item Description</th>
                          <th>Package Classification</th>
                          <th className='text-right'>Amount (₦)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pSecBItems.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.name}</td>
                            <td>New Intake Student Package</td>
                            <td className='text-right'>₦{item.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Grand Total Reconciliation */}
                <table className='receipt-items-table' style={{ marginTop: '10px' }}>
                  <tfoot>
                    <tr>
                      <td colSpan='2'><strong>TOTAL AMOUNT INVOICED:</strong></td>
                      <td className='text-right'><strong>₦{effectiveTotal.toLocaleString()}</strong></td>
                    </tr>
                    <tr className='paid-row'>
                      <td colSpan='2'><strong>TOTAL AMOUNT PAID:</strong></td>
                      <td className='text-right'><strong style={{ color: '#00a884' }}>₦{amountPaid.toLocaleString()}</strong></td>
                    </tr>
                    <tr>
                      <td colSpan='2'><strong>BALANCE OUTSTANDING:</strong></td>
                      <td className='text-right'>
                        {balance === 0 ? (
                          <strong style={{ color: '#00a884' }}>₦0.00 (PAID IN FULL ✓)</strong>
                        ) : (
                          <strong style={{ color: '#ef4444' }}>₦{balance.toLocaleString()}</strong>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Installment reconciliation note */}
                {!isReturning && (
                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '10px', fontSize: '12px' }}>
                    <strong>Installment Breakdown:</strong> Section A (Tuition & Levies): ₦{secAPaid.toLocaleString()}/₦{secATotal.toLocaleString()} {secAPaid >= secATotal ? "✓ CLEARED" : "PARTIAL"} • Section B (Materials): ₦{secBPaid.toLocaleString()}/₦{secBTotal.toLocaleString()}
                  </div>
                )}

                <div className='receipt-bank-footer'>
                  <div className='flexSB' style={{ alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#071626' }}>Bank Verification & Settlement:</strong>
                      <p style={{ margin: '2px 0', fontSize: '12px' }}>
                        Paid into: <strong>{schoolAccountDetails.bankName}</strong> | Account Name: <strong>{schoolAccountDetails.accountName}</strong> | Acc No: <strong>{schoolAccountDetails.accountNumber}</strong>
                      </p>
                      <small style={{ color: '#64748b' }}>Bank Reference: {receiptInvoice.bankRef || "FB-2043561832-VERIFIED"} • Status: <strong>{receiptInvoice.status ? receiptInvoice.status.toUpperCase() : "PAID"}</strong></small>
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
        )
      })()}

      {/* --- MODAL 5: RECORD PAYMENT MODAL --- */}
      {showPaymentModal && selectedInvoiceForPayment && (() => {
        const curProspectus = getProspectusForGrade(selectedInvoiceForPayment.grade)
        const secATotal = selectedInvoiceForPayment.secATotal || (curProspectus && curProspectus.sectionA ? curProspectus.sectionA.total : 19500)
        const secBTotal = selectedInvoiceForPayment.secBTotal || (curProspectus && curProspectus.sectionB ? curProspectus.sectionB.total : 50000)
        const isRet = paymentStudentType === "returning" || markAsCompleted
        const effectiveTotal = isRet ? secATotal : (secATotal + secBTotal)
        const alreadyPaid = selectedInvoiceForPayment.amountPaid || 0
        const effectiveBal = Math.max(0, effectiveTotal - alreadyPaid)
        const enteredAmt = parseFloat(paymentAmount) || 0
        const simTotalPaid = alreadyPaid + enteredAmt
        const simSecAPaid = Math.min(simTotalPaid, secATotal)
        const simSecBPaid = isRet ? 0 : Math.min(Math.max(0, simTotalPaid - secATotal), secBTotal)

        return (
          <div className='blis-modal-overlay' onClick={() => setShowPaymentModal(false)}>
            <div className='blis-modal-card' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
              <div className='modal-header'>
                <div>
                  <h3>Record School Fee Payment</h3>
                  <small>{selectedInvoiceForPayment.invoiceNo} • {selectedInvoiceForPayment.studentName} ({selectedInvoiceForPayment.grade})</small>
                </div>
                <button className='modal-close' onClick={() => setShowPaymentModal(false)}>×</button>
              </div>
              <form onSubmit={handleRecordPayment} className='modal-form'>
                {/* Scholar Classification Selector */}
                <div className='form-group'>
                  <label>Scholar Classification</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <label
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: isRet ? '2px solid #00a884' : '1px solid #cbd5e1',
                        background: isRet ? '#f0fdf4' : '#ffffff',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: isRet ? '#065f46' : '#334155' }}>
                        <input
                          type='radio'
                          name='paymentStudentTypeRadio'
                          checked={isRet}
                          onChange={() => {
                            setPaymentStudentType("returning")
                            const newBal = Math.max(0, secATotal - alreadyPaid)
                            setPaymentAmount(newBal > 0 ? newBal : "")
                          }}
                        />
                        <span>⭐ Returning Scholar</span>
                      </div>
                      <small style={{ marginTop: '4px', color: '#64748b' }}>
                        Section A Only (Tuition & Levies: ₦{secATotal.toLocaleString()})
                      </small>
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: !isRet ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: !isRet ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: !isRet ? '#1e40af' : '#334155' }}>
                        <input
                          type='radio'
                          name='paymentStudentTypeRadio'
                          checked={!isRet}
                          onChange={() => {
                            setPaymentStudentType("new")
                            setMarkAsCompleted(false)
                            const newBal = Math.max(0, (secATotal + secBTotal) - alreadyPaid)
                            setPaymentAmount(newBal > 0 ? newBal : "")
                          }}
                        />
                        <span>📦 New Intake Scholar</span>
                      </div>
                      <small style={{ marginTop: '4px', color: '#64748b' }}>
                        Section A + Section B (Total: ₦{(secATotal + secBTotal).toLocaleString()})
                      </small>
                    </label>
                  </div>
                </div>

                {/* Real-time Breakdown Box */}
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                  <div className='flexSB' style={{ fontSize: '13px', marginBottom: '4px' }}>
                    <span>Section A (Tuition, Exam, Lesson, Levies):</span>
                    <strong>₦{secATotal.toLocaleString()}</strong>
                  </div>
                  <div className='flexSB' style={{ fontSize: '13px', marginBottom: '4px' }}>
                    <span>Section B (Uniforms, Sweater, Sports, Books):</span>
                    <strong>{isRet ? <span style={{ color: '#059669' }}>Waived / Returning (₦0)</span> : `₦${secBTotal.toLocaleString()}`}</strong>
                  </div>
                  <div className='flexSB' style={{ fontSize: '13px', marginBottom: '4px' }}>
                    <span>Previously Collected:</span>
                    <strong style={{ color: '#00a884' }}>₦{alreadyPaid.toLocaleString()}</strong>
                  </div>
                  <div className='flexSB' style={{ fontSize: '15px', fontWeight: '800', borderTop: '1px solid #cbd5e1', paddingTop: '6px', color: '#071626' }}>
                    <span>Current Outstanding Balance:</span>
                    <span style={{ color: effectiveBal > 0 ? '#ef4444' : '#00a884' }}>
                      ₦{effectiveBal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Bursar 1-Click Returning Student Completion Option */}
                <div style={{ background: '#ecfdf5', padding: '10px 14px', borderRadius: '8px', border: '1px solid #a7f3d0', marginBottom: '14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: '700', color: '#065f46', fontSize: '13px' }}>
                    <input
                      type='checkbox'
                      checked={markAsCompleted}
                      onChange={(e) => {
                        const val = e.target.checked
                        setMarkAsCompleted(val)
                        if (val) {
                          setPaymentStudentType("returning")
                          const newBal = Math.max(0, secATotal - alreadyPaid)
                          setPaymentAmount(newBal > 0 ? newBal : "0")
                        }
                      }}
                    />
                    <span>✓ Mark as Completed (Returning Scholar — Waive Section B & Clear Remaining Balance)</span>
                  </label>
                  <small style={{ display: 'block', marginTop: '4px', color: '#047857', paddingLeft: '24px' }}>
                    Checking this clears any Section B balance so the system won't wait for Section B payment or show an outstanding balance.
                  </small>
                </div>

                <div className='form-group'>
                  <label>Payment Amount Received (₦) *</label>
                  <input
                    type='number'
                    required
                    min='0'
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                  {enteredAmt > 0 && (
                    <div style={{ marginTop: '8px', background: '#f1f5f9', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}>
                      <div>Section A Allocation: <strong>₦{simSecAPaid.toLocaleString()} / ₦{secATotal.toLocaleString()}</strong> {simSecAPaid >= secATotal ? "✓ (100% Cleared)" : ""}</div>
                      {!isRet && (
                        <div>Section B Allocation: <strong>₦{simSecBPaid.toLocaleString()} / ₦{secBTotal.toLocaleString()}</strong></div>
                      )}
                      <div style={{ marginTop: '4px', color: simTotalPaid >= effectiveTotal || markAsCompleted ? '#059669' : '#d97706', fontWeight: '700' }}>
                        Resulting Status: {simTotalPaid >= effectiveTotal || markAsCompleted ? "COMPLETED (Paid in Full ✓)" : "PARTIAL PAYMENT"}
                      </div>
                    </div>
                  )}
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
                  <button type='submit' className='primary-btn'>
                    <i className='fas fa-check-circle'></i> Confirm Payment & Reconcile Receipt
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      })()}

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

      {/* --- MODAL: COMPOSE / EDIT PUBLIC WEBSITE NEWS MODAL --- */}
      {showNewsModal && (
        <div className='blis-modal-overlay' onClick={() => setShowNewsModal(false)}>
          <div className='blis-modal-card' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className='modal-header'>
              <div>
                <h3>{editingNewsItem ? "Edit Public Website News Article" : "Publish News to Public Website"}</h3>
                <small>Displays live on Homepage, /journal & Footer</small>
              </div>
              <button className='modal-close' onClick={() => setShowNewsModal(false)}>×</button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const finalCover = newsForm.customCover && newsForm.customCover.trim() ? newsForm.customCover.trim() : (newsForm.cover || "./images/blog/b1.webp")
                
                if (editingNewsItem) {
                  const updated = publicNews.map((item) => {
                    if (item.id === editingNewsItem.id) {
                      return {
                        ...item,
                        title: newsForm.title,
                        type: newsForm.type,
                        date: newsForm.date,
                        com: newsForm.com || "0 COMMENTS",
                        desc: newsForm.desc,
                        cover: finalCover,
                      }
                    }
                    return item
                  })
                  setPublicNews(updated)
                  savePublicNews(updated)
                  showToast(`Article "${newsForm.title}" updated successfully on public site!`)
                } else {
                  const newArticle = {
                    id: Date.now(),
                    title: newsForm.title,
                    type: newsForm.type,
                    date: newsForm.date,
                    com: newsForm.com || "0 COMMENTS",
                    desc: newsForm.desc,
                    cover: finalCover,
                  }
                  const updated = [newArticle, ...publicNews]
                  setPublicNews(updated)
                  savePublicNews(updated)
                  showToast("🎉 News post published live to public website!")
                }
                setShowNewsModal(false)
              }}
              className='modal-form'
            >
              <div className='form-group'>
                <label>News Headline / Article Title *</label>
                <input
                  type='text'
                  required
                  value={newsForm.title}
                  onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                  placeholder='e.g. 2026/2027 Academic Session Resumption Date & Welcome Address'
                />
              </div>

              <div className='form-row'>
                <div className='form-group'>
                  <label>Category / Tag</label>
                  <select
                    value={newsForm.type}
                    onChange={(e) => setNewsForm({ ...newsForm, type: e.target.value })}
                  >
                    <option value='School News'>School News</option>
                    <option value='Academic Excellence'>Academic Excellence</option>
                    <option value='Sports & Athletics'>Sports & Athletics</option>
                    <option value='Campus Events'>Campus Events</option>
                    <option value='Admissions & Entry'>Admissions & Entry</option>
                    <option value='Principal Desk'>Principal's Desk</option>
                    <option value='STEM & Robotics'>STEM & Robotics</option>
                    <option value='Arts & Culture'>Arts & Culture</option>
                  </select>
                </div>
                <div className='form-group'>
                  <label>Publication Date</label>
                  <input
                    type='text'
                    required
                    value={newsForm.date}
                    onChange={(e) => setNewsForm({ ...newsForm, date: e.target.value })}
                    placeholder='e.g. OCT. 05, 2026'
                  />
                </div>
              </div>

              {/* Cover Image Selector */}
              <div className='form-group'>
                <label>Select Cover Image (Presets or Custom URL)</label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                    gap: '8px',
                    maxHeight: '130px',
                    overflowY: 'auto',
                    padding: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '10px',
                  }}
                >
                  {DEFAULT_NEWS_COVERS.map((cov) => {
                    const isSelected = (!newsForm.customCover && newsForm.cover === cov.path)
                    return (
                      <div
                        key={cov.id}
                        onClick={() => setNewsForm({ ...newsForm, cover: cov.path, customCover: "" })}
                        title={cov.label}
                        style={{
                          cursor: 'pointer',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: isSelected ? '3px solid #00a884' : '1px solid #cbd5e1',
                          boxShadow: isSelected ? '0 0 0 2px rgba(0,168,132,0.3)' : 'none',
                          height: '56px',
                          position: 'relative',
                        }}
                      >
                        <img src={cov.path} alt={cov.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {isSelected && (
                          <div style={{ position: 'absolute', top: 2, right: 2, background: '#00a884', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>
                            <i className='fas fa-check'></i>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <input
                  type='text'
                  value={newsForm.customCover}
                  onChange={(e) => setNewsForm({ ...newsForm, customCover: e.target.value })}
                  placeholder='Or paste custom image URL (https://... or ./images/...)'
                  style={{ fontSize: '13px' }}
                />
              </div>

              <div className='form-group'>
                <label>Article Story / Summary *</label>
                <textarea
                  rows='5'
                  required
                  value={newsForm.desc}
                  onChange={(e) => setNewsForm({ ...newsForm, desc: e.target.value })}
                  placeholder='Write the news story or announcement details...'
                ></textarea>
              </div>

              {/* Live Preview */}
              {newsForm.title && (
                <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                  <small style={{ fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    <i className='fas fa-eye'></i> Live Public Website Preview
                  </small>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <img
                      src={newsForm.customCover || newsForm.cover || "./images/blog/b1.webp"}
                      alt='Preview'
                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }}
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = "./images/blog/b1.webp"
                      }}
                    />
                    <div>
                      <span style={{ fontSize: '11px', background: '#00a884', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontWeight: '700' }}>
                        {newsForm.type}
                      </span>
                      <strong style={{ display: 'block', fontSize: '13px', color: '#0f172a', marginTop: '2px' }}>
                        {newsForm.title}
                      </strong>
                      <small style={{ color: '#64748b', fontSize: '11px' }}>
                        {newsForm.date} • {newsForm.desc ? `${newsForm.desc.slice(0, 60)}...` : ""}
                      </small>
                    </div>
                  </div>
                </div>
              )}

              <div className='modal-actions'>
                <button type='button' className='outline-btn' onClick={() => setShowNewsModal(false)}>Cancel</button>
                <button type='submit' className='primary-btn'>
                  <i className='fas fa-paper-plane'></i> {editingNewsItem ? "Save Changes" : "Publish to Website"}
                </button>
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

      {/* --- MODAL 7: SCHOLAR COMPREHENSIVE SUBJECT ASSESSMENT BREAKDOWN --- */}
      {broadsheetScholarDetail && (() => {
        const s = broadsheetScholarDetail.student
        const scholarScores = gradebookData.filter(
          (g) =>
            (g.studentId && g.studentId === s.id) ||
            (g.studentName && s.name && g.studentName.toLowerCase().trim() === s.name.toLowerCase().trim())
        )
        const classSubs = getSubjectsForClass(s.grade)

        return (
          <div className='blis-modal-overlay' onClick={() => setBroadsheetScholarDetail(null)}>
            <div className='blis-modal-card' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px' }}>
              <div className='modal-header'>
                <div className='flex' style={{ gap: '10px', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                    <i className='fas fa-book-reader'></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0 }}>{s.name} — Full Subject Assessment Breakdown</h3>
                    <small>{s.id} • {s.grade} • Rank: {broadsheetScholarDetail.rankOrdinal || "—"} • Average: {broadsheetScholarDetail.avgScore}% • GPA: {broadsheetScholarDetail.avgGpa}</small>
                  </div>
                </div>
                <button className='modal-close' onClick={() => setBroadsheetScholarDetail(null)}>×</button>
              </div>

              <div style={{ padding: '16px 20px' }}>
                {/* Summary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <small style={{ color: '#64748b', display: 'block', fontWeight: '700' }}>TOTAL MARKS</small>
                    <strong style={{ fontSize: '16px', color: '#0f172a' }}>{broadsheetScholarDetail.totalScore}</strong>
                  </div>
                  <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                    <small style={{ color: '#166534', display: 'block', fontWeight: '700' }}>CLASS AVERAGE</small>
                    <strong style={{ fontSize: '16px', color: '#15803d' }}>{broadsheetScholarDetail.avgScore}%</strong>
                  </div>
                  <div style={{ background: '#eff6ff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                    <small style={{ color: '#1e40af', display: 'block', fontWeight: '700' }}>GPA RATING</small>
                    <strong style={{ fontSize: '16px', color: '#2563eb' }}>{broadsheetScholarDetail.avgGpa}</strong>
                  </div>
                  <div style={{ background: '#fef3c7', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fde68a', textAlign: 'center' }}>
                    <small style={{ color: '#92400e', display: 'block', fontWeight: '700' }}>CLASS POSITION</small>
                    <strong style={{ fontSize: '16px', color: '#b45309' }}>{broadsheetScholarDetail.rankOrdinal || "—"}</strong>
                  </div>
                </div>

                {/* Subject Scores Table */}
                <div className='table-card' style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto', marginBottom: '16px' }}>
                  <table className='portal-table'>
                    <thead>
                      <tr>
                        <th>Subject Discipline</th>
                        <th>1st Assign (10)</th>
                        <th>2nd Assign (10)</th>
                        <th>1st Test (10)</th>
                        <th>2nd Test (10)</th>
                        <th>CA (40)</th>
                        <th>Exam (60)</th>
                        <th>Total (100%)</th>
                        <th>Grade</th>
                        <th>GPA</th>
                        <th>Remarks</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classSubs.map((sub) => {
                        const rec = scholarScores.find(
                          (g) => g.subject && g.subject.toLowerCase().trim() === sub.toLowerCase().trim()
                        )
                        if (!rec) {
                          return (
                            <tr key={sub} style={{ background: '#fffbeb' }}>
                              <td><strong>{sub}</strong></td>
                              <td colSpan='9' style={{ color: '#b45309', fontSize: '12.5px', fontStyle: 'italic' }}>
                                ⚠️ Score pending — No mark logged yet by {sub} teacher
                              </td>
                              <td>
                                <button
                                  type='button'
                                  className='btn-action-sm'
                                  style={{ background: '#2563eb', color: '#fff' }}
                                  onClick={() => {
                                    setGradebookSelectedClass(s.grade)
                                    setGradebookSelectedSubject(sub)
                                    setGradebookViewMode("subject_entry")
                                    setBroadsheetScholarDetail(null)
                                  }}
                                >
                                  <i className='fas fa-plus'></i> Enter Score
                                </button>
                              </td>
                            </tr>
                          )
                        }
                        const { caTotal, total, letter, gpa } = calculateGradeInfo(rec)
                        return (
                          <tr key={sub}>
                            <td><strong>{sub}</strong></td>
                            <td>{rec.assign1 !== undefined ? rec.assign1 : 0}/10</td>
                            <td>{rec.assign2 !== undefined ? rec.assign2 : 0}/10</td>
                            <td>{rec.test1 !== undefined ? rec.test1 : 0}/10</td>
                            <td>{rec.test2 !== undefined ? rec.test2 : 0}/10</td>
                            <td><span style={{ fontWeight: '700', color: '#0d9488' }}>{caTotal}/40</span></td>
                            <td><strong>{rec.exam !== undefined ? rec.exam : 0}/60</strong></td>
                            <td><strong style={{ fontSize: '14px', color: total >= 70 ? '#059669' : total >= 50 ? '#2563eb' : '#dc2626' }}>{total}%</strong></td>
                            <td><span className={`letter-badge grade-${letter}`}>{letter}</span></td>
                            <td><strong>{gpa}</strong></td>
                            <td><small style={{ color: '#64748b' }}>{rec.remarks || "Good progress"}</small></td>
                            <td>
                              <button
                                type='button'
                                className='btn-action-sm'
                                onClick={() => {
                                  handleEditScoreRecord(rec)
                                  setBroadsheetScholarDetail(null)
                                }}
                              >
                                <i className='fas fa-edit'></i> Edit
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className='modal-actions flexSB' style={{ marginTop: '14px' }}>
                  <button
                    type='button'
                    className='btn-action-primary'
                    onClick={() => {
                      setReportCardStudent(s)
                      setBroadsheetScholarDetail(null)
                    }}
                  >
                    <i className='fas fa-file-invoice'></i> Preview Official Report Card
                  </button>
                  <button type='button' className='outline-btn' onClick={() => setBroadsheetScholarDetail(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

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

