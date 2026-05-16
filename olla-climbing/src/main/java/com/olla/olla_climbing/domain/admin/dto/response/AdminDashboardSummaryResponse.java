package com.olla.olla_climbing.domain.admin.dto.response;

import lombok.Builder;
import lombok.Getter;
import java.util.List;

@Getter
@Builder
public class AdminDashboardSummaryResponse {
    private long totalVisitsToday;        // 오늘 방문자 수
    private long expiringIn3Days;         // 3일 이내 만료 예정자 수
    private long newMembersThisWeek;      // 이번 주 신규 가입자 수
    private List<NoticeResponse> notices; // 최근 공지사항 리스트 (최대 5개 등)
}