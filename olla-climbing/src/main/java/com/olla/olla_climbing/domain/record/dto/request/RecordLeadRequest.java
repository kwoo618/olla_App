package com.olla.olla_climbing.domain.record.dto.request;

import com.olla.olla_climbing.domain.record.enums.AttemptType;
import com.olla.olla_climbing.domain.record.enums.Difficulty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class RecordLeadRequest {

    @NotNull(message = "난이도는 필수입니다.")
    private Difficulty difficulty;

    @NotNull(message = "도전 유형은 필수입니다.")
    private AttemptType attemptType;

    @NotNull(message = "성공 여부는 필수입니다.")
    private Boolean isSuccess;

    private Integer maxHoldNo; // 실패 시에만 들어옴

    @NotNull(message = "기록 날짜는 필수입니다.")
    private LocalDate recordDate;
}