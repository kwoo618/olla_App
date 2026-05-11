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
@Table(name = "notice")
public class Notice extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 작성자 (관리자)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    // 이미지 첨부가 필요한 경우를 대비한 URL 필드
    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    // 상단 고정 여부
    @Column(name = "is_important", nullable = false)
    private boolean isImportant;

    @Builder
    public Notice(Member member, String title, String content, String imageUrl, boolean isImportant) {
        this.member = member;
        this.title = title;
        this.content = content;
        this.imageUrl = imageUrl;
        this.isImportant = isImportant;
    }

    public void updateNotice(String title, String content, String imageUrl, boolean isImportant) {
        this.title = title;
        this.content = content;
        this.imageUrl = imageUrl;
        this.isImportant = isImportant;
    }
}