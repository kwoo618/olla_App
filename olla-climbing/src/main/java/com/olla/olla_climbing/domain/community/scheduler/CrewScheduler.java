package com.olla.olla_climbing.domain.community.scheduler;

import com.olla.olla_climbing.domain.community.entity.Post;
import com.olla.olla_climbing.domain.community.entity.PostParticipant;
import com.olla.olla_climbing.domain.community.repository.PostParticipantRepository;
import com.olla.olla_climbing.domain.community.repository.PostRepository;
import com.olla.olla_climbing.domain.member.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class CrewScheduler {

    private final PostRepository postRepository;
    private final PostParticipantRepository participantRepository;
    private final NotificationService notificationService;

    // 매일 오전 9시 20분: 내일 예정된 모임 참여자 전체에게 리마인드 발송
    // (다른 스케줄러와 실행 시간 분리: 9:00 / 9:10 / 9:20)
    @Scheduled(cron = "0 20 9 * * *")
    @Transactional(readOnly = true)
    public void sendMeetingReminders() {
        log.info("모임 D-1 리마인드 스케줄러 시작");

        LocalDateTime startOfTomorrow = LocalDateTime.of(LocalDate.now().plusDays(1), LocalTime.MIN);
        LocalDateTime endOfTomorrow = LocalDateTime.of(LocalDate.now().plusDays(1), LocalTime.MAX);

        List<Post> tomorrowsPosts = postRepository
                .findByMeetDateTimeBetweenAndIsDeletedFalse(startOfTomorrow, endOfTomorrow);

        int count = 0;
        for (Post post : tomorrowsPosts) {
            List<PostParticipant> participants = participantRepository.findByPost(post);
            for (PostParticipant participant : participants) {
                notificationService.sendCrewReminderNotification(participant.getMember(), post);
                count++;
            }
        }

        log.info("모임 D-1 리마인드 완료: {}개 모임, {}명 발송", tomorrowsPosts.size(), count);
    }
}