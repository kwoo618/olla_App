package com.olla.olla_climbing.domain.record.dto.response;

import com.olla.olla_climbing.domain.record.entity.RecordSeries;
import com.olla.olla_climbing.domain.record.enums.Difficulty;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
public class RecordSeriesResponse {
    private Long id;
    private List<Difficulty> sequenceLog;
    private Double totalScore;
    private LocalDate recordDate;

    public static RecordSeriesResponse from(RecordSeries record) {
        return RecordSeriesResponse.builder()
                .id(record.getId())
                .sequenceLog(record.getSequenceLog())
                .totalScore(record.getTotalScore())
                .recordDate(record.getRecordDate())
                .build();
    }
}