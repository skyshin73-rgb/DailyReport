package com.dailyreport.model;

public class TextConversionRequest {

    private String rawText;
    private String tone;

    // Constructors
    public TextConversionRequest() {
    }

    public TextConversionRequest(String rawText, String tone) {
        this.rawText = rawText;
        this.tone = tone;
    }

    // Getters and Setters
    public String getRawText() {
        return rawText;
    }

    public void setRawText(String rawText) {
        this.rawText = rawText;
    }

    public String getTone() {
        return tone;
    }

    public void setTone(String tone) {
        this.tone = tone;
    }

}
