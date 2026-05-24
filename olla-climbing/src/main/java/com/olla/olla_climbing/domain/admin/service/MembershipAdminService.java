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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import org.springframework.scheduling.annotation.Scheduled;

import java.util.stream.Collectors;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MembershipAdminService {

    private final MembershipRepository membershipRepository;
    private final MemberRepository memberRepository;
    private final GoogleSheetsService googleSheetsService;
    private final AdminNotificationRepository adminNotificationRepository;
    private final NotificationService notificationService;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void grantMembership(Long memberId, Integer addMonths, Integer addCount, LocalDate startDate) {
        // 1. 회원 조회
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));

        // 💡 [핵심 추가] 기존 이용권의 최대 종료일 찾기
        LocalDate latestEndDate = membershipRepository.findMaxEndDateByMemberId(memberId).orElse(null);

        // 💡 [핵심 로직] 시작 날짜 결정
        LocalDate effectiveStartDate;
        if (latestEndDate != null && latestEndDate.isAfter(LocalDate.now().minusDays(1))) {
            // 이미 유효한 이용권이 있다면, 그 종료일이 새로운 시작일이 됨 (연장)
            effectiveStartDate = latestEndDate;
        } else {
            // 기존 이용권이 없거나 이미 예전에 만료되었다면, 입력받은 날짜 혹은 오늘부터 시작
            effectiveStartDate = (startDate != null) ? startDate : LocalDate.now();
        }

        int safeMonths = (addMonths != null) ? addMonths : 0;
        int safeCount = (addCount != null) ? addCount : 0;

        if (safeMonths == 0 && safeCount == 0) {
            throw new IllegalArgumentException("기간(개월) 또는 횟수 중 하나는 반드시 입력해야 합니다.");
        }

        // 2. 새로운 이용권 레코드 생성
        Membership newMembership = Membership.builder()
                .member(member)
                .startDate(effectiveStartDate) // 계산된 연장 시작일 적용
                .durationMonth(safeMonths > 0 ? safeMonths : null)
                .remainingCount(safeCount > 0 ? safeCount : null)
                .build();

        membershipRepository.save(newMembership);


        log.info("이용권 연장 부여 성공 : 회원={}, 시작일={}, 기간={}개월",
                member.getName(), effectiveStartDate, safeMonths);
    }

    @Transactional
    public void deleteMembership(Long membershipId) {
        Membership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이용권입니다."));
        membership.markAsDeleted();
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
        return MemberResponse.from(savedMember);
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
    public List<MembershipResponse> getMyMembership(Long memberId) {
        // 내 이용권 조회도 여러 개가 있을 수 있으니 List 반환으로 변경 (컨트롤러 쪽 리턴 타입도 맞춰야 할 수 있음)
        List<Membership> activeMemberships = membershipRepository.findAllByMemberIdAndStatusIn(
                memberId, List.of(MembershipStatus.ACTIVE, MembershipStatus.HOLDING)
        );
        return activeMemberships.stream().map(MembershipResponse::from).collect(Collectors.toList());
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
            List<Membership> activeMemberships = membershipRepository.findAllByMemberIdAndStatusIn(
                    member.getId(), List.of(MembershipStatus.ACTIVE, MembershipStatus.HOLDING)
            );
            return AdminMemberResponse.from(member, activeMemberships);
        });
    }

    @Scheduled(cron = "0 0 9 * * *")
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