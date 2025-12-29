// Budget Visualization App
// Main application logic

class BudgetApp {
    constructor() {
        this.chart = null;
        this.currentBalance = 0;
        this.startingBalance = 1000;
        this.pastDays = 0;
        this.futureDays = 60;
        this.currentDate = new Date().toISOString().split('T')[0]; // Use today's date
        this.selectedLabels = [];
        this.editingEventId = null;

        // Storage backend (will be set during initialization)
        this.storage = null;
        this.user = null;

        this.init();
    }

    async init() {
        // Initialize storage backend (LocalStorage or Firebase)
        await this.initializeStorage();

        // Set up authentication UI
        this.setupAuthUI();

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

    async initializeStorage() {
        // Try to initialize Firebase first
        const firebaseReady = initializeFirebase();

        if (firebaseReady) {
            const fb = getFirebase();
            // Create Firebase backend
            const firebaseBackend = new FirebaseBackend(fb.app, fb.auth, fb.db);

            // Check if user is authenticated
            return new Promise((resolve) => {
                fb.auth.onAuthStateChanged(async (user) => {
                    if (user) {
                        // User is signed in, use Firebase backend
                        this.storage = firebaseBackend;
                        this.user = user;
                        console.log('✅ Using Firebase backend (authenticated)');
                        this.updateBackendIndicator(true);
                        this.updateAuthUI(user);

                        // Check if we should migrate local data
                        await this.checkForLocalDataMigration();
                    } else {
                        // User is not signed in, use LocalStorage
                        this.storage = new LocalStorageBackend();
                        this.user = null;
                        console.log('📦 Using LocalStorage backend (unauthenticated)');
                        this.updateBackendIndicator(false);
                        this.updateAuthUI(null);
                    }
                    resolve();
                });
            });
        } else {
            // Firebase not available, use LocalStorage only
            this.storage = new LocalStorageBackend();
            console.log('📦 Using LocalStorage backend (Firebase not configured)');
            this.updateBackendIndicator(false);
            this.updateAuthUI(null);
        }
    }

    updateBackendIndicator(isAuthenticated) {
        const badge = document.getElementById('backendBadge');
        if (isAuthenticated) {
            badge.textContent = '☁️ Cloud';
            badge.classList.add('cloud');
        } else {
            badge.textContent = '💾 Local';
            badge.classList.remove('cloud');
        }
    }

    updateAuthUI(user) {
        const loginBtn = document.getElementById('loginBtn');
        const userInfo = document.getElementById('userInfo');

        if (user) {
            // Show user info, hide login button
            loginBtn.style.display = 'none';
            userInfo.style.display = 'flex';

            // Update user details
            document.getElementById('userAvatar').src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=8b5cf6&color=fff`;
            document.getElementById('userName').textContent = user.displayName || user.email;
        } else {
            // Show login button, hide user info
            loginBtn.style.display = 'block';
            userInfo.style.display = 'none';
        }
    }

    setupAuthUI() {
        // Login button
        document.getElementById('loginBtn').addEventListener('click', () => {
            document.getElementById('loginModal').classList.add('active');
        });

        // Close login modal
        document.getElementById('closeLoginModal').addEventListener('click', () => {
            document.getElementById('loginModal').classList.remove('active');
        });

        // Google login
        document.getElementById('googleLoginBtn').addEventListener('click', async () => {
            await this.handleGoogleLogin();
        });

        // GitHub login
        document.getElementById('githubLoginBtn').addEventListener('click', async () => {
            await this.handleGithubLogin();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await this.handleLogout();
        });

        // Migration modal buttons
        document.getElementById('skipMigrationBtn').addEventListener('click', () => {
            document.getElementById('migrationModal').classList.remove('active');
        });

        document.getElementById('confirmMigrationBtn').addEventListener('click', async () => {
            await this.performMigration();
        });
    }

    async handleGoogleLogin() {
        try {
            const fb = getFirebase();
            if (!fb) {
                alert('Firebase is not configured. Please see FIREBASE_SETUP.md');
                return;
            }

            await this.storage.signInWithGoogle();
            document.getElementById('loginModal').classList.remove('active');

            // Reinitialize storage with new auth state
            await this.initializeStorage();
            await this.loadSettings();
            await this.loadLabels();
            await this.loadEvents();
            await this.updateTimeline();
        } catch (error) {
            console.error('Google login error:', error);
            alert('Login failed: ' + error.message);
        }
    }

    async handleGithubLogin() {
        try {
            const fb = getFirebase();
            if (!fb) {
                alert('Firebase is not configured. Please see FIREBASE_SETUP.md');
                return;
            }

            await this.storage.signInWithGithub();
            document.getElementById('loginModal').classList.remove('active');

            // Reinitialize storage with new auth state
            await this.initializeStorage();
            await this.loadSettings();
            await this.loadLabels();
            await this.loadEvents();
            await this.updateTimeline();
        } catch (error) {
            console.error('GitHub login error:', error);
            alert('Login failed: ' + error.message);
        }
    }

    async handleLogout() {
        try {
            if (this.storage instanceof FirebaseBackend) {
                await this.storage.signOut();
            }

            // Reinitialize with LocalStorage
            await this.initializeStorage();
            await this.loadSettings();
            await this.loadLabels();
            await this.loadEvents();
            await this.updateTimeline();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    async checkForLocalDataMigration() {
        // Check if there's data in LocalStorage that could be migrated
        const localBackend = new LocalStorageBackend();
        const localEvents = await localBackend.getAllEvents();

        if (localEvents.length > 0) {
            // Show migration prompt
            const stats = document.getElementById('migrationStats');
            stats.innerHTML = `
                <strong>${localEvents.length}</strong> events found in local storage
            `;
            document.getElementById('migrationModal').classList.add('active');
        }
    }

    async performMigration() {
        try {
            const localBackend = new LocalStorageBackend();
            const data = await localBackend.exportData();

            // Import to Firebase
            if (this.storage instanceof FirebaseBackend) {
                await this.storage.importData(data);

                // Clear local data after successful migration
                await localBackend.clearData();

                alert('Data migrated successfully!');
                document.getElementById('migrationModal').classList.remove('active');

                // Reload data
                await this.loadSettings();
                await this.loadLabels();
                await this.loadEvents();
                await this.updateTimeline();
            }
        } catch (error) {
            console.error('Migration error:', error);
            alert('Migration failed: ' + error.message);
        }
    }

    async loadSettings() {
        try {
            const settings = await this.storage.getSettings();
            this.startingBalance = parseFloat(settings.starting_balance);
            this.currentDate = settings.current_date;

            document.getElementById('startingBalance').value = this.startingBalance;

            // Update NOW date display after loading current_date from API
            this.updateNowDateDisplay();
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettings() {
        try {
            await this.storage.setSettings({
                starting_balance: this.startingBalance,
                current_date: this.currentDate
            });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    updateNowDateDisplay() {
        // Update NOW date display (parse date components to avoid timezone issues)
        const [year, month, day] = this.currentDate.split('-').map(Number);
        const nowDate = new Date(year, month - 1, day); // month is 0-indexed
        document.getElementById('nowDate').textContent = nowDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    setupEventListeners() {

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
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#cbd5e1',
                            usePointStyle: true,
                            padding: 15,
                            filter: function (legendItem, chartData) {
                                // Only show Balance, Income Events, and Expense Events in legend
                                return legendItem.text !== 'Zero Line';
                            }
                        }
                    },
                    tooltip: {
                        mode: 'point',
                        intersect: false,
                        axis: 'xy',
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        titleColor: '#f1f5f9',
                        bodyColor: '#cbd5e1',
                        borderColor: '#475569',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function (context) {
                                if (context.datasetIndex === 1) return null; // Hide zero line tooltip

                                // Balance line
                                if (context.datasetIndex === 0) {
                                    const value = context.parsed.y;
                                    const color = value < 0 ? '⚠️ NEGATIVE: $' : value === 0 ? '⚠️ ZERO: $' : 'Balance: $';
                                    return color + value.toFixed(2);
                                }

                                // Event markers (datasets 2 and 3)
                                if (context.datasetIndex === 2 || context.datasetIndex === 3) {
                                    const dataset = context.chart.data.datasets[context.datasetIndex];
                                    const dataPoint = dataset.data[context.dataIndex];

                                    if (dataPoint && dataPoint.events) {
                                        return dataPoint.events.map(e => {
                                            const amount = e.amount >= 0 ? `+$${e.amount.toFixed(2)}` : `-$${Math.abs(e.amount).toFixed(2)}`;
                                            return `${e.description}: ${amount}`;
                                        });
                                    }
                                }

                                return null;
                            },
                            title: function (context) {
                                // Show date in title
                                if (context[0] && context[0].label) {
                                    return context[0].label;
                                }
                                // For event markers, extract from the data
                                if (context[0] && context[0].raw && context[0].raw.x) {
                                    return context[0].raw.x;
                                }
                                return '';
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
                            },
                            nowLine: {
                                type: 'line',
                                xMin: 0,
                                xMax: 0,
                                borderColor: '#a78bfa',
                                borderWidth: 4,
                                borderDash: [],
                                label: {
                                    display: true,
                                    content: '📍 NOW',
                                    position: 'start',
                                    backgroundColor: 'rgba(167, 139, 250, 1)',
                                    color: '#fff',
                                    font: {
                                        size: 14,
                                        weight: 'bold'
                                    },
                                    padding: 8,
                                    borderRadius: 6
                                }
                            },
                            pastShading: {
                                type: 'box',
                                xMin: -0.5,
                                xMax: 0,
                                backgroundColor: 'rgba(30, 41, 59, 0.3)',
                                borderWidth: 0,
                                drawTime: 'beforeDraw'
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

        // Labels will only filter event marker visibility
        // We need to calculate the timeline ourselves now
        try {
            // Get all events from storage
            const allEvents = await this.storage.getAllEvents();

            // Calculate timeline data locally
            const data = this.calculateLocalTimeline(allEvents, startDate, endDate, this.startingBalance);

            // Update chart
            const labels_arr = data.timeline.map(point => {
                const date = new Date(point.date);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });
            const balances = data.timeline.map(point => point.balance);
            const zeroLine = data.timeline.map(() => 0); // Zero threshold line

            // Find the index of the current date for the NOW line
            const currentDateIndex = data.timeline.findIndex(p => p.date === this.currentDate);

            // Create event markers dataset
            const eventMarkers = this.createEventMarkers(data.timeline, data.events);

            this.chart.data.labels = labels_arr;
            this.chart.data.datasets[0].data = balances;
            this.chart.data.datasets[1].data = zeroLine; // Update zero line

            // Add income and expense event markers
            if (this.chart.data.datasets.length > 2) {
                this.chart.data.datasets[2].data = eventMarkers.income;
                this.chart.data.datasets[3].data = eventMarkers.expenses;
            } else {
                this.chart.data.datasets.push({
                    label: 'Income Events',
                    data: eventMarkers.income,
                    backgroundColor: '#10b981',
                    borderColor: '#10b981',
                    borderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointStyle: 'circle',
                    showLine: false,
                    order: 1
                });
                this.chart.data.datasets.push({
                    label: 'Expense Events',
                    data: eventMarkers.expenses,
                    backgroundColor: '#ef4444',
                    borderColor: '#ef4444',
                    borderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointStyle: 'circle',
                    showLine: false,
                    order: 1
                });
            }

            // Update NOW line annotation
            if (this.chart.options.plugins.annotation) {
                if (currentDateIndex >= 0) {
                    // Update the vertical line annotation for NOW
                    this.chart.options.plugins.annotation.annotations.nowLine = {
                        type: 'line',
                        xMin: currentDateIndex,
                        xMax: currentDateIndex,
                        borderColor: '#a78bfa',
                        borderWidth: 4,
                        borderDash: [],
                        label: {
                            display: true,
                            content: '📍 NOW',
                            position: 'start',
                            backgroundColor: 'rgba(167, 139, 250, 1)',
                            color: '#fff',
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            padding: 8,
                            borderRadius: 6
                        }
                    };

                    // Add subtle shading for the past
                    this.chart.options.plugins.annotation.annotations.pastShading = {
                        type: 'box',
                        xMin: -0.5,
                        xMax: currentDateIndex,
                        backgroundColor: 'rgba(30, 41, 59, 0.3)',
                        borderWidth: 0,
                        drawTime: 'beforeDraw'
                    };
                } else {
                    // Hide the annotations if current date is not in the visible range
                    if (this.chart.options.plugins.annotation.annotations.nowLine) {
                        this.chart.options.plugins.annotation.annotations.nowLine.display = false;
                    }
                    if (this.chart.options.plugins.annotation.annotations.pastShading) {
                        this.chart.options.plugins.annotation.annotations.pastShading.display = false;
                    }
                }
            }

            // Check if balance ever goes to zero or negative
            const hasZeroOrNegative = balances.some(b => b <= 0);
            const minBalance = Math.min(...balances);

            // Show warning banner if balance hits zero or negative
            this.updateDangerWarning(hasZeroOrNegative, minBalance, data.timeline);

            this.chart.update();

            // Find current balance at the current date
            const currentDatePoint = data.timeline.find(p => p.date === this.currentDate);
            const currentBalanceAtDate = currentDatePoint ? currentDatePoint.balance : this.startingBalance;

            // Update ending balance (balance at end of timeline)
            this.currentBalance = data.ending_balance;

            // Update starting balance display
            const startingBalanceElement = document.getElementById('startingBalanceDisplay');
            startingBalanceElement.textContent = '$' + data.starting_balance.toFixed(2);

            // Update current balance display (at current date) with danger styling
            const currentBalanceElement = document.getElementById('currentBalance');
            currentBalanceElement.textContent = '$' + currentBalanceAtDate.toFixed(2);

            const currentBalanceDisplay = document.getElementById('currentBalanceDisplay');
            if (currentBalanceAtDate < 0) {
                currentBalanceDisplay.classList.add('danger');
                currentBalanceDisplay.classList.remove('warning');
            } else if (currentBalanceAtDate === 0) {
                currentBalanceDisplay.classList.add('warning');
                currentBalanceDisplay.classList.remove('danger');
            } else if (currentBalanceAtDate < 100) {
                currentBalanceDisplay.classList.add('warning');
                currentBalanceDisplay.classList.remove('danger');
            } else {
                currentBalanceDisplay.classList.remove('danger', 'warning');
            }

            // Update ending balance display
            const endingBalanceElement = document.getElementById('endingBalance');
            endingBalanceElement.textContent = '$' + data.ending_balance.toFixed(2);

            // Update stats
            document.getElementById('periodEvents').textContent = data.events.length;

        } catch (error) {
            console.error('Error updating timeline:', error);
        }
    }

    createEventMarkers(timeline, events) {
        // Filter events by selected labels (only affects visibility, not balance calculation)
        let filteredEvents = events;
        if (this.selectedLabels.length > 0) {
            filteredEvents = events.filter(event => {
                const eventLabels = event.labels || [];
                const hasUnlabeled = this.selectedLabels.includes('__unlabeled__');
                const hasRegularLabels = this.selectedLabels.some(label =>
                    label !== '__unlabeled__' && eventLabels.includes(label)
                );

                // Show event if:
                // - "unlabeled" is selected and event has no labels, OR
                // - event has any of the selected regular labels
                if (hasUnlabeled && eventLabels.length === 0) {
                    return true;
                }
                if (hasRegularLabels) {
                    return true;
                }

                return false;
            });
        }

        // Create arrays for income and expense events with their balance positions
        const income = [];
        const expenses = [];

        // Create a map of dates to balance and label for quick lookup
        const dateBalanceMap = {};
        timeline.forEach((point, index) => {
            const date = new Date(point.date);
            const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dateBalanceMap[point.date] = {
                balance: point.balance,
                label: label  // Use the formatted label instead of index
            };
        });

        // Group filtered events by date to create marker data
        const eventsByDate = {};
        filteredEvents.forEach(event => {
            if (!eventsByDate[event.date]) {
                eventsByDate[event.date] = [];
            }
            eventsByDate[event.date].push(event);
        });

        // For each date with events, add markers
        Object.keys(eventsByDate).forEach(date => {
            const balanceInfo = dateBalanceMap[date];
            if (balanceInfo) {
                const dateEvents = eventsByDate[date];
                const incomeEvents = dateEvents.filter(e => e.amount > 0);
                const expenseEvents = dateEvents.filter(e => e.amount < 0);

                // Create tooltip text
                const incomeTooltip = incomeEvents.map(e =>
                    `${e.description}: +$${e.amount.toFixed(2)}`
                ).join('\n');

                const expenseTooltip = expenseEvents.map(e =>
                    `${e.description}: -$${Math.abs(e.amount).toFixed(2)}`
                ).join('\n');

                // Add income marker
                if (incomeEvents.length > 0) {
                    income.push({
                        x: balanceInfo.label,  // Use label instead of index
                        y: balanceInfo.balance,
                        tooltip: incomeTooltip,
                        events: incomeEvents
                    });
                }

                // Add expense marker
                if (expenseEvents.length > 0) {
                    expenses.push({
                        x: balanceInfo.label,  // Use label instead of index
                        y: balanceInfo.balance,
                        tooltip: expenseTooltip,
                        events: expenseEvents
                    });
                }
            }
        });

        return { income, expenses };
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
            const labels = await this.storage.getAllLabels();

            const select = document.getElementById('labelFilter');
            select.innerHTML = '<option value="">All Labels</option>';

            // Add "unlabeled" option
            const unlabeledOption = document.createElement('option');
            unlabeledOption.value = '__unlabeled__';
            unlabeledOption.textContent = 'Unlabeled';
            select.appendChild(unlabeledOption);

            labels.forEach(label => {
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
            const events = await this.storage.getAllEvents();

            document.getElementById('totalEvents').textContent = events.length;

            this.renderEvents(events);
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
            is_recurring: isRecurring ? 1 : 0,
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
            await this.storage.deleteEvent(eventId);

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

    /**
     * Calculate balance timeline locally (client-side)
     * This replaces the API call to `/api/timeline`
     */
    calculateLocalTimeline(allEvents, startDate, endDate, startingBalance) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Expand recurring events and filter by date range
        const events = [];

        allEvents.forEach(event => {
            if (event.is_recurring || event.is_recurring === 1) {
                // Expand recurring event
                const occurrences = this.expandRecurringEvent(event, start, end);
                events.push(...occurrences);
            } else if (event.event_date) {
                // One-off event
                const eventDate = new Date(event.event_date);
                if (eventDate >= start && eventDate <= end) {
                    events.push({
                        id: event.id,
                        description: event.description,
                        amount: event.amount,
                        date: event.event_date,
                        comment: event.comment,
                        is_recurring: false,
                        labels: event.labels || []
                    });
                }
            }
        });

        // Sort events by date
        events.sort((a, b) => a.date.localeCompare(b.date));

        // Group events by date
        const eventsByDate = {};
        events.forEach(event => {
            if (!eventsByDate[event.date]) {
                eventsByDate[event.date] = [];
            }
            eventsByDate[event.date].push(event);
        });

        // Calculate daily balances
        const timeline = [];
        let currentBalance = startingBalance;
        let currentDate = new Date(start);

        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];

            // Apply events for this date
            if (eventsByDate[dateStr]) {
                eventsByDate[dateStr].forEach(event => {
                    currentBalance += event.amount;
                });
            }

            timeline.push({
                date: dateStr,
                balance: Math.round(currentBalance * 100) / 100 // Round to 2 decimals
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return {
            timeline: timeline,
            events: events,
            starting_balance: startingBalance,
            ending_balance: currentBalance
        };
    }

    /**
     * Expand a recurring event into individual occurrences
     */
    expandRecurringEvent(event, startDate, endDate) {
        const occurrences = [];

        const recStart = new Date(event.recurrence_start);
        const recEnd = event.recurrence_end ? new Date(event.recurrence_end) : endDate;

        let current = new Date(recStart);
        const pattern = event.recurrence_pattern;
        const interval = event.recurrence_interval || 1;

        // Fast-forward to start date
        while (current < startDate && current <= recEnd) {
            current = this.getNextOccurrence(current, pattern, interval);
        }

        // Generate occurrences within range
        while (current <= recEnd && current <= endDate) {
            if (current >= startDate) {
                occurrences.push({
                    id: event.id,
                    description: event.description,
                    amount: event.amount,
                    date: current.toISOString().split('T')[0],
                    comment: event.comment,
                    is_recurring: true,
                    labels: event.labels || []
                });
            }
            current = this.getNextOccurrence(current, pattern, interval);
        }

        return occurrences;
    }

    /**
     * Get next occurrence date for a recurring event
     */
    getNextOccurrence(currentDate, pattern, interval) {
        const next = new Date(currentDate);

        switch (pattern) {
            case 'daily':
                next.setDate(next.getDate() + interval);
                break;
            case 'weekly':
                next.setDate(next.getDate() + (7 * interval));
                break;
            case 'biweekly':
                next.setDate(next.getDate() + 14);
                break;
            case 'monthly':
                next.setMonth(next.getMonth() + interval);
                break;
            case 'quarterly':
                next.setMonth(next.getMonth() + (3 * interval));
                break;
            case 'yearly':
                next.setFullYear(next.getFullYear() + interval);
                break;
        }

        return next;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BudgetApp();
});
