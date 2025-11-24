# 💰 Budget Visualization

An interactive budget visualization tool that displays account balance changes over an adjustable timeline. Track your financial journey with beautiful charts, recurring events, and label-based filtering.

![Budget Visualization](https://img.shields.io/badge/Status-Active-success)
![Python](https://img.shields.io/badge/Python-3.7+-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- **📊 Interactive Timeline Chart**: Visualize your balance over time with smooth, animated charts
- **🔄 Recurring Events**: Support for daily, weekly, bi-weekly, monthly, quarterly, and yearly recurring transactions
- **📅 One-off Events**: Track one-time income and expenses
- **🏷️ Label Filtering**: Organize and filter events by custom labels (e.g., income, fixed, essential)
- **⏱️ Adjustable Time Range**: Dynamically adjust past and future date ranges to see balance projections
- **💾 SQLite Database**: All data stored locally in a lightweight database
- **🎨 Premium UI**: Modern dark mode design with glassmorphism and smooth animations
- **📱 Responsive**: Works beautifully on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites

- Python 3.7 or higher (no external packages required!)
- A modern web browser (Chrome, Firefox, Safari, or Edge)

### Installation

1. Clone or navigate to this repository:
   ```bash
   cd /Users/bwilson/repos/personal-budget
   ```

2. Start the server:
   ```bash
   python server.py
   ```

3. Open your browser to:
   ```
   http://localhost:8000
   ```

That's it! The database will be created automatically on first run.

## 📖 Usage Guide

### Setting Up Your Starting Balance

1. Enter your current account balance in the "Starting Balance" field
2. The system assumes this balance is at the current date (today)
3. All events before and after this date will adjust the balance accordingly

### Adding Events

#### One-off Events
1. Click the "+ Add Event" button
2. Enter a description (e.g., "Paycheck", "Rent Payment", "Groceries")
3. Enter the amount:
   - Positive numbers for income (e.g., 2000)
   - Negative numbers for expenses (e.g., -1200)
4. Select the event date
5. Optionally add labels (comma-separated, e.g., "income, salary")
6. Click "Save Event"

#### Recurring Events
1. Click the "+ Add Event" button
2. Check the "Recurring Event" checkbox
3. Enter description and amount
4. Choose a recurrence pattern:
   - **Daily**: Every day or every N days
   - **Weekly**: Every week or every N weeks
   - **Bi-weekly**: Every 2 weeks
   - **Monthly**: Every month or every N months
   - **Quarterly**: Every 3 months
   - **Yearly**: Every year
5. Set the start date and optional end date (leave blank for indefinite)
6. Add labels and comments as needed
7. Click "Save Event"

### Adjusting the Timeline

Use the sliders to adjust your view:
- **Past Days**: How many days in the past to display (0-365)
- **Future Days**: How many days in the future to project (0-365)

The chart updates automatically to show the balance trajectory.

### Filtering by Labels

1. Click the "Filter by Labels" dropdown
2. Select one or more labels (hold Ctrl/Cmd for multiple)
3. The chart and event list will update to show only matching events

### Editing and Deleting Events

- Click "Edit" on any event card to modify it
- Click "Delete" to remove an event (confirmation required)
- Changes take effect immediately

## 🗄️ Database Schema

### Tables

#### `account_events`
Stores all budget events (one-off and recurring):
- `id`: Unique identifier
- `description`: Event name
- `amount`: Transaction amount (positive = income, negative = expense)
- `comment`: Optional notes
- `event_date`: Date for one-off events
- `is_recurring`: 0 for one-off, 1 for recurring
- `recurrence_pattern`: Pattern type (daily, weekly, monthly, etc.)
- `recurrence_interval`: Repeat every N periods
- `recurrence_start`: Start date for recurring events
- `recurrence_end`: End date (NULL for indefinite)

#### `event_labels`
Links events to labels for filtering:
- `id`: Unique identifier
- `event_id`: Reference to account_events
- `label_name`: Label text

#### `settings`
Application configuration:
- `key`: Setting name
- `value`: Setting value

## 🛠️ API Endpoints

### GET `/api/settings`
Get application settings (starting balance, current date)

### POST `/api/settings`
Update application settings

### GET `/api/events`
Get all events with their labels

### POST `/api/events`
Create a new event

### PUT `/api/events/{id}`
Update an existing event

### DELETE `/api/events/{id}`
Delete an event

### GET `/api/labels`
Get all unique labels

### GET `/api/timeline`
Get balance timeline data

**Query Parameters:**
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)
- `starting_balance`: Starting balance amount
- `labels`: Comma-separated list of labels to filter by

## 📁 Project Structure

```
personal-budget/
├── schema.sql          # Database schema
├── api.py             # Backend API logic
├── server.py          # HTTP server
├── index.html         # Main HTML page
├── styles.css         # Styling
├── app.js            # Frontend JavaScript
├── README.md          # This file
├── .gitignore        # Git ignore rules
└── requirements.txt   # Python dependencies (none!)
```

## 🎨 Design Philosophy

This application features a **premium, modern design** with:
- Dark mode color scheme with vibrant purple/blue gradients
- Glassmorphism effects for depth and elegance
- Smooth animations and transitions
- Responsive grid layouts
- Accessible color contrasts
- Custom-styled form controls

## 🔧 Customization

### Changing the Color Scheme

Edit the CSS variables in `styles.css`:
```css
:root {
    --primary: #8b5cf6;        /* Main accent color */
    --secondary: #06b6d4;      /* Secondary accent */
    --background: #0f172a;     /* Background color */
    /* ... more variables ... */
}
```

### Adding New Recurrence Patterns

Edit the `expand_recurring_event` method in `api.py` to add custom patterns.

## 🤝 Contributing

This is a personal project, but feel free to fork and customize for your own needs!

## 📝 License

MIT License - feel free to use this project however you'd like.

## 🐛 Troubleshooting

**Database not found?**
- The database is created automatically on first run
- Make sure you have write permissions in the project directory

**Port 8000 already in use?**
- Edit `server.py` and change `PORT = 8000` to another port
- Or stop the process using port 8000

**Chart not displaying?**
- Ensure you have an internet connection (Chart.js is loaded from CDN)
- Check browser console for JavaScript errors

## 🚀 Future Enhancements

Potential features for future versions:
- Export data to CSV/JSON
- Import transactions from bank files
- Budget goals and alerts
- Category-based budgeting
- Multi-currency support
- Data visualization improvements (pie charts, bar charts)

---

Built with ❤️ for better financial awareness
