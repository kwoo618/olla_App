package com.olla.olla_climbing.domain.ranking.scheduler;

import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.domain.member.service.NotificationService;
import com.olla.olla_climbing.domain.ranking.entity.Ranking;
import com.olla.olla_climbing.domain.ranking.enums.RankType;
import com.olla.olla_climbing.domain.ranking.repository.RankingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class RankingScheduler {

    private final MemberRepository memberRepository;
    private final NotificationService notificationService;
    private final RankingRepository rankingRepository;

    // 매주 월요일 새벽 4시: 주간 랭킹 Top3 기록 및 전체 회원 리포트 발송
    @Scheduled(cron = "0 0 4 * * MON")
    @Transactional(readOnly = true)
    public void weeklyRankingSettlement() {
        log.info("주간 랭킹 정산 스케줄러 시작");

        logTopRankers(RankType.BEGINNER_SERIES);
        logTopRankers(RankType.MAIN_ENDURANCE_DISTANCE);
        logTopRankers(RankType.MAIN_ENDURANCE_TIME);

        List<Member> allMembers = memberRepository.findAll();
        for (Member member : allMembers) {
            if (member.getNotificationSetting() == null
                    || !member.getNotificationSetting().isGlobalNotificationOn()
                    || !member.getNotificationSetting().isActivityNotificationOn()) {
                continue;
            }
            notificationService.sendMembershipNotification(
                    member, "주간 랭킹 리포트 도착", "지난주 클라이밍 랭킹과 기록을 확인해보세요!");
        }

        log.info("주간 랭킹 정산 및 알림 발송 완료");
    }

    private void logTopRankers(RankType rankType) {
        try {
            List<Ranking> topRankers = rankingRepository.findTop3ByRankTypeAndIsMasterFalseOrderByRankingAsc(rankType);
            log.info("[{}] Top 3:", rankType.name());
            for (Ranking r : topRankers) {
                log.info("  {}등: {} (점수: {})", r.getRanking(), r.getMember().getName(), r.getScore());
            }
        } catch (Exception e) {
            log.error("랭킹 집계 중 오류: {}", e.getMessage());
        }
    }
}