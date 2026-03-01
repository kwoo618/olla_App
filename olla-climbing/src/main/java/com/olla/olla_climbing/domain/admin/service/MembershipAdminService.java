package com.olla.olla_climbing.domain.admin.service;

import com.olla.olla_climbing.domain.admin.dto.response.MembershipResponse;
import com.olla.olla_climbing.domain.admin.entity.Membership;
import com.olla.olla_climbing.domain.admin.enums.MembershipStatus;
import com.olla.olla_climbing.domain.admin.enums.MembershipType;
import com.olla.olla_climbing.domain.admin.repository.MembershipRepository;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class MembershipAdminService {

    private final MembershipRepository membershipRepository;
    private final MemberRepository memberRepository;

    // 관리자가 회원에게 이용권을 부여 (또는 연장)
    @Transactional
    public void grantMembership(Long memberId, MembershipType type, Integer addMonths, Integer addCount) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        // 1. 해당 회원의 현재 활성화된 이용권이 있는지 확인
        Membership activeMembership = membershipRepository.findByMemberIdAndStatus(member.getId(), MembershipStatus.ACTIVE)
                .orElse(null);

        if (activeMembership != null) {
            // 2. 기존 이용권이 있는 경우: 타입이 같으면 연장, 다르면 에러 처리 (또는 기존권 만료 처리)
            if (activeMembership.getMembershipType() != type) {
                throw new IllegalStateException("이미 다른 타입의 활성화된 이용권이 존재합니다. 기존 이용권을 만료 처리 후 발급하세요.");
            }

            if (type == MembershipType.PERIOD) {
                activeMembership.extendPeriod(addMonths);
            } else if (type == MembershipType.COUNT) {
                activeMembership.addCount(addCount);
            }
        } else {
            // 3. 기존 이용권이 없는 경우: 신규 발급
            Membership newMembership = null;
            if (type == MembershipType.PERIOD) {
                newMembership = Membership.builder()
                        .member(member)
                        .membershipType(MembershipType.PERIOD)
                        .startDate(LocalDate.now())
                        .endDate(LocalDate.now().plusMonths(addMonths))
                        .status(MembershipStatus.ACTIVE)
                        .build();
            } else if (type == MembershipType.COUNT) {
                newMembership = Membership.builder()
                        .member(member)
                        .membershipType(MembershipType.COUNT)
                        .remainingCount(addCount)
                        .status(MembershipStatus.ACTIVE)
                        .build();
            }
            membershipRepository.save(newMembership);
        }
    }

    // 유저 본인의 활성화된 이용권 조회
    @Transactional(readOnly = true)
    public MembershipResponse getMyMembership(Long memberId) {
        Membership activeMembership = membershipRepository.findByMemberIdAndStatus(memberId, MembershipStatus.ACTIVE)
                .orElse(null);

        // 활성화된 이용권이 없으면 null 반환 (프론트엔드에서 "이용권 없음" 처리)
        if (activeMembership == null) {
            return null;
        }

        return MembershipResponse.from(activeMembership);
    }
}