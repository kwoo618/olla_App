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

    @Scheduled(cron = "0 0 9 * * *")
    @Transactional(readOnly = true)
    public void notifyExpiringMembers() {
        log.info("⏰ [스케줄러] 만료 임박 회원 알림 발송 시작");

        LocalDate targetDate = LocalDate.now().plusDays(3);

        List<Membership> expiringMemberships = membershipRepository.findByEndDateAndStatus(targetDate, MembershipStatus.ACTIVE);

        for (Membership membership : expiringMemberships) {
            String title = "이용권 만료 안내 🎫";
            String content = "회원님의 이용권이 3일 후 만료될 예정입니다. 올라가자에서 연장 혜택을 확인해보세요!";

            notificationService.sendMembershipNotification(membership.getMember(), title, content);
        }

        log.info("⏰ [스케줄러] 만료 임박 알림 처리 완료. 총 {}명 발송", expiringMemberships.size());
    }
}