let leafletPromise: Promise<any> | null = null

export function loadLeaflet() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if ((window as any).L) return Promise.resolve((window as any).L)
  if (leafletPromise) return leafletPromise

  leafletPromise = new Promise((resolve, reject) => {
    // Inject CSS if not present
    const existingCss = document.querySelector('link[data-leaflet]') as HTMLLinkElement | null
    if (!existingCss) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      link.setAttribute('data-leaflet', 'true')
      document.head.appendChild(link)
    }

    // Inject script if not present
    const existingScript = document.querySelector('script[data-leaflet]') as HTMLScriptElement | null
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve((window as any).L))
      existingScript.addEventListener('error', reject)
      if ((window as any).L) resolve((window as any).L)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.defer = true
    script.setAttribute('data-leaflet', 'true')
    script.onload = () => resolve((window as any).L)
    script.onerror = (e) => reject(e)
    document.body.appendChild(script)
  })

  return leafletPromise
}

