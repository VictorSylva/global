import React from "react"
import "./firebase"
import "./App.css"
import Header from "./components/common/header/Header"
import { BrowserRouter as Router, Switch, Route, useLocation } from "react-router-dom"
import About from "./components/about/About"
import CourseHome from "./components/allcourses/CourseHome"
import Team from "./components/team/Team"
import Pricing from "./components/pricing/Pricing"
import Blog from "./components/blog/Blog"
import Contact from "./components/contact/Contact"
import Gallery from "./components/gallery/Gallery"
import Footer from "./components/common/footer/Footer"
import Home from "./components/home/Home"
import SchoolPortal from "./components/portal/SchoolPortal"
import ScrollToTop from "./components/common/ScrollToTop"

const AppContent = () => {
  const location = useLocation()
  const isPortal = ["/portal", "/management", "/erp"].includes(location.pathname)

  return (
    <>
      <ScrollToTop />
      {!isPortal && <Header />}
      <Switch location={location}>
        <Route exact path='/' component={Home} />
        <Route exact path='/about' component={About} />
        <Route exact path='/courses' component={CourseHome} />
        <Route exact path='/academics' component={CourseHome} />
        <Route exact path='/team' component={Team} />
        <Route exact path='/faculty' component={Team} />
        <Route exact path='/pricing' component={Pricing} />
        <Route exact path='/admissions' component={Pricing} />
        <Route exact path='/gallery' component={Gallery} />
        <Route exact path='/impact' component={Gallery} />
        <Route exact path='/excursions' component={Gallery} />
        <Route exact path='/journal' component={Blog} />
        <Route exact path='/notices' component={Blog} />
        <Route exact path='/contact' component={Contact} />
        <Route exact path='/portal' component={SchoolPortal} />
        <Route exact path='/management' component={SchoolPortal} />
        <Route exact path='/erp' component={SchoolPortal} />
      </Switch>
      {!isPortal && <Footer />}
    </>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
