// Labels Management App

class LabelsApp {
    constructor() {
        this.editingLabelName = null;
        this.init();
    }

    async init() {
        await this.loadLabels();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', async () => {
            await this.loadLabels();
        });

        // Rename modal controls
        document.getElementById('closeRenameModal').addEventListener('click', () => {
            this.closeRenameModal();
        });

        document.getElementById('cancelRenameBtn').addEventListener('click', () => {
            this.closeRenameModal();
        });

        document.getElementById('renameModal').addEventListener('click', (e) => {
            if (e.target.id === 'renameModal') {
                this.closeRenameModal();
            }
        });

        // Rename form submission
        document.getElementById('renameForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.renameLabel();
        });
    }

    async loadLabels() {
        try {
            const response = await fetch('/api/labels/with-counts');
            const data = await response.json();

            this.renderLabels(data.labels);
        } catch (error) {
            console.error('Error loading labels:', error);
        }
    }

    renderLabels(labels) {
        const grid = document.getElementById('labelsGrid');
        grid.innerHTML = '';

        if (labels.length === 0) {
            grid.innerHTML = '<p style="color: var(--text-dim); text-align: center; padding: 2rem;">No labels yet. Labels will appear here when you add them to events.</p>';
            return;
        }

        labels.forEach(label => {
            const card = document.createElement('div');
            card.className = 'label-card';

            card.innerHTML = `
                <div class="label-header">
                    <div class="label-name">${this.escapeHtml(label.name)}</div>
                    <div class="label-count">${label.count} ${label.count === 1 ? 'event' : 'events'}</div>
                </div>
                <div class="label-actions">
                    <button class="btn btn-small btn-secondary rename-btn" data-label="${this.escapeHtml(label.name)}">Rename</button>
                    <button class="btn btn-small btn-danger delete-btn" data-label="${this.escapeHtml(label.name)}">Delete</button>
                </div>
            `;

            // Add event listeners
            card.querySelector('.rename-btn').addEventListener('click', () => {
                this.openRenameModal(label.name);
            });

            card.querySelector('.delete-btn').addEventListener('click', async () => {
                if (confirm(`Are you sure you want to delete the label "${label.name}"? This will remove the label from all ${label.count} event${label.count === 1 ? '' : 's'} that use it.`)) {
                    await this.deleteLabel(label.name);
                }
            });

            grid.appendChild(card);
        });
    }

    openRenameModal(labelName) {
        this.editingLabelName = labelName;
        document.getElementById('renameModalTitle').textContent = `Rename "${labelName}"`;
        document.getElementById('newLabelName').value = labelName;
        document.getElementById('renameModal').classList.add('active');
        document.getElementById('newLabelName').focus();
    }

    closeRenameModal() {
        document.getElementById('renameModal').classList.remove('active');
        document.getElementById('renameForm').reset();
        this.editingLabelName = null;
    }

    async renameLabel() {
        const newName = document.getElementById('newLabelName').value.trim();

        if (!newName) {
            alert('Please enter a label name');
            return;
        }

        if (newName === this.editingLabelName) {
            this.closeRenameModal();
            return;
        }

        try {
            const encodedName = encodeURIComponent(this.editingLabelName);
            const response = await fetch(`/api/labels/${encodedName}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_name: newName })
            });

            if (!response.ok) {
                throw new Error('Failed to rename label');
            }

            this.closeRenameModal();
            await this.loadLabels();
        } catch (error) {
            console.error('Error renaming label:', error);
            alert('Error renaming label. Please check the console for details.');
        }
    }

    async deleteLabel(labelName) {
        try {
            const encodedName = encodeURIComponent(labelName);
            const response = await fetch(`/api/labels/${encodedName}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete label');
            }

            await this.loadLabels();
        } catch (error) {
            console.error('Error deleting label:', error);
            alert('Error deleting label. Please check the console for details.');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new LabelsApp();
});

