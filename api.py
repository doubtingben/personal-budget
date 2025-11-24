#!/usr/bin/env python3
"""
Budget Visualization API
Handles database operations and balance calculations
"""

import sqlite3
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional


class BudgetAPI:
    def __init__(self, db_path='budget.db'):
        self.db_path = db_path
        self.initialize_database()

    def get_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def initialize_database(self):
        """Create database tables if they don't exist"""
        conn = self.get_connection()
        with open('schema.sql', 'r') as f:
            conn.executescript(f.read())
        conn.commit()
        conn.close()

    def get_setting(self, key: str, default: Any = None) -> Any:
        """Get a setting value"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT value FROM settings WHERE key = ?', (key,))
        row = cursor.fetchone()
        conn.close()
        return row['value'] if row else default

    def set_setting(self, key: str, value: str):
        """Set a setting value"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', (key, value))
        conn.commit()
        conn.close()

    def add_event(self, description: str, amount: float, event_date: Optional[str] = None,
                  is_recurring: bool = False, recurrence_pattern: Optional[str] = None,
                  recurrence_interval: int = 1, recurrence_start: Optional[str] = None,
                  recurrence_end: Optional[str] = None, comment: Optional[str] = None,
                  labels: List[str] = None) -> int:
        """Add a new account event"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO account_events
            (description, amount, event_date, is_recurring, recurrence_pattern,
             recurrence_interval, recurrence_start, recurrence_end, comment)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (description, amount, event_date, 1 if is_recurring else 0,
              recurrence_pattern, recurrence_interval, recurrence_start, recurrence_end, comment))

        event_id = cursor.lastrowid

        # Add labels
        if labels:
            for label in labels:
                cursor.execute('INSERT INTO event_labels (event_id, label_name) VALUES (?, ?)',
                             (event_id, label))

        conn.commit()
        conn.close()
        return event_id

    def update_event(self, event_id: int, **kwargs):
        """Update an existing event"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Build update query dynamically
        allowed_fields = ['description', 'amount', 'event_date', 'is_recurring',
                         'recurrence_pattern', 'recurrence_interval', 'recurrence_start',
                         'recurrence_end', 'comment']

        updates = []
        values = []
        for key, value in kwargs.items():
            if key in allowed_fields:
                updates.append(f'{key} = ?')
                values.append(value)

        if updates:
            values.append(event_id)
            query = f'UPDATE account_events SET {", ".join(updates)} WHERE id = ?'
            cursor.execute(query, values)

        # Update labels if provided
        if 'labels' in kwargs:
            cursor.execute('DELETE FROM event_labels WHERE event_id = ?', (event_id,))
            for label in kwargs['labels']:
                cursor.execute('INSERT INTO event_labels (event_id, label_name) VALUES (?, ?)',
                             (event_id, label))

        conn.commit()
        conn.close()

    def delete_event(self, event_id: int):
        """Delete an event"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM account_events WHERE id = ?', (event_id,))
        conn.commit()
        conn.close()

    def get_all_labels(self) -> List[str]:
        """Get all unique labels"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT DISTINCT label_name FROM event_labels ORDER BY label_name')
        labels = [row['label_name'] for row in cursor.fetchall()]
        conn.close()
        return labels

    def get_labels_with_counts(self) -> List[Dict]:
        """Get all labels with their event counts"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT label_name, COUNT(*) as count
            FROM event_labels
            GROUP BY label_name
            ORDER BY label_name
        ''')
        labels = [{'name': row['label_name'], 'count': row['count']} for row in cursor.fetchall()]
        conn.close()
        return labels

    def rename_label(self, old_name: str, new_name: str):
        """Rename a label across all events"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE event_labels SET label_name = ? WHERE label_name = ?',
                      (new_name, old_name))
        conn.commit()
        conn.close()

    def delete_label(self, label_name: str):
        """Delete a label from all events"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM event_labels WHERE label_name = ?', (label_name,))
        conn.commit()
        conn.close()

    def expand_recurring_event(self, event: Dict, start_date: datetime, end_date: datetime) -> List[Dict]:
        """Expand a recurring event into individual occurrences"""
        occurrences = []

        rec_start = datetime.fromisoformat(event['recurrence_start'])
        rec_end = datetime.fromisoformat(event['recurrence_end']) if event['recurrence_end'] else end_date

        # Start from the actual recurrence start date
        current = rec_start

        pattern = event['recurrence_pattern']
        interval = event['recurrence_interval'] or 1

        # If the recurrence start is before the start_date, fast-forward to the first
        # occurrence that falls on or after start_date by iterating forward
        while current < start_date and current <= rec_end:
            # Calculate next occurrence
            if pattern == 'daily':
                current += timedelta(days=interval)
            elif pattern == 'weekly':
                current += timedelta(weeks=interval)
            elif pattern == 'biweekly':
                current += timedelta(weeks=2)
            elif pattern == 'monthly':
                # Add months
                month = current.month + interval
                year = current.year + (month - 1) // 12
                month = ((month - 1) % 12) + 1
                day = min(current.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
                current = datetime(year, month, day)
            elif pattern == 'quarterly':
                # Add 3 months
                month = current.month + 3 * interval
                year = current.year + (month - 1) // 12
                month = ((month - 1) % 12) + 1
                day = min(current.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
                current = datetime(year, month, day)
            elif pattern == 'yearly':
                year = current.year + interval
                month = current.month
                day = min(current.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
                current = datetime(year, month, day)
            else:
                break  # Unknown pattern

        # Now iterate through occurrences within the date range
        while current <= min(rec_end, end_date):
            if current >= start_date:
                occurrences.append({
                    'id': event['id'],
                    'description': event['description'],
                    'amount': event['amount'],
                    'date': current.strftime('%Y-%m-%d'),
                    'comment': event['comment'],
                    'is_recurring': True,
                    'labels': event.get('labels', [])
                })

            # Calculate next occurrence
            if pattern == 'daily':
                current += timedelta(days=interval)
            elif pattern == 'weekly':
                current += timedelta(weeks=interval)
            elif pattern == 'biweekly':
                current += timedelta(weeks=2)
            elif pattern == 'monthly':
                # Add months
                month = current.month + interval
                year = current.year + (month - 1) // 12
                month = ((month - 1) % 12) + 1
                day = min(current.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
                current = datetime(year, month, day)
            elif pattern == 'quarterly':
                # Add 3 months
                month = current.month + 3 * interval
                year = current.year + (month - 1) // 12
                month = ((month - 1) % 12) + 1
                day = min(current.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
                current = datetime(year, month, day)
            elif pattern == 'yearly':
                year = current.year + interval
                month = current.month
                day = min(current.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
                current = datetime(year, month, day)
            else:
                break  # Unknown pattern

        return occurrences

    def get_events_in_range(self, start_date: str, end_date: str, label_filter: List[str] = None) -> List[Dict]:
        """Get all events (one-off and expanded recurring) in date range"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Get all events
        cursor.execute('SELECT * FROM account_events')
        events = [dict(row) for row in cursor.fetchall()]

        # Get labels for each event
        for event in events:
            cursor.execute('SELECT label_name FROM event_labels WHERE event_id = ?', (event['id'],))
            event['labels'] = [row['label_name'] for row in cursor.fetchall()]

        conn.close()

        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)

        all_occurrences = []

        for event in events:
            # Apply label filter
            if label_filter:
                if not any(label in event['labels'] for label in label_filter):
                    continue

            if event['is_recurring']:
                # Expand recurring event
                occurrences = self.expand_recurring_event(event, start_dt, end_dt)
                all_occurrences.extend(occurrences)
            else:
                # One-off event
                if event['event_date']:
                    event_dt = datetime.fromisoformat(event['event_date'])
                    if start_dt <= event_dt <= end_dt:
                        all_occurrences.append({
                            'id': event['id'],
                            'description': event['description'],
                            'amount': event['amount'],
                            'date': event['event_date'],
                            'comment': event['comment'],
                            'is_recurring': False,
                            'labels': event['labels']
                        })

        # Sort by date
        all_occurrences.sort(key=lambda x: x['date'])
        return all_occurrences

    def calculate_balance_timeline(self, start_date: str, end_date: str,
                                   starting_balance: float, label_filter: List[str] = None) -> Dict:
        """Calculate balance over time"""
        events = self.get_events_in_range(start_date, end_date, label_filter)

        # Create daily balance points
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)

        timeline = []
        current_balance = starting_balance
        current_date = start_dt

        # Group events by date
        events_by_date = {}
        for event in events:
            event_date = event['date']
            if event_date not in events_by_date:
                events_by_date[event_date] = []
            events_by_date[event_date].append(event)

        # Calculate balance for each day
        while current_date <= end_dt:
            date_str = current_date.strftime('%Y-%m-%d')

            # Apply events for this date
            if date_str in events_by_date:
                for event in events_by_date[date_str]:
                    current_balance += event['amount']

            timeline.append({
                'date': date_str,
                'balance': round(current_balance, 2)
            })

            current_date += timedelta(days=1)

        return {
            'timeline': timeline,
            'events': events,
            'starting_balance': starting_balance,
            'ending_balance': round(current_balance, 2)
        }

    def get_all_events(self) -> List[Dict]:
        """Get all events with their labels"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM account_events ORDER BY created_at DESC')
        events = [dict(row) for row in cursor.fetchall()]

        for event in events:
            cursor.execute('SELECT label_name FROM event_labels WHERE event_id = ?', (event['id'],))
            event['labels'] = [row['label_name'] for row in cursor.fetchall()]

        conn.close()
        return events
