import React from "react"
import "./about.css"
import Back from "../common/back/Back"
import MissionVision from "../common/mission/MissionVision"
import AboutCard from "./AboutCard"
import ProprietorMessage from "../home/ProprietorMessage"

const About = () => {
  return (
    <>
      <Back title='About Brighter Land International School' />
      <MissionVision />
      <ProprietorMessage />
      <AboutCard />
    </>
  )
}

export default About
