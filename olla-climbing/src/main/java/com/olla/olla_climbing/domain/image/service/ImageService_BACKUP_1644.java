package com.olla.olla_climbing.domain.image.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.UUID;

@Slf4j
@Service
public class ImageService {

    @Value("${file.upload-dir:./olla-uploads/}")
    private String uploadDir;

    public String uploadImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            return null;
        }

<<<<<<< HEAD
=======
        // [수정] getAbsoluteFile()로 절대경로 강제 변환
>>>>>>> b2d23702aed8f1cc6021b9f3390329cc27d14380
        // 상대경로 사용 시 Tomcat 임시폴더로 저장되는 버그 방지
        File directory = new File(uploadDir).getAbsoluteFile();

        if (!directory.exists()) {
            directory.mkdirs();
        }

        String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        String savedFileName = UUID.randomUUID().toString().substring(0, 8)
                + "_" + System.currentTimeMillis() + extension;

        try {
            File targetFile = new File(directory, savedFileName);
            file.transferTo(targetFile);
            log.info("이미지 저장 완료: {}", targetFile.getAbsolutePath());
            return "/images/" + savedFileName;
        } catch (IOException e) {
            log.error("이미지 저장 실패: ", e);
            throw new RuntimeException("이미지 저장에 실패했습니다.");
        }
    }
}