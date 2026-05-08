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
        // 1. 기본 검증
        if (deductionCount <= 0) {
            return VisitScanResponse.builder().statusCode("ERROR").message("차감 횟수는 1회 이상이어야 합니다.").build();
        }

        // 2. QR 토큰(JWT) 검증 및 ID 추출
        if (!jwtTokenProvider.validateToken(qrToken)) {
            return VisitScanResponse.builder().statusCode("ERROR").message("유효하지 않거나 만료된 QR 코드입니다.").build();
        }
        String memberLoginId = jwtTokenProvider.getLoginId(qrToken);

        // 3. 회원 및 관리자 조회
        Member member = memberRepository.findByLoginIdAndIsDeletedFalse(memberLoginId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보를 찾을 수 없습니다."));
        Member admin = memberRepository.findByLoginIdAndIsDeletedFalse(adminLoginId)
                .orElseThrow(() -> new IllegalArgumentException("관리자 정보를 찾을 수 없습니다."));

        // 4. 중복 입장 방지 (1분 이내)
        VisitLog lastVisit = visitLogRepository.findTopByMemberIdOrderByCreatedAtDesc(member.getId()).orElse(null);
        if (lastVisit != null && lastVisit.getCreatedAt().plusMinutes(1).isAfter(LocalDateTime.now())) {
            return VisitScanResponse.builder()
                    .statusCode("WARNING")
                    .memberName(member.getName())
                    .message("방금(1분 이내) 입장 처리된 회원입니다.")
                    .build();
        }

        // 5. 회원의 유효한 모든 이용권 조회 (우선순위 판단을 위해 List로 조회)
        List<Membership> activeMemberships = membershipRepository
                .findAllByMemberIdAndStatusAndIsDeletedFalse(member.getId(), MembershipStatus.ACTIVE);

        if (activeMemberships.isEmpty()) {
            return VisitScanResponse.builder().statusCode("ERROR").memberName(member.getName()).message("활성화된 이용권이 없습니다.").build();
        }

        // 6. 이용권 우선순위 엔진 (기간권 > 횟수권)
        Membership targetMembership = null;
        String remainingInfo = "";
        String statusCode = "SUCCESS";
        String message = "";

        // 6-1. 1순위: 기간권 찾기
        for (Membership m : activeMemberships) {
            if ("PERIOD".equals(m.getMembershipTypeName())) {
                if (!LocalDate.now().isAfter(m.getEndDate())) {
                    targetMembership = m;
                    remainingInfo = m.getEndDate().toString() + " 까지";
                    message = member.getName() + " 회원님(기간권) 반갑습니다!";
                    // 만료 3일 전이면 경고 코드
                    if (LocalDate.now().plusDays(3).isAfter(m.getEndDate())) statusCode = "WARNING";
                    break;
                }
            }
        }

        // 6-2. 2순위: 기간권이 없으면 횟수권 사용
        if (targetMembership == null) {
            for (Membership m : activeMemberships) {
                if ("COUNT".equals(m.getMembershipTypeName())) {
                    if (m.getRemainingCount() >= deductionCount) {
                        targetMembership = m;
                        m.useCount(deductionCount); // 횟수 차감 (내부에서 0회 시 EXPIRED 처리 권장)
                        remainingInfo = "잔여 " + m.getRemainingCount() + "회";
                        message = member.getName() + " 회원님(" + deductionCount + "명 차감) 반갑습니다!";
                        if (m.getRemainingCount() <= 2) statusCode = "WARNING";
                        break;
                    }
                }
            }
        }

        // 6-3. 둘 다 없으면 에러
        if (targetMembership == null) {
            return VisitScanResponse.builder().statusCode("ERROR").memberName(member.getName()).message("사용 가능한 이용권이 없거나 잔여 횟수가 부족합니다.").build();
        }

        // 7. 사후 처리 (누적 방문수 증가 + 로그 저장 + 시트 연동 + 알림 발송)
        targetMembership.increaseAccumulatedVisits();

        visitLogRepository.save(VisitLog.builder().member(member).admin(admin).build());

        String todayStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy. MM. dd"));
        googleSheetsService.updateVisitData(member.getId(), todayStr, targetMembership.getAccumulatedVisits());

        // 알림 발송 (푸시)
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