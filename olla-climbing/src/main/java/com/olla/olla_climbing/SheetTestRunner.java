package com.olla.olla_climbing;

import com.olla.olla_climbing.domain.admin.service.GoogleSheetsService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

// 시트 연동을 테스트하기 위한 ApplicationRunner 구현체입니다.
// 사용하고 지우기
@Component
@RequiredArgsConstructor
public class SheetTestRunner implements ApplicationRunner {
    private final GoogleSheetsService sheetsService;
    @Override
    public void run(ApplicationArguments args) {
        sheetsService.appendRow("회원목록", List.of("서버시작", "테스트", "성공!"));
    }
}