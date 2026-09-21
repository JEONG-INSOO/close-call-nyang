export type AdAvailability = 'disabled' | 'mock';

/** Flags must come from getFeatureFlags: production never enables this provider. */
export function getRewardedAdAvailability(flags: { mockAdsEnabled: boolean }): AdAvailability {
  return flags.mockAdsEnabled === true ? 'mock' : 'disabled';
}

// A real ad SDK needs an intentional engine API change for externally verified
// rewards, native-build validation and one-time eligibility. Never switch providers
// automatically, grant rewards from a view timer, or enable ads from a public flag alone.
