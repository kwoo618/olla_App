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

    // =========================================================================
    // 1. [공통] 시트에 데이터 한 줄 추가 (Update 강제 덮어쓰기 방식)
    // =========================================================================
    private void appendRow(String sheetName, List<Object> rowData) {
        log.info("[구글 시트 전송 대기] 시트명: {}, 데이터: {}", sheetName, rowData);


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
    }

    // =========================================================================
    // 2. [시트 1] 완전 신규 회원 가입 시 동기화
    // =========================================================================
    @Async
    public void syncNewMember(Member member) {
        String birthDateStr = member.getBirthDate() != null ? member.getBirthDate().format(DateTimeFormatter.ofPattern("yyyy. MM. dd")) : "";
        String createdAtStr = member.getCreatedAt() != null ? member.getCreatedAt().format(DateTimeFormatter.ofPattern("yyyy. MM. dd")) : getTodayStr();

        // 상세 정보 처리
        Double footSize = (member.getMemberDetail() != null) ? member.getMemberDetail().getFootSize() : null;
        String footSizeStr = (footSize != null) ? String.valueOf(footSize) : "";
        String remark = (member.getLoginId() == null) ? "오프라인 회원" : "앱 가입 회원";

        // 💡 시트 구조 A~K (11개 컬럼) 매핑
        List<Object> rowData = List.of(
                "=ROW()-2",           // A: No
                member.getId(),       // B: 회원 ID
                member.getName(),     // C: 이름
                member.getGender() != null ? member.getGender() : "", // D: 성별
                member.getPhone(),    // E: 연락처
                birthDateStr,         // F: 생년월일
                "",                   // G: 나이(수기)
                createdAtStr,         // H: 최초 등록일
                footSizeStr,          // I: 암벽화 사이즈
                remark,               // J: 유형
                ""                    // K: 비고
        );

        try {
            // 회원정보 시트는 회원 ID로 행을 찾아 덮어쓰는 것이 안전합니다.
            int rowIndex = findRowIndexByMemberId("올라클라이밍 회원정보", member.getId());
            if (rowIndex != -1) {
                String range = "올라클라이밍 회원정보!A" + rowIndex + ":K" + rowIndex;
                ValueRange body = new ValueRange().setValues(List.of(rowData));
                sheetsService.spreadsheets().values().update(spreadsheetId, range, body).setValueInputOption("USER_ENTERED").execute();
            } else {
                appendRow("올라클라이밍 회원정보", rowData);
            }
        } catch (IOException e) {
            log.error("회원정보 시트 동기화 실패: {}", e.getMessage());
        }
    }

    // =========================================================================
    // 3. [시트 2] 미등록 회원 생성 및 이용권 결제 동기화
    // =========================================================================
    @Async
    public void syncUnregisteredMember(Member member) {
        List<Object> rowData = List.of(
                "=ROW()-2", member.getId(), member.getName(), member.getPhone(),
                "미등록", "", "", "", "", 0, "", 0, "", "N", ""
        );

        try {
            int rowIndex = findRowIndexByMemberId("이용권 관리", member.getId());
            if (rowIndex == -1) { // 없으면 새로 추가
                appendRow("이용권 관리", rowData);
            }
        } catch (IOException e) {
            log.error("미등록 회원 시트 생성 실패: {}", e.getMessage());
        }
    }

    @Async
    public void syncNewMembership(Member member, Membership membership) {
        boolean isPeriod = membership.getDurationMonth() != null;
        String typeDesc = isPeriod ? "회원권" : "횟수권";
        String serviceAmount = isPeriod ? membership.getDurationMonth() + "개월" : membership.getRemainingCount() + "회";
        String startDate = membership.getStartDate().format(DateTimeFormatter.ofPattern("yyyy. MM. dd"));
        String endDate = (membership.getEndDate() != null) ? membership.getEndDate().format(DateTimeFormatter.ofPattern("yyyy. MM. dd")) : "";

        // 💡 시트 구조 A~O(15개 컬럼) 완벽 매핑
        List<Object> rowData = List.of(
                "",                     // A: No
                member.getId(),         // B: 회원 ID
                member.getName(),       // C: 이름
                member.getPhone(),      // D: 연락처
                typeDesc,               // E: 이용권 종류
                serviceAmount,          // F: 신청 서비스
                startDate,              // G: 시작일
                endDate,                // H: 종료일
                "",                     // I: 잔여일수
                isPeriod ? 0 : (membership.getRemainingCount() != null ? membership.getRemainingCount() : 0), // J: 일일권 갯수
                "",                     // K: 최근 방문일
                0,                      // L: 누적 방문
                "",                     // M: 정지일
                "N",                    // N: 기초강습여부
                "ACTIVE"                // O: 비고
        );

        try {
            int rowIndex = findRowIndexByMemberId("이용권 관리", member.getId());
            if (rowIndex != -1) {
                // 기존 데이터 업데이트: B열부터 O열까지 (B,C,D,E,F,G,H,I,J,K,L,M,N,O = 14개 컬럼)
                String range = "이용권 관리!B" + rowIndex + ":O" + rowIndex;
                List<Object> updateData = rowData.subList(1, rowData.size()); // No 제외하고 전송
                ValueRange body = new ValueRange().setValues(List.of(updateData));
                sheetsService.spreadsheets().values().update(spreadsheetId, range, body).setValueInputOption("USER_ENTERED").execute();
            } else {
                appendRow("이용권 관리", rowData);
            }
        } catch (IOException e) {
            log.error("시트 이용권 동기화 실패: {}", e.getMessage());
        }
    }

    // =========================================================================
    // 4. [시트 2] 방문 데이터 및 정지/해제 업데이트
    // =========================================================================
    // 4. 방문 데이터 업데이트 (K, L열 업데이트)
    @Async
    public void updateVisitData(Long memberId, String visitDateStr, Integer accumulatedVisits) {
        try {
            int rowIndex = findRowIndexByMemberId("이용권 관리", memberId);
            if (rowIndex != -1) {
                // K열(11번째)부터 L열(12번째)까지
                String range = "이용권 관리!K" + rowIndex + ":L" + rowIndex;
                List<Object> rowData = List.of(visitDateStr, accumulatedVisits);
                ValueRange body = new ValueRange().setValues(List.of(rowData));
                sheetsService.spreadsheets().values().update(spreadsheetId, range, body).setValueInputOption("USER_ENTERED").execute();
            }
        } catch (Exception e) {
            log.error("시트 방문 데이터 업데이트 에러: ", e);
        }
    }

    // 5. 정지일 업데이트 (M열 업데이트)
    @Async
    public void updateMembershipPauseDate(Long memberId, String pauseDateStr) {
        try {
            int rowIndex = findRowIndexByMemberId("이용권 관리", memberId);
            if (rowIndex != -1) {
                // M열(13번째)에 정지일 기록
                String range = "이용권 관리!M" + rowIndex + ":M" + rowIndex;
                List<Object> rowData = List.of(pauseDateStr);
                ValueRange body = new ValueRange().setValues(List.of(rowData));
                sheetsService.spreadsheets().values().update(spreadsheetId, range, body).setValueInputOption("USER_ENTERED").execute();
            }
        } catch (Exception e) {
            log.error("시트 정지일 업데이트 에러: ", e);
        }
    }

    // 6. 정지 해제 업데이트 (H열 및 M열 초기화)
    @Async
    public void unpauseMembershipData(Long memberId, String newEndDateStr) {
        try {
            int rowIndex = findRowIndexByMemberId("이용권 관리", memberId);
            if (rowIndex != -1) {
                // H열(종료일) 갱신하고 M열(정지일) 초기화
                // H부터 M까지 범위를 잡고 [종료일, "", "", "", "", ""] 형태로 덮어씀
                String range = "이용권 관리!H" + rowIndex + ":M" + rowIndex;
                List<Object> rowData = List.of(newEndDateStr, "", "", "", "", "");
                ValueRange body = new ValueRange().setValues(List.of(rowData));
                sheetsService.spreadsheets().values().update(spreadsheetId, range, body).setValueInputOption("USER_ENTERED").execute();
            }
        } catch (Exception e) {
            log.error("시트 정지 해제 업데이트 에러: ", e);
        }
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