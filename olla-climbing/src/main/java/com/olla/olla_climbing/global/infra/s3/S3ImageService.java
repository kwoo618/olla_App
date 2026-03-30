package com.olla.olla_climbing.global.infra.s3;

import io.awspring.cloud.s3.ObjectMetadata;
import io.awspring.cloud.s3.S3Template;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class S3ImageService {

    private final S3Template s3Template;

    // application-secret.yml에 적어둔 버킷 이름을 가져옴
    @Value("${spring.cloud.aws.s3.bucket}")
    private String bucketName;

    public String uploadImage(MultipartFile file) {
        if (file.isEmpty() || file.getOriginalFilename() == null) {
            throw new IllegalArgumentException("업로드할 파일이 비어있습니다.");
            // 팁: 이전에 만든 CustomException(ErrorCode.INVALID_INPUT_VALUE)을 써도 좋음
        }

        // 1. 파일명 중복 방지 (난수 생성)
        // 유저들이 똑같은 이름(image.png)으로 사진을 올리면 덮어씌워지기 때문에, 파일명 앞에 랜덤 문자를 붙여줍니다.
        String originalFilename = file.getOriginalFilename();
        String s3FileName = UUID.randomUUID().toString().substring(0, 8) + "_" + originalFilename;

        try {
            // 2. 브라우저에서 다운로드되지 않고 화면에 바로 보이도록 Content-Type 설정 (필수!)
            ObjectMetadata metadata = ObjectMetadata.builder()
                    .contentType(file.getContentType())
                    .build();

            // 3. S3 서버로 파일 전송 (마법처럼 한 줄로 끝납니다)
            var s3Resource = s3Template.upload(bucketName, s3FileName, file.getInputStream(), metadata);

            // 4. 업로드 완료 후, 프론트엔드가 사용할 수 있는 퍼블릭 URL 반환
            return s3Resource.getURL().toString();

        } catch (IOException e) {
            // S3 통신 중 에러가 발생한 경우
            throw new RuntimeException("S3 이미지 업로드에 실패했습니다.", e);
        }
    }
}