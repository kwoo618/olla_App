package com.olla.olla_climbing.domain.record.dto.response;

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
    private boolean isSuccess;
    private Integer maxHoldNo;
    private LocalDate recordDate;

    public static RecordBeginnerResponse from(RecordBeginner record) {
        return RecordBeginnerResponse.builder()
                .id(record.getId())     // id는 DB에서 자동 생성되므로 클라이언트가 보내는 게 아니라 서버가 응답할 때 넣어줍니다.
                .difficulty(record.getDifficulty())     // 난이도
                .attemptType(record.getAttemptType())   // 도전 유형
                .isSuccess(record.isSuccess())     // 성공 여부
                .maxHoldNo(record.getMaxHoldNo())   // 실패 시에만 들어오는 홀드 번호
                .recordDate(record.getRecordDate()) // 기록 날짜
                .build();
    }
}