/**
 * Sleeps for `baseMs` with +/-20% random jitter to simulate realistic
 * external network I/O latency during load testing.
 */
export async function simulateMockLatency(baseMs: number): Promise<void> {
  if (baseMs <= 0) return;
  const jitteredMs = Math.max(
    0,
    Math.round(baseMs * (0.8 + Math.random() * 0.4)),
  );
  await new Promise<void>((resolve) => setTimeout(resolve, jitteredMs));
}
