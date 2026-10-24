package com.campus.transparency.api.issue;

import com.campus.transparency.domain.user.User;

public record AssignedUserResponse(
        Long id,
        String username,
        String alias
) {
    public static AssignedUserResponse from(User user) {
        if (user == null) {
            return null;
        }
        return new AssignedUserResponse(
                user.getId(),
                user.getUsername(),
                user.getUsername()
        );
    }
}
