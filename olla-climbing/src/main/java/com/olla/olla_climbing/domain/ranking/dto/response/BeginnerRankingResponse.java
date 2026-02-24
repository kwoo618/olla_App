package com.olla.olla_climbing.domain.ranking.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class BeginnerRankingResponse {

    private List<MasterDto> masters;            // 순위 없는 명예의 전당 목록
    private List<ChallengerDto> challengers;    // 순위가 있는 도전자 목록

    @Getter
    @Builder
    public static class MasterDto {
        private Long memberId;
        private String name;
        private Double score; // 도달 홀드 수 (만점)
        private LocalDateTime achievedAt; // 달성 날짜 (baseDate 활용)
    }

    @Getter
    @Builder
    public static class ChallengerDto {
        private Long memberId;
        private String name;
        private Integer ranking; // 현재 등수
        private Double score; // 최고 도달 홀드 수
    }
}