import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { Platform, View } from 'react-native';
import { ControlButton } from '../../components/ControlButton';
import { createInputRegistry } from '../inputState';
import { installBrowserFixture } from './browserFixture';

const initialOS = Object.getOwnPropertyDescriptor(Platform, 'OS')!;
function platform(value: 'ios' | 'web') { Object.defineProperty(Platform, 'OS', { configurable: true, value }); }
function touch(target: string, ids: string[], others: { identifier: string; target: string }[] = []) {
  return { nativeEvent: { target, changedTouches: [...ids.map(identifier => ({ identifier, target })), ...others] } };
}
afterEach(async () => { await cleanup(); Object.defineProperty(Platform, 'OS', initialOS); });

describe('native control pad touch identities', () => {
  beforeEach(() => platform('ios'));
  it('holds both pads simultaneously and releases only the ended/cancelled finger', async () => {
    const input = createInputRegistry();
    await render(<View>
      <ControlButton direction={-1} disabled={false} onChange={(id, down) => input.set('touch', id, -1, down)} />
      <ControlButton direction={1} disabled={false} onChange={(id, down) => input.set('touch', id, 1, down)} />
    </View>);
    await fireEvent(screen.getByTestId('control-left'), 'touchStart', touch('left', ['one', 'two'], [{ identifier: 'three', target: 'right' }]));
    await fireEvent(screen.getByTestId('control-right'), 'touchStart', touch('right', ['three']));
    expect(input.read()).toEqual({ left: true, right: true });
    await fireEvent(screen.getByTestId('control-left'), 'touchEnd', touch('left', ['one']));
    expect(input.read().left).toBe(true);
    await fireEvent(screen.getByTestId('control-left'), 'touchCancel', touch('left', ['two']));
    expect(input.read()).toEqual({ left: false, right: true });
    await fireEvent(screen.getByTestId('control-right'), 'touchEnd', touch('right', ['three']));
    expect(input.read()).toEqual({ left: false, right: false });
  });
  it('ignores repeated starts, releases on disable/unmount, and does not accept disabled touches', async () => {
    const change = jest.fn();
    const result = await render(<ControlButton direction={-1} disabled={false} onChange={change} />);
    const pad = screen.getByTestId('control-left');
    await fireEvent(pad, 'touchStart', touch('left', ['one']));
    await fireEvent(pad, 'touchStart', touch('left', ['one']));
    expect(change).toHaveBeenCalledTimes(1);
    await result.rerender(<ControlButton direction={-1} disabled onChange={change} />);
    expect(change).toHaveBeenLastCalledWith('left:touch:one', false);
    await fireEvent(screen.getByTestId('control-left'), 'touchStart', touch('left', ['two']));
    expect(change).toHaveBeenCalledTimes(2);
    await result.rerender(<ControlButton direction={-1} disabled={false} onChange={change} />);
    await fireEvent(screen.getByTestId('control-left'), 'touchStart', touch('left', ['three']));
    await result.unmount();
    expect(change).toHaveBeenLastCalledWith('left:touch:three', false);
  });
  it('offers accessible activation as an explicit held toggle and keeps >=72 point targets', async () => {
    const change = jest.fn();
    await render(<ControlButton direction={1} disabled={false} onChange={change} />);
    const pad = screen.getByRole('button', { name: '오른쪽으로 균형 잡기' });
    expect(pad).toHaveStyle({ minWidth: 72, minHeight: 72 });
    await fireEvent(pad, 'accessibilityTap');
    expect(change).toHaveBeenLastCalledWith('right:accessible', true);
    await fireEvent(pad, 'accessibilityTap');
    expect(change).toHaveBeenLastCalledWith('right:accessible', false);
  });
});

describe('web control pad pointer sequences', () => {
  let browser: ReturnType<typeof installBrowserFixture>;
  beforeEach(() => { platform('web'); browser = installBrowserFixture(); });
  afterEach(async () => { await cleanup(); browser.restore(); });
  const capture = () => ({ setPointerCapture: jest.fn(), releasePointerCapture: jest.fn() });
  const pointer = (id: number, target = capture(), button = 0) => ({ nativeEvent: { pointerId: id, button }, currentTarget: target });

  it('exposes real RN-web disabled/pressed DOM semantics, including enabled false omission', async () => {
    // Exercise the installed DOM conversion rather than assuming native test props map.
    const createDOMProps = require('react-native-web/dist/cjs/modules/createDOMProps') as
      (element: string, props: Record<string, unknown>) => Record<string, unknown>;
    const result = await render(<ControlButton direction={-1} disabled onChange={jest.fn()} />);
    const domState = () => {
      const props = screen.getByTestId('control-left').props;
      return createDOMProps('button', { role: 'button', 'aria-disabled': props['aria-disabled'], 'aria-pressed': props['aria-pressed'] });
    };
    expect(domState()).toMatchObject({ disabled: true, 'aria-disabled': true, 'aria-pressed': false });
    await result.rerender(<ControlButton direction={-1} disabled={false} onChange={jest.fn()} />);
    expect(domState()).not.toHaveProperty('disabled');
    expect(domState()).not.toHaveProperty('aria-disabled');
    expect(domState()['aria-pressed']).toBe(false);
    await fireEvent(screen.getByTestId('control-left'), 'pointerDown', pointer(8));
    expect(domState()['aria-pressed']).toBe(true);
    await fireEvent(screen.getByTestId('control-left'), 'pointerCancel', pointer(8));
    expect(domState()['aria-pressed']).toBe(false);
  });

  it('captures each pointer and preserves remaining fingers on cancel/lost capture', async () => {
    const change = jest.fn();
    await render(<ControlButton direction={-1} disabled={false} onChange={change} />);
    const pad = screen.getByTestId('control-left');
    const target = capture();
    await fireEvent(pad, 'pointerDown', pointer(1, target));
    await fireEvent(pad, 'pointerDown', pointer(2, target));
    expect(target.setPointerCapture.mock.calls).toEqual([[1], [2]]);
    await fireEvent(pad, 'pointerCancel', pointer(1, target));
    expect(change).toHaveBeenLastCalledWith('left:pointer:1', false);
    expect(pad.props.accessibilityState.selected).toBe(true);
    await fireEvent(pad, 'lostPointerCapture', pointer(2, target));
    expect(change).toHaveBeenLastCalledWith('left:pointer:2', false);
    expect(pad.props.accessibilityState.selected).toBe(false);
  });
  it('uses window pointer-up fallback when capture is unavailable and cleans listeners', async () => {
    const change = jest.fn();
    const result = await render(<ControlButton direction={1} disabled={false} onChange={change} />);
    await fireEvent(screen.getByTestId('control-right'), 'pointerDown', pointer(3));
    await act(() => browser.win.emit('pointerup', { pointerId: 3 }));
    expect(change).toHaveBeenLastCalledWith('right:pointer:3', false);
    await result.unmount();
    expect(browser.win.count()).toBe(0);
  });
  it('supports focused Space/Enter independently and releases focus/blur without affecting keyboard registry', async () => {
    const input = createInputRegistry();
    input.set('keyboard', 'KeyA', -1, true);
    await render(<ControlButton direction={-1} disabled={false} onChange={(id, down) => input.set('touch', id, -1, down)} />);
    const pad = screen.getByTestId('control-left');
    const space = { key: ' ', preventDefault: jest.fn() };
    await fireEvent(pad, 'keyDown', space);
    await fireEvent(pad, 'keyDown', space);
    await fireEvent(pad, 'keyDown', { key: 'Enter', preventDefault: jest.fn() });
    await fireEvent(pad, 'keyUp', space);
    expect(pad.props.accessibilityState.selected).toBe(true);
    await fireEvent(pad, 'blur');
    expect(pad.props.accessibilityState.selected).toBe(false);
    expect(input.read().left).toBe(true);
  });
  it('does not begin on right-click and blocks context selection without disabling accessible click', async () => {
    const change = jest.fn();
    await render(<ControlButton direction={1} disabled={false} onChange={change} />);
    const pad = screen.getByTestId('control-right');
    await fireEvent(pad, 'pointerDown', pointer(1, capture(), 2));
    expect(change).not.toHaveBeenCalled();
    const preventDefault = jest.fn();
    await fireEvent(pad, 'contextMenu', { preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    await fireEvent(pad, 'click', { detail: 0 });
    expect(change).toHaveBeenLastCalledWith('right:accessible', true);
  });
  it.each([' ', 'Enter'])('does not re-latch after a synthesized %s key click', async key => {
    jest.useFakeTimers();
    try {
      const change = jest.fn();
      const result = await render(<ControlButton direction={1} disabled={false} onChange={change} />);
      const pad = screen.getByTestId('control-right');
      await fireEvent(pad, 'keyDown', { key, preventDefault: jest.fn() });
      await fireEvent(pad, 'keyUp', { key, preventDefault: jest.fn() });
      await fireEvent(pad, 'click', { detail: 0 });
      expect(change).toHaveBeenCalledTimes(2);
      expect(change).toHaveBeenLastCalledWith(`right:button-key:${key}`, false);
      await act(() => { jest.runOnlyPendingTimers(); });
      await fireEvent(pad, 'click', { detail: 0 });
      expect(change).toHaveBeenLastCalledWith('right:accessible', true);
      await result.unmount();
    } finally { jest.useRealTimers(); }
  });
});
