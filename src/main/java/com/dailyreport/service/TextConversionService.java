package com.dailyreport.service;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;

@Service
public class TextConversionService {

    @Autowired
    private OllamaService ollamaService;

    private final Gson gson = new Gson();

    /**
     * 사용자 입력 텍스트를 정중하고 깔끔한 비즈니스 업무 일지 형식으로 정제
     */
    public String convertToBusinessFormat(String rawText) {
        try {
            // 비즈니스 형식 변환 프롬프트
            String prompt = buildConversionPrompt(rawText);
            return ollamaService.generateSummary(prompt);
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }

    /**
     * 비동기 방식의 텍스트 정제
     */
    public CompletableFuture<String> convertToBusinessFormatAsync(String rawText) {
        return CompletableFuture.supplyAsync(() -> convertToBusinessFormat(rawText));
    }

    /**
     * 텍스트 정제용 프롬프트 빌드
     */
    private String buildConversionPrompt(String rawText) {
        return "다음의 업무 메모를 정중하고 체계적인 비즈니스 일지 형식으로 정제하여 한국어로 작성해줘. " +
               "존댓말을 사용하고, 불릿 포인트나 항목별로 정리된 형식으로 출력해줘. " +
               "원본 내용의 의미는 유지하면서 표현을 개선해줘.\n\n" +
               "[원본 텍스트]\n" +
               rawText + "\n\n" +
               "[정제된 비즈니스 일지 형식 출력]";
    }

    /**
     * 전문 프롬프트: 고급 비즈니스 형식
     */
    private String buildAdvancedConversionPrompt(String rawText) {
        return "당신은 전문적인 비즈니스 문서 편집자입니다. " +
               "다음 업무 메모를 아래 형식에 맞게 정제해주세요:\n\n" +
               "1. 주요 업무 내용\n" +
               "2. 진행 상황 (진행 중 / 완료 / 대기 중)\n" +
               "3. 이슈 및 해결 사항\n" +
               "4. 다음 조치 사항\n\n" +
               "원본 텍스트:\n" +
               rawText + "\n\n" +
               "위 텍스트를 위의 4가지 항목으로 정리하여 전문적이고 명확하게 작성해주세요.";
    }

    /**
     * 간단한 형식으로 정제 (빠른 처리)
     */
    public String convertSimple(String rawText) {
        try {
            String prompt = "다음 텍스트를 정중하고 명확한 한국어로 다시 작성해줘:\n\n" + rawText;
            return ollamaService.generateSummary(prompt);
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }

    /**
     * 마크다운 형식으로 정제
     */
    public String convertToMarkdown(String rawText) {
        try {
            String prompt = "다음 업무 메모를 마크다운 형식의 깔끔한 비즈니스 일지로 변환해줘:\n\n" +
                           rawText + "\n\n" +
                           "마크다운 형식 사용 (## 제목, - 항목, **강조** 등)";
            return ollamaService.generateSummary(prompt);
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }

}
