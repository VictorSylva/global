import React from "react"
import Back from "../common/back/Back"
import CoursesCard from "./CoursesCard"
import OnlineCourses from "./OnlineCourses"
import AcademicsEnvironment from "./AcademicsEnvironment"

const CourseHome = () => {
  return (
    <>
      <Back title='Academics & International Curricula' />
      <CoursesCard />
      <AcademicsEnvironment />
      <OnlineCourses />
    </>
  )
}

export default CourseHome

