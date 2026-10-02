import React from "react"
import Back from "../common/back/Back"
import TeamCard from "./TeamCard"
import Heading from "../common/heading/Heading"
import "./team.css"
import Awrapper from "../about/Awrapper"
import "../about/about.css"
import ProprietorMessage from "../home/ProprietorMessage"

const Team = () => {
  return (
    <>
      <Back title='Distinguished Faculty & Leadership' />
      <ProprietorMessage />
      <section className='team padding'>
        <div className='container'>
          <Heading
            subtitle='SCHOOL ADMINISTRATIVE DIRECTORS & DEANS'
            title='Leadership Team Guiding Academic Excellence'
          />
          <div className='grid'>
            <TeamCard />
          </div>
        </div>
      </section>
      <Awrapper />
    </>
  )
}

export default Team
