package com.dailyreport.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class DateUtil {

    public static final String DEFAULT_DATE_FORMAT = "yyyy-MM-dd";
    public static final String DEFAULT_TIME_FORMAT = "yyyy-MM-dd HH:mm:ss";

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern(DEFAULT_DATE_FORMAT);
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern(DEFAULT_TIME_FORMAT);

    /**
     * 현재 날짜를 DEFAULT_DATE_FORMAT 형식으로 반환
     */
    public static String getCurrentDateString() {
        return LocalDate.now().format(DATE_FORMATTER);
    }

    /**
     * 현재 시간을 DEFAULT_TIME_FORMAT 형식으로 반환
     */
    public static String getCurrentTimeString() {
        return LocalDateTime.now().format(TIME_FORMATTER);
    }

    /**
     * LocalDate를 DEFAULT_DATE_FORMAT 형식의 문자열로 변환
     */
    public static String formatDate(LocalDate date) {
        return date.format(DATE_FORMATTER);
    }

    /**
     * LocalDateTime을 DEFAULT_TIME_FORMAT 형식의 문자열로 변환
     */
    public static String formatDateTime(LocalDateTime dateTime) {
        return dateTime.format(TIME_FORMATTER);
    }

    /**
     * DEFAULT_DATE_FORMAT 형식의 문자열을 LocalDate로 변환
     */
    public static LocalDate parseDate(String dateString) {
        return LocalDate.parse(dateString, DATE_FORMATTER);
    }

    /**
     * DEFAULT_TIME_FORMAT 형식의 문자열을 LocalDateTime으로 변환
     */
    public static LocalDateTime parseDateTime(String dateTimeString) {
        return LocalDateTime.parse(dateTimeString, TIME_FORMATTER);
    }

}
