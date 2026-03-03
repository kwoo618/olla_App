package com.olla.olla_climbing.domain.admin.repository;

import com.olla.olla_climbing.domain.admin.entity.Notice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface NoticeRepository extends JpaRepository<Notice, Long> {

    // 상단 고정(isImportant = true)을 먼저, 그 다음 최신순(createdAt DESC) 정렬하여 페이징 조회
    @Query("SELECT n FROM Notice n ORDER BY n.isImportant DESC, n.createdAt DESC")
    Page<Notice> findAllOrderByIsImportantDescAndCreatedAtDesc(Pageable pageable);
}