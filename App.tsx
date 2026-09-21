import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ko } from './src/i18n/ko';

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            {ko.title}
          </Text>
          <Text style={styles.status}>{ko.foundationStatus}</Text>
          <Text style={styles.description}>{ko.foundationDescription}</Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFF6E9',
  },
  card: {
    width: '100%',
    maxWidth: 620,
    alignItems: 'center',
    padding: 28,
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E8DACA',
  },
  title: {
    color: '#433B50',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  status: {
    color: '#35695D',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    color: '#6E647A',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});
