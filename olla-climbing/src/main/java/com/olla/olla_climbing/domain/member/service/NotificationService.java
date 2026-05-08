package com.olla.olla_climbing.domain.member.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.olla.olla_climbing.domain.community.entity.Post;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.entity.MemberNotification;
import com.olla.olla_climbing.domain.member.entity.NotificationSetting;
import com.olla.olla_climbing.domain.member.repository.MemberNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final MemberNotificationRepository notificationRepository;

    @Async
    @Transactional
    public void sendCommentNotification(Member receiver, Member sender, Post post) {
        if (receiver.getId().equals(sender.getId())) return; // 💡 자기 자신 제외

        // 알림 스위치 확인: Global이 켜져있고, Activity 알림이 켜져있어야 함
        if (isNotificationDisabled(receiver, "ACTIVITY")) return;

        String title = "새로운 댓글 💬";
        String content = sender.getName() + "님이 [" + post.getTitle() + "] 글에 댓글을 남겼습니다.";

        saveAndSendPush(receiver, title, content, "COMMENT", String.valueOf(post.getId()));
    }

    @Async
    @Transactional
    public void sendParticipantNotification(Member receiver, Member sender, Post post, boolean isJoin) {
        if (isNotificationDisabled(receiver, "CREW")) return;

        String title = isJoin ? "새로운 참여자 🧗" : "참여 취소 알림 😢";
        String content = sender.getName() + "님이 [" + post.getTitle() + "] 모임에 " + (isJoin ? "참여 신청했습니다." : "참여를 취소했습니다.");

        saveAndSendPush(receiver, title, content, "CREW", String.valueOf(post.getId()));
    }

    // --- 공통 체크 로직 ---
    private boolean isNotificationDisabled(Member member, String type) {
        NotificationSetting s = member.getNotificationSetting();
        if (s == null || !s.isGlobalNotificationOn()) return true;

        return switch (type) {
            case "MEMBERSHIP" -> !s.isMembershipNotificationOn();
            case "ACTIVITY" -> !s.isActivityNotificationOn();
            case "CREW" -> !s.isCrewNotificationOn();
            case "NOTICE" -> !s.isNoticeNotificationOn();
            default -> false;
        };
    }

    @Async
    @Transactional
    public void sendMembershipNotification(Member receiver, String title, String content) {
        if (isNotificationDisabled(receiver, "MEMBERSHIP")) return;
        saveAndSendPush(receiver, title, content, "MEMBERSHIP", ""); // 이동할 특정 게시글이 없으므로 targetId는 빈칸
    }

    // 공지사항/이벤트 알림
    private void saveAndSendPush(Member receiver, String title, String content, String type, String targetId) {
        // 1. 앱 내 알림함(DB)에 저장
        MemberNotification noti = MemberNotification.builder()
                .member(receiver)
                .title(title)
                .content(content)
                .build();
        notificationRepository.save(noti);

        // 2. 기기 토큰이 있으면 구글(FCM)로 푸시 알림 전송
        if (StringUtils.hasText(receiver.getFcmToken())) {
            Message message = Message.builder()
                    .setToken(receiver.getFcmToken())
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(content)
                            .build())
                    .putData("type", type) // 프론트 화면 이동용
                    .putData("targetId", targetId != null ? targetId : "") // 이동할 상세 페이지 ID
                    .build();

            try {
                FirebaseMessaging.getInstance().send(message);
                log.info("FCM 푸시 발송 성공 - 수신자: {}", receiver.getLoginId());
            } catch (Exception e) {
                log.error("FCM 푸시 발송 실패 - 수신자: {}, 에러: {}", receiver.getLoginId(), e.getMessage());
            }
        }
    }

    @Transactional(readOnly = true)
    public Page<MemberNotification> getMyNotifications(Long memberId, Pageable pageable) {
        return notificationRepository.findByMemberIdOrderByCreatedAtDesc(memberId, pageable);
    }

    @Transactional
    public void markAsRead(Long notiId, Long memberId) {
        MemberNotification noti = notificationRepository.findById(notiId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 알림입니다."));

        if (!noti.getMember().getId().equals(memberId)) {
            throw new IllegalArgumentException("본인의 알림만 읽음 처리할 수 있습니다.");
        }
        noti.markAsRead();
    }

    @Async
    @Transactional
    public void sendCrewReminderNotification(Member receiver, Post post) {
        if (isNotificationDisabled(receiver, "CREW")) return;

        String title = "모임 리마인드 ⏰";
        String content = "내일 [" + post.getTitle() + "] 모임이 예정되어 있습니다! 잊지 말고 준비물 챙겨주세요!";

        saveAndSendPush(receiver, title, content, "CREW", String.valueOf(post.getId()));
    }
}