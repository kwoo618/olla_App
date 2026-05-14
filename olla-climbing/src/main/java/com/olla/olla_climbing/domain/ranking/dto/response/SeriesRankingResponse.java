package com.olla.olla_climbing.domain.ranking.dto.response;

import com.olla.olla_climbing.domain.record.enums.Difficulty;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class SeriesRankingResponse {
    private Long memberId;
    private String name;
    private String profileImageUrl; // 💡 추가
    private Integer ranking;
    private Double totalScore;
    private List<Difficulty> sequenceLog;
}