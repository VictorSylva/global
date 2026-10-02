import React from "react"
import "./about.css"
import Back from "../common/back/Back"
import AboutCard from "./AboutCard"
import ProprietorMessage from "../home/ProprietorMessage"

const About = () => {
  return (
    <>
      <Back title='About Brighter Land International School' />
      <ProprietorMessage />
      <AboutCard />
    </>
  )
}

export default About
