-- Budget Visualization Database Schema

-- Application settings (starting balance, etc.)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Account events (transactions)
CREATE TABLE IF NOT EXISTS account_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    comment TEXT,
    
    -- One-off event fields
    event_date TEXT,  -- ISO format: YYYY-MM-DD
    
    -- Recurring event fields
    is_recurring INTEGER DEFAULT 0,  -- 0 = one-off, 1 = recurring
    recurrence_pattern TEXT,  -- 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom'
    recurrence_interval INTEGER,  -- For custom: repeat every N days/weeks/months
    recurrence_start TEXT,  -- ISO format: YYYY-MM-DD
    recurrence_end TEXT,  -- ISO format: YYYY-MM-DD (NULL for indefinite)
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Event labels (can be used for filtering)
CREATE TABLE IF NOT EXISTS event_labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    label_name TEXT NOT NULL,
    FOREIGN KEY (event_id) REFERENCES account_events(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_date ON account_events(event_date);
CREATE INDEX IF NOT EXISTS idx_recurrence_dates ON account_events(recurrence_start, recurrence_end);
CREATE INDEX IF NOT EXISTS idx_labels ON event_labels(label_name);

-- Insert default starting balance setting
INSERT OR IGNORE INTO settings (key, value) VALUES ('starting_balance', '1000.00');
INSERT OR IGNORE INTO settings (key, value) VALUES ('current_date', '2025-11-24');
