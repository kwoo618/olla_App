package com.olla.olla_climbing.domain.member.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class MemberUpdateRequest {
    // Member 기본 정보 수정용
    private String name;
    private String phone;

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