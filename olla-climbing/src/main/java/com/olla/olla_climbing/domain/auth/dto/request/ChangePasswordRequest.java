package com.olla.olla_climbing.domain.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ChangePasswordRequest {

    @NotBlank(message = "기존 비밀번호를 입력해주세요.")
    private String oldPassword;

    @NotBlank(message = "새 비밀번호를 입력해주세요.")
    @Pattern(regexp = "(?=.*[A-Za-z])(?=.*[0-9])(?=\\S+$).{6,}", message = "비밀번호는 최소 6자 이상이어야 하며, 영문자와 숫자를 포함해야 합니다.")
    private String newPassword;
}