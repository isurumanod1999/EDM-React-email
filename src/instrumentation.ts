export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertSafeExposure } = await import('@/lib/security/exposureGate');
    assertSafeExposure();
  }
}
