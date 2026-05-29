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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final MemberRepository memberRepository;
    private final ImageService imageService;

    @Transactional(readOnly = true)
    public Page<NoticeResponse> getNotices(Pageable pageable) {
        return noticeRepository.findAll(pageable).map(NoticeResponse::from);
    }

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

        String imageUrl = (file != null && !file.isEmpty())
                ? imageService.uploadImage(file)
                : request.getImageUrl();

        Notice notice = Notice.builder()
                .member(admin)
                .title(request.getTitle())
                .content(request.getContent())
                .imageUrl(imageUrl)
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