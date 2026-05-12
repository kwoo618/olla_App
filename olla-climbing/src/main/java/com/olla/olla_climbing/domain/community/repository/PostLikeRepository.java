package com.olla.olla_climbing.domain.community.repository;

import com.olla.olla_climbing.domain.community.entity.Post;
import com.olla.olla_climbing.domain.community.entity.PostLike;
import com.olla.olla_climbing.domain.member.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {
    boolean existsByPostAndMember(Post post, Member member);

    Optional<PostLike> findByPostAndMember(Post post, Member member);

    long countByPostId(Long postId); // 게시글의 총 좋아요 수 합산

    // 💡 회원이 누른 모든 좋아요 기록을 물리 삭제
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM PostLike l WHERE l.member.id = :memberId")
    void deleteByMemberId(@Param("memberId") Long memberId);
}