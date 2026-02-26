package com.olla.olla_climbing.domain.record.dto.response;

import com.olla.olla_climbing.domain.record.entity.RecordEndurance;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class RecordEnduranceResponse {
    private Long id;
    private Integer oneWayCount;
    private Integer additionalBlocks;
    private Integer timeSeconds;
    private Double totalScore;
    private LocalDate recordDate;

    public static RecordEnduranceResponse from(RecordEndurance record) {
        return RecordEnduranceResponse.builder()
                .id(record.getId())
                .oneWayCount(record.getOneWayCount())
                .additionalBlocks(record.getAdditionalBlocks())
                .timeSeconds(record.getTimeSeconds())
                .totalScore(record.getTotalScore())
                .recordDate(record.getRecordDate())
                .build();
    }
}
