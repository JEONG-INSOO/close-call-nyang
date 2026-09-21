import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View, type GestureResponderEvent, type ViewStyle } from 'react-native';
import { ko } from '../i18n/ko';
import { palette, ui } from '../theme/tokens';

export interface ControlButtonProps {
  direction: -1 | 1;
  disabled: boolean;
  onChange(id: string, down: boolean): void;
}

interface CaptureTarget {
  setPointerCapture?(id: number): void;
  releasePointerCapture?(id: number): void;
  hasPointerCapture?(id: number): boolean;
}
interface PadPointerEvent {
  nativeEvent: { pointerId: number; button?: number };
  currentTarget: unknown;
}
interface PadKeyEvent { key: string; preventDefault(): void }

/** Raw touches avoid the exclusive responder lock used by a single Pressable. */
export function ControlButton({ direction, disabled, onChange }: ControlButtonProps): React.JSX.Element {
  const callback = useRef(onChange);
  callback.current = onChange;
  const held = useRef(new Set<string>());
  const captures = useRef(new Map<number, CaptureTarget>());
  const suppressKeyClick = useRef(false);
  const clickReset = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressed, setPressed] = useState(false);
  const prefix = direction === -1 ? 'left' : 'right';
  const change = useCallback((suffix: string, down: boolean, render = true) => {
    const id = `${prefix}:${suffix}`;
    if (held.current.has(id) === down) return;
    if (down) held.current.add(id);
    else held.current.delete(id);
    callback.current(id, down);
    if (render) setPressed(held.current.size > 0);
  }, [prefix]);
  const releaseAll = useCallback((render = true) => {
    if (clickReset.current !== null) clearTimeout(clickReset.current);
    clickReset.current = null;
    suppressKeyClick.current = false;
    for (const id of held.current) callback.current(id, false);
    held.current.clear();
    for (const [id, target] of captures.current) {
      try { target.releasePointerCapture?.(id); } catch { /* Browser already ended this pointer. */ }
    }
    captures.current.clear();
    if (render) setPressed(false);
  }, []);
  const releasePointer = useCallback((pointerId: number) => {
    change(`pointer:${pointerId}`, false);
    const target = captures.current.get(pointerId);
    captures.current.delete(pointerId);
    try { target?.releasePointerCapture?.(pointerId); } catch { /* Capture can already be lost. */ }
  }, [change]);
  useEffect(() => { if (disabled) releaseAll(); }, [disabled, releaseAll]);
  useEffect(() => () => releaseAll(false), [releaseAll, direction]);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const finish = (event: globalThis.PointerEvent) => releasePointer(event.pointerId);
    const blur = () => releaseAll();
    // Fallback for browsers without pointer capture; releasing elsewhere never sticks.
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      window.removeEventListener('blur', blur);
    };
  }, [releaseAll, releasePointer]);
  const touch = (event: GestureResponderEvent, down: boolean) => {
    if (down && disabled) return;
    const changed = event.nativeEvent.changedTouches;
    for (const point of changed) {
      if (!down || point.target === event.nativeEvent.target) change(`touch:${point.identifier}`, down);
    }
  };
  const toggleAccessible = () => {
    if (!disabled) change('accessible', !held.current.has(`${prefix}:accessible`));
  };
  const webProps = Platform.OS === 'web' ? {
    // RN-web does not forward the native composite accessibilityState prop.
    'aria-disabled': disabled,
    'aria-pressed': pressed,
    onPointerDown: (event: PadPointerEvent) => {
      if (disabled || (event.nativeEvent.button !== undefined && event.nativeEvent.button !== 0)) return;
      const id = event.nativeEvent.pointerId;
      const target = event.currentTarget as CaptureTarget;
      change(`pointer:${id}`, true);
      captures.current.set(id, target);
      try { target.setPointerCapture?.(id); } catch { /* Window listeners provide the fallback. */ }
    },
    onPointerUp: (event: PadPointerEvent) => releasePointer(event.nativeEvent.pointerId),
    onPointerCancel: (event: PadPointerEvent) => releasePointer(event.nativeEvent.pointerId),
    onLostPointerCapture: (event: PadPointerEvent) => releasePointer(event.nativeEvent.pointerId),
    onContextMenu: (event: { preventDefault(): void }) => event.preventDefault(),
    onKeyDown: (event: PadKeyEvent) => {
      if (!disabled && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault();
        if (clickReset.current !== null) clearTimeout(clickReset.current);
        clickReset.current = null;
        suppressKeyClick.current = true;
        change(`button-key:${event.key}`, true);
      }
    },
    onKeyUp: (event: PadKeyEvent) => {
      if (event.key === ' ' || event.key === 'Enter') {
        if (!disabled) event.preventDefault();
        change(`button-key:${event.key}`, false);
        // RN web maps the role to a real button. A keyboard-generated click
        // must not re-latch a direction after keyup; later assistive clicks work.
        if (clickReset.current !== null) clearTimeout(clickReset.current);
        clickReset.current = setTimeout(() => {
          suppressKeyClick.current = false;
          clickReset.current = null;
        }, 0);
      }
    },
    onBlur: () => releaseAll(),
    onClick: (event: { detail: number }) => {
      if (event.detail !== 0) return;
      if (suppressKeyClick.current) { suppressKeyClick.current = false; return; }
      toggleAccessible();
    },
  } : {
    onTouchStart: (event: GestureResponderEvent) => touch(event, true),
    onTouchEnd: (event: GestureResponderEvent) => touch(event, false),
    onTouchCancel: (event: GestureResponderEvent) => touch(event, false),
  };

  return (
    <View testID={`control-${prefix}`} accessibilityRole="button"
      accessibilityLabel={direction === -1 ? ko.controlLeft : ko.controlRight}
      accessibilityState={{ disabled, selected: pressed }}
      accessible focusable={!disabled} tabIndex={disabled ? -1 : 0}
      onAccessibilityTap={toggleAccessible}
      style={[styles.pad, pressed && styles.pressed, disabled && styles.disabled,
        Platform.OS === 'web' && styles.web]}
      {...webProps}>
      <Text pointerEvents="none" style={styles.arrow}>{direction === -1 ? '←' : '→'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { width: ui.controlSize, height: ui.controlSize, minWidth: 72, minHeight: 72,
    alignItems: 'center', justifyContent: 'center', borderRadius: 24,
    backgroundColor: '#FFFFFFCC', borderWidth: 2, borderColor: palette.ink },
  pressed: { backgroundColor: palette.mint, borderWidth: 3 },
  disabled: { opacity: 0.45 },
  arrow: { fontSize: 38, lineHeight: 44, fontWeight: '700', color: palette.ink, userSelect: 'none' },
  web: { touchAction: 'none', userSelect: 'none', cursor: 'pointer' } as ViewStyle,
});
