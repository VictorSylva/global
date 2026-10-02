import React from "react"
import Hero from "./hero/Hero"
import AboutCard from "../about/AboutCard"
import ProprietorMessage from "./ProprietorMessage"
import HAbout from "./HAbout"
import ProspectusRequest from "./ProspectusRequest"
// import Testimonal from "./testimonal/Testimonal"
import Hblog from "./Hblog"

const Home = () => {
  return (
    <>
      <Hero />
      <AboutCard />
      <ProprietorMessage />
      <HAbout />
      <ProspectusRequest />
      {/* <Testimonal /> */}
      <Hblog />
    </>
  )
}

export default Home
