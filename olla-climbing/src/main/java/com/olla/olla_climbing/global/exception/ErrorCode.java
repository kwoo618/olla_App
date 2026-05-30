package com.olla.olla_climbing.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // ── 공통 ──────────────────────────────────────────────────────
    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "잘못된 입력값입니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다."),

    // ── 인증/보안 ─────────────────────────────────────────────────
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "인증이 필요하거나 잘못된 토큰입니다."),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    EMAIL_VERIFICATION_NOT_FOUND(HttpStatus.BAD_REQUEST, "이메일 인증 요청 내역이 없습니다."),
    EMAIL_VERIFICATION_EXPIRED(HttpStatus.BAD_REQUEST, "인증 시간이 만료되었습니다."),
    EMAIL_VERIFICATION_INVALID(HttpStatus.BAD_REQUEST, "인증 번호가 일치하지 않습니다."),
    EMAIL_NOT_VERIFIED(HttpStatus.BAD_REQUEST, "이메일 인증이 완료되지 않았습니다."),

    // ── 회원 ─────────────────────────────────────────────────────
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "해당 회원을 찾을 수 없습니다."),
    MEMBER_ALREADY_DELETED(HttpStatus.BAD_REQUEST, "이미 탈퇴한 회원입니다."),
    DUPLICATE_LOGIN_ID(HttpStatus.BAD_REQUEST, "이미 사용 중인 아이디입니다."),
    DUPLICATE_EMAIL(HttpStatus.BAD_REQUEST, "이미 가입된 이메일입니다."),
    DUPLICATE_PHONE(HttpStatus.BAD_REQUEST, "이미 등록된 전화번호입니다."),
    INVALID_PASSWORD(HttpStatus.BAD_REQUEST, "비밀번호가 일치하지 않습니다."),
    SAME_AS_CURRENT_PASSWORD(HttpStatus.BAD_REQUEST, "새 비밀번호는 기존 비밀번호와 달라야 합니다."),
    OFFLINE_MEMBER_NO_ACCOUNT(HttpStatus.BAD_REQUEST, "앱 가입 이력이 없는 오프라인 회원입니다."),

    // ── 이용권 ────────────────────────────────────────────────────
    MEMBERSHIP_NOT_FOUND(HttpStatus.NOT_FOUND, "유효한 이용권을 찾을 수 없습니다."),
    MEMBERSHIP_ALREADY_PAUSED(HttpStatus.BAD_REQUEST, "이미 정지 중인 이용권입니다."),
    MEMBERSHIP_NOT_PAUSED(HttpStatus.BAD_REQUEST, "정지 상태가 아닌 이용권입니다."),
    MEMBERSHIP_INSUFFICIENT_COUNT(HttpStatus.BAD_REQUEST, "잔여 횟수가 부족합니다."),
    MEMBERSHIP_DURATION_OR_COUNT_REQUIRED(HttpStatus.BAD_REQUEST, "기간(개월) 또는 횟수 중 하나는 반드시 입력해야 합니다."),

    // ── 게시글/커뮤니티 ───────────────────────────────────────────
    POST_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 게시글입니다."),
    POST_ALREADY_DELETED(HttpStatus.BAD_REQUEST, "삭제된 게시글입니다."),
    POST_UNAUTHORIZED(HttpStatus.FORBIDDEN, "게시글 작성자만 수정/삭제할 수 있습니다."),
    POST_ALREADY_CLOSED(HttpStatus.BAD_REQUEST, "이미 마감된 모집 게시글입니다."),
    PARTICIPANT_ALREADY_JOINED(HttpStatus.BAD_REQUEST, "이미 참여한 모집글입니다."),
    PARTICIPANT_NOT_FOUND(HttpStatus.BAD_REQUEST, "해당 모집글에 참여한 내역이 없습니다."),
    PARTICIPANT_IS_AUTHOR(HttpStatus.BAD_REQUEST, "작성자는 참여/취소할 수 없습니다."),

    // ── 기록 ─────────────────────────────────────────────────────
    RECORD_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 기록입니다."),
    RECORD_UNAUTHORIZED(HttpStatus.FORBIDDEN, "자신의 기록만 삭제할 수 있습니다."),
    RECORD_INVALID_HOLD_NO(HttpStatus.BAD_REQUEST, "홀드 번호가 유효 범위를 벗어납니다."),
    RECORD_HOLD_NO_REQUIRED(HttpStatus.BAD_REQUEST, "실패 기록에는 도달한 홀드 번호가 필수입니다."),

    // ── 입장/방문 ─────────────────────────────────────────────────
    VISIT_QR_INVALID(HttpStatus.BAD_REQUEST, "유효하지 않거나 만료된 QR 코드입니다."),
    VISIT_ALREADY_TODAY(HttpStatus.BAD_REQUEST, "이미 오늘 출석이 완료된 회원입니다."),
    VISIT_DEDUCTION_INVALID(HttpStatus.BAD_REQUEST, "차감 횟수는 1회 이상이어야 합니다."),
    VISIT_NO_ACTIVE_MEMBERSHIP(HttpStatus.BAD_REQUEST, "활성화된 이용권이 없습니다."),

    // ── 공지 ─────────────────────────────────────────────────────
    NOTICE_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 공지사항입니다."),

    // ── 알림 ─────────────────────────────────────────────────────
    NOTIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 알림입니다."),
    NOTIFICATION_UNAUTHORIZED(HttpStatus.FORBIDDEN, "본인의 알림만 읽음 처리할 수 있습니다.");

    private final HttpStatus httpStatus;
    private final String message;
}