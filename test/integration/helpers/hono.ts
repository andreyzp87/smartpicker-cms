import { Context } from 'hono'

export function createHonoContext(url: string, init?: RequestInit) {
  const request = new Request(url, init)
  return new Context(request, { path: new URL(url).pathname })
}
