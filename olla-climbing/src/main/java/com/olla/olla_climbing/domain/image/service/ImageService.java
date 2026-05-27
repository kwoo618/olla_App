package com.olla.olla_climbing.domain.image.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.UUID;

@Service
@Slf4j
public class ImageService {

    @Value("${file.upload-dir:./olla-uploads/}")
    private String uploadDir;

    public String uploadImage(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getOriginalFilename() == null) {
            throw new IllegalArgumentException("업로드할 파일이 비어있습니다.");
        }

        // 1. 물리 저장 디렉토리 존재 유무 검증 및 자동 생성
        File directory = new File(uploadDir);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        // 2. 파일명 난수화 조합 (UUID 기반 중복 파일명 덮어쓰기 차단)
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        String savedFileName = UUID.randomUUID().toString().substring(0, 8) + "_" + System.currentTimeMillis() + extension;

        try {
            // 3. 서버 하드디스크 디렉토리에 멀티파트 파일 물리 적재 실행
            File targetFile = new File(directory, savedFileName);
            file.transferTo(targetFile);

            log.info("로컬 미디어 적재 완료: {}", targetFile.getAbsolutePath());

            // 4. DB에 저장 및 프론트엔드가 '1번 설정'을 통해 호출할 상대 경로 URL 반환
            // 예시 리턴값: /images/abcde123_171234567.png
            return "/images/" + savedFileName;

        } catch (IOException e) {
            log.error("서버 로컬 디렉토리 파일 입출력(IO) 장애 터짐: ", e);
            throw new RuntimeException("이미지 저장 프로세스 실패");
        }
    }
}