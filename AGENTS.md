# Repository Guidelines

## Project Structure & Module Organization
This monorepo hosts a single Vite app in `guide-generator/`. Root `package.json` proxies dev/build scripts. Within the app, `src/` contains UI: `pages/` for routed screens, `components/` for reusable blocks, `utils/` for helpers, `config.ts` for environment constants, and `types.ts` for guide schemas. Static assets live under `public/` (including `logo-guide.svg`). Deployment rewrites are defined in `guide-generator/vercel.json` for SPA routing.

## Build, Test, and Development Commands
From the repository root run `npm install` to bootstrap both package manifests. `npm run dev` starts Vite on localhost with hash routing. `npm run build` runs `tsc -b` and outputs the optimized bundle to `guide-generator/dist`. `npm run preview` serves the built bundle for smoke checks. `npm run lint` executes ESLint across `.ts` and `.tsx` sources; run it before committing.

## Coding Style & Naming Conventions
Write React function components in TypeScript with strict typing; export default only for routed pages, prefer named exports elsewhere. Use two-space indentation and keep Tailwind class lists grouped by layout → spacing → typography to mirror existing files. Place components in PascalCase files (`components/GuideHeader.tsx`), hooks/utilities in camelCase (`utils/persistGuide.ts`), and centralize shared types in `types.ts`.

## Testing Guidelines
Automated tests are not yet configured. When contributing, add Vitest + React Testing Library suites under `src/__tests__/` or colocated `*.test.tsx` files that cover the wizard flow, QR generation, and PDF export. Until the harness lands, run `npm run lint` and manually verify the `/wizard`, `/preview`, and `/guide/:guideId` routes in the browser. Document any manual QA steps inside the pull request.

## Commit & Pull Request Guidelines
Follow the existing short, Title-Case commit style (e.g., `Synchronise QR Code Storage`). Group related changes and keep one topic per commit. Pull requests should include a concise summary, linked issue or task, screenshots or GIFs for UI updates (desktop + mobile when applicable), and a checklist of commands run. Request review once lint/build pass and the preview looks correct.
