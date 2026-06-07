package com.olla.olla_climbing.domain.admin.service;

import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.model.ValueRange;
import com.olla.olla_climbing.domain.admin.entity.Membership;
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

    // ─────────────────────────────────────────────────────────────
    // [공통] 시트에 데이터 한 줄 추가
    // 구글 시트는 핵심 비즈니스 로직이 아니므로 실패해도 예외를 전파하지 않음
    // 실패 시 log.error 기록 후 조용히 종료 (Fail-Safe)
    // ─────────────────────────────────────────────────────────────
    private void appendRow(String sheetName, List<Object> rowData) {
        try {
            int emptyRowIdx = findFirstEmptyRow(sheetName);
            String range = sheetName + "!A" + emptyRowIdx;

            ValueRange body = new ValueRange().setValues(Collections.singletonList(rowData));
            sheetsService.spreadsheets().values()
                    .update(spreadsheetId, range, body)
                    .setValueInputOption("USER_ENTERED")
                    .execute();

            log.info("[Google Sheets] 행 추가 성공: 시트={}, row={}", sheetName, emptyRowIdx);
        } catch (Exception e) {
            log.error("[Google Sheets] 행 추가 실패: 시트={}, 사유={}", sheetName, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 1. 신규 회원 가입 시 회원정보 시트 동기화
    // ─────────────────────────────────────────────────────────────
    @Async
    public void syncNewMember(Member member) {
        try {
            String birthDateStr = member.getBirthDate() != null
                    ? member.getBirthDate().format(DateTimeFormatter.ofPattern("yyyy. MM. dd")) : "";
            String createdAtStr = member.getCreatedAt() != null
                    ? member.getCreatedAt().format(DateTimeFormatter.ofPattern("yyyy. MM. dd")) : getTodayStr();

            Double footSize = (member.getMemberDetail() != null) ? member.getMemberDetail().getFootSize() : null;
            String footSizeStr = (footSize != null) ? String.valueOf(footSize) : "";
            String remark = (member.getLoginId() == null) ? "오프라인 회원" : "앱 가입 회원";

            List<Object> rowData = List.of(
                    "=ROW()-2", member.getId(), member.getName(),
                    member.getGender() != null ? member.getGender() : "",
                    member.getPhone(), birthDateStr, "", createdAtStr,
                    footSizeStr, remark, ""
            );

            int rowIndex = findRowIndexByMemberId("회원 정보 시트", member.getId());
            if (rowIndex != -1) {
                String range = "회원 정보 시트!A" + rowIndex + ":K" + rowIndex;
                ValueRange body = new ValueRange().setValues(List.of(rowData));
                sheetsService.spreadsheets().values()
                        .update(spreadsheetId, range, body)
                        .setValueInputOption("USER_ENTERED").execute();
            } else {
                appendRow("회원 정보 시트", rowData);
            }
        } catch (Exception e) {
            log.error("[Google Sheets] 회원정보 시트 동기화 실패: memberId={}, 사유={}", member.getId(), e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. 미등록 회원 이용권 관리 시트 동기화
    // ─────────────────────────────────────────────────────────────
    @Async
    public void syncUnregisteredMember(Member member) {
        try {
            List<Object> rowData = List.of(
                    "=ROW()-2", member.getId(), member.getName(), member.getPhone(),
                    "미등록", "", "", "", "", 0, "", 0, "", "N", ""
            );

            int rowIndex = findRowIndexByMemberId("이용권 관리 시트", member.getId());
            if (rowIndex == -1) {
                appendRow("이용권 관리 시트", rowData);
            }
        } catch (Exception e) {
            log.error("[Google Sheets] 미등록 회원 시트 생성 실패: memberId={}, 사유={}", member.getId(), e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. 이용권 부여 시 이용권 관리 시트 동기화
    // F열(신청서비스): 기간권 개월수만 기록 (예: "3개월"), 일일권만이면 공란
    // J열(일일권개수): 일일권 잔여 횟수만 기록, 기간권이면 0
    // ─────────────────────────────────────────────────────────────
    @Async
    public void syncNewMembership(Member member, Membership membership) {
        try {
            String typeDesc = membership.getMembershipTypeName(); // 회원권 / 일일권 / 회원권+일일권
            // F열: 기간권 개월수만 (일일권만 있으면 공란)
            String serviceAmount = membership.getDurationMonth() != null
                    ? membership.getDurationMonth() + "개월" : "";
            // J열: 일일권 잔여 횟수 (기간권만 있으면 0)
            int countValue = membership.getRemainingCount() != null ? membership.getRemainingCount() : 0;

            String startDate = membership.getStartDate().format(DateTimeFormatter.ofPattern("yyyy. MM. dd"));
            String endDate = (membership.getEndDate() != null)
                    ? membership.getEndDate().format(DateTimeFormatter.ofPattern("yyyy. MM. dd")) : "";

            List<Object> rowData = List.of(
                    "", member.getId(), member.getName(), member.getPhone(),
                    typeDesc, serviceAmount, startDate, endDate, "",
                    countValue, "", 0, "", "N", "ACTIVE"
            );

            int rowIndex = findRowIndexByMemberId("이용권 관리 시트", member.getId());
            if (rowIndex != -1) {
                String range = "이용권 관리 시트!B" + rowIndex + ":O" + rowIndex;
                ValueRange body = new ValueRange().setValues(List.of(rowData.subList(1, rowData.size())));
                sheetsService.spreadsheets().values()
                        .update(spreadsheetId, range, body)
                        .setValueInputOption("USER_ENTERED").execute();
            } else {
                appendRow("이용권 관리 시트", rowData);
            }
        } catch (Exception e) {
            log.error("[Google Sheets] 이용권 시트 동기화 실패: memberId={}, 사유={}", member.getId(), e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. 방문 데이터 업데이트 (K, L열)
    // ─────────────────────────────────────────────────────────────
    @Async
    public void updateVisitData(Long memberId, String visitDateStr, Integer accumulatedVisits) {
        try {
            int rowIndex = findRowIndexByMemberId("이용권 관리 시트", memberId);
            if (rowIndex != -1) {
                String range = "이용권 관리 시트!K" + rowIndex + ":L" + rowIndex;
                ValueRange body = new ValueRange().setValues(List.of(List.of(visitDateStr, accumulatedVisits)));
                sheetsService.spreadsheets().values()
                        .update(spreadsheetId, range, body)
                        .setValueInputOption("USER_ENTERED").execute();
            }
        } catch (Exception e) {
            log.error("[Google Sheets] 방문 데이터 업데이트 실패: memberId={}, 사유={}", memberId, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 5. 이용권 정지일 업데이트 (M열)
    // ─────────────────────────────────────────────────────────────
    @Async
    public void updateMembershipPauseDate(Long memberId, String pauseDateStr) {
        try {
            int rowIndex = findRowIndexByMemberId("이용권 관리 시트", memberId);
            if (rowIndex != -1) {
                String range = "이용권 관리 시트!M" + rowIndex + ":M" + rowIndex;
                ValueRange body = new ValueRange().setValues(List.of(List.of(pauseDateStr)));
                sheetsService.spreadsheets().values()
                        .update(spreadsheetId, range, body)
                        .setValueInputOption("USER_ENTERED").execute();
            }
        } catch (Exception e) {
            log.error("[Google Sheets] 정지일 업데이트 실패: memberId={}, 사유={}", memberId, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 6. 이용권 정지 해제 업데이트 (H, M열)
    // ─────────────────────────────────────────────────────────────
    @Async
    public void unpauseMembershipData(Long memberId, String newEndDateStr) {
        try {
            int rowIndex = findRowIndexByMemberId("이용권 관리 시트", memberId);
            if (rowIndex != -1) {
                String range = "이용권 관리 시트!H" + rowIndex + ":M" + rowIndex;
                ValueRange body = new ValueRange().setValues(
                        List.of(List.of(newEndDateStr, "", "", "", "", "")));
                sheetsService.spreadsheets().values()
                        .update(spreadsheetId, range, body)
                        .setValueInputOption("USER_ENTERED").execute();
            }
        } catch (Exception e) {
            log.error("[Google Sheets] 정지 해제 업데이트 실패: memberId={}, 사유={}", memberId, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // private 헬퍼: B열 전체 스캔으로 회원 ID의 행 번호 탐색
    // ─────────────────────────────────────────────────────────────
    private int findRowIndexByMemberId(String tabName, Long memberId) throws IOException {
        ValueRange response = sheetsService.spreadsheets().values()
                .get(spreadsheetId, tabName + "!B:B").execute();
        List<List<Object>> values = response.getValues();
        if (values != null) {
            for (int i = 0; i < values.size(); i++) {
                // 1행(제목), 2행(헤더), 3행(수식 예시) 스킵 → 4행(index=3)부터 탐색
                if (i < 3) continue;
                List<Object> row = values.get(i);
                if (!row.isEmpty() && row.get(0).toString().equals(String.valueOf(memberId))) {
                    return i + 1; // 1-based row number
                }
            }
        }
        return -1;
    }

    private int findFirstEmptyRow(String tabName) throws IOException {
        ValueRange response = sheetsService.spreadsheets().values()
                .get(spreadsheetId, tabName + "!B:B").execute();
        List<List<Object>> values = response.getValues();

        // 데이터가 없거나 헤더/수식 행만 있으면 4행부터 시작
        if (values == null || values.size() <= 3) return 4;

        int lastDataRow = 3; // 3행은 수식 예시 행이므로 최소 4행부터
        for (int i = 3; i < values.size(); i++) { // 4행(index=3)부터 탐색
            List<Object> row = values.get(i);
            if (row != null && !row.isEmpty() && !row.get(0).toString().trim().isEmpty()) {
                lastDataRow = i + 1;
            }
        }
        return lastDataRow + 1;
    }
}