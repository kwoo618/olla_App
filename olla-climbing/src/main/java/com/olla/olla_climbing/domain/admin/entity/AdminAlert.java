package com.olla.olla_climbing.domain.admin.entity;

import com.olla.olla_climbing.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AdminAlert extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title; // 알림 제목 (예: 회원권 만료 요약)

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content; // 알림 상세 내용

    private boolean isRead = false; // 읽음 여부

    @Builder
    public AdminAlert(String title, String content) {
        this.title = title;
        this.content = content;
    }

    public void markAsRead() {
        this.isRead = true;
    }
}