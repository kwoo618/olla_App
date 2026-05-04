package com.olla.olla_climbing.domain.admin.dto.response;

import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class VisitDashboardResponse {
    private int totalVisitsToday; // 오늘 전체 입장객 수
    private List<VisitLogDto> visitLogs;

    @Getter
    @Builder
    public static class VisitLogDto {
        private String memberName;
        private LocalDateTime visitTime;
        private String adminName;
    }
}