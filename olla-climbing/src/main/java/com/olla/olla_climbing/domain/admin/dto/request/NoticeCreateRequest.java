package com.olla.olla_climbing.domain.admin.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class NoticeCreateRequest {

    @NotBlank(message = "제목은 필수 입력값입니다.")
    private String title;

    @NotBlank(message = "내용은 필수 입력값입니다.")
    private String content;

    private String imageUrl;

    // 필드 위에 @JsonProperty를 달아서 JSON 매핑 이름을 강제 고정해 줍니다!
    @JsonProperty("isImportant")
    private boolean isImportant;

    @JsonProperty("isTopFixed")
    private boolean isTopFixed;
}