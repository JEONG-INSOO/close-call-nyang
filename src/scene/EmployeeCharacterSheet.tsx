import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import Svg from 'react-native-svg';
import { NyangCharacter, type EmployeePose } from './NyangCharacter';
import type { SceneFrame } from './types';

const POSES = [
  { id: 'walk', label: '활기찬 출근' }, { id: 'water', label: '물 한 모금' },
  { id: 'run', label: '신입의 질주' }, { id: 'notes', label: '꼼꼼한 메모' },
] as const;

const EmployeePoseCard = memo(function EmployeePoseCard({ pose, label }: { pose: EmployeePose; label: string }) {
  const frame = useSharedValue<SceneFrame>({ distanceM: 0, elapsedSeconds: 0,
    angleRad: pose === 'run' ? 0.16 : 0, angularVelocity: 0, hasCoffee: false,
    protectionSeconds: 0, playing: false, fallen: false, seed: 1 });
  return <View testID={`employee-pose-${pose}`} style={styles.card}>
    <Svg width={240} height={240} viewBox="-130 -220 260 250">
      <NyangCharacter frame={frame} reduceMotion characterId="rookie" pose={pose} />
    </Svg>
    <Text style={styles.label}>{label}</Text>
  </View>;
});

/** Art-only sheet of the actual game renderer. No engine, timers, unlocks or score. */
export function EmployeeCharacterSheet() {
  return <View testID="employee-sheet" style={styles.sheet}>
    {POSES.map(({ id, label }) => <EmployeePoseCard key={id} pose={id} label={label} />)}
  </View>;
}
const styles = StyleSheet.create({
  sheet: { width: 544, maxWidth: '100%', padding: 16, gap: 16, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#FAF8F3', borderRadius: 16 },
  card: { width: 248, alignItems: 'center', paddingBottom: 12 },
  label: { color: '#515967', fontSize: 13, lineHeight: 20, fontWeight: '600' },
});
