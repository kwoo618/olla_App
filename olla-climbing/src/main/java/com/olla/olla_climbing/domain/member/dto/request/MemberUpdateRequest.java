package com.olla.olla_climbing.domain.member.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter; //(동철 수정) 프론트가 보낸 값 안전하게 받기 위해 추가
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@Setter //(동철 수정)
@NoArgsConstructor
public class MemberUpdateRequest {
    // Member 기본 정보 수정용
    private String name;

    @Pattern(regexp = "^01[016789]-\\d{3,4}-\\d{4}$", message = "전화번호는 010-0000-0000 형식으로 하이픈(-)을 포함해야 합니다.")
    private String phone;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd", timezone = "Asia/Seoul")
    private LocalDate birthDate; // String에서 LocalDate로 변경

    @Pattern(regexp = "^(남|여)$", message = "성별은 '남' 또는 '여'만 입력 가능합니다.")
    private String gender;


    private String profileImageUrl;

    // MemberDetail 신체 정보 수정용 (PATCH니까 다 null 허용)
    private Integer age;
    private Double height;
    private Double weight;
    private Double armSpan;
    private Double footSize;

    // MemberPrivacy 공개 설정 수정용 (Boolean을 써야 null 체크 가능)
    private Boolean isPublicPhone;
    private Boolean isEmailPublic;
    private Boolean isHeightPublic;
    private Boolean isWeightPublic;
    private Boolean isArmSpanPublic;
    private Boolean isFootSizePublic;
}