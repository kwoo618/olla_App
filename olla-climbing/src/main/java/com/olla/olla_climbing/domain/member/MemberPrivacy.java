package com.olla.olla_climbing.domain.member;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "is_public") // ERD 테이블명 준수
public class MemberPrivacy {

    @Id
    private Long memberId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    @Column(name = "is_public_phone")
    private boolean isPublicPhone; // 기본값 false

    @Column(name = "is_email_public")
    private boolean isEmailPublic;

    @Column(name = "is_height_public")
    private boolean isHeightPublic;

    @Column(name = "is_weight_public")
    private boolean isWeightPublic;

    @Column(name = "is_arm_span_public")
    private boolean isArmSpanPublic;

    @Column(name = "is_foot_size_public")
    private boolean isFootSizePublic;

    // 생성자: 처음 생성 시 기본값은 모두 비공개(false)
    public MemberPrivacy(Member member) {
        this.member = member;
    }

    // 설정 변경 메서드
    public void update(boolean isPublicPhone, boolean isEmailPublic, boolean isHeightPublic,
                       boolean isWeightPublic, boolean isArmSpanPublic, boolean isFootSizePublic) {
        this.isPublicPhone = isPublicPhone;
        this.isEmailPublic = isEmailPublic;
        this.isHeightPublic = isHeightPublic;
        this.isWeightPublic = isWeightPublic;
        this.isArmSpanPublic = isArmSpanPublic;
        this.isFootSizePublic = isFootSizePublic;
    }
}