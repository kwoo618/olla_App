package com.olla.olla_climbing.domain.admin.service;

import com.olla.olla_climbing.domain.admin.dto.request.AdminMemberCreateRequest;
import com.olla.olla_climbing.domain.admin.dto.response.AdminMemberResponse;
import com.olla.olla_climbing.domain.admin.dto.response.MembershipResponse;
import com.olla.olla_climbing.domain.admin.entity.AdminNotification;
import com.olla.olla_climbing.domain.admin.entity.Membership;
import com.olla.olla_climbing.domain.admin.enums.MembershipStatus;
import com.olla.olla_climbing.domain.admin.repository.AdminNotificationRepository;
import com.olla.olla_climbing.domain.admin.repository.MembershipRepository;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.enums.Role;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.domain.member.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MembershipAdminService {

    private final MembershipRepository membershipRepository;
    private final MemberRepository memberRepository;
    private final GoogleSheetsService googleSheetsService;
    private final AdminNotificationRepository adminNotificationRepository;
    private final NotificationService notificationService;

    @Transactional
    public void grantMembership(Long memberId, Integer addMonths, Integer addCount, LocalDate startDate) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));

        // 기존에 활성화된 회원권이 있는지 찾기
        Membership activeMembership = membershipRepository.findByMemberIdAndStatusIn(
                memberId, List.of(MembershipStatus.ACTIVE, MembershipStatus.HOLDING)
        ).orElse(null);

        if (activeMembership != null) {
            // 이미 있으면 새로 만들지 말고 기간/횟수를 연장함
            if (addMonths != null && addMonths > 0) activeMembership.addDuration(addMonths);
            if (addCount != null && addCount > 0) activeMembership.addRemainingCount(addCount);
        } else {
            // 없으면 새로 생성
            Membership newMembership;
            if (addMonths != null && addMonths > 0) {
                newMembership = Membership.builder()
                        .member(member)
                        .startDate(startDate)
                        .durationMonth(addMonths)
                        .build();
            } else if (addCount != null && addCount > 0) {
                newMembership = Membership.builder()
                        .member(member)
                        .startDate(startDate)
                        .remainingCount(addCount)
                        .build();
            } else {
                throw new IllegalArgumentException("기간(개월) 또는 횟수 중 하나를 입력해야 합니다.");
            }
            membershipRepository.save(newMembership);
        }
    }

    @Transactional
    public void deleteMembership(Long membershipId) {
        Membership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이용권입니다."));
        membership.markAsDeleted();
    }

    @Transactional
    public void createOfflineMember(AdminMemberCreateRequest request) {
        if (memberRepository.findByPhone(request.getPhone()).isPresent()) {
            throw new IllegalArgumentException("이미 등록된 전화번호입니다.");
        }
        Member dummyMember = Member.builder()
                .name(request.getName()).phone(request.getPhone()).gender(request.getGender()).birthDate(request.getBirthDate()).role(Role.USER).build();
        Member savedMember = memberRepository.save(dummyMember);

        googleSheetsService.syncNewMember(savedMember);
        googleSheetsService.syncUnregisteredMember(savedMember);
    }

    @Transactional
    public void pauseMembership(Long membershipId) {
        Membership membership = membershipRepository.findById(membershipId).orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이용권입니다."));
        membership.pause();
        googleSheetsService.updateMembershipPauseDate(membership.getMember().getId(), LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy. MM. dd")));
    }

    @Transactional
    public void unpauseMembership(Long membershipId) {
        Membership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이용권입니다."));
        membership.unpause();

        String newEndDateStr = membership.getEndDate() != null ? membership.getEndDate().format(DateTimeFormatter.ofPattern("yyyy. MM. dd")) : "";
        googleSheetsService.unpauseMembershipData(membership.getMember().getId(), newEndDateStr);
    }

    @Transactional(readOnly = true)
    public MembershipResponse getMyMembership(Long memberId) {
        Membership activeOrHoldingMembership = membershipRepository.findByMemberIdAndStatusIn(
                memberId, List.of(MembershipStatus.ACTIVE, MembershipStatus.HOLDING)
        ).orElse(null);

        if (activeOrHoldingMembership == null) {
            return null;
        }

        return MembershipResponse.from(activeOrHoldingMembership);
    }

    @Transactional(readOnly = true)
    public Page<AdminMemberResponse> getAdminMemberList(String searchName, Pageable pageable) {
        Page<Member> memberPage;

        if (StringUtils.hasText(searchName)) {
            memberPage = memberRepository.findByNameContaining(searchName, pageable);
        } else {
            memberPage = memberRepository.findAll(pageable);
        }

        return memberPage.map(member -> {
            Membership activeOrHolding = membershipRepository.findByMemberIdAndStatusIn(
                    member.getId(), List.of(MembershipStatus.ACTIVE, MembershipStatus.HOLDING)
            ).orElse(null);

            return AdminMemberResponse.from(member, activeOrHolding);
        });
    }

    @Scheduled(cron = "0 0 9 * * *")    //
    @Transactional
    public void generateExpirySummaryAlert() {
        LocalDate today = LocalDate.now();
        LocalDate d3 = today.plusDays(3);

        List<Membership> expiredToday = membershipRepository.findByEndDateAndStatus(today, MembershipStatus.ACTIVE);
        List<Membership> expiringIn3Days = membershipRepository.findByEndDateAndStatus(d3, MembershipStatus.ACTIVE);

        if (expiredToday.isEmpty() && expiringIn3Days.isEmpty()) return;

        StringBuilder sb = new StringBuilder();
        sb.append("[오늘 만료: ").append(expiredToday.size()).append("명]\n");
        expiredToday.forEach(m -> sb.append("- ").append(m.getMember().getName()).append("\n"));

        sb.append("\n[3일 뒤 만료: ").append(expiringIn3Days.size()).append("명]\n");
        expiringIn3Days.forEach(m -> sb.append("- ").append(m.getMember().getName()).append("\n"));

        AdminNotification alert = AdminNotification.builder()
                .title(today + " 회원권 만료 요약 알림")
                .content(sb.toString())
                .build();

        adminNotificationRepository.save(alert);
    }

    @Transactional
    public void deleteMember(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));
        member.withdraw();
    }
}