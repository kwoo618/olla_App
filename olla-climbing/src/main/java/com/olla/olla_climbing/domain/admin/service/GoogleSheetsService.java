package com.olla.olla_climbing.domain.admin.service;

import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.model.ValueRange;
import com.olla.olla_climbing.domain.admin.entity.Membership;
import com.olla.olla_climbing.domain.admin.enums.MembershipType;
import com.olla.olla_climbing.domain.member.entity.Member;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleSheetsService {

    private final Sheets sheetsService;

    @Value("${google.sheet.id}")
    private String spreadsheetId;

    private String getTodayStr() {
        return LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy. MM. dd"));
    }

    // =========================================================================
    // 1. [공통] 시트에 데이터 한 줄 추가 (Append)
    // =========================================================================
    private void appendRow(String sheetName, List<Object> rowData) {
        log.info("[구글 시트 전송 대기] 시트명: {}, 데이터: {}", sheetName, rowData);

        /* ----- 구글 시트 활성화 시 이 줄 삭제 -----
        try {
            String range = sheetName + "!A1";
            ValueRange body = new ValueRange().setValues(Collections.singletonList(rowData));
            sheetsService.spreadsheets().values()
                    .append(spreadsheetId, range, body)
                    .setValueInputOption("USER_ENTERED")
                    .execute();
            log.info("Google Sheet Append Success");
        } catch (IOException e) {
            log.error("Google Sheet API 에러 발생: ", e);
        }
        ----- 구글 시트 활성화 시 이 줄 삭제 ----- */
    }

    // =========================================================================
    // 2. [시트 1] 완전 신규 회원 가입 시 동기화
    // =========================================================================
    @Async
    public void syncNewMember(Member member) {
        String birthDateStr = member.getBirthDate() != null ? member.getBirthDate().format(DateTimeFormatter.ofPattern("yyyy. MM. dd")) : "";
        String createdAtStr = member.getCreatedAt() != null ? member.getCreatedAt().format(DateTimeFormatter.ofPattern("yyyy. MM. dd")) : getTodayStr();

        Double footSize = (member.getMemberDetail() != null) ? member.getMemberDetail().getFootSize() : null;
        String footSizeStr = (footSize != null) ? String.valueOf(footSize) : "";

        List<Object> rowData = List.of(
                member.getId(), member.getName(), member.getGender() != null ? member.getGender() : "",
                member.getPhone(), birthDateStr, "", createdAtStr, footSizeStr, ""
        );
        appendRow("올라클라이밍 회원정보", rowData);
    }

    // =========================================================================
    // 3. [시트 2] 신규 이용권 발급 시 동기화
    // =========================================================================
    @Async
    public void syncNewMembership(Membership membership, Integer addMonths, Integer addCount) {
        Member member = membership.getMember();
        String startDateStr = membership.getStartDate() != null ? membership.getStartDate().format(DateTimeFormatter.ofPattern("yyyy. MM. dd")) : "";
        String serviceAmount = membership.getMembershipType() == MembershipType.PERIOD ? addMonths + "개월" : addCount + "회";

        List<Object> rowData = List.of(
                member.getId(), member.getName(), member.getPhone(),
                membership.getMembershipType().getDescription(), serviceAmount, startDateStr,
                "", "", "", 0, "", "미수강", ""
        );
        appendRow("이용권 관리", rowData);
    }

    // =========================================================================
    // 4. [시트 2] QR 입장 시 최근방문일(I열) & 누적횟수(J열) 업데이트
    // =========================================================================
    @Async
    public void updateVisitData(Long memberId, String visitDateStr, Integer accumulatedVisits) {
        log.info("[구글 시트 업데이트 대기] 회원번호: {}, 최근방문일: {}, 누적횟수: {}", memberId, visitDateStr, accumulatedVisits);

        /* ----- 구글 시트 활성화 시 이 줄 삭제 -----
        try {
            int rowIndex = findRowIndexByMemberId("이용권 관리", memberId);
            if (rowIndex != -1) {
                String range = "이용권 관리!I" + rowIndex + ":J" + rowIndex;
                ValueRange body = new ValueRange().setValues(List.of(List.of(visitDateStr, accumulatedVisits)));
                sheetsService.spreadsheets().values()
                        .update(spreadsheetId, range, body)
                        .setValueInputOption("USER_ENTERED")
                        .execute();
            }
        } catch (Exception e) {
            log.error("시트 방문 데이터 업데이트 에러: ", e);
        }
        ----- 구글 시트 활성화 시 이 줄 삭제 ----- */
    }

    // =========================================================================
    // 5. [시트 2] 이용권 정지/해제 시 정지일(K열) 업데이트
    // =========================================================================
    @Async
    public void updateMembershipPauseDate(Long memberId, String pauseDateStr) {
        log.info("[구글 시트 업데이트 대기] 회원번호: {}, 정지일: {}", memberId, pauseDateStr);

        /* ----- 구글 시트 활성화 시 이 줄 삭제 -----
        try {
            int rowIndex = findRowIndexByMemberId("이용권 관리", memberId);
            if (rowIndex != -1) {
                String range = "이용권 관리!K" + rowIndex;
                ValueRange body = new ValueRange().setValues(List.of(List.of(pauseDateStr)));
                sheetsService.spreadsheets().values()
                        .update(spreadsheetId, range, body)
                        .setValueInputOption("USER_ENTERED")
                        .execute();
            }
        } catch (Exception e) {
            log.error("시트 정지일 업데이트 에러: ", e);
        }
        ----- 구글 시트 활성화 시 이 줄 삭제 ----- */
    }

    // 회원 ID로 몇 번째 줄인지 찾는 헬퍼 메서드
    private int findRowIndexByMemberId(String tabName, Long memberId) throws IOException {
        ValueRange response = sheetsService.spreadsheets().values().get(spreadsheetId, tabName + "!A:A").execute();
        List<List<Object>> values = response.getValues();
        if (values != null) {
            for (int i = 0; i < values.size(); i++) {
                List<Object> row = values.get(i);
                if (!row.isEmpty() && row.get(0).toString().equals(String.valueOf(memberId))) {
                    return i + 1; // 시트는 1행부터 시작하므로 +1
                }
            }
        }
        return -1;
    }
}