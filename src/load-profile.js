/** Bounded startup phases. Timing never awards progress or changes game state. */
export function createLoadProfile(clock = () => performance.now()) {
  const phases = [];
  async function run(name, operation) {
    const started = clock();
    let status = 'complete';
    try { return await operation(); }
    catch (error) { status = 'failed'; throw error; }
    finally {
      if (phases.length === 32) phases.shift();
      phases.push({ name, durationMs: clock() - started, status });
    }
  }
  return { run, snapshot: () => phases.map(phase => ({ ...phase })) };
}
