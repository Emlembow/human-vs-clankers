import type { GameEngine } from './game-engine';
type Tool = { name: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => unknown };
type Context = { registerTool(tool: Tool, options?: { signal?: AbortSignal }): void | Promise<void> };
export function registerGameTools(engine: GameEngine) {
  const context = (document as Document & { modelContext?: Context }).modelContext;
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  const tools: Tool[] = [
    { name: 'get_game_status', description: 'Read the current Geometry Conflict run: score, wave, lives, shields, weapon, relics, rerolls, and offered rewards.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute(input) { if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('Expected an empty object.'); return engine.model.snapshot(); } },
    { name: 'control_game', description: 'Start a new run from the title or game-over screen, pause an active run, or resume a paused run. Starting during a live run fails without changing the game.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['start', 'pause', 'resume'] } }, required: ['action'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => k !== 'action')) throw new Error('Expected only an action.');
      const action = (input as { action?: unknown }).action, status = engine.model.status;
      if (action === 'start') { if (status !== 'ready' && status !== 'over') throw new Error('A run is already in progress.'); engine.start(); }
      else if (action === 'pause') { if (status !== 'playing') throw new Error('The game is not playing.'); engine.togglePause(); }
      else if (action === 'resume') { if (status !== 'paused') throw new Error('The game is not paused.'); engine.togglePause(); }
      else throw new Error('Action must be start, pause, or resume.');
      return engine.model.snapshot();
    } },
    { name: 'choose_wave_reward', description: 'Choose one currently offered reward by its exact id. Applies the reward and begins the next wave. Read get_game_status for offers.', inputSchema: { type: 'object', properties: { rewardId: { type: 'string' } }, required: ['rewardId'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => k !== 'rewardId') || typeof (input as { rewardId?: unknown }).rewardId !== 'string') throw new Error('Expected a rewardId string.');
      if (!engine.chooseReward((input as { rewardId: string }).rewardId)) throw new Error('This reward is not currently available.');
      return engine.model.snapshot();
    } },
    { name: 'reroll_wave_rewards', description: 'Spend one of the run-wide rerolls to replace all three current reward choices. Fails without spending anything outside reward selection or at zero rerolls.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('Expected an empty object.');
      if (!engine.rerollRewards()) throw new Error('Reroll unavailable.');
      return engine.model.snapshot();
    } },
  ];
  for (const tool of tools) { try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Older registries may reject unsupported tools. */ } }
  return () => lifecycle.abort();
}
