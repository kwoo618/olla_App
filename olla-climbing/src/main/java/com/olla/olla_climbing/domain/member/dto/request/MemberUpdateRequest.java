package com.olla.olla_climbing.domain.member.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class MemberUpdateRequest {

    private String name;

    @Pattern(regexp = "^01[016789]-\\d{3,4}-\\d{4}$", message = "전화번호는 010-0000-0000 형식으로 하이픈(-)을 포함해야 합니다.")
    private String phone;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd", timezone = "Asia/Seoul")
    private LocalDate birthDate;

    @Pattern(regexp = "^(남|여)$", message = "성별은 '남' 또는 '여'만 입력 가능합니다.")
    private String gender;

    private String profileImageUrl;

    private Double height;
    private Double weight;
    private Double armSpan;
    private Double footSize;

    // is 접두사 필드 → 수동 setter로 Jackson 파싱 버그 방지
    private Boolean isPublicPhone;
    private Boolean isEmailPublic;
    private Boolean isHeightPublic;
    private Boolean isWeightPublic;
    private Boolean isArmSpanPublic;
    private Boolean isFootSizePublic;

    @JsonProperty("isPublicPhone")
    public void setIsPublicPhone(Boolean value) { this.isPublicPhone = value; }

    @JsonProperty("isEmailPublic")
    public void setIsEmailPublic(Boolean value) { this.isEmailPublic = value; }

    @JsonProperty("isHeightPublic")
    public void setIsHeightPublic(Boolean value) { this.isHeightPublic = value; }

    @JsonProperty("isWeightPublic")
    public void setIsWeightPublic(Boolean value) { this.isWeightPublic = value; }

    @JsonProperty("isArmSpanPublic")
    public void setIsArmSpanPublic(Boolean value) { this.isArmSpanPublic = value; }

    @JsonProperty("isFootSizePublic")
    public void setIsFootSizePublic(Boolean value) { this.isFootSizePublic = value; }
}