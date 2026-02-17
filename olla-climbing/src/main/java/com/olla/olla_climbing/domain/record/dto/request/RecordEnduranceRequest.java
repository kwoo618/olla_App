package com.olla.olla_climbing.domain.record.dto.request;

import com.olla.olla_climbing.domain.record.enums.EnduranceZone;
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
    private Integer completedOneWays;

    private EnduranceZone dropZone; // null 허용 (추락 안 했을 경우)

    @NotNull(message = "운동 시간은 필수입니다.")
    @PositiveOrZero(message = "운동 시간은 0 이상이어야 합니다.")
    private Integer timeSeconds;

    @NotNull(message = "기록 날짜는 필수입니다.")
    private LocalDate recordDate;
}