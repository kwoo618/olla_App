package com.olla.olla_climbing.domain.ranking.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class EnduranceRankingResponse {
    private Long memberId;
    private String name;
    private Integer ranking;
    private Double score; // 랭킹 정렬 기준이 된 점수

    private Integer oneWayCount;
    private Integer additionalBlocks;
    private Integer timeSeconds;
}
