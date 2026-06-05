import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import PublicLayout from './components/PublicLayout.jsx'
import AppLayout from './components/AppLayout.jsx'

import Landing from './pages/Landing.jsx'
import About from './pages/About.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'

import Dashboard from './pages/Dashboard.jsx'
import CaseSearch from './pages/CaseSearch.jsx'
import Procedure from './pages/Procedure.jsx'
import Documents from './pages/Documents.jsx'
import Evidence from './pages/Evidence.jsx'
import Schedule from './pages/Schedule.jsx'
import Notifications from './pages/Notifications.jsx'
import Guide from './pages/Guide.jsx'
import MyPage from './pages/MyPage.jsx'

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) { el.scrollIntoView({ behavior: 'smooth' }); return }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="search" element={<CaseSearch />} />
          <Route path="procedure" element={<Procedure />} />
          <Route path="documents" element={<Documents />} />
          <Route path="evidence" element={<Evidence />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="guide" element={<Guide />} />
          <Route path="my" element={<MyPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
