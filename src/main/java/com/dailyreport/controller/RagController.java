package com.dailyreport.controller;

import com.dailyreport.service.RagService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/rag")
@CrossOrigin(origins = "*")
public class RagController {

    @Autowired
    private RagService ragService;

    @PostMapping("/query")
    public ResponseEntity<Map<String, Object>> queryRag(@RequestBody Map<String, String> request) {
        try {
            String question = request.getOrDefault("question", "");
            if (question.trim().isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("error", "질문을 입력해주세요.");
                return ResponseEntity.badRequest().body(response);
            }

            String answer = ragService.answerQuestion(question);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("answer", answer);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}
