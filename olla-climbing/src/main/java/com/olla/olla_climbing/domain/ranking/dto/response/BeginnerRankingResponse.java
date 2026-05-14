package com.olla.olla_climbing.domain.ranking.dto.response;

import com.olla.olla_climbing.domain.record.enums.AttemptType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class BeginnerRankingResponse {

    private List<MasterDto> masters;
    private List<ChallengerDto> challengers;

    @Getter
    @Builder
    public static class MasterDto {
        private Long memberId;
        private String name;
        private String profileImageUrl;
        private Double score;
        private AttemptType attemptType;
        private LocalDateTime achievedAt;
    }

    @Getter
    @Builder
    public static class ChallengerDto {
        private Long memberId;
        private String name;
        private String profileImageUrl;
        private Integer ranking;
        private Double score;
        private AttemptType attemptType;
        private LocalDateTime achievedAt;
    }
}