-- SQLite Database Schema for Daily Reports

CREATE TABLE IF NOT EXISTS daily_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    report_date VARCHAR(10) NOT NULL,
    ai_summary TEXT,
    ai_processed BOOLEAN DEFAULT 0,
    UNIQUE(report_date, title)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_report_date ON daily_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_created_at ON daily_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_processed ON daily_reports(ai_processed);
