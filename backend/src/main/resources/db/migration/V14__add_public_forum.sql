-- V14__add_public_forum.sql
-- Phase P4: Public Forum + Super Admin Governance Schema

-- 1. Create forum_posts table
CREATE TABLE IF NOT EXISTS forum_posts (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    author_id BIGINT NOT NULL,
    author_alias VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMP WITH TIME ZONE,
    moderated_at TIMESTAMP WITH TIME ZONE,
    moderated_by VARCHAR(100),
    moderation_reason VARCHAR(500),
    CONSTRAINT fk_forum_posts_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_forum_posts_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_forum_posts_org_status ON forum_posts(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON forum_posts(category);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON forum_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON forum_posts(author_id);

-- 2. Create forum_replies table
CREATE TABLE IF NOT EXISTS forum_replies (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    author_id BIGINT NOT NULL,
    author_alias VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMP WITH TIME ZONE,
    moderated_at TIMESTAMP WITH TIME ZONE,
    moderated_by VARCHAR(100),
    moderation_reason VARCHAR(500),
    CONSTRAINT fk_forum_replies_post FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_forum_replies_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    CONSTRAINT fk_forum_replies_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_forum_replies_post_status ON forum_replies(post_id, status);
CREATE INDEX IF NOT EXISTS idx_forum_replies_org ON forum_replies(organization_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_created_at ON forum_replies(created_at);

-- 3. Create forum_audit_logs table (Strictly separate from complaint audit logs)
CREATE TABLE IF NOT EXISTS forum_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL,
    actor VARCHAR(100) NOT NULL,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id BIGINT NOT NULL,
    reason VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_forum_audit_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_forum_audit_org ON forum_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_forum_audit_target ON forum_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_forum_audit_created_at ON forum_audit_logs(created_at);
