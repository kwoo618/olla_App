package com.olla.olla_climbing.domain.record.dto.request;

import com.olla.olla_climbing.domain.record.enums.Difficulty;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Getter
@NoArgsConstructor
public class RecordSeriesRequest {

    @Size(max = 50, message = "연속 리드는 최대 50개까지만 기록할 수 있습니다.")
    @NotEmpty(message = "최소 1개 이상의 난이도를 선택해야 합니다.")
    private List<Difficulty> sequenceLog;

    @NotNull(message = "기록 날짜는 필수입니다.")
    private LocalDate recordDate;
}