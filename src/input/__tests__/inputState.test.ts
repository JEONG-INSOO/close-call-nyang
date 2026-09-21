import { createInputRegistry } from '../inputState';

describe('independent held input sources', () => {
  it('starts empty and returns independent read snapshots', () => {
    const input = createInputRegistry();
    const original = input.read();
    input.set('keyboard', 'KeyA', -1, true);
    expect(original).toEqual({ left: false, right: false });
    expect(input.read()).toEqual({ left: true, right: false });
  });
  it('keeps left held until A and ArrowLeft have both been released', () => {
    const input = createInputRegistry();
    input.set('keyboard', 'KeyA', -1, true);
    input.set('keyboard', 'ArrowLeft', -1, true);
    input.set('keyboard', 'KeyA', -1, false);
    expect(input.read().left).toBe(true);
    input.set('keyboard', 'ArrowLeft', -1, false);
    expect(input.read().left).toBe(false);
  });
  it('does not let touch release a keyboard source with the same id', () => {
    const input = createInputRegistry();
    input.set('keyboard', '1', -1, true);
    input.set('touch', '1', -1, true);
    input.set('touch', '1', -1, false);
    expect(input.read().left).toBe(true);
  });
  it('is repeat-idempotent and ignores unknown releases', () => {
    const input = createInputRegistry();
    input.set('keyboard', 'KeyD', 1, true);
    input.set('keyboard', 'KeyD', 1, true);
    input.set('touch', 'missing', 1, false);
    expect(input.read().right).toBe(true);
    input.set('keyboard', 'KeyD', 1, false);
    expect(input.read().right).toBe(false);
  });
  it('keeps opposite directions independent so their forces cancel in the engine', () => {
    const input = createInputRegistry();
    input.set('touch', 'same-id', -1, true);
    input.set('touch', 'same-id', 1, true);
    expect(input.read()).toEqual({ left: true, right: true });
    input.set('touch', 'same-id', -1, false);
    expect(input.read()).toEqual({ left: false, right: true });
  });
  it('clears all directions and every physical source', () => {
    const input = createInputRegistry();
    input.set('keyboard', 'KeyA', -1, true);
    input.set('touch', 'finger', 1, true);
    input.clear();
    expect(input.read()).toEqual({ left: false, right: false });
  });
});
