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
import Cases from './pages/Cases.jsx'
import CaseDetail from './pages/CaseDetail.jsx'
import Documents from './pages/Documents.jsx'
import Evidence from './pages/Evidence.jsx'
import Schedule from './pages/Schedule.jsx'
import Notifications from './pages/Notifications.jsx'
import Guide from './pages/Guide.jsx'
import MyPage from './pages/MyPage.jsx'
import FigmaComplaintResult from './pages/FigmaComplaintResult.jsx'
import FigmaComplaintInput from './pages/FigmaComplaintInput.jsx'

function FigmaCaptureBridge() {
  useEffect(() => {
    if (!import.meta.env.DEV || !window.location.hash.includes('figmacapture=')) return undefined
    const root = document.documentElement
    const body = document.body
    const before = { rootWidth: root.style.width, rootMinWidth: root.style.minWidth, bodyWidth: body.style.width, bodyMinWidth: body.style.minWidth, bodyMinHeight: body.style.minHeight }
    root.style.width = '1440px'
    root.style.minWidth = '1440px'
    body.style.width = '1440px'
    body.style.minWidth = '1440px'
    body.style.minHeight = '1024px'
    const timer = window.setTimeout(() => {
      if (document.querySelector('script[data-figma-capture]')) return
      const script = document.createElement('script')
      script.src = 'https://mcp.figma.com/mcp/html-to-design/capture.js'
      script.async = true
      script.dataset.figmaCapture = 'true'
      document.head.appendChild(script)
    }, 1200)
    return () => {
      window.clearTimeout(timer)
      root.style.width = before.rootWidth
      root.style.minWidth = before.rootMinWidth
      body.style.width = before.bodyWidth
      body.style.minWidth = before.bodyMinWidth
      body.style.minHeight = before.bodyMinHeight
    }
  }, [])
  return null
}

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
      <FigmaCaptureBridge />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/figma/complaint-result/:caseId" element={<FigmaComplaintResult />} />

        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="search" element={<CaseSearch />} />
          <Route path="procedure" element={<Procedure />} />
          <Route path="cases" element={<Cases />} />
          <Route path="cases/:id" element={<CaseDetail />} />
          <Route path="documents" element={<Documents />} />
          <Route path="figma/complaint-input/:typeKey/:stepIndex" element={<FigmaComplaintInput />} />
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
