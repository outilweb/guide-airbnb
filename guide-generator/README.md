# Guide Generator (Airbnb)

Application web pour créer un guide client, le publier avec une URL publique et générer une fiche QR imprimable.

## Stack
- React + Vite + TypeScript + TailwindCSS (v4)
- React Router (HashRouter)
- React Hook Form + Zod
- QR code: `qrcode.react`
- Export PDF: `html2canvas` + `jspdf`
- Stockage: `localStorage`

## Démarrage

1. Installer les dépendances:

```
npm install
```

2. Lancer le serveur de dev:

```
npm run dev
```

3. Build production (statique, prêt pour Vercel/Netlify):

```
npm run build
```

## Routes
- `/` — Accueil (landing) avec CTA « Créer mon guide » et « Voir la démo »
- `/wizard` — Assistant en 4 étapes avec sauvegarde automatique
- `/preview` — Aperçu du guide, publication, impression et fiche QR
- `/guide/:guideId` — Guide public (lecture seule, imprimable)
- `/print-qr/:guideId` — Fiche QR (PDF/Impression)

## Données
Voir `src/types.ts`. Un exemple de guide démo est automatiquement seedé sous l’id `demo` et accessible via « Voir la démo ».

## Notes
- La sauvegarde locale est instantanée et affiche « Sauvegardé automatiquement ».
- La publication génère un `guideId` via `crypto.randomUUID()` et rend disponible l’URL publique (utilisée pour le QR).
- Les styles d’impression sont définis dans `src/index.css`.
