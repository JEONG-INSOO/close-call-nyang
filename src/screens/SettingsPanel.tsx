import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ko } from '../i18n/ko';
import type { Settings } from '../services/preferences';
import { palette, ui } from '../theme/tokens';
import { onlineStyles as online } from './onlineStyles';

export interface SettingsPanelProps {
  visible: boolean; settings: Settings;
  onChange(patch: Partial<Settings>): void; onClose(): void;
  nickname?: string | null; onEditNickname?(): void; onDeleteProfile?(): Promise<boolean | void>;
  deleting?: boolean; onlineError?: string | null;
}

interface PanelFrameProps {
  visible: boolean; title: string; testID: string; onClose(): void;
  children: ReactNode; maxWidth?: number; closeDisabled?: boolean;
}

/** Native Modal and RN-web's focus-trapped Modal share one scrollable dialog shell. */
export function ServicePanelFrame({ visible, title, testID, onClose, children, maxWidth = 540, closeDisabled = false }: PanelFrameProps) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={() => { if (!closeDisabled) onClose(); }}
      supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}>
      <SafeAreaView style={styles.backdrop}>
        <View testID={testID} role="dialog" aria-modal accessibilityViewIsModal
          accessibilityLabel={title} style={[styles.panel, { maxWidth }]}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
            <Pressable testID={`${testID}-close`} accessibilityRole="button" accessibilityLabel={ko.close}
              disabled={closeDisabled} accessibilityState={{ disabled: closeDisabled }}
              onPress={onClose} style={({ pressed }) => [styles.close, closeDisabled && online.disabled, pressed && styles.pressed]}>
              <Text style={styles.closeText}>{ko.close}</Text>
            </Pressable>
          </View>
          <ScrollView testID={`${testID}-scroll`} style={styles.scroll} contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
            {children}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const SETTING_ROWS: readonly { key: keyof Settings; title: string; description: string }[] = [
  { key: 'musicEnabled', title: ko.music, description: ko.musicDescription },
  { key: 'sfxEnabled', title: ko.sfx, description: ko.sfxDescription },
  { key: 'hapticsEnabled', title: ko.haptics, description: ko.hapticsDescription },
  { key: 'reduceMotion', title: ko.reduceMotion, description: ko.reduceMotionDescription },
];

export function SettingsPanel({ visible, settings, onChange, onClose, nickname, onEditNickname, onDeleteProfile,
  deleting = false, onlineError }: SettingsPanelProps) {
  const [confirming, setConfirming] = useState(false); const [localBusy, setLocalBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null); const locked = useRef(false);
  const active = useRef(false); const generation = useRef(0);
  useEffect(() => {
    active.current = visible;
    if (!visible) { generation.current += 1; setConfirming(false); setDeleteError(null); setLocalBusy(false); }
    return () => { active.current = false; };
  }, [visible]);
  const busy = deleting || localBusy;
  const remove = async () => {
    if (!onDeleteProfile || locked.current || busy) return;
    locked.current = true; setLocalBusy(true); setDeleteError(null);
    const operation = generation.current;
    try {
      const result = await onDeleteProfile();
      if (active.current && operation === generation.current) {
        if (result !== false) setConfirming(false);
        else setDeleteError(ko.deleteOnlineRetry);
      }
    } catch {
      if (active.current && operation === generation.current) setDeleteError(ko.deleteOnlineRetry);
    } finally {
      locked.current = false;
      if (active.current && operation === generation.current) setLocalBusy(false);
    }
  };
  return (
    <ServicePanelFrame visible={visible} title={ko.settings} testID="settings-panel" onClose={onClose} closeDisabled={busy}>
      {SETTING_ROWS.map(row => (
        <View key={row.key} style={styles.settingRow}>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>{row.title}</Text>
            <Text style={styles.settingDescription}>{row.description}</Text>
          </View>
          {/* The wrapper owns the 44pt target; stretching Switch itself misaligns its thumb and track on web. */}
          <View style={styles.switchTarget}>
            <Switch testID={`setting-${row.key}`} accessibilityLabel={row.title}
              value={settings[row.key]} onValueChange={enabled => onChange({ [row.key]: enabled })}
              trackColor={{ false: palette.border, true: palette.mint }} thumbColor={palette.white}
              ios_backgroundColor={palette.border} />
          </View>
        </View>
      ))}
      <Text style={styles.hint}>{ko.settingsHint}</Text>
      {(onEditNickname || onDeleteProfile || onlineError) && <View style={styles.onlineSection}>
        <Text accessibilityRole="header" style={online.label}>{ko.onlineProfile}</Text>
        {nickname && <Text testID="settings-nickname" style={online.copy}>{nickname}</Text>}
        {onlineError && <Text accessibilityRole="alert" style={online.error}>{onlineError}</Text>}
        {onEditNickname && !confirming && <Pressable testID="settings-nickname-edit" accessibilityRole="button"
          accessibilityLabel={nickname ? ko.nicknameEdit : ko.nicknameSet} disabled={busy}
          onPress={onEditNickname} style={({ pressed }) => [online.button, busy && online.disabled, pressed && online.pressed]}>
          <Text style={online.buttonText}>{nickname ? ko.nicknameEdit : ko.nicknameSet}</Text>
        </Pressable>}
        {onDeleteProfile && !confirming && <Pressable testID="settings-delete-online" accessibilityRole="button"
          accessibilityLabel={ko.deleteOnlineProfile} disabled={busy} onPress={() => { setConfirming(true); setDeleteError(null); }}
          style={({ pressed }) => [online.button, busy && online.disabled, pressed && online.pressed]}>
          <Text style={online.buttonText}>{ko.deleteOnlineProfile}</Text>
        </Pressable>}
        {confirming && <View testID="delete-online-confirmation" style={styles.onlineSection}>
          <Text accessibilityRole="header" style={online.label}>{ko.deleteOnlineConfirm}</Text>
          <Text style={online.notice}>{ko.deleteOnlineDescription}</Text>
          {deleteError && <Text accessibilityRole="alert" style={online.error}>{deleteError}</Text>}
          <Pressable testID="confirm-delete-online" accessibilityRole="button" accessibilityLabel={ko.deleteOnlineAction}
            disabled={busy} accessibilityState={{ disabled: busy, busy }} onPress={() => { void remove(); }}
            style={({ pressed }) => [online.button, online.destructive, busy && online.disabled, pressed && online.pressed]}>
            <Text style={online.buttonText}>{busy ? ko.deletingOnline : ko.deleteOnlineAction}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={ko.cancel} disabled={busy}
            onPress={() => { setConfirming(false); setDeleteError(null); }} style={[online.button, busy && online.disabled]}>
            <Text style={online.buttonText}>{ko.cancel}</Text>
          </Pressable>
        </View>}
      </View>}
    </ServicePanelFrame>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: palette.overlay, alignItems: 'center', justifyContent: 'center', padding: ui.gutter },
  panel: { width: '100%', maxHeight: '100%', borderRadius: ui.radius, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.border, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderColor: palette.border },
  heading: { color: palette.ink, fontSize: 22, lineHeight: 30, fontWeight: '800', flexShrink: 1 },
  close: { minHeight: ui.minTapSize, minWidth: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: palette.background, paddingHorizontal: 12 },
  closeText: { color: palette.ink, fontSize: 14, fontWeight: '600' },
  scroll: { flexShrink: 1 },
  content: { padding: 18, gap: 10 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, borderBottomWidth: 1, borderColor: palette.border, paddingBottom: 10 },
  settingCopy: { flex: 1 },
  settingTitle: { color: palette.ink, fontSize: 16, lineHeight: 23, fontWeight: '700' },
  settingDescription: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  switchTarget: { minHeight: ui.minTapSize, minWidth: 52, alignItems: 'center', justifyContent: 'center' },
  hint: { color: palette.muted, fontSize: 12, lineHeight: 19, marginTop: 4 },
  onlineSection: { gap: 10, marginTop: 6 },
  pressed: { opacity: 0.7 },
});
