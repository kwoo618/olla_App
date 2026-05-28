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

    // 비동기 처리: 푸시 발송 실패가 메인 비즈니스 로직에 영향을 주지 않도록 별도 스레드에서 실행
    @Async
    public void sendPushNotification(String fcmToken, String title, String content,
                                     String type, String targetId) {
        if (!StringUtils.hasText(fcmToken)) {
            log.debug("FCM 토큰 없음 - 푸시 발송 생략 (로그아웃 또는 토큰 미등록)");
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

            String response = FirebaseMessaging.getInstance().send(message);
            log.debug("FCM 푸시 발송 성공: {}", response);

        } catch (Exception e) {
            // FCM 실패가 메인 트랜잭션 롤백으로 이어지지 않도록 예외를 삼킴
            log.error("FCM 푸시 발송 실패 - 토큰: {}, 사유: {}", fcmToken, e.getMessage());
        }
    }
}