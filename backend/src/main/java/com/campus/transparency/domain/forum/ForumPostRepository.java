package com.campus.transparency.domain.forum;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ForumPostRepository extends JpaRepository<ForumPost, Long>, JpaSpecificationExecutor<ForumPost> {

    Page<ForumPost> findByOrganizationIdAndStatusIn(Long organizationId, Collection<ForumPostStatus> statuses, Pageable pageable);

    Page<ForumPost> findByStatusIn(Collection<ForumPostStatus> statuses, Pageable pageable);

    Page<ForumPost> findByOrganizationId(Long organizationId, Pageable pageable);

    long countByOrganizationIdAndStatus(Long organizationId, ForumPostStatus status);

    long countByStatus(ForumPostStatus status);

    long countByOrganizationId(Long organizationId);
}
