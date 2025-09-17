import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { HashRouter, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing.tsx'
import Wizard from './pages/Wizard/Wizard.tsx'
import Preview from './pages/Preview.tsx'
import PublicGuide from './pages/PublicGuide.tsx'
import PrintQR from './pages/PrintQR.tsx'
import MyGuides from './pages/MyGuides.tsx'
import { ensureDemoSeed } from './utils/seed.ts'
import { AuthProvider } from './contexts/AuthContext.tsx'

function Bootstrapper() {
  useEffect(() => {
    ensureDemoSeed()
  }, [])
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<App /> }>
            <Route index element={<Landing />} />
            <Route path="my-guides" element={<MyGuides />} />
            <Route path="wizard" element={<Wizard />} />
            <Route path="preview" element={<Preview />} />
            <Route path="guide/:guideId" element={<PublicGuide />} />
            <Route path="print-qr/:guideId" element={<PrintQR />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Bootstrapper />
  </StrictMode>,
)
