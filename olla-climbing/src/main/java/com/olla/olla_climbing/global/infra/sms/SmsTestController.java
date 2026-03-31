package com.olla.olla_climbing.global.infra.sms;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/test/sms")
@RequiredArgsConstructor
@Tag(name = "Test API", description = "개발 환경 테스트용 API")
public class SmsTestController {

    private final SmsService smsService;

    @PostMapping
    @Operation(summary = "SMS 발송 테스트", description = "입력한 휴대폰 번호로 테스트 문자를 발송합니다.")
    public ResponseEntity<String> sendTestSms(
            @RequestParam("to") String to,
            @RequestParam("content") String content) {

        // 발송 로직 호출
        smsService.sendSms(to, content);

        return ResponseEntity.ok("테스트 문자 발송 요청이 완료되었습니다.");
    }
}