import { memo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import Svg, { G } from 'react-native-svg';
import { CHARACTERS, getUnlockedCharacterIds, type CharacterId } from '../characters/catalog';
import { ko } from '../i18n/ko';
import { NyangCharacter } from '../scene/NyangCharacter';
import type { SceneFrame } from '../scene/types';
import type { CollectionState } from '../services/preferences';
import { palette, ui } from '../theme/tokens';
import { ServicePanelFrame } from './SettingsPanel';

export interface CharacterSelectPanelProps {
  visible: boolean; collection: CollectionState;
  onSelect(id: CharacterId): void; onClose(): void;
}

const CharacterPreview = memo(function CharacterPreview({ characterId }: { characterId: CharacterId }) {
  // Static, original SVG preview: no game controller, clocks, effects, or completion state.
  const frame = useSharedValue<SceneFrame>({ distanceM: 0, elapsedSeconds: 0, angleRad: 0,
    angularVelocity: 0, hasCoffee: false, protectionSeconds: 0, playing: false, fallen: false, seed: 1 });
  return (
    <View testID={`character-preview-${characterId}`} style={styles.preview} pointerEvents="none"
      accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height={104} viewBox="-115 -218 230 235" preserveAspectRatio="xMidYMid meet">
        <G><NyangCharacter frame={frame} reduceMotion characterId={characterId} /></G>
      </Svg>
    </View>
  );
});

export function CharacterSelectPanel({ visible, collection, onSelect, onClose }: CharacterSelectPanelProps) {
  const completed = Number.isFinite(collection.completedRuns) ? Math.min(10, Math.max(0, Math.floor(collection.completedRuns))) : 0;
  const unlocked = getUnlockedCharacterIds(completed);
  return (
    <ServicePanelFrame visible={visible} title={ko.characterSelect} testID="character-panel" onClose={onClose} maxWidth={720}>
      <Text style={styles.hint}>{ko.characterSelectHint}</Text>
      <View style={styles.cards}>
        {CHARACTERS.map(character => {
          const owned = unlocked.includes(character.id);
          const selected = owned && collection.selectedCharacter === character.id;
          const name = ko[character.nameKey];
          const progress = Math.min(completed, character.requiredCompletions);
          return (
            <View testID={`character-card-${character.id}`} key={character.id} style={[styles.card, selected && styles.selectedCard]}>
              <CharacterPreview characterId={character.id} />
              <Text style={styles.name}>{name}</Text>
              <Text style={[styles.status, owned && styles.owned]}>{selected ? ko.characterSelected : owned ? ko.characterOwned : ko.characterLocked}</Text>
              <Text testID={`character-progress-${character.id}`} style={styles.progress}>
                {character.requiredCompletions === 0 ? '기본 캐릭터' : `${ko.collectionProgress} ${progress}/${character.requiredCompletions}회`}
              </Text>
              <Pressable testID={`select-${character.id}`} accessibilityRole="button"
                accessibilityLabel={`${name} ${ko.characterSelectAction}`}
                accessibilityState={{ disabled: !owned, selected }} disabled={!owned}
                {...(Platform.OS === 'web' ? { 'aria-pressed': selected } : {})}
                onPress={() => { if (owned) onSelect(character.id); }}
                style={({ pressed }) => [styles.select, !owned && styles.locked, selected && styles.selectedButton, pressed && styles.pressed]}>
                <Text style={styles.selectText}>{selected ? ko.characterSelected : owned ? ko.characterSelectAction : `${character.requiredCompletions}회 달성 시 획득`}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      <Text style={styles.localHint}>{ko.collectionLocalHint}</Text>
    </ServicePanelFrame>
  );
}

const styles = StyleSheet.create({
  hint: { color: palette.muted, fontSize: 13, lineHeight: 20 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' },
  card: { flexBasis: 160, flexGrow: 1, minWidth: 145, borderRadius: 20, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.background, padding: 10, alignItems: 'center' },
  selectedCard: { borderColor: palette.scoreSuccess, borderWidth: 2, padding: 9 },
  preview: { width: '100%', height: 104 },
  name: { color: palette.ink, fontSize: 14, fontWeight: '800', lineHeight: 20, textAlign: 'center', minHeight: 40, textAlignVertical: 'center' },
  status: { color: palette.muted, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  owned: { color: palette.scoreSuccess },
  progress: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: 8, textAlign: 'center' },
  select: { minHeight: ui.minTapSize, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: palette.mint, paddingHorizontal: 4 },
  locked: { backgroundColor: palette.border },
  selectedButton: { backgroundColor: palette.mint },
  selectText: { color: palette.ink, fontSize: 12, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
  localHint: { color: palette.muted, fontSize: 11, lineHeight: 18 },
  pressed: { opacity: 0.7 },
});
