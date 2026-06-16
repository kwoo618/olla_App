package com.olla.olla_climbing.domain.admin.service;

import com.olla.olla_climbing.domain.admin.dto.response.AdminDashboardResponse;
import com.olla.olla_climbing.domain.admin.dto.response.AdminDashboardSummaryResponse;
import com.olla.olla_climbing.domain.admin.dto.response.NoticeResponse;
import com.olla.olla_climbing.domain.admin.entity.Membership;
import com.olla.olla_climbing.domain.admin.entity.VisitLog;
import com.olla.olla_climbing.domain.admin.enums.MembershipStatus;
import com.olla.olla_climbing.domain.admin.repository.MembershipRepository;
import com.olla.olla_climbing.domain.admin.repository.NoticeRepository;
import com.olla.olla_climbing.domain.admin.repository.VisitLogRepository;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final MemberRepository memberRepository;
    private final MembershipRepository membershipRepository;
    private final VisitLogRepository visitLogRepository;
    private final NoticeRepository noticeRepository;

    @Transactional(readOnly = true)
    public AdminDashboardSummaryResponse getDashboardSummary() {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(23, 59, 59);

        long totalVisitsToday = visitLogRepository.findByCreatedAtBetween(startOfDay, endOfDay).size();

        long expiringIn3Days = membershipRepository
                .findByEndDateBetweenAndStatus(today, today.plusDays(3), MembershipStatus.ACTIVE).size();

        LocalDate startOfWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        long newMembersThisWeek = memberRepository.countByCreatedAtAfter(startOfWeek.atStartOfDay());

        List<NoticeResponse> recentNotices = noticeRepository
                .findTop5ByOrderByCreatedAtDesc(PageRequest.of(0, 5))
                .stream()
                .map(NoticeResponse::from)
                .collect(Collectors.toList());

        return AdminDashboardSummaryResponse.builder()
                .totalVisitsToday(totalVisitsToday)
                .expiringIn3Days(expiringIn3Days)
                .newMembersThisWeek(newMembersThisWeek)
                .notices(recentNotices)
                .build();
    }

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboardStats() {
        long totalMembers = memberRepository.count();

        long newMembersToday = memberRepository.countByCreatedAtAfter(LocalDate.now().atStartOfDay());
        long activeMemberships = membershipRepository.countByStatusAndIsDeletedFalse(MembershipStatus.ACTIVE);

        // 최근 30일 방문 로그 기반 혼잡도 집계
        List<VisitLog> logs = visitLogRepository.findByCreatedAtAfter(LocalDateTime.now().minusDays(30));

        long[] weeklyCounter = new long[8];
        Map<Integer, long[]> hourlyMap = new HashMap<>();
        for (int i = 1; i <= 7; i++) hourlyMap.put(i, new long[24]);

        for (VisitLog log : logs) {
            int dayOfWeek = log.getCreatedAt().getDayOfWeek().getValue();
            int hour = log.getCreatedAt().getHour();
            weeklyCounter[dayOfWeek]++;
            hourlyMap.get(dayOfWeek)[hour]++;
        }

        List<Long> weeklyList = Arrays.stream(weeklyCounter).skip(1).boxed().toList();
        Map<Integer, List<Long>> hourlyCongestion = new HashMap<>();
        for (int i = 1; i <= 7; i++) {
            List<Long> hours = new ArrayList<>();
            for (int h = 9; h <= 23; h++) hours.add(hourlyMap.get(i)[h]);
            hourlyCongestion.put(i, hours);
        }

        // 7일 이내 만료 임박 회원 목록
        List<Membership> expiringSoon = membershipRepository
                .findByEndDateBetweenAndStatus(LocalDate.now(), LocalDate.now().plusDays(7), MembershipStatus.ACTIVE);

        List<AdminDashboardResponse.ExpiringMemberDto> expiringDtoList = expiringSoon.stream()
                .map(m -> AdminDashboardResponse.ExpiringMemberDto.builder()
                        .name(m.getMember().getName())
                        .phone(m.getMember().getPhone())
                        .endDate(m.getEndDate().toString())
                        .dDay(ChronoUnit.DAYS.between(LocalDate.now(), m.getEndDate()))
                        .build())
                .collect(Collectors.toList());

        return AdminDashboardResponse.builder()
                .totalMembers(totalMembers)
                .newMembersToday(newMembersToday)
                .activeMemberships(activeMemberships)
                .weeklyCongestion(weeklyList)
                .hourlyCongestionByDay(hourlyCongestion)
                .expiringMembers(expiringDtoList)
                .build();
    }

    @Transactional(readOnly = true)
    public List<Long> getHourlyCongestionByDay(int dayOfWeek) {
        List<VisitLog> logs = visitLogRepository.findByCreatedAtAfter(LocalDateTime.now().minusDays(30));

        long[] hourly = new long[24];
        for (VisitLog log : logs) {
            if (log.getCreatedAt().getDayOfWeek().getValue() == dayOfWeek) {
                hourly[log.getCreatedAt().getHour()]++;
            }
        }

        List<Long> result = new ArrayList<>();
        int endHour = (dayOfWeek == 6) ? 19 : 22; // 토요일 13~19시(7개), 평일 13~22시(10개)
        for (int h = 13; h <= endHour; h++) {
            result.add(hourly[h]);
        }
        return result;
    }
}