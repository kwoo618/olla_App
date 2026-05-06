package com.olla.olla_climbing.global.util;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    // 임시 비밀번호 이메일 발송
    public void sendTemporaryPassword(String toEmail, String tempPassword) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setFrom("your-email@gmail.com"); // 설정파일(yml)의 계정과 일치해야 함
        message.setSubject("[올라가자] 임시 비밀번호 안내");
        message.setText("안녕하세요. 올라가자입니다.\n\n" +
                "회원님의 임시 비밀번호는 [" + tempPassword + "] 입니다.\n" +
                "로그인 후 마이페이지에서 반드시 비밀번호를 변경해주세요.");

        mailSender.send(message);
    }
}