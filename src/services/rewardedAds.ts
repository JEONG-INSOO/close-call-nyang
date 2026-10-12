export type AdAvailability = 'disabled' | 'mock';

/** Explicit build-time opt-in exposes only the local DEXCONSULTING text provider. */
export function getRewardedAdAvailability(flags: { mockAdsEnabled: boolean }): AdAvailability {
  return flags.mockAdsEnabled === true ? 'mock' : 'disabled';
}

// A real ad SDK needs an intentional engine API change for externally verified
// rewards, native-build validation and one-time eligibility. Never switch providers
// automatically or grant rewards from a view timer. A mock opt-in never enables an SDK.
