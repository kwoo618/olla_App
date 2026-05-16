package com.olla.olla_climbing.domain.image.controller;

import com.olla.olla_climbing.global.common.ApiResponse;
import com.olla.olla_climbing.global.infra.s3.S3ImageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
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
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadImage(@RequestPart(value = "file") MultipartFile file) {
        String imageUrl = s3ImageService.uploadImage(file);
        return ResponseEntity.ok(ApiResponse.success(201, "이미지가 성공적으로 업로드되었습니다.", Map.of("imageUrl", imageUrl)));
    }
}