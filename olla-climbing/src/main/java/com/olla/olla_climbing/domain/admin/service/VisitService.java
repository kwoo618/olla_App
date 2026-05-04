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
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class VisitService {

    private final VisitLogRepository visitLogRepository;
    private final MembershipRepository membershipRepository;
    private final MemberRepository memberRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final GoogleSheetsService googleSheetsService;

    @Transactional
    public void processEntry(String qrToken, String adminLoginId) {
        // 1. QR 토큰 검증 및 회원 식별
        if (!jwtTokenProvider.validateToken(qrToken)) {
            throw new IllegalArgumentException("유효하지 않거나 만료된 QR 코드입니다.");
        }
        String memberLoginId = jwtTokenProvider.getLoginId(qrToken);

        Member member = memberRepository.findByLoginId(memberLoginId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보를 찾을 수 없습니다."));

        Member admin = memberRepository.findByLoginId(adminLoginId)
                .orElseThrow(() -> new IllegalArgumentException("관리자 정보를 찾을 수 없습니다."));

        // 2. 해당 회원의 활성화된 이용권 조회
        Membership membership = membershipRepository.findByMemberIdAndStatus(member.getId(), MembershipStatus.ACTIVE)
                .orElseThrow(() -> new IllegalStateException("활성화된 이용권이 없습니다. 안내데스크에 문의해주세요."));

        // 3. 이용권 횟수 차감 및 기간 검증
        if (membership.getMembershipType() == MembershipType.PERIOD) {
            if (LocalDate.now().isAfter(membership.getEndDate())) {
                membership.expire();
                throw new IllegalStateException("이용권 기간이 만료되었습니다.");
            }
        } else if (membership.getMembershipType() == MembershipType.COUNT) {
            membership.decreaseCount(); // 횟수 1회 차감 및 0회 시 자동 만료
        }

        // 5. 입장 기록 저장
        VisitLog visitLog = VisitLog.builder()
                .member(member)
                .admin(admin)
                .build();
        visitLogRepository.save(visitLog);

        // 6. 구글 시트 비동기 업데이트 (Epic 13)
        // 더티 체킹으로 트랜잭션이 끝나면 DB가 업데이트되지만, 시트는 지금 바로 쏴줍니다.
        String todayStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy. MM. dd"));
        googleSheetsService.updateVisitData(member.getId(), todayStr, membership.getAccumulatedVisits());
    }
}