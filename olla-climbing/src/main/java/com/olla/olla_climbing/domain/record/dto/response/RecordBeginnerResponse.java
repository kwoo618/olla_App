package com.olla.olla_climbing.domain.record.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.olla.olla_climbing.domain.record.entity.RecordBeginner;
import com.olla.olla_climbing.domain.record.enums.AttemptType;
import com.olla.olla_climbing.domain.record.enums.Difficulty;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class RecordBeginnerResponse {

    private Long id;
    private Difficulty difficulty;
    private AttemptType attemptType;

    // @JsonProperty로 "isSuccess" 키 강제 고정
    @JsonProperty("isSuccess")
    private boolean isSuccess;

    private Integer maxHoldNo;
    private LocalDate recordDate;

    public static RecordBeginnerResponse from(RecordBeginner record) {
        return RecordBeginnerResponse.builder()
                .id(record.getId())
                .difficulty(record.getDifficulty())
                .attemptType(record.getAttemptType())
                .isSuccess(record.isSuccess())
                .maxHoldNo(record.getMaxHoldNo())
                .recordDate(record.getRecordDate())
                .build();
    }
}