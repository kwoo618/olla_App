package com.olla.olla_climbing.domain.admin.repository;

import com.olla.olla_climbing.domain.admin.entity.Membership;
import com.olla.olla_climbing.domain.admin.enums.MembershipStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface MembershipRepository extends JpaRepository<Membership, Long> {

    // 회원의 현재 활성화된 이용권 단건 조회
    Optional<Membership> findByMemberIdAndStatus(Long memberId, MembershipStatus status);

    // 회원의 활성화된 이용권 여러 개 조회 ('활성' 상태와 '정지' 상태의 이용권)
    Optional<Membership> findByMemberIdAndStatusIn(Long memberId, List<MembershipStatus> statuses);
}