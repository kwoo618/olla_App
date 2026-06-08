package com.olla.olla_climbing.domain.admin.repository;

import com.olla.olla_climbing.domain.admin.entity.Membership;
import com.olla.olla_climbing.domain.admin.enums.MembershipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MembershipRepository extends JpaRepository<Membership, Long> {

    List<Membership> findAllByMemberIdAndStatusIn(Long memberId, List<MembershipStatus> statuses);

    long countByStatusAndIsDeletedFalse(MembershipStatus status);

    Optional<Membership> findByMemberIdAndStatus(Long memberId, MembershipStatus status);

    List<Membership> findByEndDateAndStatus(LocalDate endDate, MembershipStatus status);

    List<Membership> findAllByMemberIdAndStatusAndIsDeletedFalse(Long memberId, MembershipStatus status);

    List<Membership> findByEndDateBetweenAndStatus(LocalDate start, LocalDate end, MembershipStatus status);

    @Query("SELECT m FROM Membership m WHERE m.member.id = :memberId AND m.remainingCount IS NOT NULL AND m.status = 'ACTIVE' AND m.isDeleted = false")
    Optional<Membership> findActiveCountMembershipByMemberId(@Param("memberId") Long memberId);

    @Query("SELECT MAX(m.endDate) FROM Membership m WHERE m.member.id = :memberId AND m.isDeleted = false")
    Optional<LocalDate> findMaxEndDateByMemberId(@Param("memberId") Long memberId);
}