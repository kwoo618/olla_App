package com.olla.olla_climbing.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${file.upload-dir:./olla-uploads/}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 절대 경로 변환 프로세스 구축 (리눅스 실서버 환경 방어벽)
        String absolutePath = new File(uploadDir).getAbsolutePath() + File.separator;

        // 외부에서 /images/** 주소로 접근하면, 서버 내부 하드디스크의 uploadDir 폴더로 연결합니다.
        registry.addResourceHandler("/images/**")
                .addResourceLocations("file:" + absolutePath);
    }
}