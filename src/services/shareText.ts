import { APP_NAME, PUBLIC_WEB_URL } from '../config/app';

export type ShareResult = { status: 'shared' | 'copied' | 'cancelled' | 'manual'; text: string };

export function formatShareText(score: number): string {
  const safeScore = Number.isFinite(score) && score >= 0 ? Math.floor(score) : 0;
  return `${APP_NAME} 프로젝트 성공률 ${safeScore}%!\n${PUBLIC_WEB_URL}`;
}
