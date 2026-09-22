import { StyleSheet } from 'react-native';
import { palette, ui } from '../theme/tokens';

export const onlineStyles = StyleSheet.create({
  copy: { color: palette.muted, fontSize: 13, lineHeight: 21 },
  label: { color: palette.ink, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  notice: { color: palette.ink, fontSize: 13, lineHeight: 21, backgroundColor: palette.background, padding: 12, borderRadius: 12 },
  error: { color: palette.navy, fontSize: 13, lineHeight: 21, backgroundColor: palette.peach, padding: 12, borderRadius: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  button: { minHeight: ui.minTapSize, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: palette.border, justifyContent: 'center', alignItems: 'center' },
  primary: { backgroundColor: palette.mint, borderColor: palette.mint },
  destructive: { backgroundColor: palette.peach, borderColor: palette.peach },
  buttonText: { color: palette.ink, fontSize: 14, lineHeight: 21, fontWeight: '700', textAlign: 'center' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});
