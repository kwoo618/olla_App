package com.olla.olla_climbing.global.util;

import org.springframework.beans.factory.annotation.Value;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    // 기존 인증번호 발송 메서드
    public void sendVerificationCode(String toEmail, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setFrom(fromEmail);
        message.setSubject("[올라가자] 회원가입 인증번호 안내");
        message.setText("안녕하세요. 올라가자입니다.\n\n" +
                "회원가입을 위한 인증번호는 [" + code + "] 입니다.\n" +
                "5분 이내에 입력해주세요.");

        mailSender.send(message);
    }

    // 💡 추가된 메서드: 임시 비밀번호 발송
    public void sendTemporaryPassword(String toEmail, String tempPassword) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setFrom(fromEmail);
        message.setSubject("[올라가자] 임시 비밀번호 안내");
        message.setText("안녕하세요. 올라가자입니다.\n\n" +
                "회원가입시 등록하신 임시 비밀번호는 [" + tempPassword + "] 입니다.\n" +
                "로그인 후 마이페이지에서 반드시 비밀번호를 변경해주세요.");

        mailSender.send(message);
    }
} 