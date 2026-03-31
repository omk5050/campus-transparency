package com.campus.transparency.application.issue;

import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class AnonymousTagService {

    private static final List<String> ADJECTIVES = List.of("Clever", "Brave", "Silent", "Hidden", "Swift", "Bright", "Fierce", "Noble", "Calm", "Fierce", "Bold", "Wild", "Keen", "Loyal");
    private static final List<String> NOUNS = List.of("Fox", "Owl", "Wolf", "Hawk", "Bear", "Lynx", "Tiger", "Lion", "Eagle", "Falcon", "Panther", "Leopard", "Shark", "Snake");

    public String generateAlias(String reporterHash, Long issueId) {
        if (reporterHash == null) reporterHash = "unknown";
        int hash = Math.abs((reporterHash + issueId).hashCode());
        String adj = ADJECTIVES.get(hash % ADJECTIVES.size());
        String noun = NOUNS.get((hash / ADJECTIVES.size()) % NOUNS.size());
        return "Anon-" + adj + "-" + noun;
    }
}
