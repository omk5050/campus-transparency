package com.campus.transparency.domain.forum;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface ForumReplyRepository extends JpaRepository<ForumReply, Long> {

    List<ForumReply> findByPostIdAndStatus(Long postId, ForumReplyStatus status, Sort sort);

    List<ForumReply> findByPostIdAndStatusIn(Long postId, Collection<ForumReplyStatus> statuses, Sort sort);

    List<ForumReply> findByPostId(Long postId, Sort sort);

    long countByPostIdAndStatus(Long postId, ForumReplyStatus status);

    long countByPostIdAndStatusIn(Long postId, Collection<ForumReplyStatus> statuses);

    long countByOrganizationId(Long organizationId);
}
