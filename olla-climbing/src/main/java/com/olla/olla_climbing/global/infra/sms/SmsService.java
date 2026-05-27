package com.olla.olla_climbing.global.infra.sms;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import net.nurigo.sdk.NurigoApp;
import net.nurigo.sdk.message.model.Message;
import net.nurigo.sdk.message.request.SingleMessageSendingRequest;
import net.nurigo.sdk.message.response.SingleMessageSentResponse;
import net.nurigo.sdk.message.service.DefaultMessageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

// TODO: [출시 대비 리팩토링] 사용하지 않는 외부 API 통신 빈 등록 해제
@Slf4j
// @Service
public class SmsService {

    /* 기존 코드 전체 주석 처리

    @Value("${coolsms.api-key}")
    private String apiKey;

    @Value("${coolsms.api-secret}")
    private String apiSecret;

    @Value("${coolsms.sender-number}")
    private String senderNumber;

    private DefaultMessageService messageService;

    // 스프링 빈이 생성된 후 자동으로 솔라피 객체를 초기화합니다.
    @PostConstruct
    private void init() {
        this.messageService = NurigoApp.INSTANCE.initialize(apiKey, apiSecret, "https://api.solapi.com");
    }

    // 단건 문자 발송 기능
    public void sendSms(String to, String content) {
        Message message = new Message();
        // 발신번호 및 수신번호는 반드시 01012345678 형태로 입력되어야 합니다.
        message.setFrom(senderNumber);
        message.setTo(to.replaceAll("-", ""));
        message.setText(content);

        try {
            // 솔라피 API로 문자 전송 요청
            SingleMessageSentResponse response = this.messageService.sendOne(new SingleMessageSendingRequest(message));
            log.info("문자 발송 성공: 수신번호={}, 상태={}", to, response.getStatusCode());
        } catch (Exception e) {
            log.error("문자 발송 실패: 수신번호={}, 에러={}", to, e.getMessage());
            // 실무에서는 여기서 에러를 삼키지 않고 CustomException을 던져서 처리하기도 합니다.
            throw new RuntimeException("문자 발송 중 오류가 발생했습니다.", e);
        }
    }
    */
}