package com.olla.olla_climbing.domain.member.dto.request;

import com.olla.olla_climbing.domain.member.Member;
import com.olla.olla_climbing.domain.member.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor  // 기본 생성자 자동 생성, new Member()로 텅 빈 객체를 만들지 말고, Member.builder()...build()를 통해서만 완전한 객체를 만들라는 뜻
public class SignupRequest {

    @NotBlank(message = "아이디는 필수 입력입니다.")
    private String loginId;

    @NotBlank
    @Pattern(regexp = "(?=.*[A-Za-z])(?=.*[0-9])(?=\\S+$).{6,}", message = "비밀번호는 최소 6자 이상이어야 하며, 영문자와 숫자를 포함해야 합니다.")
    private String password;

    @NotBlank(message = "이름은 필수 입력입니다.")
    private String name;

    @NotBlank(message = "전화번호는 필수 입력입니다.")
    @Pattern(regexp = "^\\d{3}-\\d{3,4}-\\d{4}$", message = "전화번호는 000-0000-0000 형식이어야 합니다.")
    private String phone;

    @NotBlank(message = "이메일은 필수 입력입니다.")
    @Email(message = "유효한 이메일 주소를 입력해주세요.")
    private String email;

    private Role role;

    // DTO -> Entity 변환 메서드
    public Member toEntity(String encodedPassword) {
        return Member.builder()
                .loginId(this.loginId)
                .password(encodedPassword)
                .name(this.name)
                .phone(this.phone)
                .email(this.email != null ? this.email : null)
                .role(this.role != null ? this.role : Role.USER) // role이 null이면 기본값 USER로 설정
                .build();
    }
}
