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
        if (file == null || file.isEmpty() || file.getOriginalFilename() == null) {
            throw new IllegalArgumentException("업로드할 파일이 비어있습니다.");
        }

        File directory = new File(uploadDir);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        // UUID + timestamp 조합으로 파일명 중복 방지
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