const PRODUCTION_HOST = 'thaioml.org'

function cookieDomain() {
  const { hostname } = window.location
  return hostname === PRODUCTION_HOST || hostname.endsWith(`.${PRODUCTION_HOST}`)
    ? `; domain=.${PRODUCTION_HOST}`
    : ''
}

export function getBrowserCookie(name: string) {
  const prefix = `${encodeURIComponent(name)}=`
  const cookie = document.cookie.split('; ').find((item) => item.startsWith(prefix))
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null
}

export function setBrowserCookie(name: string, value: string, maxAge: number) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${cookieDomain()}${secure}`
}

export function clearBrowserCookie(name: string) {
  setBrowserCookie(name, '', 0)
}
