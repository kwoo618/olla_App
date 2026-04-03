package com.olla.olla_climbing.domain.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AdminNotificationSendRequest {

    @NotNull(message = "수신할 회원 ID는 필수입니다.")
    private Long memberId;

    @NotBlank(message = "알림 제목을 입력해주세요.")
    private String title;

    @NotBlank(message = "알림 내용을 입력해주세요.")
    private String content;
}