package com.olla.olla_climbing.domain.record.dto.request;

import com.olla.olla_climbing.domain.record.enums.Difficulty;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Getter
@NoArgsConstructor
public class RecordSeriesRequest {

    @NotEmpty(message = "최소 1개 이상의 난이도를 선택해야 합니다.")
    private List<Difficulty> sequenceLog;

    @NotNull(message = "기록 날짜는 필수입니다.")
    private LocalDate recordDate;
}