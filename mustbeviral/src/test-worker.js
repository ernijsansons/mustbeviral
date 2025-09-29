export default {
  async fetch(request, env, ctx) {
    return new Response('Hello World from Must Be Viral!', {
      headers: { 'content-type': 'text/plain' },
    });
  },
};