package com.olla.olla_climbing.global.config;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.SheetsScopes;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;

@Configuration
public class GoogleSheetsConfig {

    private static final String APPLICATION_NAME = "Olla Climbing Dashboard";
    private static final String CREDENTIALS_FILE_PATH = "google-credentials.json";

    @Bean
    public Sheets googleSheetsClient() throws IOException, GeneralSecurityException {
        // 1. resources 폴더에서 키 파일 읽기
        GoogleCredentials credentials = GoogleCredentials.fromStream(
                        new ClassPathResource(CREDENTIALS_FILE_PATH).getInputStream())
                .createScoped(Collections.singleton(SheetsScopes.SPREADSHEETS));

        // 2. 구글 시트 서비스 객체 빌드
        return new Sheets.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(credentials))
                .setApplicationName(APPLICATION_NAME)
                .build();
    }
}