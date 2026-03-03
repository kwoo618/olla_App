package com.olla.olla_climbing.domain.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class NoticeCreateRequest {

    @NotBlank(message = "제목은 필수 입력값입니다.")
    private String title;

    @NotBlank(message = "내용은 필수 입력값입니다.")
    private String content;

    private String imageUrl; // 이미지는 필수X

    // 상단 고정
    private boolean isImportant;
}