package com.olla.olla_climbing.domain.community.repository;

import com.olla.olla_climbing.domain.community.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostRepository extends JpaRepository<Post, Long> {

    // 삭제되지 않은 게시글만 페이징 처리하여 최신순으로 조회
    Page<Post> findByIsDeletedFalseOrderByCreatedAtDesc(Pageable pageable);
}