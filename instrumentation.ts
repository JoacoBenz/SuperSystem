// Next.js instrumentation hook — runs once when the server process starts.
// Used to validate required environment configuration before serving requests.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('@/src/core/config/env');
    validateEnv();
  }
}
