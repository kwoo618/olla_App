package com.olla.olla_climbing.domain.community.repository;

import com.olla.olla_climbing.domain.community.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Post p WHERE p.id = :id")
    Optional<Post> findByIdWithPessimisticLock(@Param("id") Long id);

    // 삭제되지 않은 게시글만 페이징 처리하여 최신순으로 조회
    // findByIsDeletedFalseOrderByCreatedAtDesc 메서드는 Spring Data JPA의 메서드 이름 규칙을 활용하여 자동으로 쿼리를 생성합니다.
    // isDeleted가 false인 게시글만 조회하고, createdAt 기준으로 내림차순 정렬
    // Pageable: 페이지 번호, 페이지 크기, 정렬 정보를 포함하는 인터페이스로, 이를 통해 페이징 처리된 결과를 반환할 수 있습니다.
    // 기본 전체 조회 (삭제되지 않은 글 최신순) - 기존 코드 유지
    @EntityGraph(attributePaths = {"member"})
    Page<Post> findByIsDeletedFalseOrderByCreatedAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"member"})
    Page<Post> findByTitleContainingOrContentContainingAndIsDeletedFalseOrderByCreatedAtDesc(
            String titleKeyword, String contentKeyword, Pageable pageable);

    @EntityGraph(attributePaths = {"member"})
    Page<Post> findByMemberIdAndIsDeletedFalseOrderByCreatedAtDesc(Long memberId, Pageable pageable);

    List<Post> findByMeetDateTimeBetweenAndIsDeletedFalse(java.time.LocalDateTime start, java.time.LocalDateTime end);

    // 💡 작성한 게시글을 한 번에 Soft Delete 처리
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Post p SET p.isDeleted = true WHERE p.member.id = :memberId")
    void softDeleteByMemberId(@Param("memberId") Long memberId);
}