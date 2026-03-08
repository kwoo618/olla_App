package com.olla.olla_climbing.domain.admin.service;

import com.olla.olla_climbing.domain.admin.entity.Membership;
import com.olla.olla_climbing.domain.admin.entity.VisitLog;
import com.olla.olla_climbing.domain.admin.enums.MembershipStatus;
import com.olla.olla_climbing.domain.admin.enums.MembershipType;
import com.olla.olla_climbing.domain.admin.repository.MembershipRepository;
import com.olla.olla_climbing.domain.admin.repository.VisitLogRepository;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.global.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class VisitService {

    private final VisitLogRepository visitLogRepository;
    private final MembershipRepository membershipRepository;
    private final MemberRepository memberRepository;
    private final JwtTokenProvider jwtTokenProvider; // 기존에 만들어두신 JWT 유틸리티

    @Transactional
    public void processEntry(String qrToken, String adminLoginId) {
        // 1. QR 토큰 검증 및 회원 식별 (3분 만료 여부 등은 JwtTokenProvider 내부에서 검증됨)
        if (!jwtTokenProvider.validateToken(qrToken)) {
            throw new IllegalArgumentException("유효하지 않거나 만료된 QR 코드입니다.");
        }
        String memberLoginId = jwtTokenProvider.getSubject(qrToken); // 토큰에서 유저 로그인 ID 추출

        Member member = memberRepository.findByLoginId(memberLoginId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보를 찾을 수 없습니다."));

        Member admin = memberRepository.findByLoginId(adminLoginId)
                .orElseThrow(() -> new IllegalArgumentException("관리자 정보를 찾을 수 없습니다."));

        // 2. 해당 회원의 활성화된 이용권 조회
        Membership membership = membershipRepository.findByMemberIdAndStatus(member.getId(), MembershipStatus.ACTIVE)
                .orElseThrow(() -> new IllegalStateException("활성화된 이용권이 없습니다. 이용권을 구매해 주세요."));

        // 3. 이용권 유효성 2차 검증 및 차감
        if (membership.getMembershipType() == MembershipType.PERIOD) {
            // 기간권: 오늘 날짜가 종료일을 지났는지 확인
            if (LocalDate.now().isAfter(membership.getEndDate())) {
                membership.expire(); // 기간이 지났으면 만료 처리
                throw new IllegalStateException("이용권 기간이 만료되었습니다.");
            }
        } else if (membership.getMembershipType() == MembershipType.COUNT) {
            // 횟수권: 횟수 1회 차감 (메서드 내부에서 0회 시 만료 처리됨)
            membership.decreaseCount();
        }

        // 4. 입장 기록 저장
        VisitLog visitLog = VisitLog.builder()
                .member(member)
                .admin(admin)
                .build();
        visitLogRepository.save(visitLog);
    }
}