package com.olla.olla_climbing.domain.admin.service;

import com.olla.olla_climbing.domain.admin.dto.response.AdminDashboardResponse;
import com.olla.olla_climbing.domain.admin.entity.Membership;
import com.olla.olla_climbing.domain.admin.entity.VisitLog;
import com.olla.olla_climbing.domain.admin.enums.MembershipStatus;
import com.olla.olla_climbing.domain.admin.repository.MembershipRepository;
import com.olla.olla_climbing.domain.admin.repository.VisitLogRepository;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final MemberRepository memberRepository;
    private final MembershipRepository membershipRepository;
    private final VisitLogRepository visitLogRepository;

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboardStats() {
        long totalMembers = memberRepository.count();
        long newMembersToday = memberRepository.findByCreatedAtAfter(LocalDate.now().atStartOfDay()).size();
        long activeMemberships = membershipRepository.countByStatusAndIsDeletedFalse(MembershipStatus.ACTIVE);

        // 혼잡도 데이터 가공 (최근 30일)
        List<VisitLog> logs = visitLogRepository.findByCreatedAtAfter(LocalDateTime.now().minusDays(30));
        long[] weeklyCounter = new long[8];
        Map<Integer, long[]> hourlyMap = new HashMap<>();
        for(int i=1; i<=7; i++) hourlyMap.put(i, new long[24]);

        for (VisitLog log : logs) {
            int dayOfWeek = log.getCreatedAt().getDayOfWeek().getValue();
            int hour = log.getCreatedAt().getHour();
            weeklyCounter[dayOfWeek]++;
            hourlyMap.get(dayOfWeek)[hour]++;
        }

        List<Long> weeklyList = Arrays.stream(weeklyCounter).skip(1).boxed().toList();
        Map<Integer, List<Long>> hourlyCongestion = new HashMap<>();
        for(int i=1; i<=7; i++) {
            List<Long> hours = new ArrayList<>();
            for(int h=9; h<=23; h++) hours.add(hourlyMap.get(i)[h]);
            hourlyCongestion.put(i, hours);
        }

        // 만료 임박 회원 (7일 이내)
        List<Membership> expiringSoon = membershipRepository.findByEndDateBetweenAndStatus(
                LocalDate.now(), LocalDate.now().plusDays(7), MembershipStatus.ACTIVE);

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
}