package com.olla.olla_climbing.domain.admin.repository;

import com.olla.olla_climbing.domain.admin.entity.Notice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface NoticeRepository extends JpaRepository<Notice, Long> {

    // 중요 공지 상단 고정 후 최신순 정렬
    @Query("SELECT n FROM Notice n ORDER BY n.isImportant DESC, n.createdAt DESC")
    Page<Notice> findAllOrderByIsImportantDescAndCreatedAtDesc(Pageable pageable);

    // [추가] 대시보드 최근 공지 5개 조회용 - findAll() 전체 로드 방지
    @Query("SELECT n FROM Notice n ORDER BY n.createdAt DESC")
    Page<Notice> findTop5ByOrderByCreatedAtDesc(Pageable pageable);
}