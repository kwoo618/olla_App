package com.olla.olla_climbing.domain.ranking.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class EnduranceRankingResponse {
    private Long memberId;
    private String name;
    private String profileImageUrl; // 💡 추가
    private Integer ranking;
    private Double score;

    private Integer oneWayCount;
    private Integer additionalBlocks;
    private Integer timeSeconds;
}