import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ko } from '../i18n/ko';
import { palette } from '../theme/tokens';
import { ServicePanelFrame } from './SettingsPanel';

export interface NicknameWelcomePanelProps {
  visible: boolean;
  onSetup(): void;
  onLater(): void;
}

export function NicknameWelcomePanel({ visible, onSetup, onLater }: NicknameWelcomePanelProps) {
  return (
    <ServicePanelFrame visible={visible} title={ko.nicknameWelcomeTitle} testID="nickname-welcome-panel" onClose={onLater}>
      <Text style={styles.copy}>{ko.nicknameWelcomeDescription}</Text>
      <View style={styles.actions}>
        <Pressable testID="nickname-welcome-setup" accessibilityRole="button" accessibilityLabel={ko.nicknameWelcomeSetup}
          onPress={onSetup} style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>{ko.nicknameWelcomeSetup}</Text>
        </Pressable>
        <Pressable testID="nickname-welcome-later" accessibilityRole="button" accessibilityLabel={ko.nicknameWelcomeLater}
          onPress={onLater} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>{ko.nicknameWelcomeLater}</Text>
        </Pressable>
      </View>
    </ServicePanelFrame>
  );
}

const styles = StyleSheet.create({
  copy: { color: palette.ink, fontSize: 15, lineHeight: 23, textAlign: 'center' },
  actions: { marginTop: 20, gap: 10 },
  button: { minHeight: 50, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.paper },
  primary: { backgroundColor: palette.mint },
  buttonText: { color: palette.ink, fontSize: 15, lineHeight: 21, fontWeight: '700', textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
