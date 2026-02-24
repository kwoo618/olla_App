package com.olla.olla_climbing.domain.community.dto.request;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class PostCreateRequest {

    @NotBlank(message = "제목은 필수 입력값입니다.")
    private String title;

    @NotBlank(message = "내용은 필수 입력값입니다.")
    private String content;

    @NotNull(message = "원정 여부를 선택해주세요.")
    private Boolean isDifferentGym;

    // 타 암장일 경우에만 값이 들어옴 (올라클라이밍이면 null 가능)
    private String gymPlace;

    @NotNull(message = "모임 날짜와 시간은 필수입니다.")
    @FutureOrPresent(message = "과거의 시간으로 모집할 수 없습니다.")
    private LocalDateTime meetDateTime;

    @Min(value = 2, message = "모집 인원은 본인 포함 최소 2명 이상이어야 합니다.")
    private int maxMember;
}