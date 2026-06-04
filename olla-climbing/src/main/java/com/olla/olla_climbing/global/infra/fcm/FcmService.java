package com.olla.olla_climbing.global.infra.fcm;

import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.AndroidNotification;
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
            Message message = Message.builder()
                    .setToken(fcmToken)
                    // data: 앱에서 타입/ID 기반 딥링크 처리용
                    .putData("title", title != null ? title : "")
                    .putData("body", content != null ? content : "")
                    .putData("type", type != null ? type : "")
                    .putData("targetId", targetId != null ? targetId : "")

                    // Android: 포그라운드는 앱이 처리, 백그라운드/종료 시 OS 자동 표시
                    .setAndroidConfig(AndroidConfig.builder()
                            .setPriority(AndroidConfig.Priority.HIGH)
                            .setNotification(AndroidNotification.builder()
                                    .setTitle(title)
                                    .setBody(content)
                                    .setChannelId("olla_default_channel")
                                    .build())
                            .build())

                    // iOS: content_available=true로 백그라운드/종료 상태에서도 수신 가능
                    // 포그라운드는 앱(Notifee)이 처리, 백그라운드/종료는 APS alert로 OS 자동 표시
                    .setApnsConfig(ApnsConfig.builder()
                            .putHeader("apns-priority", "10")
                            .setAps(Aps.builder()
                                    .setAlert(ApsAlert.builder()
                                            .setTitle(title)
                                            .setBody(content)
                                            .build())
                                    .setSound("default")
                                    .setContentAvailable(true) // 종료 상태에서도 백그라운드 핸들러 실행
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