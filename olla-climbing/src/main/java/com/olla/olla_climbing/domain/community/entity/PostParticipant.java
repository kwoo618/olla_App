package com.olla.olla_climbing.domain.community.entity;

import com.olla.olla_climbing.domain.member.Member;
import com.olla.olla_climbing.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "post_participant")
public class PostParticipant extends BaseTimeEntity {

    // GeneratedValue: 자동으로 고유한 ID 값을 생성하는 전략을 지정하는 어노테이션
    // GenerationType.IDENTITY: 데이터베이스가 자동으로 증가하는 ID 값을 생성하도록 지정하는 전략입니다. MySQL, PostgreSQL 등에서 주로 사용
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ManyToOne: 여러 참가자가 하나의 게시글에 참여할 수 있으므로, PostParticipant 엔티티에서 Post 엔티티로 다대일 관계를 설정
    // fetch = FetchType.LAZY: 연관된 엔티티를 실제로 사용할 때까지 데이터베이스에서 로딩을 지연시키는 전략. 성능 최적화에 도움
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Builder
    public PostParticipant(Post post, Member member) {
        this.post = post;
        this.member = member;
    }
}