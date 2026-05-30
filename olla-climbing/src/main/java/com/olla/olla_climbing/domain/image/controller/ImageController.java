package com.olla.olla_climbing.domain.image.controller;

import com.olla.olla_climbing.domain.image.service.ImageService;
import com.olla.olla_climbing.global.common.ApiResponse;
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
@Tag(name = "Image API")
public class ImageController {

    private final ImageService imageService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "단일 이미지 업로드")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadImage(
            @RequestPart(value = "file", required = false) MultipartFile file) {
        String imageUrl = imageService.uploadImage(file);
        if (imageUrl == null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, "업로드할 파일이 없습니다."));
        }
        return ResponseEntity.ok(ApiResponse.success(201, "이미지 업로드 성공", Map.of("imageUrl", imageUrl)));
    }
}