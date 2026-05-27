package com.olla.olla_climbing.domain.member.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.olla.olla_climbing.domain.community.entity.Post;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.entity.MemberNotification;
import com.olla.olla_climbing.domain.member.entity.NotificationSetting;
import com.olla.olla_climbing.domain.member.repository.MemberNotificationRepository;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.global.infra.fcm.FcmService;
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
    private final MemberRepository memberRepository;
    private final FcmService fcmService;

    @Async
    @Transactional
    public void sendCommentNotification(Member receiver, Member sender, Post post) {
        if (receiver.getId().equals(sender.getId())) return;
        if (isNotificationDisabled(receiver, "ACTIVITY")) return;

        String title = "새로운 댓글 💬";
        String content = sender.getName() + "님이 [" + post.getTitle() + "] 글에 댓글을 남겼습니다.";
        saveAndSendPush(receiver, title, content, "COMMENT", String.valueOf(post.getId()));
    }

    @Async
    @Transactional
    public void sendParticipantNotification(Long receiverId, String senderName, String postTitle, Long postId, boolean isJoin) {
        Member receiver = memberRepository.findById(receiverId).orElse(null);
        if (receiver == null || isNotificationDisabled(receiver, "CREW")) return;

        String title = isJoin ? "새로운 참여자 🧗" : "참여 취소 알림 😢";
        String content = senderName + "님이 [" + postTitle + "] 모임에 " + (isJoin ? "참여 신청했습니다." : "참여를 취소했습니다.");
        saveAndSendPush(receiver, title, content, "CREW", String.valueOf(postId));
    }

    @Async
    @Transactional
    public void sendMembershipNotification(Member receiver, String title, String content) {
        if (isNotificationDisabled(receiver, "MEMBERSHIP")) return;
        saveAndSendPush(receiver, title, content, "MEMBERSHIP", "");
    }

    @Async
    @Transactional
    public void sendCrewReminderNotification(Member receiver, Post post) {
        if (isNotificationDisabled(receiver, "CREW")) return;
        String title = "모임 리마인드 ⏰";
        String content = "내일 [" + post.getTitle() + "] 모임이 예정되어 있습니다! 잊지 말고 준비물 챙겨주세요!";
        saveAndSendPush(receiver, title, content, "CREW", String.valueOf(post.getId()));
    }

    @Async
    @Transactional
    public void sendAdminDirectNotification(Member receiver, String title, String content) {
        // 관리자가 콕 찝어 보내는 중요 알림이므로 수신거부 필터를 무시하거나 NOTICE 타입으로 발송합니다.
        saveAndSendPush(receiver, title, content, "NOTICE", "");
    }

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

    private void saveAndSendPush(Member receiver, String title, String content, String type, String targetId) {
        // 1. 앱 내 알림함(DB)에 안전하게 저장 (이 부분은 정상 작동하여 프론트에서 UI 테스트 가능)
        MemberNotification noti = MemberNotification.builder()
                .member(receiver)
                .title(title)
                .content(content)
                .build();
        notificationRepository.save(noti);

        // 2. 외부 통신(FCM)은 전담 서비스로 넘겨버림 (스레드 분리 완료)
        fcmService.sendPushNotification(receiver.getFcmToken(), title, content, type, targetId);
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
}