import { setUpTests } from 'react-native-reanimated';

// Jest has no native UI runtime. Use Worklets' own native-boundary mock.
jest.mock('react-native-worklets', () =>
  jest.requireActual('react-native-worklets/src/mock'),
);

setUpTests();

jest.mock('react-native-safe-area-context', () =>
  jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

// The storage API is real in service tests; only the missing native disk boundary is mocked.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
