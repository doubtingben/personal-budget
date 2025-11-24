// Budget Visualization App
// Main application logic

class BudgetApp {
    constructor() {
        this.chart = null;
        this.currentBalance = 0;
        this.startingBalance = 1000;
        this.pastDays = 30;
        this.futureDays = 30;
        this.currentDate = '2025-11-24';
        this.selectedLabels = [];
        this.editingEventId = null;

        this.init();
    }

    async init() {
        // Load settings
        await this.loadSettings();

        // Initialize chart
        this.initChart();

        // Set up event listeners
        this.setupEventListeners();

        // Load initial data
        await this.loadLabels();
        await this.loadEvents();
        await this.updateTimeline();
    }

    async loadSettings() {
        try {
            const response = await fetch('/api/settings');
            const settings = await response.json();
            this.startingBalance = parseFloat(settings.starting_balance);
            this.currentDate = settings.current_date;

            document.getElementById('startingBalance').value = this.startingBalance;
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettings() {
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    starting_balance: this.startingBalance,
                    current_date: this.currentDate
                })
            });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    setupEventListeners() {
        // Set NOW date display
        const nowDate = new Date(this.currentDate);
        document.getElementById('nowDate').textContent = nowDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        // Starting balance
        document.getElementById('startingBalance').addEventListener('change', async (e) => {
            this.startingBalance = parseFloat(e.target.value);
            await this.saveSettings();
            await this.updateTimeline();
        });

        // Time range sliders
        document.getElementById('pastDays').addEventListener('input', (e) => {
            this.pastDays = parseInt(e.target.value);
            document.getElementById('pastDaysValue').textContent = this.pastDays + ' days';
        });

        document.getElementById('pastDays').addEventListener('change', async () => {
            await this.updateTimeline();
        });

        document.getElementById('futureDays').addEventListener('input', (e) => {
            this.futureDays = parseInt(e.target.value);
            document.getElementById('futureDaysValue').textContent = this.futureDays + ' days';
        });

        document.getElementById('futureDays').addEventListener('change', async () => {
            await this.updateTimeline();
        });

        // Label filter
        document.getElementById('labelFilter').addEventListener('change', async (e) => {
            const select = e.target;
            this.selectedLabels = Array.from(select.selectedOptions)
                .map(option => option.value)
                .filter(v => v !== '');
            await this.updateTimeline();
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', async () => {
            await this.loadLabels();
            await this.loadEvents();
            await this.updateTimeline();
        });

        // Add event button
        document.getElementById('addEventBtn').addEventListener('click', () => {
            this.openEventModal();
        });

        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeEventModal();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeEventModal();
        });

        document.getElementById('eventModal').addEventListener('click', (e) => {
            if (e.target.id === 'eventModal') {
                this.closeEventModal();
            }
        });

        // Recurring checkbox
        document.getElementById('eventRecurring').addEventListener('change', (e) => {
            const isRecurring = e.target.checked;
            document.getElementById('oneOffFields').style.display = isRecurring ? 'none' : 'block';
            document.getElementById('recurringFields').style.display = isRecurring ? 'block' : 'none';
        });

        // Event form submission
        document.getElementById('eventForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveEvent();
        });
    }

    initChart() {
        const ctx = document.getElementById('balanceChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Balance',
                        data: [],
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: '#8b5cf6',
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 2,
                        segment: {
                            // Make line red when balance is negative
                            borderColor: (ctx) => {
                                const value = ctx.p1.parsed.y;
                                return value < 0 ? '#ef4444' : '#8b5cf6';
                            },
                            backgroundColor: (ctx) => {
                                const value = ctx.p1.parsed.y;
                                return value < 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.1)';
                            }
                        }
                    },
                    {
                        // Zero threshold line
                        label: 'Zero Line',
                        data: [],
                        borderColor: '#ef4444',
                        borderWidth: 2,
                        borderDash: [10, 5],
                        pointRadius: 0,
                        fill: false,
                        tension: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(30, 41, 59, 0.9)',
                        titleColor: '#f1f5f9',
                        bodyColor: '#cbd5e1',
                        borderColor: '#475569',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function (context) {
                                if (context.datasetIndex === 1) return null; // Hide zero line tooltip
                                const value = context.parsed.y;
                                const color = value < 0 ? '⚠️ NEGATIVE: $' : value === 0 ? '⚠️ ZERO: $' : 'Balance: $';
                                return color + value.toFixed(2);
                            }
                        }
                    },
                    annotation: {
                        annotations: {
                            dangerZone: {
                                type: 'box',
                                yMin: -Infinity,
                                yMax: 0,
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                borderWidth: 0
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(71, 85, 105, 0.3)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#cbd5e1',
                            maxRotation: 45,
                            minRotation: 0
                        }
                    },
                    y: {
                        grid: {
                            color: (context) => {
                                // Make zero line extra visible
                                if (context.tick.value === 0) {
                                    return 'rgba(239, 68, 68, 0.5)';
                                }
                                return 'rgba(71, 85, 105, 0.3)';
                            },
                            drawBorder: false
                        },
                        ticks: {
                            color: (context) => {
                                // Highlight zero value
                                if (context.tick.value === 0) {
                                    return '#ef4444';
                                }
                                return '#cbd5e1';
                            },
                            callback: function (value) {
                                return '$' + value.toFixed(0);
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    async updateTimeline() {
        const startDate = this.addDays(this.currentDate, -this.pastDays);
        const endDate = this.addDays(this.currentDate, this.futureDays);

        const labels = this.selectedLabels.length > 0 ? this.selectedLabels.join(',') : '';

        try {
            const response = await fetch(
                `/api/timeline?start_date=${startDate}&end_date=${endDate}&starting_balance=${this.startingBalance}&labels=${labels}`
            );
            const data = await response.json();

            // Update chart
            const labels_arr = data.timeline.map(point => {
                const date = new Date(point.date);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });
            const balances = data.timeline.map(point => point.balance);
            const zeroLine = data.timeline.map(() => 0); // Zero threshold line

            this.chart.data.labels = labels_arr;
            this.chart.data.datasets[0].data = balances;
            this.chart.data.datasets[1].data = zeroLine; // Update zero line

            // Check if balance ever goes to zero or negative
            const hasZeroOrNegative = balances.some(b => b <= 0);
            const minBalance = Math.min(...balances);

            // Show warning banner if balance hits zero or negative
            this.updateDangerWarning(hasZeroOrNegative, minBalance, data.timeline);

            this.chart.update();

            // Update current balance (balance at current date)
            const currentDateIndex = data.timeline.findIndex(p => p.date === this.currentDate);
            if (currentDateIndex >= 0) {
                this.currentBalance = data.timeline[currentDateIndex].balance;
            } else {
                this.currentBalance = data.ending_balance;
            }

            // Update balance display with danger styling
            const balanceElement = document.getElementById('currentBalance');
            balanceElement.textContent = '$' + this.currentBalance.toFixed(2);

            const balanceDisplay = document.querySelector('.balance-display');
            if (this.currentBalance < 0) {
                balanceDisplay.classList.add('danger');
                balanceDisplay.classList.remove('warning');
            } else if (this.currentBalance === 0) {
                balanceDisplay.classList.add('warning');
                balanceDisplay.classList.remove('danger');
            } else if (this.currentBalance < 100) {
                balanceDisplay.classList.add('warning');
                balanceDisplay.classList.remove('danger');
            } else {
                balanceDisplay.classList.remove('danger', 'warning');
            }

            // Update stats
            document.getElementById('periodEvents').textContent = data.events.length;

        } catch (error) {
            console.error('Error updating timeline:', error);
        }
    }

    updateDangerWarning(hasZeroOrNegative, minBalance, timeline) {
        // Remove existing warning if present
        let warning = document.getElementById('dangerWarning');

        if (hasZeroOrNegative) {
            // Find when balance hits zero or negative
            const dangerPoints = timeline.filter(p => p.balance <= 0);
            const firstDangerDate = dangerPoints.length > 0 ? dangerPoints[0].date : null;

            if (!warning) {
                warning = document.createElement('div');
                warning.id = 'dangerWarning';
                warning.className = 'danger-warning';
                document.querySelector('.chart-container').insertAdjacentElement('beforebegin', warning);
            }

            warning.innerHTML = `
                <div class="warning-content">
                    <span class="warning-icon">⚠️</span>
                    <div class="warning-text">
                        <strong>DANGER: Balance Hits Zero!</strong>
                        <p>Your balance reaches $${minBalance.toFixed(2)} on ${new Date(firstDangerDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. 
                        ${minBalance < 0 ? 'You will be overdrawn!' : 'Critical low balance!'}</p>
                    </div>
                </div>
            `;
            warning.style.display = 'block';
        } else if (warning) {
            warning.style.display = 'none';
        }
    }

    async loadLabels() {
        try {
            const response = await fetch('/api/labels');
            const data = await response.json();

            const select = document.getElementById('labelFilter');
            select.innerHTML = '<option value="">All Labels</option>';

            data.labels.forEach(label => {
                const option = document.createElement('option');
                option.value = label;
                option.textContent = label;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading labels:', error);
        }
    }

    async loadEvents() {
        try {
            const response = await fetch('/api/events');
            const data = await response.json();

            document.getElementById('totalEvents').textContent = data.events.length;

            this.renderEvents(data.events);
        } catch (error) {
            console.error('Error loading events:', error);
        }
    }

    renderEvents(events) {
        const grid = document.getElementById('eventsGrid');
        grid.innerHTML = '';

        if (events.length === 0) {
            grid.innerHTML = '<p style="color: var(--text-dim); text-align: center; padding: 2rem;">No events yet. Click "Add Event" to get started!</p>';
            return;
        }

        events.forEach(event => {
            const card = document.createElement('div');
            card.className = `event-card ${event.amount >= 0 ? 'positive' : 'negative'}`;

            const dateDisplay = event.is_recurring
                ? `${event.recurrence_pattern} (${event.recurrence_start} to ${event.recurrence_end || 'indefinite'})`
                : event.event_date;

            card.innerHTML = `
                <div class="event-header">
                    <div class="event-description">${event.description}</div>
                    <div class="event-amount ${event.amount >= 0 ? 'positive' : 'negative'}">
                        ${event.amount >= 0 ? '+' : ''}$${Math.abs(event.amount).toFixed(2)}
                    </div>
                </div>
                <div class="event-details">
                    ${event.is_recurring ? '🔁' : '📅'} ${dateDisplay}
                </div>
                ${event.comment ? `<div class="event-comment">${event.comment}</div>` : ''}
                ${event.labels && event.labels.length > 0 ? `
                    <div class="event-labels">
                        ${event.labels.map(label => `<span class="label-tag">${label}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="event-actions">
                    <button class="edit-btn" data-id="${event.id}">Edit</button>
                    <button class="delete-btn" data-id="${event.id}">Delete</button>
                </div>
            `;

            // Add event listeners
            card.querySelector('.edit-btn').addEventListener('click', () => {
                this.editEvent(event);
            });

            card.querySelector('.delete-btn').addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this event?')) {
                    await this.deleteEvent(event.id);
                }
            });

            grid.appendChild(card);
        });
    }

    openEventModal(event = null) {
        this.editingEventId = event ? event.id : null;

        document.getElementById('modalTitle').textContent = event ? 'Edit Event' : 'Add Event';

        if (event) {
            document.getElementById('eventDescription').value = event.description;
            document.getElementById('eventAmount').value = event.amount;
            document.getElementById('eventComment').value = event.comment || '';
            document.getElementById('eventRecurring').checked = event.is_recurring === 1;

            if (event.is_recurring) {
                document.getElementById('oneOffFields').style.display = 'none';
                document.getElementById('recurringFields').style.display = 'block';
                document.getElementById('recurrencePattern').value = event.recurrence_pattern;
                document.getElementById('recurrenceInterval').value = event.recurrence_interval || 1;
                document.getElementById('recurrenceStart').value = event.recurrence_start;
                document.getElementById('recurrenceEnd').value = event.recurrence_end || '';
            } else {
                document.getElementById('oneOffFields').style.display = 'block';
                document.getElementById('recurringFields').style.display = 'none';
                document.getElementById('eventDate').value = event.event_date;
            }

            document.getElementById('eventLabels').value = event.labels ? event.labels.join(', ') : '';
        } else {
            document.getElementById('eventForm').reset();
            document.getElementById('oneOffFields').style.display = 'block';
            document.getElementById('recurringFields').style.display = 'none';
            document.getElementById('eventDate').value = this.currentDate;
        }

        document.getElementById('eventModal').classList.add('active');
    }

    closeEventModal() {
        document.getElementById('eventModal').classList.remove('active');
        document.getElementById('eventForm').reset();
        this.editingEventId = null;
    }

    editEvent(event) {
        this.openEventModal(event);
    }

    async saveEvent() {
        const isRecurring = document.getElementById('eventRecurring').checked;
        const labels = document.getElementById('eventLabels').value
            .split(',')
            .map(l => l.trim())
            .filter(l => l.length > 0);

        const eventData = {
            description: document.getElementById('eventDescription').value,
            amount: parseFloat(document.getElementById('eventAmount').value),
            comment: document.getElementById('eventComment').value,
            is_recurring: isRecurring,
            labels: labels
        };

        if (isRecurring) {
            eventData.recurrence_pattern = document.getElementById('recurrencePattern').value;
            eventData.recurrence_interval = parseInt(document.getElementById('recurrenceInterval').value);
            eventData.recurrence_start = document.getElementById('recurrenceStart').value;
            eventData.recurrence_end = document.getElementById('recurrenceEnd').value || null;
        } else {
            eventData.event_date = document.getElementById('eventDate').value;
        }

        try {
            if (this.editingEventId) {
                // Update existing event
                await fetch(`/api/events/${this.editingEventId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(eventData)
                });
            } else {
                // Create new event
                await fetch('/api/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(eventData)
                });
            }

            this.closeEventModal();
            await this.loadLabels();
            await this.loadEvents();
            await this.updateTimeline();
        } catch (error) {
            console.error('Error saving event:', error);
            alert('Error saving event. Please check the console for details.');
        }
    }

    async deleteEvent(eventId) {
        try {
            await fetch(`/api/events/${eventId}`, {
                method: 'DELETE'
            });

            await this.loadLabels();
            await this.loadEvents();
            await this.updateTimeline();
        } catch (error) {
            console.error('Error deleting event:', error);
        }
    }

    addDays(dateStr, days) {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BudgetApp();
});
