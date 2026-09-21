import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ko } from '../i18n/ko';
import type { Settings } from '../services/preferences';
import { palette, ui } from '../theme/tokens';

export interface SettingsPanelProps {
  visible: boolean; settings: Settings;
  onChange(patch: Partial<Settings>): void; onClose(): void;
}

interface PanelFrameProps {
  visible: boolean; title: string; testID: string; onClose(): void;
  children: ReactNode; maxWidth?: number;
}

/** Native Modal and RN-web's focus-trapped Modal share one scrollable dialog shell. */
export function ServicePanelFrame({ visible, title, testID, onClose, children, maxWidth = 540 }: PanelFrameProps) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}
      supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}>
      <SafeAreaView style={styles.backdrop}>
        <View testID={testID} role="dialog" aria-modal accessibilityViewIsModal
          accessibilityLabel={title} style={[styles.panel, { maxWidth }]}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
            <Pressable testID={`${testID}-close`} accessibilityRole="button" accessibilityLabel={ko.close}
              onPress={onClose} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
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

export function SettingsPanel({ visible, settings, onChange, onClose }: SettingsPanelProps) {
  return (
    <ServicePanelFrame visible={visible} title={ko.settings} testID="settings-panel" onClose={onClose}>
      {SETTING_ROWS.map(row => (
        <View key={row.key} style={styles.settingRow}>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>{row.title}</Text>
            <Text style={styles.settingDescription}>{row.description}</Text>
          </View>
          <Switch testID={`setting-${row.key}`} accessibilityLabel={row.title}
            value={settings[row.key]} onValueChange={enabled => onChange({ [row.key]: enabled })}
            trackColor={{ false: palette.border, true: palette.mint }} thumbColor={palette.white}
            ios_backgroundColor={palette.border} style={styles.switch} />
        </View>
      ))}
      <Text style={styles.hint}>{ko.settingsHint}</Text>
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
  switch: { minHeight: ui.minTapSize, minWidth: 52 },
  hint: { color: palette.muted, fontSize: 12, lineHeight: 19, marginTop: 4 },
  pressed: { opacity: 0.7 },
});
