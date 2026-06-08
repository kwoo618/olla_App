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
import com.olla.olla_climbing.domain.member.service.NotificationService;
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
    private final NotificationService notificationService;

    @Transactional
    public VisitScanResponse processEntry(String qrToken, String adminLoginId, int deductionCount) {

        boolean isCountMembership = false;

        if (deductionCount <= 0) {
            return errorResponse("차감 횟수는 1회 이상이어야 합니다.");
        }

        if (!jwtTokenProvider.validateToken(qrToken)) {
            return errorResponse("유효하지 않거나 만료된 QR 코드입니다.");
        }

        String memberLoginId = jwtTokenProvider.getLoginId(qrToken);

        Member member = memberRepository.findByLoginIdAndIsDeletedFalse(memberLoginId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보를 찾을 수 없습니다."));
        Member admin = memberRepository.findByLoginIdAndIsDeletedFalse(adminLoginId)
                .orElseThrow(() -> new IllegalArgumentException("관리자 정보를 찾을 수 없습니다."));

        // 당일 중복 입장 방지
        LocalDateTime startOfToday = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime endOfToday = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);
        if (visitLogRepository.existsByMemberIdAndCreatedAtBetween(member.getId(), startOfToday, endOfToday)) {
            throw new IllegalArgumentException("이미 오늘 출석이 완료된 회원입니다.");
        }

        List<Membership> activeMemberships = membershipRepository
                .findAllByMemberIdAndStatusAndIsDeletedFalse(member.getId(), MembershipStatus.ACTIVE);

        if (activeMemberships.isEmpty()) {
            return VisitScanResponse.builder()
                    .statusCode("ERROR").memberName(member.getName())
                    .message("활성화된 이용권이 없습니다.").build();
        }

        // 이용권 우선순위: 기간권 → 횟수권
        Membership targetMembership = null;
        String remainingInfo = "";
        String statusCode = "SUCCESS";
        String message = "";

        // 기간권 우선 탐색 (durationMonth != null이면 기간권)
        for (Membership m : activeMemberships) {
            if (m.getDurationMonth() != null && !LocalDate.now().isAfter(m.getEndDate())) {
                targetMembership = m;
                remainingInfo = m.getEndDate() + " 까지";
                message = member.getName() + " 회원님(기간권) 반갑습니다!";
                if (LocalDate.now().plusDays(3).isAfter(m.getEndDate())) statusCode = "WARNING";
                break;
            }
        }

        // 기간권 없으면 횟수권 탐색 (remainingCount != null이면 횟수권)
        if (targetMembership == null) {
            for (Membership m : activeMemberships) {
                if (m.getRemainingCount() != null && m.getRemainingCount() >= deductionCount) {
                    targetMembership = m;
                    m.useCount(deductionCount);
                    isCountMembership = true; // ← 추가
                    remainingInfo = "잔여 " + m.getRemainingCount() + "회";
                    message = member.getName() + " 회원님(" + deductionCount + "명 차감) 반갑습니다!";
                    if (m.getRemainingCount() <= 2) statusCode = "WARNING";
                    break;
                }
            }
        }

        if (targetMembership == null) {
            return VisitScanResponse.builder()
                    .statusCode("ERROR").memberName(member.getName())
                    .message("사용 가능한 이용권이 없거나 잔여 횟수가 부족합니다.").build();
        }

        targetMembership.increaseAccumulatedVisits();
        visitLogRepository.save(VisitLog.builder().member(member).admin(admin).build());

        String todayStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy. MM. dd"));
        googleSheetsService.updateVisitData(member.getId(), todayStr, targetMembership.getAccumulatedVisits());

        if (isCountMembership) {
            googleSheetsService.updateCountInSheet(
                    member.getId(), targetMembership.getRemainingCount());
        }

        notificationService.sendMembershipNotification(member, "입장 완료 🧗", message + " 즐거운 클라이밍 되세요!");

        return VisitScanResponse.builder()
                .statusCode(statusCode)
                .memberName(member.getName())
                .remainingInfo(remainingInfo)
                .message(message)
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
        YearMonth ym = YearMonth.parse(yearMonth);
        LocalDateTime start = ym.atDay(1).atStartOfDay();
        LocalDateTime end = ym.atEndOfMonth().atTime(23, 59, 59);

        return visitLogRepository.findAllByMemberIdAndCreatedAtBetween(memberId, start, end)
                .stream()
                .map(log -> log.getCreatedAt().toLocalDate())
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    private VisitScanResponse errorResponse(String message) {
        return VisitScanResponse.builder().statusCode("ERROR").message(message).build();
    }
}