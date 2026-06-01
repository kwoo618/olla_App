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

    // 이유: 공지사항 등 이미지가 선택사항인 API에서 파일 없이 요청 시 500 에러 발생
    public String uploadImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            return null;
        }

        File directory = new File(uploadDir);
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