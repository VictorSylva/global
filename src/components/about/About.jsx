import React from "react"
import "./about.css"
import Back from "../common/back/Back"
import MissionVision from "../common/mission/MissionVision"
import CampusEvolution from "./CampusEvolution"
import ProprietorMessage from "../home/ProprietorMessage"
import AboutCard from "./AboutCard"
import CommunityOutreachShowcase from "./CommunityOutreachShowcase"

const About = () => {
  return (
    <>
      <Back title='About Brighter Land International School' />
      <MissionVision />
      <CampusEvolution />
      <ProprietorMessage />
      <AboutCard />
      <CommunityOutreachShowcase />
    </>
  )
}

export default About

