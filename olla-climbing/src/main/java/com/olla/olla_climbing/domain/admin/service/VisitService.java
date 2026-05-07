package com.olla.olla_climbing.domain.admin.service;

import com.olla.olla_climbing.domain.admin.dto.response.VisitDashboardResponse;
import com.olla.olla_climbing.domain.admin.dto.response.VisitScanResponse;
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
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VisitService {

    private final VisitLogRepository visitLogRepository;
    private final MembershipRepository membershipRepository;
    private final MemberRepository memberRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final GoogleSheetsService googleSheetsService;

    @Transactional
    public VisitScanResponse processEntry(String qrToken, String adminLoginId, int deductionCount) {
        // 1. QR 토큰 검증 및 회원 식별
        if (!jwtTokenProvider.validateToken(qrToken)) {
            return VisitScanResponse.builder().statusCode("ERROR").message("유효하지 않거나 만료된 QR 코드입니다.").build();
        }
        String memberLoginId = jwtTokenProvider.getLoginId(qrToken);

        Member member = memberRepository.findByLoginId(memberLoginId).orElse(null);
        Member admin = memberRepository.findByLoginId(adminLoginId).orElse(null);

        if (member == null) return VisitScanResponse.builder().statusCode("ERROR").message("회원 정보를 찾을 수 없습니다.").build();
        if (admin == null) return VisitScanResponse.builder().statusCode("ERROR").message("관리자 정보를 찾을 수 없습니다.").build();

        // 2. [추가] 1분 쿨타임 (중복 스캔 방지)
        VisitLog lastVisit = visitLogRepository.findTopByMemberIdOrderByCreatedAtDesc(member.getId()).orElse(null);
        if (lastVisit != null && lastVisit.getCreatedAt().plusMinutes(1).isAfter(LocalDateTime.now())) {
            return VisitScanResponse.builder()
                    .statusCode("WARNING")
                    .memberName(member.getName())
                    .message("방금(1분 이내) 입장 처리된 회원입니다.")
                    .build();
        }

        // 3. 해당 회원의 활성화된 이용권 조회
        Membership membership = membershipRepository.findByMemberIdAndStatus(member.getId(), MembershipStatus.ACTIVE).orElse(null);
        if (membership == null) {
            return VisitScanResponse.builder().statusCode("ERROR").memberName(member.getName()).message("활성화된 이용권이 없습니다. 데스크에 문의하세요.").build();
        }

        String remainingInfo = "";
        String statusCode = "SUCCESS";

        // 4. 이용권 횟수 차감 및 기간 검증
        if (membership.getMembershipType() == MembershipType.PERIOD) {
            if (LocalDate.now().isAfter(membership.getEndDate())) {
                membership.expire();
                return VisitScanResponse.builder().statusCode("ERROR").memberName(member.getName()).message("이용권 기간이 만료되었습니다.").build();
            }
            remainingInfo = membership.getEndDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) + " 까지";

            if (LocalDate.now().plusDays(3).isAfter(membership.getEndDate())) {
                statusCode = "WARNING"; // 만료 임박
            }
        } else if (membership.getMembershipType() == MembershipType.COUNT) {
            if (membership.getRemainingCount() < deductionCount) {
                return VisitScanResponse.builder().statusCode("ERROR").memberName(member.getName()).message("잔여 횟수가 부족합니다. (현재: " + membership.getRemainingCount() + "회)").build();
            }
            membership.decreaseCount(deductionCount); // 횟수 다중 차감
            remainingInfo = "잔여 " + membership.getRemainingCount() + "회";

            if (membership.getRemainingCount() <= 2) {
                statusCode = "WARNING"; // 횟수 소진 임박
            }
        }

        // [추가] 누적 방문 횟수 증가
        membership.increaseAccumulatedVisits();

        // 5. 입장 기록 저장
        VisitLog visitLog = VisitLog.builder()
                .member(member)
                .admin(admin)
                .build();
        visitLogRepository.save(visitLog);

        // 6. 구글 시트 비동기 업데이트
        String todayStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy. MM. dd"));
        googleSheetsService.updateVisitData(member.getId(), todayStr, membership.getAccumulatedVisits());

        return VisitScanResponse.builder()
                .statusCode(statusCode)
                .memberName(member.getName())
                .remainingInfo(remainingInfo)
                .message(member.getName() + " 회원님 반갑습니다!")
                .build();
    }

    // 당일 출석 대시보드 리스트 조회
    @Transactional(readOnly = true)
    public VisitDashboardResponse getTodayDashboard() {
        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime endOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);

        List<VisitLog> todayLogs = visitLogRepository.findByCreatedAtBetween(startOfDay, endOfDay);

        List<VisitDashboardResponse.VisitLogDto> logDtos = todayLogs.stream()
                .map(log -> VisitDashboardResponse.VisitLogDto.builder()
                        .memberName(log.getMember().getName())
                        .visitTime(log.getCreatedAt())
                        .adminName(log.getAdmin().getName())
                        .build())
                .collect(Collectors.toList());

        return VisitDashboardResponse.builder()
                .totalVisitsToday(todayLogs.size())
                .visitLogs(logDtos)
                .build();
    }

    // 특정 회원의 월별 출석 날짜 조회 (중복 제거)
    @Transactional(readOnly = true)
    public List<LocalDate> getMonthlyVisitDates(Long memberId, String yearMonth) {
        java.time.YearMonth ym = java.time.YearMonth.parse(yearMonth);
        java.time.LocalDateTime start = ym.atDay(1).atStartOfDay();
        java.time.LocalDateTime end = ym.atEndOfMonth().atTime(23, 59, 59);

        return visitLogRepository.findAllByMemberIdAndCreatedAtBetween(memberId, start, end)
                .stream()
                .map(log -> log.getCreatedAt().toLocalDate())
                .distinct() // 중복 날짜 제거
                .sorted()   // 날짜순 정렬
                .collect(java.util.stream.Collectors.toList());
    }
}