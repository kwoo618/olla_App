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

    // 매일 아침 9시에 내일 예정된 모임 리마인드 알림 발송
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional(readOnly = true)
    public void sendMeetingReminders() {
        log.info("⏰ 모임 D-1 리마인드 스케줄러 시작");

        // 내일의 시작(00:00)과 끝(23:59)
        LocalDateTime startOfTomorrow = LocalDateTime.of(LocalDate.now().plusDays(1), LocalTime.MIN);
        LocalDateTime endOfTomorrow = LocalDateTime.of(LocalDate.now().plusDays(1), LocalTime.MAX);

        // 내일 예정된 모든 활성(삭제되지 않은) 게시글 조회
        List<Post> tomorrowsPosts = postRepository.findByMeetDateTimeBetweenAndIsDeletedFalse(startOfTomorrow, endOfTomorrow);

        int count = 0;
        for (Post post : tomorrowsPosts) {
            // 해당 게시글에 참여 중인 모든 참여자(방장 포함) 조회
            List<PostParticipant> participants = participantRepository.findByPost(post);

            for (PostParticipant participant : participants) {
                notificationService.sendCrewReminderNotification(participant.getMember(), post);
                count++;
            }
        }

        log.info("⏰ 모임 D-1 리마인드 완료: 총 {}개의 모임, {}명의 회원에게 발송됨", tomorrowsPosts.size(), count);
    }
}