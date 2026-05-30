// 동료가 파일을 줄 때까지 사용하는 임시 데이터 파일입니다.

export interface NotificationItem {
  id: string | number;
  title: string;
  content: string;
  isRead?: boolean;
  read?: boolean;
  important?: boolean;
  createdAt?: string;
}

export interface MembershipType {
  id: string | number;
  name: string;
  endDate: string;
  dDay: number;
}

// 💡 추가됨: 모달 설정의 타입을 정의하여 onConfirm 에러(TS2339) 해결
export interface ResultModalConfigType {
  title: string;
  message: string;
  type: string;
  onConfirm?: () => void; // onConfirm 함수가 있을 수도, 없을 수도 있음을 명시
}

export const useNotification = (navigation: any) => {
  
  const notifications: NotificationItem[] = [
    {
      id: '1',
      title: '임시 알림입니다.',
      content: '동료분이 ts 파일을 올려주시면 진짜 데이터로 바뀝니다.',
      isRead: false,
      important: true,
      createdAt: '2026-05-30T10:00:00'
    }
  ];

  const myMemberships: MembershipType[] = [
    {
      id: 'm1',
      name: '임시 자유 이용권',
      endDate: '2026-06-05',
      dDay: 2
    }
  ];

  return {
    loading: false,
    refreshing: false,
    notifications,
    myMemberships,
    membershipLoading: false,
    expandedId: null as string | number | null,
    toggleExpandAndRead: (item: NotificationItem) => console.log('알림 클릭됨', item),
    onRefresh: () => console.log('새로고침 됨'),
    resultModalVisible: false,
    setResultModalVisible: (val: boolean) => {},
    // 💡 수정됨: resultModalConfig가 ResultModalConfigType을 따르도록 지정
    resultModalConfig: { title: '', message: '', type: 'info' } as ResultModalConfigType,
  };
};