// 회원권 조회 + 5곳 중복 로직 통합
/**
 * src/api/membership.ts
 *
 * 회원권 관련 API 호출 + 판별 로직을 한 곳으로 통합합니다.
 *
 * 기존에 Home.ts / Community.ts / App.tsx / Recode.ts / Ranking.ts
 * 5곳에 거의 동일한 코드가 흩어져 있었습니다.
 * 특히 Recode·Ranking은 isStarted(시작일) 체크가 빠져 있어
 * 시작일이 미래인 이용권도 활성으로 잘못 인식하는 버그가 있었습니다.
 * 이 파일은 그 버전들을 합쳐 올바른 로직을 하나로 정리한 것입니다.
 */

import axios from 'axios';
import { authHeader } from './apiClient';
import { API_BASE_URL } from '../Config';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface MembershipItem {
  membershipId?: number;
  id?: number;
  membershipType: string;
  membershipStatus?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  remainingCount?: number | null;
}

// ─── 내부 헬퍼 ───────────────────────────────────────────────────────────────

/** 오늘 00:00:00 기준 Date 반환 */
const todayMidnight = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * 이용권 시작일이 오늘 이전인지 확인합니다.
 * startDate가 없으면 이미 시작된 것으로 간주합니다.
 */
export const isStarted = (startDate?: string): boolean => {
  if (!startDate) return true;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  return start <= todayMidnight();
};

/**
 * 이용권 목록에서 유효한 기간권(회원권)이 있는지 확인합니다.
 *
 * 유효 조건:
 * - status가 ACTIVE이고 (DELETED·INACTIVE·EXPIRED 제외)
 * - 시작일이 오늘 이전이고 (아직 시작 안 한 이용권 제외)
 * - COUNT/횟수/일일 타입이 아니고 (일일권 제외)
 * - endDate가 현재 이후인 (만료된 이용권 제외)
 */
export const hasActivePeriodMembership = (items: MembershipItem[]): boolean => {
  if (!Array.isArray(items) || items.length === 0) return false;

  return items.some(m => {
    const status = String(m.membershipStatus ?? m.status ?? '').toUpperCase();
    if (['DELETED', 'INACTIVE', 'EXPIRED'].includes(status)) return false;
    if (!isStarted(m.startDate)) return false;

    const typeStr = String(m.membershipType ?? '').toUpperCase();
    const isCount =
      typeStr.includes('COUNT') ||
      typeStr.includes('횟수') ||
      typeStr.includes('일일');
    if (isCount) return false;

    if (!m.endDate) return false;
    const end = new Date(m.endDate);
    end.setHours(23, 59, 59, 999);
    return end.getTime() >= Date.now();
  });
};

// ─── API 함수 ─────────────────────────────────────────────────────────────────

/**
 * /memberships/me를 호출해 기간권 보유 여부를 반환합니다.
 * 호출 실패 시 false를 반환합니다(보수적 처리).
 */
export const fetchHasMembership = async (): Promise<boolean> => {
  try {
    const headers = await authHeader();
    const res = await axios.get(`${API_BASE_URL}/memberships/me`, { headers });
    const raw = res.data?.data;
    const list: MembershipItem[] = Array.isArray(raw)
      ? raw
      : (raw?.content ?? []);
    return hasActivePeriodMembership(list);
  } catch {
    return false;
  }
};

/**
 * /memberships/me 원본 목록 전체를 반환합니다.
 * Home.ts 처럼 상세 상태(남은 일수, 잔여 횟수 등)가 필요한 화면에서 사용합니다.
 */
export const fetchMyMemberships = async (): Promise<MembershipItem[]> => {
  try {
    const headers = await authHeader();
    const res = await axios.get(`${API_BASE_URL}/memberships/me`, { headers });
    const raw = res.data?.data;
    return Array.isArray(raw) ? raw : (raw?.content ?? []);
  } catch {
    return [];
  }
};