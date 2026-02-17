package com.olla.olla_climbing.domain.record.dto.response;

import com.olla.olla_climbing.domain.record.entity.RecordEndurance;
import com.olla.olla_climbing.domain.record.enums.EnduranceZone;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class RecordEnduranceResponse {
    private Long id;
    private Integer completedOneWays;
    private EnduranceZone dropZone;
    private Integer timeSeconds;
    private LocalDate recordDate;

    public static RecordEnduranceResponse from(RecordEndurance record) {
        return RecordEnduranceResponse.builder()
                .id(record.getId())
                .completedOneWays(record.getCompletedOneWays())
                .dropZone(record.getDropZone())
                .timeSeconds(record.getTimeSeconds())
                .recordDate(record.getRecordDate())
                .build();
    }
}