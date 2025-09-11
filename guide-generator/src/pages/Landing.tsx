import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="text-center bg-slate-50 rounded-2xl py-10">
        <h1 className="text-4xl sm:text-6xl font-extrabold mb-4 tracking-tight" style={{ color: 'var(--primary)' }}>Créez le guide parfait pour vos invités</h1>
        <p className="text-gray-600 max-w-3xl mx-auto text-lg">Générez facilement un guide personnalisé avec QR code pour améliorer l'expérience de vos invités Airbnb.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/wizard" className="btn btn-primary text-base px-5 py-3">Créer mon guide</Link>
          <a href="#/guide/demo" className="btn btn-outline text-base px-5 py-3">▶️ Voir la démo</a>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-6 mt-12">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-2"><span className="text-xl">✏️</span><h3 className="font-semibold text-lg">Simple à créer</h3></div>
          <p className="text-sm text-gray-600">Assistant en 4 étapes pour remplir facilement toutes les informations importantes.</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-2"><span className="text-xl">🔳</span><h3 className="font-semibold text-lg">QR Code intégré</h3></div>
          <p className="text-sm text-gray-600">Génération automatique d'un QR code pour un accès instantané depuis le mobile.</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-2"><span className="text-xl">📥</span><h3 className="font-semibold text-lg">Export PDF</h3></div>
          <p className="text-sm text-gray-600">Exportez et imprimez vos guides en PDF de qualité professionnelle.</p>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-6 text-center">Comment ça marche ?</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            ['1', 'Remplir'],
            ['2', 'Personnaliser'],
            ['3', 'Générer'],
            ['4', 'Partager'],
          ].map(([n, label]) => (
            <div key={n} className="text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--accent)] text-white mx-auto flex items-center justify-center text-lg font-semibold shadow-md">{n}</div>
              <div className="mt-2 text-sm font-medium text-gray-800">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
