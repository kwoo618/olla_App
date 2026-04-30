package com.olla.olla_climbing.domain.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class AdminMemberCreateRequest {

    @NotBlank(message = "이름은 필수 입력입니다.")
    private String name;

    @NotBlank(message = "전화번호는 필수 입력입니다.")
    @Pattern(regexp = "^\\d{3}-\\d{3,4}-\\d{4}$", message = "전화번호는 000-0000-0000 형식이어야 합니다.")
    private String phone;

    @NotBlank(message = "성별은 필수 입력입니다.")
    @Pattern(regexp = "^(남|여)$", message = "성별은 '남' 또는 '여'만 입력 가능합니다.")
    private String gender;

    @NotNull(message = "생년월일은 필수 입력입니다.")
    private LocalDate birthDate;
}