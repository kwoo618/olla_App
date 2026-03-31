package com.olla.olla_climbing.domain.admin.service;

import com.olla.olla_climbing.domain.admin.dto.response.AdminMemberResponse;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.List;

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
        // ACTIVE뿐만 아니라 HOLDING 상태인 이용권도 가져오도록 수정
        Membership activeOrHoldingMembership = membershipRepository.findByMemberIdAndStatusIn(
                memberId, List.of(MembershipStatus.ACTIVE, MembershipStatus.HOLDING)
        ).orElse(null);

        if (activeOrHoldingMembership == null) {
            return null; // 프론트엔드에서 "이용권 없음" 처리
        }

        return MembershipResponse.from(activeOrHoldingMembership);
    }

    // 관리자용 전체 회원 리스트 페이징 및 검색
    @Transactional(readOnly = true)
    public Page<AdminMemberResponse> getAdminMemberList(String searchName, Pageable pageable) {
        Page<Member> memberPage;

        // 1. 이름 검색어가 있으면 조건 검색, 없으면 전체 검색
        if (StringUtils.hasText(searchName)) {
            memberPage = memberRepository.findByNameContaining(searchName, pageable);
        } else {
            memberPage = memberRepository.findAll(pageable);
        }

        // 2. 조회된 회원 각각의 현재 이용권 상태를 매핑하여 DTO로 변환 (Page 객체의 map 기능 활용)
        return memberPage.map(member -> {
            // 회원 1명당 이용권 1번씩 조회 (N+1 발생 지점이지만 관리자 페이징 단위에서는 허용 가능한 수준)
            Membership activeOrHolding = membershipRepository.findByMemberIdAndStatusIn(
                    member.getId(), List.of(MembershipStatus.ACTIVE, MembershipStatus.HOLDING)
            ).orElse(null);

            return AdminMemberResponse.from(member, activeOrHolding);
        });
    }

    // 관리자의 이용권 일시정지 처리
    @Transactional
    public void pauseMembership(Long membershipId) {
        Membership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이용권입니다."));

        // 엔티티 내부의 pause() 호출 (더티 체킹으로 자동 UPDATE)
        membership.pause();
    }

    // 관리자의 이용권 일시정지 해제 처리
    @Transactional
    public void unpauseMembership(Long membershipId) {
        Membership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이용권입니다."));

        // 엔티티 내부의 unpause() 호출 (만료일 연장 로직 포함)
        membership.unpause();
    }
}