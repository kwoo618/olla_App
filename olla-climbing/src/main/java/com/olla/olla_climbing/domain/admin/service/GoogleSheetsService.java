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
                    "=ROW()-2", member.getId(), "", "",
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
    // 3. 이용권 부여 시 이용권 관리 시트 동기화 (항상 새 행 추가 - 이력 관리)
    // C열(이름), D열(연락처): XLOOKUP 수식 자동
    // I열(잔여일수): ARRAYFORMULA 수식 자동
    // O열(비고): ACTIVE/EXPIRED 상태 → 필터 뷰로 현황/이력 구분
    // ─────────────────────────────────────────────────────────────
    @Async
    public void syncNewMembership(Member member, Membership membership) {
        try {
            String typeDesc = membership.getMembershipTypeName();
            String serviceAmount = membership.getDurationMonth() != null
                    ? membership.getDurationMonth() + "개월" : "";
            int countValue = membership.getRemainingCount() != null
                    ? membership.getRemainingCount() : 0;
            String startDate = membership.getStartDate()
                    .format(DateTimeFormatter.ofPattern("yyyy. MM. dd"));
            String endDate = (membership.getEndDate() != null)
                    ? membership.getEndDate().format(DateTimeFormatter.ofPattern("yyyy. MM. dd")) : "";

            List<Object> rowData = List.of(
                    "=ROW()-2",      // A: No
                    member.getId(),  // B: 회원ID
                    "",              // C: 이름 (XLOOKUP 수식 자동)
                    "",              // D: 연락처 (XLOOKUP 수식 자동)
                    typeDesc,        // E: 이용권 종류
                    serviceAmount,   // F: 신청 서비스
                    startDate,       // G: 시작일
                    endDate,         // H: 종료일
                    "",              // I: 잔여 일수 (ARRAYFORMULA 수식 자동)
                    countValue,      // J: 일일권 갯수
                    "",              // K: 최근 방문일
                    0,               // L: 누적 방문 횟수
                    "",              // M: 이용권 정지일
                    "N",             // N: 기초강습 여부
                    "ACTIVE"         // O: 비고 (필터 뷰용)
            );

            appendRow("이용권 관리 시트", rowData);
            log.info("[Google Sheets] 이용권 이력 추가: memberId={}, 타입={}", member.getId(), typeDesc);

        } catch (Exception e) {
            log.error("[Google Sheets] 이용권 시트 동기화 실패: memberId={}, 사유={}", member.getId(), e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. 방문 데이터 업데이트 (K, L열) - ACTIVE 행 기준
    // ─────────────────────────────────────────────────────────────
    @Async
    public void updateVisitData(Long memberId, String visitDateStr, Integer accumulatedVisits) {
        try {
            int rowIndex = findActiveRowIndexByMemberId("이용권 관리 시트", memberId);
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
    // 5. 이용권 정지일 업데이트 (M열) - ACTIVE 행 기준
    // ─────────────────────────────────────────────────────────────
    @Async
    public void updateMembershipPauseDate(Long memberId, String pauseDateStr) {
        try {
            int rowIndex = findActiveRowIndexByMemberId("이용권 관리 시트", memberId);
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
    // 6. 이용권 정지 해제 업데이트 (H, M열) - ACTIVE 행 기준
    // ─────────────────────────────────────────────────────────────
    @Async
    public void unpauseMembershipData(Long memberId, String newEndDateStr) {
        try {
            int rowIndex = findActiveRowIndexByMemberId("이용권 관리 시트", memberId);
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
    // 7. 일일권 횟수 합산 시 J열 업데이트
    // ─────────────────────────────────────────────────────────────
    @Async
    public void updateCountInSheet(Long memberId, int remainingCount) {
        try {
            int rowIndex = findActiveRowIndexByMemberId("이용권 관리 시트", memberId);
            if (rowIndex != -1) {
                String range = "이용권 관리 시트!J" + rowIndex;
                ValueRange body = new ValueRange().setValues(List.of(List.of(remainingCount)));
                sheetsService.spreadsheets().values()
                        .update(spreadsheetId, range, body)
                        .setValueInputOption("USER_ENTERED").execute();
                log.info("[Google Sheets] 일일권 횟수 업데이트: memberId={}, 잔여={}회", memberId, remainingCount);
            }
        } catch (Exception e) {
            log.error("[Google Sheets] 일일권 횟수 업데이트 실패: memberId={}, 사유={}", memberId, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 8. 이용권 상태 업데이트 (O열) - ACTIVE/EXPIRED 구분용
    // ─────────────────────────────────────────────────────────────
    @Async
    public void updateMembershipStatus(Long memberId, String status) {
        try {
            int rowIndex = findActiveRowIndexByMemberId("이용권 관리 시트", memberId);
            if (rowIndex != -1) {
                String range = "이용권 관리 시트!O" + rowIndex;
                ValueRange body = new ValueRange().setValues(List.of(List.of(status)));
                sheetsService.spreadsheets().values()
                        .update(spreadsheetId, range, body)
                        .setValueInputOption("USER_ENTERED").execute();
                log.info("[Google Sheets] 이용권 상태 업데이트: memberId={}, status={}", memberId, status);
            }
        } catch (Exception e) {
            log.error("[Google Sheets] 이용권 상태 업데이트 실패: memberId={}, 사유={}", memberId, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // private 헬퍼: B열 스캔으로 회원ID의 첫 번째 행 반환 (회원정보 시트용)
    // ─────────────────────────────────────────────────────────────
    private int findRowIndexByMemberId(String tabName, Long memberId) throws IOException {
        ValueRange response = sheetsService.spreadsheets().values()
                .get(spreadsheetId, tabName + "!B:B").execute();
        List<List<Object>> values = response.getValues();
        if (values != null) {
            for (int i = 0; i < values.size(); i++) {
                if (i < 3) continue;
                List<Object> row = values.get(i);
                if (!row.isEmpty() && row.get(0).toString().equals(String.valueOf(memberId))) {
                    return i + 1;
                }
            }
        }
        return -1;
    }

    // ─────────────────────────────────────────────────────────────
    // private 헬퍼: O열이 ACTIVE인 가장 마지막 행 반환 (이용권 관리 시트용)
    // 회원 1명이 여러 이용권 행을 가질 수 있으므로 ACTIVE 상태인 행만 업데이트
    // ─────────────────────────────────────────────────────────────
    private int findActiveRowIndexByMemberId(String tabName, Long memberId) throws IOException {
        ValueRange response = sheetsService.spreadsheets().values()
                .get(spreadsheetId, tabName + "!B:O").execute();
        List<List<Object>> values = response.getValues();
        int lastMatchRow = -1;
        if (values != null) {
            for (int i = 0; i < values.size(); i++) {
                if (i < 3) continue;
                List<Object> row = values.get(i);
                if (row.size() < 2) continue;
                if (row.get(0).toString().equals(String.valueOf(memberId))) {
                    // O열(index=14)이 ACTIVE인 행만 대상
                    if (row.size() > 14 && "ACTIVE".equals(row.get(14).toString())) {
                        lastMatchRow = i + 1;
                    }
                }
            }
        }
        return lastMatchRow;
    }

    private int findFirstEmptyRow(String tabName) throws IOException {
        ValueRange response = sheetsService.spreadsheets().values()
                .get(spreadsheetId, tabName + "!B:B").execute();
        List<List<Object>> values = response.getValues();
        if (values == null || values.size() <= 3) return 4;
        int lastDataRow = 3;
        for (int i = 3; i < values.size(); i++) {
            List<Object> row = values.get(i);
            if (row != null && !row.isEmpty() && !row.get(0).toString().trim().isEmpty()) {
                lastDataRow = i + 1;
            }
        }
        return lastDataRow + 1;
    }
}
