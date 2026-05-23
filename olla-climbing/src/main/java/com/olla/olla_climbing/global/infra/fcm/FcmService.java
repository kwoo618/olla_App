package com.olla.olla_climbing.global.infra.fcm;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Slf4j
@Service
public class FcmService {

    /**
     * 💡 @Async: 메인 로직(스캔, 가입 등)과 별개의 스레드에서 작동하여 응답 속도에 영향을 주지 않음
     */
    @Async
    public void sendPushNotification(String fcmToken, String title, String content, String type, String targetId) {
        if (!StringUtils.hasText(fcmToken)) {
            log.warn("🔔 FCM 토큰이 존재하지 않아 푸시 발송을 생략합니다. (로그아웃 또는 미동의)");
            return;
        }

        try {
            Message message = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(content)
                            .build())
                    .putData("type", type != null ? type : "")
                    .putData("targetId", targetId != null ? targetId : "")
                    .build();

            // 실제 구글(FCM)/애플(APNs) 서버로 푸시 알림 전송 요청
            String response = FirebaseMessaging.getInstance().send(message);
            log.info("✅ FCM 푸시 발송 성공 - 응답: {}", response);

        } catch (Exception e) {
            // 💡 [iOS 완벽 방어막] 애플 APNs 연동이 안 되어 있어 예외가 터지더라도 여기서 조용히 처리됩니다.
            // 에러가 메인 서비스로 전파되지 않으므로 DB 롤백 등의 대참사가 발생하지 않습니다!
            log.error("⚠️ FCM 푸시 발송 실패 (메인 로직은 정상 유지됨) - 토큰: {}, 사유: {}", fcmToken, e.getMessage());
        }
    }
}