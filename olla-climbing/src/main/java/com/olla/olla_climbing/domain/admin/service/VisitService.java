package com.olla.olla_climbing.domain.admin.service;

import com.olla.olla_climbing.domain.admin.dto.response.VisitDashboardResponse;
import com.olla.olla_climbing.domain.admin.dto.response.VisitScanResponse;
import com.olla.olla_climbing.domain.admin.entity.Membership;
import com.olla.olla_climbing.domain.admin.entity.VisitLog;
import com.olla.olla_climbing.domain.admin.enums.MembershipStatus;
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
        if (deductionCount <= 0) {
            return VisitScanResponse.builder().statusCode("ERROR").message("차감 횟수는 1회 이상이어야 합니다.").build();
        }

        if (!jwtTokenProvider.validateToken(qrToken)) {
            return VisitScanResponse.builder().statusCode("ERROR").message("유효하지 않거나 만료된 QR 코드입니다.").build();
        }
        String memberLoginId = jwtTokenProvider.getLoginId(qrToken);

        Member member = memberRepository.findByLoginId(memberLoginId).orElse(null);
        Member admin = memberRepository.findByLoginId(adminLoginId).orElse(null);

        if (member == null) return VisitScanResponse.builder().statusCode("ERROR").message("회원 정보를 찾을 수 없습니다.").build();
        if (admin == null) return VisitScanResponse.builder().statusCode("ERROR").message("관리자 정보를 찾을 수 없습니다.").build();

        VisitLog lastVisit = visitLogRepository.findTopByMemberIdOrderByCreatedAtDesc(member.getId()).orElse(null);
        if (lastVisit != null && lastVisit.getCreatedAt().plusMinutes(1).isAfter(LocalDateTime.now())) {
            return VisitScanResponse.builder()
                    .statusCode("WARNING")
                    .memberName(member.getName())
                    .message("방금(1분 이내) 입장 처리된 회원입니다.")
                    .build();
        }

        Membership membership = membershipRepository.findByMemberIdAndStatus(member.getId(), MembershipStatus.ACTIVE).orElse(null);
        if (membership == null) {
            return VisitScanResponse.builder().statusCode("ERROR").memberName(member.getName()).message("활성화된 이용권이 없습니다. 데스크에 문의하세요.").build();
        }

        String remainingInfo = "";
        String statusCode = "SUCCESS";

        // 💡 [수정] Enum 비교(==) 대신 앞서 만든 getMembershipTypeName() 메서드를 활용하여 String 비교로 변경
        if ("PERIOD".equals(membership.getMembershipTypeName())) {
            if (LocalDate.now().isAfter(membership.getEndDate())) {
                membership.expire();
                return VisitScanResponse.builder().statusCode("ERROR").memberName(member.getName()).message("이용권 기간이 만료되었습니다.").build();
            }
            remainingInfo = membership.getEndDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) + " 까지";

            if (LocalDate.now().plusDays(3).isAfter(membership.getEndDate())) {
                statusCode = "WARNING";
            }
        } else if ("COUNT".equals(membership.getMembershipTypeName())) {
            if (membership.getRemainingCount() < deductionCount) {
                return VisitScanResponse.builder().statusCode("ERROR").memberName(member.getName()).message("잔여 횟수가 부족합니다. (현재: " + membership.getRemainingCount() + "회)").build();
            }
            membership.decreaseCount(deductionCount);
            remainingInfo = "잔여 " + membership.getRemainingCount() + "회";

            if (membership.getRemainingCount() <= 2) {
                statusCode = "WARNING";
            }
        }

        membership.increaseAccumulatedVisits();

        VisitLog visitLog = VisitLog.builder()
                .member(member)
                .admin(admin)
                .build();
        visitLogRepository.save(visitLog);

        String todayStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy. MM. dd"));
        googleSheetsService.updateVisitData(member.getId(), todayStr, membership.getAccumulatedVisits());

        return VisitScanResponse.builder()
                .statusCode(statusCode)
                .memberName(member.getName())
                .remainingInfo(remainingInfo)
                .message(member.getName() + " 회원님 반갑습니다!")
                .build();
    }

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

    @Transactional(readOnly = true)
    public List<LocalDate> getMonthlyVisitDates(Long memberId, String yearMonth) {
        java.time.YearMonth ym = java.time.YearMonth.parse(yearMonth);
        java.time.LocalDateTime start = ym.atDay(1).atStartOfDay();
        java.time.LocalDateTime end = ym.atEndOfMonth().atTime(23, 59, 59);

        return visitLogRepository.findAllByMemberIdAndCreatedAtBetween(memberId, start, end)
                .stream()
                .map(log -> log.getCreatedAt().toLocalDate())
                .distinct()
                .sorted()
                .collect(java.util.stream.Collectors.toList());
    }
}