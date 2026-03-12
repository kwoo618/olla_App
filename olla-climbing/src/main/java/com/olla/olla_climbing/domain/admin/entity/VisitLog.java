package com.olla.olla_climbing.domain.admin.entity;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "visit_log")
public class VisitLog extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 입장한 회원
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    // QR을 스캔하고 입장을 승인한 관리자 (포스기 계정)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id", nullable = false)
    private Member admin;

    @Builder
    public VisitLog(Member member, Member admin) {
        this.member = member;
        this.admin = admin;
    }
}