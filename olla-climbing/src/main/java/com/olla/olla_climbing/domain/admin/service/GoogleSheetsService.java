package com.olla.olla_climbing.domain.admin.service;

import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.model.ValueRange;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleSheetsService {

    private final Sheets sheetsService;

    @Value("${google.sheet.id}") // application.yml에 등록할 ID
    private String spreadsheetId;

    /**
     * 특정 시트에 데이터를 한 줄 추가(Append)합니다.
     * @param sheetName 시트 탭 이름 (예: "회원목록")
     * @param rowData 추가할 데이터 리스트 (컬럼 순서대로)
     */
    @Async
    public void appendRow(String sheetName, List<Object> rowData) {
        /* ----- 구글 시트 세팅 완료 전까지 임시 비활성화 -----
        try {

            // A열부터 시작하여 데이터가 있는 마지막 행 다음에 추가
            String range = sheetName + "!A1";

            ValueRange body = new ValueRange()
                    .setValues(Collections.singletonList(rowData));

            sheetsService.spreadsheets().values()
                    .append(spreadsheetId, range, body)
                    .setValueInputOption("USER_ENTERED") // 날짜나 숫자를 문자열이 아닌 데이터로 인식
                    .execute();

            log.info("Google Sheet Append Success: {}", rowData);
        } catch (IOException e) {
            log.error("Google Sheet API 에러 발생: ", e);
            // 메인 로직에 지장을 주지 않도록 예외를 다시 던지지 않고 로그만 남김
        }---------------------------------------------------- */
        log.info("구글 시트 전송 임시 비활성화 상태입니다. 데이터: {}", rowData);
    }
}