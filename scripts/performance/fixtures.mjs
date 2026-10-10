// Deliberately synthetic fixtures, validated by the application's save boundary.
export function freshFixture(Game, { supplied = false } = {}) {
  const state = Game.createGame(); state.guidance = { stage:0, skipped:true };
  if (supplied) state.inventory = { wood:100, scrap:100, pearls:100 };
  const serialized = Game.serializeGame(state);
  Game.deserializeGame(serialized);
  return { state, serialized, label:supplied ? 'synthetic supplied fresh raft; upgrades/discoveries require normal domain actions; no earned progression' : 'synthetic fresh raft, skipped guide; no earned progression' };
}
