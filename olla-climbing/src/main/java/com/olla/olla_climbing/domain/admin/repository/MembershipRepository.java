package com.olla.olla_climbing.domain.admin.repository;

import com.olla.olla_climbing.domain.admin.entity.Membership;
import com.olla.olla_climbing.domain.admin.enums.MembershipStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MembershipRepository extends JpaRepository<Membership, Long> {

    // 회원의 현재 활성화된 이용권 단건 조회
    Optional<Membership> findByMemberIdAndStatus(Long memberId, MembershipStatus status);
}