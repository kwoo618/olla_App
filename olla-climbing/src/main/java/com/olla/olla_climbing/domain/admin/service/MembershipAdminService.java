package com.olla.olla_climbing.domain.admin.service;

import com.olla.olla_climbing.domain.admin.dto.request.AdminMemberCreateRequest;
import com.olla.olla_climbing.domain.admin.dto.response.AdminMemberResponse;
import com.olla.olla_climbing.domain.admin.dto.response.MembershipResponse;
import com.olla.olla_climbing.domain.admin.entity.AdminNotification;
import com.olla.olla_climbing.domain.admin.entity.Membership;
import com.olla.olla_climbing.domain.admin.enums.MembershipStatus;
import com.olla.olla_climbing.domain.admin.repository.AdminNotificationRepository;
import com.olla.olla_climbing.domain.admin.repository.MembershipRepository;
import com.olla.olla_climbing.domain.member.dto.response.MemberResponse;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.enums.Role;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.domain.member.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
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

        int safeMonths = (addMonths != null) ? addMonths : 0;
        int safeCount = (addCount != null) ? addCount : 0;

        if (safeMonths == 0 && safeCount == 0) {
            throw new IllegalArgumentException("기간(개월) 또는 횟수 중 하나는 반드시 입력해야 합니다.");
        }

        // 일일권 추가 시 기존 ACTIVE 일일권에 횟수 합산
        if (safeCount > 0) {
            Membership existingCount = membershipRepository
                    .findActiveCountMembershipByMemberId(memberId).orElse(null);
            if (existingCount != null) {
                existingCount.addRemainingCount(safeCount);
                googleSheetsService.updateCountInSheet(member.getId(), existingCount.getRemainingCount());
                log.info("일일권 횟수 합산 완료: 회원={}, 추가={}회, 잔여={}회",
                        member.getName(), safeCount, existingCount.getRemainingCount());
                return;
            }
        }

        // 기간권 시작일 계산 (일일권은 항상 오늘)
        LocalDate effectiveStartDate;
        if (safeMonths > 0) {
            LocalDate latestEndDate = membershipRepository.findMaxEndDateByMemberId(memberId).orElse(null);
            if (latestEndDate != null && latestEndDate.isAfter(LocalDate.now().minusDays(1))) {
                effectiveStartDate = latestEndDate;
            } else {
                effectiveStartDate = (startDate != null) ? startDate : LocalDate.now();
            }
        } else {
            effectiveStartDate = LocalDate.now();
        }

        Membership newMembership = Membership.builder()
                .member(member)
                .startDate(effectiveStartDate)
                .durationMonth(safeMonths > 0 ? safeMonths : null)
                .remainingCount(safeCount > 0 ? safeCount : null)
                .build();

        membershipRepository.save(newMembership);
        googleSheetsService.syncNewMembership(member, newMembership);

        log.info("이용권 부여 완료: 회원={}, 시작일={}, 기간={}개월, 횟수={}회",
                member.getName(), effectiveStartDate, safeMonths, safeCount);
    }

    @Transactional
    public void deleteMembership(Long membershipId) {
        Membership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이용권입니다."));
        membership.markAsDeleted();
        googleSheetsService.updateMembershipStatus(membership.getMember().getId(), "EXPIRED");
    }

    @Transactional
    public MemberResponse createOfflineMember(AdminMemberCreateRequest request) {
        if (memberRepository.findByPhone(request.getPhone()).isPresent()) {
            throw new IllegalArgumentException("이미 등록된 전화번호입니다.");
        }

        String cleanPhone = request.getPhone().replaceAll("-", "");
        String dummyEmail = "offline_" + cleanPhone + "@ollagaja.com";

        Member offlineMember = Member.builder()
                .name(request.getName())
                .gender(request.getGender())
                .birthDate(request.getBirthDate())
                .phone(request.getPhone())
                .email(dummyEmail)
                .password(null)
                .role(Role.USER)
                .build();

        Member savedMember = memberRepository.save(offlineMember);

        googleSheetsService.syncNewMember(savedMember);
        googleSheetsService.syncUnregisteredMember(savedMember);

        log.info("오프라인 회원 등록 완료: 이름={}, 전화번호={}", savedMember.getName(), savedMember.getPhone());
        return MemberResponse.from(savedMember);
    }

    @Transactional
    public void pauseMembership(Long membershipId) {
        Membership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이용권입니다."));
        membership.pause();
        googleSheetsService.updateMembershipPauseDate(
                membership.getMember().getId(),
                LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy. MM. dd"))
        );
    }

    @Transactional
    public void unpauseMembership(Long membershipId) {
        Membership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이용권입니다."));
        membership.unpause();
        String newEndDateStr = membership.getEndDate() != null
                ? membership.getEndDate().format(DateTimeFormatter.ofPattern("yyyy. MM. dd")) : "";
        googleSheetsService.unpauseMembershipData(membership.getMember().getId(), newEndDateStr);
        googleSheetsService.updateMembershipStatus(membership.getMember().getId(), "HOLDING");
    }

    @Transactional(readOnly = true)
    public List<MembershipResponse> getMyMembership(Long memberId) {
        List<Membership> activeMemberships = membershipRepository.findAllByMemberIdAndStatusIn(
                memberId, List.of(MembershipStatus.ACTIVE, MembershipStatus.HOLDING)
        );
        return activeMemberships.stream().map(MembershipResponse::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<AdminMemberResponse> getAdminMemberList(String searchName, Pageable pageable) {
        Page<Member> memberPage = StringUtils.hasText(searchName)
                ? memberRepository.findByNameContaining(searchName, pageable)
                : memberRepository.findAll(pageable);

        return memberPage.map(member -> {
            List<Membership> activeMemberships = membershipRepository.findAllByMemberIdAndStatusIn(
                    member.getId(), List.of(MembershipStatus.ACTIVE, MembershipStatus.HOLDING)
            );
            return AdminMemberResponse.from(member, activeMemberships);
        });
    }

    // 매일 오전 9시: 오늘 만료 회원 EXPIRED 처리 + 요약 알림 생성
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void generateExpirySummaryAlert() {
        LocalDate today = LocalDate.now();
        LocalDate d3 = today.plusDays(3);

        List<Membership> expiredToday = membershipRepository.findByEndDateAndStatus(today, MembershipStatus.ACTIVE);
        List<Membership> expiringIn3Days = membershipRepository.findByEndDateAndStatus(d3, MembershipStatus.ACTIVE);

        if (expiredToday.isEmpty() && expiringIn3Days.isEmpty()) return;

        expiredToday.forEach(m -> {
            m.expire();
            googleSheetsService.updateMembershipStatus(m.getMember().getId(), "EXPIRED");
        });

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
        log.info("관리자 만료 요약 알림 저장 완료");
    }

    @Transactional
    public void deleteMember(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));
        member.withdraw();
    }
}