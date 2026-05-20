package com.olla.olla_climbing.domain.auth.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@NoArgsConstructor  // 기본 생성자 자동 생성, new Member()로 텅 빈 객체를 만들지 말고, Member.builder()...build()를 통해서만 완전한 객체를 만들라는 뜻
public class SignupRequest {

    @NotBlank(message = "아이디는 필수 입력입니다.")
    @Pattern(regexp = "^[a-zA-Z0-9]{4,20}$", message = "아이디는 영문, 숫자만 사용하여 4~20자로 입력해주세요.") // 💡 한글 방지 정규식 추가    private String loginId;
    private String loginId;

    // (?=.*[A-Za-z])(?=.*[0-9])(?=.*[@$!%*?&])(?=\S+$).{6,}의 자세한 뜻
    @NotBlank
    @Pattern(regexp = "(?=.*[A-Za-z])(?=.*[0-9])(?=.*[@$!%*?&])(?=\\S+$).{6,}", message = "비밀번호는 최소 6자 이상이어야 하며, 영문자와 숫자를 포함해야 합니다.")
    private String password;

    @NotBlank(message = "이름은 필수 입력입니다.")
    private String name;

    @NotBlank(message = "전화번호는 필수 입력입니다.")
    @Pattern(regexp = "^01[016789]-\\d{3,4}-\\d{4}$", message = "전화번호는 010-0000-0000 형식으로 하이픈(-)을 포함해야 합니다.")
    private String phone;

    @NotBlank(message = "이메일은 필수 입력입니다.") // 필수값으로 변경
    @Email(message = "유효한 이메일 주소를 입력해주세요.")
    private String email;

    @NotBlank(message = "성별은 필수 입력입니다.")
    @Pattern(regexp = "^(남|여)$", message = "성별은 '남' 또는 '여'만 입력 가능합니다.")
    private String gender;

    @NotNull(message = "생년월일은 필수 입력입니다.")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd", timezone = "Asia/Seoul")
    private LocalDate birthDate;

    private Role role;

    // (동철 수정) 회원가입할때 전달되는 기능이 (팔 길이, 키, 몸무게 등) 없음 
    private MemberDetailDto detail; 
    private PrivacyDto privacy;

    @Setter
    @Getter
    @NoArgsConstructor
    public static class MemberDetailDto { // 내부 클래스로 정의
        private Integer age;
        private Double height;
        private Double weight;
        private Double armSpan;
        private Double footSize;
    }

    @Setter
    @Getter
    @NoArgsConstructor
    public static class PrivacyDto {
        private boolean isPhonePublic;
        private boolean isEmailPublic;
        private boolean isHeightPublic;
        private boolean isWeightPublic;
        private boolean isArmSpanPublic;
        private boolean isFootSizePublic;
    }

    // DTO -> Entity 변환 메서드
    public Member toEntity(String encodedPassword) {
        return Member.builder()
                .loginId(this.loginId)
                .password(encodedPassword)
                .name(this.name)
                .phone(this.phone)
                .email(this.email)
                .gender(this.gender)
                .birthDate(this.birthDate)
                .role(this.role != null ? this.role : Role.USER)
                .build();
    }
}
