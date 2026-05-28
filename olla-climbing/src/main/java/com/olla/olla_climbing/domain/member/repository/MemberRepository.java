package com.olla.olla_climbing.domain.member.repository;

import com.olla.olla_climbing.domain.member.entity.Member;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {

    boolean existsByPhone(String phone);
    boolean existsByEmail(String email);

    Optional<Member> findByLoginId(String loginId);

    // 마이페이지 조회용: detail, privacy, notificationSetting 한 번에 JOIN
    @EntityGraph(attributePaths = {"memberDetail", "memberPrivacy", "notificationSetting"})
    Optional<Member> findWithDetailsByLoginId(String loginId);

    Page<Member> findByNameContaining(String name, Pageable pageable);

    Optional<Member> findByPhone(String phone);
    Optional<Member> findByPhoneAndIsDeletedFalse(String phone);
    Optional<Member> findByLoginIdAndIsDeletedFalse(String loginId);

    // findByCreatedAtAfter(...).size() 패턴 제거용 count 메서드 추가
    long countByCreatedAtAfter(LocalDateTime dateTime);
}