package com.olla.olla_climbing.global.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;

@Slf4j
@Configuration
public class FCMConfig {

    // 서버 배포 시 외부 파일 경로 사용
    // 로컬 개발 시 classpath의 파일 사용 (fallback)
    @Value("${firebase.credentials.path:}")
    private String firebaseCredentialsPath;

    @PostConstruct
    public void init() {
        try {
            InputStream serviceAccount;

            if (firebaseCredentialsPath != null && !firebaseCredentialsPath.isEmpty()) {
                // 운영 서버: 외부 파일 경로로 읽기
                File credFile = new File(firebaseCredentialsPath);
                if (!credFile.exists()) {
                    log.error("🚨 FCM 인증 파일을 찾을 수 없습니다: {}", firebaseCredentialsPath);
                    return;
                }
                serviceAccount = new FileInputStream(credFile);
                log.info("FCM 인증 파일 로드 (외부 경로): {}", firebaseCredentialsPath);
            } else {
                // 로컬 개발: classpath에서 읽기
                serviceAccount = new ClassPathResource("/firebase/firebase-service-account.json").getInputStream();
                log.info("FCM 인증 파일 로드 (classpath)");
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
                log.info("🚀 FCM(Firebase Cloud Messaging) 초기화 성공! 푸시 활성화됨.");
            }
        } catch (Exception e) {
            log.error("🚨 FCM 초기화 실패: {}", e.getMessage());
        }
    }
}