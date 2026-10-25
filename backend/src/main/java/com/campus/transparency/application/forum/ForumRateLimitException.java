package com.campus.transparency.application.forum;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
public class ForumRateLimitException extends RuntimeException {
    public ForumRateLimitException(String message) {
        super(message);
    }
}
