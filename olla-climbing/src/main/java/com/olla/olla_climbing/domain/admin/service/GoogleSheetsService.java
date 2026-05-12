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
import java.util.List;

/*
 * 🚨 [팀원 필독: 구글 시트 연동 비활성화 상태] 🚨
 * 현재 서버 에러(Google Credentials Missing)를 방지하기 위해 실제 API 호출 코드는 주석 처리(안전 잠금)되어 있습니다.
 * 구글 클라우드 세팅이 완료되고 실제 연동 테스트를 진행할 때만 주석을 해제하세요.
 *
 * [주석 해제 방법]
 * 총 5개의 메서드(appendRow, updateVisitData, updateMembershipPauseDate, unpauseMembershipData, findRowIndexByMemberId) 내부에 있는
 * '/* ----- 구글 시트 활성화 시 이 줄 삭제 -----' 부터
 * '----- 구글 시트 활성화 시 이 줄 삭제 ----- * /' 까지의 범위를 지워주시면 즉시 시트로 데이터가 전송됩니다.
 */
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
    // 1. [공통] 시트에 데이터 한 줄 추가 (Update 강제 덮어쓰기 방식)
    // =========================================================================
    private void appendRow(String sheetName, List<Object> rowData) {
        log.info("[구글 시트 전송 대기] 시트명: {}, 데이터: {}", sheetName, rowData);

        /* ----- 구글 시트 활성화 시 이 줄 삭제 -----
        try {
            int emptyRowIdx = findFirstEmptyRow(sheetName);
            String range = sheetName + "!A" + emptyRowIdx;

            ValueRange body = new ValueRange().setValues(Collections.singletonList(rowData));
            sheetsService.spreadsheets().values()
                    .update(spreadsheetId, range, body)
                    .setValueInputOption("USER_ENTERED")
                    .execute();
            log.info("Google Sheet Insert Success at row: {}", emptyRowIdx);
        } catch (Exception e) {
            log.error("Google Sheets 행 추가 중 치명적 오류 발생: {}", e.getMessage(), e);
            throw new RuntimeException("구글 시트 연동 실패", e);
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
        String remark = (member.getLoginId() == null) ? "오프라인 회원" : "앱 가입 회원";

        List<Object> rowData = List.of(
                "=ROW()-2", member.getId(), member.getName(),
                member.getGender() != null ? member.getGender() : "",
                member.getPhone(), birthDateStr, "", createdAtStr, footSizeStr, remark
        );
        appendRow("올라클라이밍 회원정보", rowData);
    }

    // =========================================================================
    // 3. [시트 2] 미등록 회원 생성 및 이용권 결제 동기화
    // =========================================================================
    @Async
    public void syncUnregisteredMember(Member member) {
        List<Object> rowData = List.of(
                "=ROW()-2", member.getId(), "", "",
                "미등록", "", "",
                "", "", "", 0, "", "", ""
        );
        appendRow("이용권 관리", rowData);
    }

    @Async
    public void syncNewMembership(Member member, Membership membership) {
        String typeStr = "PERIOD".equals(membership.getMembershipTypeName()) ? "기간권" : "횟수권";
        String amountStr = "PERIOD".equals(membership.getMembershipTypeName())
                ? membership.getDurationMonth() + "개월"
                : membership.getRemainingCount() + "회";

        /* ----- 구글 시트 활성화 시 이 줄 삭제 -----
        try {
            int rowIndex = findRowIndexByMemberId("이용권 관리", member.getId());
            if (rowIndex != -1) {
                String range = "이용권 관리!E" + rowIndex + ":G" + rowIndex;
                List<Object> updateData = List.of(typeDesc, serviceAmount, startDateStr);
                ValueRange body = new ValueRange().setValues(List.of(updateData));
                sheetsService.spreadsheets().values().update(spreadsheetId, range, body).setValueInputOption("USER_ENTERED").execute();
            } else {
                List<Object> rowData = List.of(
                        "=ROW()-2", member.getId(), "", "",
                        typeDesc, serviceAmount, startDateStr,
                        "", "", "", 0, "", "", ""
                );
                appendRow("이용권 관리", rowData);
            }
        } catch (Exception e) {
            log.error("시트 이용권 발급/업데이트 에러: ", e);
        }
        ----- 구글 시트 활성화 시 이 줄 삭제 ----- */
    }

    // =========================================================================
    // 4. [시트 2] 방문 데이터 및 정지/해제 업데이트
    // =========================================================================
    @Async
    public void updateVisitData(Long memberId, String visitDateStr, Integer accumulatedVisits) {
        /* ----- 구글 시트 활성화 시 이 줄 삭제 -----
        try {
            int rowIndex = findRowIndexByMemberId("이용권 관리", memberId);
            if (rowIndex != -1) {
                String range = "이용권 관리!J" + rowIndex + ":N" + rowIndex;
                List<Object> rowData = List.of(visitDateStr, accumulatedVisits, "", "", "입장");
                ValueRange body = new ValueRange().setValues(List.of(rowData));
                sheetsService.spreadsheets().values().update(spreadsheetId, range, body).setValueInputOption("USER_ENTERED").execute();
            }
        } catch (Exception e) {
            log.error("시트 방문 데이터 업데이트 에러: ", e);
        }
        ----- 구글 시트 활성화 시 이 줄 삭제 ----- */
    }

    @Async
    public void updateMembershipPauseDate(Long memberId, String pauseDateStr) {
        /* ----- 구글 시트 활성화 시 이 줄 삭제 -----
        try {
            int rowIndex = findRowIndexByMemberId("이용권 관리", memberId);
            if (rowIndex != -1) {
                String range = "이용권 관리!L" + rowIndex + ":N" + rowIndex;
                List<Object> rowData = List.of(pauseDateStr, "", "정지");
                ValueRange body = new ValueRange().setValues(List.of(rowData));
                sheetsService.spreadsheets().values().update(spreadsheetId, range, body).setValueInputOption("USER_ENTERED").execute();
            }
        } catch (Exception e) {
            log.error("시트 정지일 업데이트 에러: ", e);
        }
        ----- 구글 시트 활성화 시 이 줄 삭제 ----- */
    }

    @Async
    public void unpauseMembershipData(Long memberId, String newEndDateStr) {
        /* ----- 구글 시트 활성화 시 이 줄 삭제 -----
        try {
            int rowIndex = findRowIndexByMemberId("이용권 관리", memberId);
            if (rowIndex != -1) {
                String range = "이용권 관리!H" + rowIndex + ":N" + rowIndex;
                List<Object> rowData = List.of(newEndDateStr, "", "", "", "", "", "정상");
                ValueRange body = new ValueRange().setValues(List.of(rowData));
                sheetsService.spreadsheets().values().update(spreadsheetId, range, body).setValueInputOption("USER_ENTERED").execute();
            }
        } catch (Exception e) {
            log.error("시트 정지 해제 업데이트 에러: ", e);
        }
        ----- 구글 시트 활성화 시 이 줄 삭제 ----- */
    }

    // =========================================================================
    // 5. [내부 헬퍼] API 호출을 통한 행 번호 스캔
    // =========================================================================
    private int findRowIndexByMemberId(String tabName, Long memberId) throws IOException {
        ValueRange response = sheetsService.spreadsheets().values().get(spreadsheetId, tabName + "!B:B").execute();
        List<List<Object>> values = response.getValues();
        if (values != null) {
            for (int i = 0; i < values.size(); i++) {
                List<Object> row = values.get(i);
                if (!row.isEmpty() && row.get(0).toString().equals(String.valueOf(memberId))) {
                    return i + 1;
                }
            }
        }
        return -1;
    }

    private int findFirstEmptyRow(String tabName) throws IOException {
        ValueRange response = sheetsService.spreadsheets().values().get(spreadsheetId, tabName + "!B:B").execute();
        List<List<Object>> values = response.getValues();

        if (values == null || values.isEmpty()) return 3;

        int lastDataRow = 2;
        for (int i = 0; i < values.size(); i++) {
            List<Object> row = values.get(i);
            if (row != null && !row.isEmpty() && !row.get(0).toString().trim().isEmpty()) {
                lastDataRow = i + 1;
            }
        }
        return lastDataRow + 1;
    }
}