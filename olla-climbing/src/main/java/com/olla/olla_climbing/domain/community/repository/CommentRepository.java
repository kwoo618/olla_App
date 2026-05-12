package com.olla.olla_climbing.domain.community.repository;

import com.olla.olla_climbing.domain.community.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    // 특정 게시글의 최상위 댓글(parent가 null인 것)들만 페이징 조회
    @Query("SELECT c FROM Comment c WHERE c.post.id = :postId AND c.parent IS NULL ORDER BY c.createdAt ASC")
    Page<Comment> findByPostIdAndParentIsNull(@Param("postId") Long postId, Pageable pageable);

    // 💡 작성한 댓글을 한 번에 Soft Delete 처리
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Comment c SET c.isDeleted = true WHERE c.member.id = :memberId")
    void softDeleteByMemberId(@Param("memberId") Long memberId);
}