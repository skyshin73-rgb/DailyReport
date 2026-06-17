package com.dailyreport;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class DailyReportApplication {

    public static void main(String[] args) {
        SpringApplication.run(DailyReportApplication.class, args);
    }

}
