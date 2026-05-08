package com.olla.olla_climbing.domain.admin.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.Map;

@Getter
@Builder
public class AdminDashboardResponse {
    private long totalMembers; // 총 가입 회원 수
    private long newMembersToday; // 오늘 신규 가입자 수
    private long activeMemberships; // 현재 활성화된(사용 가능한) 이용권 수

    // 요일별 혼잡도 (월~일 순서의 숫자 배열)
    private List<Long> weeklyCongestion;

    // 요일별 시간대 상세 데이터 (Key: 요일번호 1~7, Value: 09~23시 방문수 배열)
    private Map<Integer, List<Long>> hourlyCongestionByDay;

    // 만료 임박 회원 리스트
    private List<ExpiringMemberDto> expiringMembers;

    @Getter
    @Builder
    public static class ExpiringMemberDto {
        private String name;
        private String phone;
        private String endDate;
        private long dDay;
    }
}