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
@Tag(name = "Image API", description = "서버 로컬 스토리지 이미지 호스팅 API (AWS 전면 대체)")
public class ImageController {

    private final ImageService imageService; // 리팩토링된 서비스 주입

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "단일 이미지 업로드", description = "사진 파일을 서버 로컬 디렉토리에 업로드하고 접근 가능한 상대 URL 주소를 반환합니다.")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadImage(@RequestPart(value = "file") MultipartFile file) {
        String imageUrl = imageService.uploadImage(file);

        // 프로젝트 글로벌 룰 북 규칙 준수: ApiResponse형태로 래핑하여 리턴
        return ResponseEntity.ok(ApiResponse.success(201, "이미지가 서버 로컬에 무결하게 적재되었습니다.", Map.of("imageUrl", imageUrl)));
    }
}