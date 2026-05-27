package com.olla.olla_climbing.domain.member.entity;

import com.olla.olla_climbing.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

// Jackson 직렬화 무시를 위한 import 추가 (수정)
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberNotification extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 알림을 받을 수신자
    @JsonIgnore // @JsonIgnore 추가 (프록시 객체 에러 방지) (수정)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    private boolean isRead = false; // 회원이 읽었는지 여부

    @Builder
    public MemberNotification(Member member, String title, String content) {
        this.member = member;
        this.title = title;
        this.content = content;
    }

    public void markAsRead() {
        this.isRead = true;
    }
}