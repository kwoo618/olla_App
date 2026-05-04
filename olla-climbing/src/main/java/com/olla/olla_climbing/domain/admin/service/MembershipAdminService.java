package com.olla.olla_climbing.domain.admin.service;

import com.olla.olla_climbing.domain.admin.dto.request.AdminMemberCreateRequest;
import com.olla.olla_climbing.domain.admin.dto.response.AdminMemberResponse;
import com.olla.olla_climbing.domain.admin.dto.response.MembershipResponse;
import com.olla.olla_climbing.domain.admin.entity.AdminAlert;
import com.olla.olla_climbing.domain.admin.entity.Membership;
import com.olla.olla_climbing.domain.admin.enums.MembershipStatus;
import com.olla.olla_climbing.domain.admin.enums.MembershipType;
import com.olla.olla_climbing.domain.admin.repository.AdminAlertRepository;
import com.olla.olla_climbing.domain.admin.repository.MembershipRepository;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.enums.Role;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
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

    private final AdminAlertRepository adminAlertRepository;

    // 관리자가 회원에게 이용권을 부여 (또는 연장)
    @Transactional
    public void grantMembership(Long memberId, MembershipType type, Integer addMonths, Integer addCount) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        Membership activeMembership = membershipRepository.findByMemberIdAndStatus(member.getId(), MembershipStatus.ACTIVE).orElse(null);
        Membership savedMembership;

        if (activeMembership != null) {
            if (activeMembership.getMembershipType() != type) throw new IllegalStateException("이미 다른 타입의 활성화된 이용권이 존재합니다. 기존 이용권을 만료 처리 후 발급하세요.");
            if (type == MembershipType.PERIOD) activeMembership.extendPeriod(addMonths);
            else if (type == MembershipType.COUNT) activeMembership.addCount(addCount);
            savedMembership = activeMembership;
            // 연장 시 시트 업데이트(updateRow) 로직 호출 필요
        } else {
            Membership newMembership = null;
            if (type == MembershipType.PERIOD) {
                newMembership = Membership.builder().member(member).membershipType(MembershipType.PERIOD).startDate(LocalDate.now()).endDate(LocalDate.now().plusMonths(addMonths)).status(MembershipStatus.ACTIVE).build();
            } else if (type == MembershipType.COUNT) {
                newMembership = Membership.builder().member(member).membershipType(MembershipType.COUNT).remainingCount(addCount).status(MembershipStatus.ACTIVE).build();
            }
            savedMembership = membershipRepository.save(newMembership);

            // 구글 시트 전송
            googleSheetsService.syncNewMembership(savedMembership, addMonths, addCount);
        }
    }

    @Transactional
    public void createOfflineMember(AdminMemberCreateRequest request) {
        if (memberRepository.findByPhone(request.getPhone()).isPresent()) {
            throw new IllegalArgumentException("이미 등록된 전화번호입니다.");
        }
        Member dummyMember = Member.builder()
                .name(request.getName()).phone(request.getPhone()).gender(request.getGender()).birthDate(request.getBirthDate()).role(Role.USER).build();
        Member savedMember = memberRepository.save(dummyMember);

        // 구글 시트 전송
        googleSheetsService.syncNewMember(savedMember);
    }

    @Transactional
    public void pauseMembership(Long membershipId) {
        Membership membership = membershipRepository.findById(membershipId).orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이용권입니다."));
        membership.pause();
        // 시트 업데이트
        googleSheetsService.updateMembershipPauseDate(membership.getMember().getId(), LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy. MM. dd")));
    }

    @Transactional
    public void unpauseMembership(Long membershipId) {
        Membership membership = membershipRepository.findById(membershipId).orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이용권입니다."));
        membership.unpause();
        // 시트 업데이트 (빈칸)
        googleSheetsService.updateMembershipPauseDate(membership.getMember().getId(), "");
    }

    // 유저 본인의 활성화된 이용권 조회
    @Transactional(readOnly = true)
    public MembershipResponse getMyMembership(Long memberId) {
        // ACTIVE뿐만 아니라 HOLDING 상태인 이용권도 가져오도록 수정
        Membership activeOrHoldingMembership = membershipRepository.findByMemberIdAndStatusIn(
                memberId, List.of(MembershipStatus.ACTIVE, MembershipStatus.HOLDING)
        ).orElse(null);

        if (activeOrHoldingMembership == null) {
            return null; // 프론트엔드에서 "이용권 없음" 처리
        }

        return MembershipResponse.from(activeOrHoldingMembership);
    }

    // 관리자용 전체 회원 리스트 페이징 및 검색
    @Transactional(readOnly = true)
    public Page<AdminMemberResponse> getAdminMemberList(String searchName, Pageable pageable) {
        Page<Member> memberPage;

        // 1. 이름 검색어가 있으면 조건 검색, 없으면 전체 검색
        if (StringUtils.hasText(searchName)) {
            memberPage = memberRepository.findByNameContaining(searchName, pageable);
        } else {
            memberPage = memberRepository.findAll(pageable);
        }

        // 2. 조회된 회원 각각의 현재 이용권 상태를 매핑하여 DTO로 변환 (Page 객체의 map 기능 활용)
        return memberPage.map(member -> {
            // 회원 1명당 이용권 1번씩 조회 (N+1 발생 지점이지만 관리자 페이징 단위에서는 허용 가능한 수준)
            Membership activeOrHolding = membershipRepository.findByMemberIdAndStatusIn(
                    member.getId(), List.of(MembershipStatus.ACTIVE, MembershipStatus.HOLDING)
            ).orElse(null);

            return AdminMemberResponse.from(member, activeOrHolding);
        });
    }

    @Scheduled(cron = "0 0 9 * * *") // 매일 아침 9시 실행
    @Transactional
    public void generateExpirySummaryAlert() {
        LocalDate today = LocalDate.now();
        LocalDate d3 = today.plusDays(3);

        // 1. 대상 조회
        List<Membership> expiredToday = membershipRepository.findByEndDateAndStatus(today, MembershipStatus.ACTIVE);
        List<Membership> expiringIn3Days = membershipRepository.findByEndDateAndStatus(d3, MembershipStatus.ACTIVE);

        if (expiredToday.isEmpty() && expiringIn3Days.isEmpty()) return;

        // 2. 메시지 구성
        StringBuilder sb = new StringBuilder();
        sb.append("[오늘 만료: ").append(expiredToday.size()).append("명]\n");
        expiredToday.forEach(m -> sb.append("- ").append(m.getMember().getName()).append("\n"));

        sb.append("\n[3일 뒤 만료: ").append(expiringIn3Days.size()).append("명]\n");
        expiringIn3Days.forEach(m -> sb.append("- ").append(m.getMember().getName()).append("\n"));

        // 3. 관리자 알림 저장 (SMS 대신 DB 저장)
        AdminAlert alert = AdminAlert.builder()
                .title(today + " 회원권 만료 요약 알림")
                .content(sb.toString())
                .build();

        adminAlertRepository.save(alert);
    }

}