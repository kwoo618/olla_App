package com.olla.olla_climbing.domain.ranking.scheduler;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.domain.member.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class RankingScheduler {

    private final MemberRepository memberRepository;
    private final NotificationService notificationService;

    // 매주 월요일 새벽 4시에 랭킹 정산 및 주간 리포트 알림 발송
    @Scheduled(cron = "0 0 4 * * MON")
    public void weeklyRankingSettlement() {
        log.info("🏆 주간 랭킹 정산 스케줄러 시작");

        List<Member> allMembers = memberRepository.findAll();

        for (Member member : allMembers) {
            if (member.getNotificationSetting() == null ||
                    !member.getNotificationSetting().isGlobalNotificationOn() ||
                    !member.getNotificationSetting().isActivityNotificationOn()) {
                continue;
            }

            notificationService.sendMembershipNotification(
                    member,
                    "주간 랭킹 리포트 도착 📈",
                    "지난주 클라이밍 랭킹과 기록을 확인해보세요!"
            );
        }
        log.info("🏆 주간 랭킹 정산 및 알림 발송 완료");
    }
}