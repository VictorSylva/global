import React from "react"
import Hero from "./hero/Hero"
import MissionVision from "../common/mission/MissionVision"
import AboutCard from "../about/AboutCard"
import ProprietorMessage from "./ProprietorMessage"
import HAbout from "./HAbout"
import HomeGalleryPreview from "./HomeGalleryPreview"
import ProspectusRequest from "./ProspectusRequest"
// import Testimonal from "./testimonal/Testimonal"
import Hblog from "./Hblog"

const Home = () => {
  return (
    <>
      <Hero />
      <MissionVision />
      <AboutCard />
      <ProprietorMessage />
      <HAbout />
      <HomeGalleryPreview />
      <ProspectusRequest />
      {/* <Testimonal /> */}
      <Hblog />
    </>
  )
}

export default Home

