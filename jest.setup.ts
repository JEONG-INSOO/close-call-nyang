import { setUpTests } from 'react-native-reanimated';

// Jest has no native UI runtime. Use Worklets' own native-boundary mock.
jest.mock('react-native-worklets', () =>
  jest.requireActual('react-native-worklets/src/mock'),
);

setUpTests();

jest.mock('react-native-safe-area-context', () =>
  jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
