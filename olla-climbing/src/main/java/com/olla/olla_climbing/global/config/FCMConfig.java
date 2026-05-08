package com.olla.olla_climbing.global.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;

@Slf4j
@Configuration
public class FCMConfig {

    @PostConstruct
    public void init() {
        try {
            // resources/firebase 폴더 안에 키 파일을 넣어야 합니다.
            InputStream serviceAccount = new ClassPathResource("/firebase/firebase-service-account.json").getInputStream();

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
                log.info("FCM(Firebase Cloud Messaging) 초기화 성공!");
            }
        } catch (Exception e) {
            log.error("FCM 초기화 실패 (키 파일이 없거나 잘못되었습니다): {}", e.getMessage());
        }
    }
}