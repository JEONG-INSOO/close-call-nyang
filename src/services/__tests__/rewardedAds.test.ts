import { getFeatureFlags } from '../../config/app';
import { getRewardedAdAvailability } from '../rewardedAds';

describe('reward provider gate', () => {
  it.each([undefined, 'false', 'TRUE', ' true ', '1'])('keeps the production text provider disabled for %s', value => {
    expect(getRewardedAdAvailability(getFeatureFlags(false, value))).toBe('disabled');
  });
  it('requires an exact opt-in on both development and production and has no live-network provider', () => {
    expect(getRewardedAdAvailability(getFeatureFlags(true, undefined))).toBe('disabled');
    expect(getRewardedAdAvailability(getFeatureFlags(true, 'TRUE'))).toBe('disabled');
    expect(getRewardedAdAvailability(getFeatureFlags(true, 'true'))).toBe('mock');
    expect(getRewardedAdAvailability(getFeatureFlags(false, 'true'))).toBe('mock');
  });
});
