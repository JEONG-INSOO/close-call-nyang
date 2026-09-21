import { Share } from 'react-native';
import { formatShareText, type ShareResult } from './shareText';

export { formatShareText, type ShareResult } from './shareText';

export async function shareScore(score: number): Promise<ShareResult> {
  const text = formatShareText(score);
  try {
    const result = await Share.share({ message: text });
    return { text, status: result.action === Share.sharedAction ? 'shared' : 'cancelled' };
  } catch (error) {
    return { text, status: error instanceof Error && error.name === 'AbortError' ? 'cancelled' : 'manual' };
  }
}
