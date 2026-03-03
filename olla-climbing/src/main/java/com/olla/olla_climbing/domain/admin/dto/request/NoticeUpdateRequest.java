package com.olla.olla_climbing.domain.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class NoticeUpdateRequest {

    @NotBlank(message = "제목은 필수 입력값입니다.")
    private String title;

    @NotBlank(message = "내용은 필수 입력값입니다.")
    private String content;

    // 이미지는 수정 시 삭제하거나 안 바꿀 수도 있으므로 NotBlank 제외
    private String imageUrl;

    private boolean isImportant;
}