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

    private static final String MEMBER_SHEET = "회원 정보 시트";
    private static final String TICKET_SHEET = "이용권 관리 시트";

    private String getTodayStr() {
        return LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy. MM. dd"));
    }

    // ─────────────────────────────────────────────────────────────
    // [공통] 행 업데이트
    // ─────────────────────────────────────────────────────────────
    private void updateRow(String sheetName, int rowIndex, String range, List<Object> rowData) {
        try {
            ValueRange body = new ValueRange().setValues(List.of(rowData));
            sheetsService.spreadsheets().values()
                    .update(spreadsheetId, sheetName + "!" + range + rowIndex + ":" + range.charAt(range.length() - 1) + rowIndex, body)
                    .setValueInputOption("USER_ENTERED")
                    .execute();
        } catch (Exception e) {
            log.error("[Google Sheets] 행 업데이트 실패: 시트={}, row={}, 사유={}", sheetName, rowIndex, e.getMessage());
        }
    }

    private void updateCell(String sheetName, String cellRange, Object value) {
        try {
            ValueRange body = new ValueRange().setValues(List.of(List.of(value)));
            sheetsService.spreadsheets().values()
                    .update(spreadsheetId, sheetName + "!" + cellRange, body)
                    .setValueInputOption("USER_ENTERED")
                    .execute();
        } catch (Exception e) {
            log.error("[Google Sheets] 셀 업데이트 실패: 시트={}, 범위={}, 사유={}", sheetName, cellRange, e.getMessage());
        }
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
    // 1. 회원정보 시트 동기화 (1인 1행 덮어쓰기)
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
                    member.getPhone() != null ? member.getPhone() : "",
                    birthDateStr, "", createdAtStr, footSizeStr, remark, ""
            );

            int rowIndex = findRowIndexByMemberId(MEMBER_SHEET, member.getId());
            if (rowIndex != -1) {
                // 기존 행 덮어쓰기
                ValueRange body = new ValueRange().setValues(List.of(rowData));
                sheetsService.spreadsheets().values()
                        .update(spreadsheetId, MEMBER_SHEET + "!A" + rowIndex + ":K" + rowIndex, body)
                        .setValueInputOption("USER_ENTERED").execute();
                log.info("[Google Sheets] 회원정보 업데이트: memberId={}, row={}", member.getId(), rowIndex);
            } else {
                // 신규 행 추가
                appendRow(MEMBER_SHEET, rowData);
            }
        } catch (Exception e) {
            log.error("[Google Sheets] 회원정보 시트 동기화 실패: memberId={}, 사유={}", member.getId(), e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. 이용권 현황 시트 동기화 (1인 1행 덮어쓰기)
    // 회원권, 일일권 컬럼 분리 - 한 행에 둘 다 표시
    // ─────────────────────────────────────────────────────────────
    @Async
    public void syncMembershipStatus(Member member, Membership membership) {
        try {
            String startDate = membership.getStartDate() != null
                    ? membership.getStartDate().format(DateTimeFormatter.ofPattern("yyyy. MM. dd")) : "";
            String endDate = membership.getEndDate() != null
                    ? membership.getEndDate().format(DateTimeFormatter.ofPattern("yyyy. MM. dd")) : "";
            int countValue = membership.getRemainingCount() != null ? membership.getRemainingCount() : 0;
            String membershipType = membership.getDurationMonth() != null ? "회원권" : "일일권";

            int rowIndex = findRowIndexByMemberId(TICKET_SHEET, member.getId());

            if (rowIndex != -1) {
                // 기존 행 덮어쓰기
                if (membership.getDurationMonth() != null) {
                    // 회원권 컬럼만 업데이트 (E~H열)
                    ValueRange body = new ValueRange().setValues(List.of(List.of(
                            membershipType, membership.getDurationMonth() + "개월", startDate, endDate
                    )));
                    sheetsService.spreadsheets().values()
                            .update(spreadsheetId, TICKET_SHEET + "!E" + rowIndex + ":H" + rowIndex, body)
                            .setValueInputOption("USER_ENTERED").execute();
                } else {
                    // 일일권 컬럼만 업데이트 (J열)
                    updateCell(TICKET_SHEET, "J" + rowIndex, countValue);
                }
                log.info("[Google Sheets] 이용권 현황 업데이트: memberId={}", member.getId());
            } else {
                // 신규 행 추가
                List<Object> rowData = List.of(
                        "=ROW()-2", member.getId(), member.getName(), member.getPhone() != null ? member.getPhone() : "",
                        membershipType,
                        membership.getDurationMonth() != null ? membership.getDurationMonth() + "개월" : "",
                        startDate, endDate, "", countValue, "", 0, "", "N", "ACTIVE"
                );
                appendRow(TICKET_SHEET, rowData);
            }
        } catch (Exception e) {
            log.error("[Google Sheets] 이용권 현황 동기화 실패: memberId={}, 사유={}", member.getId(), e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. 미등록 회원 이용권 시트 동기화
    // ─────────────────────────────────────────────────────────────
    @Async
    public void syncUnregisteredMember(Member member) {
        try {
            int rowIndex = findRowIndexByMemberId(TICKET_SHEET, member.getId());
            if (rowIndex == -1) {
                List<Object> rowData = List.of(
                        "=ROW()-2", member.getId(), member.getName(),
                        member.getPhone() != null ? member.getPhone() : "",
                        "미등록", "", "", "", "", 0, "", 0, "", "N", ""
                );
                appendRow(TICKET_SHEET, rowData);
            }
        } catch (Exception e) {
            log.error("[Google Sheets] 미등록 회원 시트 생성 실패: memberId={}, 사유={}", member.getId(), e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. 방문 데이터 업데이트 (K, L열)
    // ─────────────────────────────────────────────────────────────
    @Async
    public void updateVisitData(Long memberId, String visitDateStr, Integer accumulatedVisits) {
        try {
            int rowIndex = findRowIndexByMemberId(TICKET_SHEET, memberId);
            if (rowIndex != -1) {
                ValueRange body = new ValueRange().setValues(List.of(List.of(visitDateStr, accumulatedVisits)));
                sheetsService.spreadsheets().values()
                        .update(spreadsheetId, TICKET_SHEET + "!K" + rowIndex + ":L" + rowIndex, body)
                        .setValueInputOption("USER_ENTERED").execute();
            }
        } catch (Exception e) {
            log.error("[Google Sheets] 방문 데이터 업데이트 실패: memberId={}, 사유={}", memberId, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 5. 일일권 횟수 업데이트 (J열)
    // ─────────────────────────────────────────────────────────────
    @Async
    public void updateCountInSheet(Long memberId, int remainingCount) {
        try {
            int rowIndex = findRowIndexByMemberId(TICKET_SHEET, memberId);
            if (rowIndex != -1) {
                updateCell(TICKET_SHEET, "J" + rowIndex, remainingCount);
                log.info("[Google Sheets] 일일권 횟수 업데이트: memberId={}, 잔여={}회", memberId, remainingCount);
            }
        } catch (Exception e) {
            log.error("[Google Sheets] 일일권 횟수 업데이트 실패: memberId={}, 사유={}", memberId, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 6. 이용권 정지일 업데이트 (M열) + 상태 HOLDING
    // ─────────────────────────────────────────────────────────────
    @Async
    public void updateMembershipPauseDate(Long memberId, String pauseDateStr) {
        try {
            int rowIndex = findRowIndexByMemberId(TICKET_SHEET, memberId);
            if (rowIndex != -1) {
                ValueRange body = new ValueRange().setValues(List.of(List.of(pauseDateStr)));
                sheetsService.spreadsheets().values()
                        .update(spreadsheetId, TICKET_SHEET + "!M" + rowIndex + ":M" + rowIndex, body)
                        .setValueInputOption("USER_ENTERED").execute();
                updateCell(TICKET_SHEET, "O" + rowIndex, "HOLDING");
            }
        } catch (Exception e) {
            log.error("[Google Sheets] 정지일 업데이트 실패: memberId={}, 사유={}", memberId, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 7. 이용권 정지 해제 (H열 종료일 연장 + M열 초기화 + 상태 ACTIVE)
    // ─────────────────────────────────────────────────────────────
    @Async
    public void unpauseMembershipData(Long memberId, String newEndDateStr) {
        try {
            int rowIndex = findRowIndexByMemberId(TICKET_SHEET, memberId);
            if (rowIndex != -1) {
                ValueRange body = new ValueRange().setValues(
                        List.of(List.of(newEndDateStr, "", "", "", "", "")));
                sheetsService.spreadsheets().values()
                        .update(spreadsheetId, TICKET_SHEET + "!H" + rowIndex + ":M" + rowIndex, body)
                        .setValueInputOption("USER_ENTERED").execute();
                updateCell(TICKET_SHEET, "O" + rowIndex, "ACTIVE");
            }
        } catch (Exception e) {
            log.error("[Google Sheets] 정지 해제 업데이트 실패: memberId={}, 사유={}", memberId, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 8. 이용권 상태 업데이트 (O열) - ACTIVE/EXPIRED/HOLDING
    // ─────────────────────────────────────────────────────────────
    @Async
    public void updateMembershipStatus(Long memberId, String status) {
        try {
            int rowIndex = findRowIndexByMemberId(TICKET_SHEET, memberId);
            if (rowIndex != -1) {
                updateCell(TICKET_SHEET, "O" + rowIndex, status);
                log.info("[Google Sheets] 이용권 상태 업데이트: memberId={}, status={}", memberId, status);
            }
        } catch (Exception e) {
            log.error("[Google Sheets] 이용권 상태 업데이트 실패: memberId={}, 사유={}", memberId, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // private 헬퍼: B열 스캔으로 회원ID 행 번호 탐색
    // ─────────────────────────────────────────────────────────────
    private int findRowIndexByMemberId(String tabName, Long memberId) throws IOException {
        ValueRange response = sheetsService.spreadsheets().values()
                .get(spreadsheetId, tabName + "!B:B").execute();
        List<List<Object>> values = response.getValues();
        if (values != null) {
            for (int i = 0; i < values.size(); i++) {
                if (i < 3) continue; // 1행(제목), 2행(헤더), 3행(수식예시) 스킵
                List<Object> row = values.get(i);
                if (row.isEmpty()) continue;
                String cellValue = row.get(0).toString().trim();
                if (cellValue.endsWith(".0")) {
                    cellValue = cellValue.substring(0, cellValue.length() - 2);
                }
                if (cellValue.equals(String.valueOf(memberId))) {
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