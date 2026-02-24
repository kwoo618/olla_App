package com.olla.olla_climbing.domain.community.entity;

import com.olla.olla_climbing.domain.member.Member;
import com.olla.olla_climbing.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "post")
public class Post extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 작성자 (회원 탈퇴 시 게시글 처리 방식은 비즈니스 로직에 따라 다름)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false, length = 100)
    private String title; // 제목

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content; // 내용

    @Column(nullable = false)
    private boolean isDifferentGym; // 올라클라이밍(false) vs 타 암장 원정(true)

    @Column(nullable = true, length = 100)
    private String gymPlace; // 모임 장소 (타 암장일 경우 입력, 올라클라이밍이면 null 가능)

    @Column(nullable = false)
    private LocalDateTime meetDateTime; // 모집(모임) 날짜 및 시간

    @Column(nullable = false)
    private Integer maxMember; // 모집 최대 인원 (예: 4명)

    @Column(nullable = false)
    private Integer memberCount; // 현재 참여 인원 (작성자 포함 기본 1명부터 시작)

    @Column(nullable = false)
    private boolean isDeleted; // 삭제 여부 (Soft Delete 방식 적용)

    @Builder
    public Post(Member member, String title, String content, boolean isDifferentGym,
                String gymPlace, LocalDateTime meetDateTime, Integer maxMember) {
        this.member = member;
        this.title = title;
        this.content = content;
        this.isDifferentGym = isDifferentGym;
        this.gymPlace = gymPlace;
        this.meetDateTime = meetDateTime;
        this.maxMember = maxMember;
        this.memberCount = 1; // 글 작성 시 본인은 무조건 참여 상태이므로 1로 초기화
        this.isDeleted = false; // 기본값 활성 상태
    }

    // 참여 인원 증가 로직
    public void addParticipant() {
        if (this.memberCount >= this.maxMember) {
            throw new IllegalStateException("모집 인원이 마감되었습니다.");
        }
        this.memberCount++;
    }

    // 참여 인원 감소 로직
    public void removeParticipant() {
        if (this.memberCount > 1) { // 작성자는 빠질 수 없다고 가정할 경우 1 유지 (추후 정책에 따라 변경 가능)
            this.memberCount--;
        }
    }

    // Soft Delete 상태 변경 메서드
    public void markAsDeleted() {
        this.isDeleted = true;
    }

    public void updatePost(String title, String content, boolean isDifferentGym,
                           String gymPlace, LocalDateTime meetDateTime, Integer maxMember) {
        this.title = title;
        this.content = content;
        this.isDifferentGym = isDifferentGym;
        this.gymPlace = gymPlace;
        this.meetDateTime = meetDateTime;
        this.maxMember = maxMember;
    }
}