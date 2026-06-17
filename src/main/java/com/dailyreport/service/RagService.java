package com.dailyreport.service;

import com.dailyreport.model.Report;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RagService {

    @Autowired
    private ReportService reportService;

    @Autowired
    private OllamaService ollamaService;

    public String answerQuestion(String question) {
        String keyword = extractKeyword(question);
        List<Report> candidates = searchRelevantReports(keyword);

        if (candidates.isEmpty()) {
            return "관련된 과거 일지를 찾을 수 없습니다. 다른 질문을 시도해보세요.";
        }

        String context = buildContext(candidates);
        String prompt = buildRagPrompt(question, context);

        return ollamaService.generateSummaryWithModel(prompt, ollamaService.getDefaultModel());
    }

    private String extractKeyword(String question) {
        if (question == null || question.isBlank()) {
            return "";
        }

        String cleaned = question.toLowerCase()
                .replaceAll("[\\p{Punct}]", " ")
                .replaceAll("\\s+", " ")
                .trim();

        String[] words = cleaned.split(" ");
        List<String> filtered = new ArrayList<>();
        for (String word : words) {
            if (word.length() > 1 && !List.of("지난달", "지난주", "무엇", "뭐", "어디", "언제", "어떻게", "있었지", "있지", "이슈", "프로젝트", "사내", "업무", "보고").contains(word)) {
                filtered.add(word);
            }
        }

        return filtered.stream().limit(4).collect(Collectors.joining(" "));
    }

    private List<Report> searchRelevantReports(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return reportService.getAllReports().stream().limit(10).collect(Collectors.toList());
        }
        return reportService.searchReports(keyword).stream().limit(10).collect(Collectors.toList());
    }

    private String buildContext(List<Report> reports) {
        StringBuilder builder = new StringBuilder();
        builder.append("다음은 관련된 과거 업무 일지입니다. 참고하여 질문에 답변하세요.\n\n");

        for (Report report : reports) {
            builder.append("[날짜] ").append(report.getReportDate()).append("\n");
            builder.append("[제목] ").append(report.getTitle()).append("\n");
            builder.append("[내용] ").append(report.getContent()).append("\n\n");
        }

        return builder.toString();
    }

    private String buildRagPrompt(String question, String context) {
        return "다음 과거 일지 내용을 참고하여 질문에 답변해 주세요. 답변은 한국어로 정중하게 작성하세요.\n\n" +
                context +
                "질문: " + question + "\n" +
                "답변: ";
    }
}
