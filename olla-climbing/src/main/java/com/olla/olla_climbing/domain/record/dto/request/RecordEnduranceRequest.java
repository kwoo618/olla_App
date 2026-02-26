package com.olla.olla_climbing.domain.record.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class RecordEnduranceRequest {

    @NotNull(message = "편도 완주 횟수는 필수입니다.")
    @PositiveOrZero(message = "완주 횟수는 0 이상이어야 합니다.")
    private Integer oneWayCount;

    @NotNull(message = "추가 진행 칸 수는 필수입니다.")
    @Min(0)
    @Max(26) // 27칸 기준이므로 추가 칸은 0~26까지만 가능
    private Integer additionalBlocks;

    @NotNull(message = "운동 시간은 필수입니다.")
    @PositiveOrZero(message = "운동 시간은 0 이상이어야 합니다.")
    private Integer timeSeconds;

    @NotNull(message = "기록 날짜는 필수입니다.")
    private LocalDate recordDate;
}