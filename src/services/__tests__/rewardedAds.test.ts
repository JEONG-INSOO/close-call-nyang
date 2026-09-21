import { getFeatureFlags } from '../../config/app';
import { getRewardedAdAvailability } from '../rewardedAds';

describe('reward provider gate', () => {
  it.each([undefined, 'false', 'true', 'TRUE'])('never enables a production provider with public value %s', value => {
    expect(getRewardedAdAvailability(getFeatureFlags(false, value))).toBe('disabled');
  });
  it('requires an exact developer opt-in and has no live-network provider', () => {
    expect(getRewardedAdAvailability(getFeatureFlags(true, undefined))).toBe('disabled');
    expect(getRewardedAdAvailability(getFeatureFlags(true, 'TRUE'))).toBe('disabled');
    expect(getRewardedAdAvailability(getFeatureFlags(true, 'true'))).toBe('mock');
  });
});
