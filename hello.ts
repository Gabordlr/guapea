export default {
  async fetch(_request: Request): Promise<Response> {
    return new Response('Hello from Guapea Neon Function', {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  },
}
