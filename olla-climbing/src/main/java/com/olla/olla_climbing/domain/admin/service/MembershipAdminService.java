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

        // 1. 해당 회원의 현재 활성화된 이용권이 있는지 확인
        Membership activeMembership = membershipRepository.findByMemberIdAndStatus(member.getId(), MembershipStatus.ACTIVE)
                .orElse(null);

        Membership savedMembership; // 구글 시트로 보낼 최종 저장 객체

        if (activeMembership != null) {
            // 2. 기존 이용권이 있는 경우: 연장
            if (activeMembership.getMembershipType() != type) {
                throw new IllegalStateException("이미 다른 타입의 활성화된 이용권이 존재합니다. 기존 이용권을 만료 처리 후 발급하세요.");
            }

            if (type == MembershipType.PERIOD) {
                activeMembership.extendPeriod(addMonths);
            } else if (type == MembershipType.COUNT) {
                activeMembership.addCount(addCount);
            }
            savedMembership = activeMembership; // 더티 체킹으로 업데이트 되지만 명시적 할당

            // [주의] 연장의 경우 시트에 새로운 줄을 추가(append)하는 것이 아니라,
            // 기존 줄의 종료일/잔여횟수를 업데이트(update)해야 합니다.
            // 현재는 appendRow만 구현되어 있으므로, 연장 시에는 시트 연동을 생략하거나 추후 updateRow로 교체해야 합니다.

        } else {
            // 3. 기존 이용권이 없는 경우: 신규 발급 (Insert)
            Membership newMembership = null;
            if (type == MembershipType.PERIOD) {
                newMembership = Membership.builder()
                        .member(member)
                        .membershipType(MembershipType.PERIOD)
                        .startDate(LocalDate.now())
                        .endDate(LocalDate.now().plusMonths(addMonths))
                        .status(MembershipStatus.ACTIVE)
                        // [추가] Epic 13: Membership 엔티티에 serviceMonths, accumulatedVisits 등이
                        // 추가되었다고 가정하고 빌더를 세팅해야 합니다. (엔티티 확장이 필요할 수 있습니다)
                        .build();
            } else if (type == MembershipType.COUNT) {
                newMembership = Membership.builder()
                        .member(member)
                        .membershipType(MembershipType.COUNT)
                        // COUNT 타입일 때의 처리가 필요합니다.
                        .status(MembershipStatus.ACTIVE)
                        .build();
            }
            savedMembership = membershipRepository.save(newMembership);

            // 4. [Epic 13] 완전 신규 발급일 경우 구글 [시트 2: 이용권 관리]에 데이터 전송 (Append)
            sendMembershipToGoogleSheets(savedMembership, addMonths, addCount);
        }
    }

    // 시트 2번 탭 전송용 프라이빗 메서드
    private void sendMembershipToGoogleSheets(Membership membership, Integer addMonths, Integer addCount) {
        Member member = membership.getMember();

        // 시트에 보낼 데이터 가공
        String startDateStr = membership.getStartDate() != null ?
                membership.getStartDate().format(DateTimeFormatter.ofPattern("yyyy. MM. dd")) : "";

        // 신청 서비스(개월 수 또는 횟수) 문자열 조합
        String serviceAmount = membership.getMembershipType() == MembershipType.PERIOD
                ? addMonths + "개월" : addCount + "회";

        // 전송 규격: [No, 이름, 연락처, 이용권종류, 신청서비스, 시작일, "", "", "", 누적방문횟수(0), "", 기초강습여부, ""]
        List<Object> rowData = List.of(
                member.getId(),
                member.getName(),
                member.getPhone(),
                membership.getMembershipType().getDescription(), // "회원권" 또는 "일일권" (Enum 변환)
                serviceAmount, // "6개월" 등
                startDateStr,
                "", // 종료일 (ARRAYFORMULA 계산 영역)
                "", // 잔여 횟수/일수 (계산 영역)
                "", // 최근 방문일
                0,  // 누적 방문횟수 초기값
                "", // 이용권 정지일
                "미수강", // 기초강습 여부 (기본값 설정 필요 시)
                ""  // 비고
        );

        // 시트 2번 탭 이름 ("이용권 관리" - 실제 시트 탭 이름과 정확히 일치해야 함)
        googleSheetsService.appendRow("이용권 관리", rowData);
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

    // 관리자의 이용권 일시정지 처리
    @Transactional
    public void pauseMembership(Long membershipId) {
        Membership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이용권입니다."));

        // 엔티티 내부의 pause() 호출 (더티 체킹으로 자동 UPDATE)
        membership.pause();
    }

    // 관리자의 이용권 일시정지 해제 처리
    @Transactional
    public void unpauseMembership(Long membershipId) {
        Membership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이용권입니다."));

        // 엔티티 내부의 unpause() 호출 (만료일 연장 로직 포함)
        membership.unpause();
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

    @Transactional
    public void createOfflineMember(AdminMemberCreateRequest request) {
        // 1. 이미 등록된 번호인지 중복 확인
        if (memberRepository.findByPhone(request.getPhone()).isPresent()) {
            throw new IllegalArgumentException("이미 등록된 전화번호입니다.");
        }

        // 2. 로그인 정보(ID, PW, 이메일)가 없는 유령 회원(Dummy) 엔티티 생성
        Member dummyMember = Member.builder()
                .name(request.getName())
                .phone(request.getPhone())
                .gender(request.getGender())
                .birthDate(request.getBirthDate())
                .role(Role.USER) // 권한은 일반 유저로 세팅
                // loginId, password, email은 빌더에 안 넣었으므로 null로 들어감
                .build();

        // 3. DB에 저장
        Member savedMember = memberRepository.save(dummyMember);

        // 4. 구글 시트 [시트 1: 회원정보]에 데이터 전송
        sendToGoogleSheets(savedMember);
    }

    // 구글 시트 전송용 프라이빗 메서드 (AuthService와 동일한 규격)
    private void sendToGoogleSheets(Member member) {
        String birthDateStr = member.getBirthDate().format(DateTimeFormatter.ofPattern("yyyy. MM. dd"));
        String createdAtStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy. MM. dd"));

        List<Object> rowData = List.of(
                member.getId(),
                member.getName(),
                member.getGender(),
                member.getPhone(),
                birthDateStr,
                "", // 나이 빈칸
                createdAtStr
        );

        googleSheetsService.appendRow("올라클라이밍 회원정보", rowData);
    }

}