package com.olla.olla_climbing.domain.admin.scheduler;

import com.olla.olla_climbing.domain.admin.entity.Membership;
import com.olla.olla_climbing.domain.admin.enums.MembershipStatus;
import com.olla.olla_climbing.domain.admin.repository.MembershipRepository;
import com.olla.olla_climbing.domain.member.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class MembershipScheduler {

    private final MembershipRepository membershipRepository;
    private final NotificationService notificationService;

    // 매일 오전 9시 10분: 3일 후 만료 예정 회원에게 갱신 안내 발송
    // (MembershipAdminService의 만료 요약 알림과 실행 시간 분리: 9:00 vs 9:10)
    @Scheduled(cron = "0 10 9 * * *")
    @Transactional(readOnly = true)
    public void notifyExpiringMembers() {
        log.info("만료 임박 회원 알림 발송 시작");

        List<Membership> expiringMemberships = membershipRepository
                .findByEndDateAndStatus(LocalDate.now().plusDays(3), MembershipStatus.ACTIVE);

        for (Membership membership : expiringMemberships) {
            notificationService.sendMembershipNotification(
                    membership.getMember(),
                    "이용권 만료 안내 🎫",
                    "회원님의 이용권이 3일 후 만료될 예정입니다. 올라가자에서 연장 혜택을 확인해보세요!"
            );
        }

        log.info("만료 임박 알림 발송 완료: {}명", expiringMemberships.size());
    }
}