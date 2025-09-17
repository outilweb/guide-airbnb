import { Link, Outlet } from 'react-router-dom'
import { BRAND_URL } from './config'

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold text-lg flex items-center gap-2" style={{ color: 'var(--primary)' }}>
            <img src="/logo-guide.svg" alt="Logo" className="w-7 h-7 rounded-md border bg-white p-0.5" />
            <span>Guide générateur</span>
          </Link>
          <div className="flex items-center gap-6">
            <nav className="text-sm flex gap-6 text-gray-700">
              <Link to="/" className="hover:text-gray-900">Accueil</Link>
              <Link to="/my-guides" className="hover:text-gray-900">Mes guides</Link>
              <a href="#" className="hover:text-gray-900">Support</a>
            </nav>
            <div className="text-sm flex gap-2">
              <Link to="/wizard" className="btn btn-primary">Créer mon guide</Link>
              <a href="#/guide/demo" className="btn btn-outline">Voir la démo</a>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-gray-100 text-xs text-gray-500 py-4 text-center">
        © {new Date().getFullYear()} Guide générateur •
        <a href={BRAND_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 underline hover:no-underline ml-1">
          <span>Réalisé par</span>
          <img src="/logo-guide.svg" alt="Logo" className="inline-block w-4 h-4" />
        </a>
      </footer>
    </div>
  )
}
