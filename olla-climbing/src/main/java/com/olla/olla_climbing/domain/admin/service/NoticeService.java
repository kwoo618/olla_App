package com.olla.olla_climbing.domain.admin.service;

import com.olla.olla_climbing.domain.admin.dto.request.NoticeCreateRequest;
import com.olla.olla_climbing.domain.admin.dto.request.NoticeUpdateRequest;
import com.olla.olla_climbing.domain.admin.dto.response.NoticeResponse;
import com.olla.olla_climbing.domain.admin.entity.Notice;
import com.olla.olla_climbing.domain.admin.repository.NoticeRepository;
import com.olla.olla_climbing.domain.image.service.ImageService;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// (동철 수정) 
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final MemberRepository memberRepository;
    private final ImageService imageService;

    // (동철 수정) 공지사항 사용자도 볼 수 있게 수정 
    // 유저/관리자 공용 조회 메서드 추가
    @Transactional(readOnly = true)
    public Page<NoticeResponse> getNotices(Pageable pageable) {
        return noticeRepository.findAll(pageable)
                .map(NoticeResponse::from);
    }
    
    // 상세 조회 메서드 추가
    @Transactional(readOnly = true)
    public NoticeResponse getNotice(Long noticeId) {
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 공지사항입니다."));
        return NoticeResponse.from(notice);
    }

    @Transactional
    public NoticeResponse createNotice(String loginId, NoticeCreateRequest request, MultipartFile file) {
        Member admin = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("관리자 정보를 찾을 수 없습니다."));

        // 이미지 업로드 로직 추가
        String imageUrl = imageService.uploadImage(file);

        Notice notice = Notice.builder()
                .member(admin)
                .title(request.getTitle())
                .content(request.getContent())
                .imageUrl(imageUrl) // 업로드된 경로 저장
                .isImportant(request.isImportant())
                .build();

        noticeRepository.save(notice);
        return NoticeResponse.from(notice);
    }


    @Transactional
    public NoticeResponse updateNotice(Long noticeId, NoticeUpdateRequest request) {
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 공지사항입니다."));

        notice.updateNotice(request.getTitle(), request.getContent(), request.getImageUrl(), request.isImportant());
        return NoticeResponse.from(notice);
    }

    @Transactional
    public void deleteNotice(Long noticeId) {
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 공지사항입니다."));

        noticeRepository.delete(notice);
    }
}