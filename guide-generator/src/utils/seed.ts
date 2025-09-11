import type { Guide } from '../types'

const DEMO_KEY = 'guide:demo'

export function ensureDemoSeed() {
  if (localStorage.getItem(DEMO_KEY)) return
  const demo: Guide = {
    guideId: 'demo',
    title: 'Appartement cosy centre-ville',
    address: '123 Rue de la Paix, 75001 Paris',
    stay: {
      checkIn: { time: '15:00', instructions: 'Récupérez les clés au boîtier sécurisé devant la porte.', code: '1234' },
      checkOut: { time: '11:00', checklist: 'Fermer les fenêtres, éteindre les lumières...' },
    },
    contact: { name: 'Marie Dupont', phone: '+33 6 12 34 56 78', email: 'marie@example.com' },
    wifi: { ssid: 'MonWiFi_5G', password: 'motdepasse123' },
    rules: [
      { id: 'r1', text: 'Pas de fêtes' },
      { id: 'r2', text: 'Non fumeur' },
    ],
    equipmentNotes: 'Cuisine équipée, machine à café, lave-linge. Merci de respecter le voisinage.',
    places: [
      { id: 'p1', name: 'Le Petit Bistrot', category: 'Restaurant', subtype: 'Cuisine française traditionnelle', description: 'Ambiance conviviale', address: '5 min à pied', mapsUrl: 'https://maps.google.com', siteUrl: 'https://example.com' },
    ],
    map: { homeAddress: '123 Rue de la Paix, 75001 Paris', points: [{ id: 'm1', label: 'Boulangerie', address: 'Rue de la Paix', mapsUrl: '' }] },
    links: [ { id: 'l1', label: 'Règlement intérieur', url: 'https://example.com/reglement' } ],
    theme: { primary: '#2c3e50', accent: '#3498db', fontHeading: 'Inter', fontBody: 'Inter', welcomeMessage: 'Bienvenue chez vous' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  localStorage.setItem(DEMO_KEY, JSON.stringify(demo))
}
