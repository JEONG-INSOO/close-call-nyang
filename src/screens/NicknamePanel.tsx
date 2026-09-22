import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { ko } from '../i18n/ko';
import type { PlayerProfile } from '../online/contracts';
import { validateNickname } from '../online/nickname';
import { onlineErrorMessage } from '../online/types';
import { palette } from '../theme/tokens';
import { onlineStyles as styles } from './onlineStyles';
import { ServicePanelFrame } from './SettingsPanel';

export interface NicknamePanelProps {
  visible: boolean; profile: PlayerProfile | null; onClose(): void;
  onSave(nickname: string): Promise<boolean | void>; busy?: boolean; error?: string | null;
  disabled?: boolean;
}

export function NicknamePanel({ visible, profile, onClose, onSave, busy = false, error, disabled = false }: NicknamePanelProps) {
  const [draft, setDraft] = useState(profile?.nickname ?? '');
  const [localError, setLocalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const active = useRef(false); const operation = useRef(0); const lock = useRef(false);
  useEffect(() => {
    active.current = visible;
    if (visible) { setDraft(profile?.nickname ?? ''); setLocalError(null); }
    else { operation.current += 1; lock.current = false; setSaving(false); }
    return () => { active.current = false; };
    // An in-flight profile refresh must not erase an open editor's unsaved draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  const waiting = busy || saving;
  const save = async () => {
    if (lock.current || waiting || disabled) return;
    const validation = validateNickname(draft);
    if (!validation.ok) { setLocalError(validation.reason); return; }
    lock.current = true; setSaving(true); setLocalError(null);
    const generation = ++operation.current;
    try {
      const result = await onSave(validation.value);
      if (generation === operation.current && active.current && result !== false) onClose();
    } catch (cause) {
      if (generation === operation.current && active.current) setLocalError(onlineErrorMessage(cause));
    } finally {
      if (generation === operation.current && active.current) { lock.current = false; setSaving(false); }
    }
  };
  return (
    <ServicePanelFrame visible={visible} title={profile ? ko.nicknameEdit : ko.nicknameSet} testID="nickname-panel" onClose={onClose}>
      <Text style={styles.copy}>{ko.nicknamePublicNotice}</Text>
      <Text style={styles.notice}>{ko.guestIdentityNotice}</Text>
      <Text style={styles.label}>{ko.nickname}</Text>
      <TextInput testID="nickname-input" accessibilityLabel={ko.nickname} value={draft}
        onChangeText={value => { setDraft(value); setLocalError(null); }} editable={!waiting && !disabled}
        autoCapitalize="none" autoCorrect={false} autoComplete="off" textContentType="none"
        returnKeyType="done" onSubmitEditing={() => { void save(); }} maxLength={80}
        placeholder={ko.nicknamePlaceholder} placeholderTextColor={palette.muted} style={inputStyle.input} />
      <Text style={styles.copy}>{ko.nicknameRules}</Text>
      {(localError || error) && <Text accessibilityRole="alert" style={styles.error}>{localError || error}</Text>}
      <Pressable testID="nickname-save" accessibilityRole="button" accessibilityLabel={ko.nicknameSave}
        disabled={waiting || disabled} accessibilityState={{ disabled: waiting || disabled, busy: waiting }}
        onPress={() => { void save(); }} style={({ pressed }) => [styles.button, styles.primary, (waiting || disabled) && styles.disabled, pressed && styles.pressed]}>
        <Text style={styles.buttonText}>{waiting ? ko.saving : ko.nicknameSave}</Text>
      </Pressable>
    </ServicePanelFrame>
  );
}

const inputStyle = StyleSheet.create({
  input: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.white, color: palette.ink, fontSize: 17 },
});
