package com.olla.olla_climbing.domain.image.controller;

import com.olla.olla_climbing.global.infra.s3.S3ImageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/images")
@RequiredArgsConstructor
@Tag(name = "Image API", description = "AWS S3 이미지 업로드 API")
public class ImageController {

    private final S3ImageService s3ImageService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "단일 이미지 업로드", description = "사진 파일을 S3에 업로드하고 퍼블릭 URL을 반환합니다.")
    public Map<String, String> uploadImage(@RequestPart(value = "file") MultipartFile file) {

        // S3에 업로드 후 URL을 받아옴
        String imageUrl = s3ImageService.uploadImage(file);

        // Map에 담아서 반환하면 GlobalResponseAdvice가 ApiResponse로 자동 포장해줌
        return Map.of("imageUrl", imageUrl);
    }
}