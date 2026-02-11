package com.olla.olla_climbing.domain.member;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberPrivacy {

    @Id
    private Long memberId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    private boolean isPhonePublic; // 기본값 false

    private boolean isEmailPublic;

    private boolean isHeightPublic;

    private boolean isWeightPublic;

    private boolean isArmSpanPublic;

    private boolean isFootSizePublic;

    // 생성자: 처음 생성 시 기본값은 모두 비공개(false)
    public MemberPrivacy(Member member) {
        this.member = member;
    }

    // 설정 변경 메서드
    public void update(boolean isPhonePublic, boolean isEmailPublic, boolean isHeightPublic, boolean isWeightPublic, boolean isArmSpanPublic, boolean isFootSizePublic) {
        this.isPhonePublic = isPhonePublic;
        this.isEmailPublic = isEmailPublic;
        this.isHeightPublic = isHeightPublic;
        this.isWeightPublic = isWeightPublic;
        this.isArmSpanPublic = isArmSpanPublic;
        this.isFootSizePublic = isFootSizePublic;
    }
}