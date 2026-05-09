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
    private final RankingRepository rankingRepository; // 💡 랭커 추출을 위해 추가

    // 매주 월요일 새벽 4시에 랭킹 정산 및 주간 리포트 알림 발송
    @Scheduled(cron = "0 0 4 * * MON")
    @Transactional(readOnly = true)
    public void weeklyRankingSettlement() {
        log.info("🏆 주간 랭킹 정산 스케줄러 시작");

        // 1. 실무 팁: 이미 랭킹은 실시간으로 업데이트 되고 있으므로, 월요일 새벽에는 영광의 1~3등을 추출하여 로그로 박제합니다.
        // (나중에 확장 시, 이 데이터를 '주간 명예의 전당' 테이블에 넣을 수 있습니다)
        extractAndLogTopRankers(RankType.BEGINNER_SERIES);
        extractAndLogTopRankers(RankType.MAIN_ENDURANCE_DISTANCE);
        extractAndLogTopRankers(RankType.MAIN_ENDURANCE_TIME);

        // 2. 주간 랭킹 리포트 알림 발송
        List<Member> allMembers = memberRepository.findAll();
        for (Member member : allMembers) {
            if (member.getNotificationSetting() == null ||
                    !member.getNotificationSetting().isGlobalNotificationOn() ||
                    !member.getNotificationSetting().isActivityNotificationOn()) {
                continue;
            }

            // 이름 하드코딩 제거 완료
            notificationService.sendMembershipNotification(
                    member,
                    "주간 랭킹 리포트 도착 📈",
                    "지난주 클라이밍 랭킹과 기록을 확인해보세요!"
            );
        }
        log.info("🏆 주간 랭킹 정산 및 알림 발송 완료");
    }

    // 종목별 1~3등 추출 로직
    private void extractAndLogTopRankers(RankType rankType) {
        try {
            List<Ranking> topRankers = rankingRepository.findTop3ByRankTypeAndIsMasterFalseOrderByRankingAsc(rankType);
            log.info("👑 이번 주 [{}] 부문 Top 3 👑", rankType.name());
            for (Ranking r : topRankers) {
                log.info("{}등: {} (점수: {})", r.getRanking(), r.getMember().getName(), r.getScore());
            }
        } catch (Exception e) {
            log.error("랭킹 집계 중 오류 발생: {}", e.getMessage());
        }
    }
}