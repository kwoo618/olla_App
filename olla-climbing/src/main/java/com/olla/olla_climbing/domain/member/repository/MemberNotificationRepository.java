package com.olla.olla_climbing.domain.member.repository;

import com.olla.olla_climbing.domain.member.entity.MemberNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberNotificationRepository extends JpaRepository<MemberNotification, Long> {
    // 특정 회원의 알림 목록을 최신순으로 페이징 조회하기 위한 메서드 (나중에 회원이 사용할 용도)
    Page<MemberNotification> findByMemberIdOrderByCreatedAtDesc(Long memberId, Pageable pageable);
}