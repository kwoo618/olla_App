package com.olla.olla_climbing.global.infra.fcm;

import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.ApnsConfig;
import com.google.firebase.messaging.Aps;
import com.google.firebase.messaging.ApsAlert;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Slf4j
@Service
public class FcmService {

    @Async
    public void sendPushNotification(String fcmToken, String title, String content,
                                     String type, String targetId) {
        if (!StringUtils.hasText(fcmToken)) {
            log.debug("FCM 토큰 없음 - 푸시 발송 생략");
            return;
        }

        try {
            // data-only 메시지: Notifee가 포그라운드/백그라운드 모두 완전 제어
            // AndroidNotification, ApsAlert 제거 → OS 자동 배너 차단
            Message message = Message.builder()
                    .setToken(fcmToken)
                    .putData("title", title != null ? title : "")
                    .putData("body", content != null ? content : "")
                    .putData("type", type != null ? type : "")
                    .putData("targetId", targetId != null ? targetId : "")
                    .setAndroidConfig(AndroidConfig.builder()
                            .setPriority(AndroidConfig.Priority.HIGH)
                            .build())
                    .setApnsConfig(ApnsConfig.builder()
                            .putHeader("apns-priority", "10")
                            .setAps(Aps.builder()
                                    .setContentAvailable(true)
                                    .setAlert(ApsAlert.builder()
                                            .setTitle(title != null ? title : "")
                                            .setBody(content != null ? content : "")
                                            .build())
                                    .setSound("default")
                                    .build())
                            .build())
                    .build();

            String response = FirebaseMessaging.getInstance().send(message);
            log.debug("FCM 푸시 발송 성공: {}", response);

        } catch (Exception e) {
            log.error("FCM 푸시 발송 실패 - 토큰: {}, 사유: {}", fcmToken, e.getMessage());
        }
    }
}