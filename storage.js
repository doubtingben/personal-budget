// Storage Backend Abstraction Layer
// Provides unified interface for LocalStorage and Firebase backends

/**
 * Abstract base class for storage backends
 * Defines the interface that all storage implementations must follow
 */
class StorageBackend {
    /**
     * Check if user is authenticated
     * @returns {Promise<boolean>}
     */
    async isAuthenticated() {
        throw new Error('Method not implemented');
    }

    /**
     * Get current user information
     * @returns {Promise<object|null>} User object or null if not authenticated
     */
    async getCurrentUser() {
        throw new Error('Method not implemented');
    }

    /**
     * Get all settings
     * @returns {Promise<object>}
     */
    async getSettings() {
        throw new Error('Method not implemented');
    }

    /**
     * Update settings
     * @param {object} settings - Settings to update
     * @returns {Promise<void>}
     */
    async setSettings(settings) {
        throw new Error('Method not implemented');
    }

    /**
     * Get all events
     * @returns {Promise<Array>}
     */
    async getAllEvents() {
        throw new Error('Method not implemented');
    }

    /**
     * Add a new event
     * @param {object} eventData - Event data
     * @returns {Promise<number|string>} Event ID
     */
    async addEvent(eventData) {
        throw new Error('Method not implemented');
    }

    /**
     * Update an existing event
     * @param {number|string} eventId - Event ID
     * @param {object} eventData - Updated event data
     * @returns {Promise<void>}
     */
    async updateEvent(eventId, eventData) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete an event
     * @param {number|string} eventId - Event ID
     * @returns {Promise<void>}
     */
    async deleteEvent(eventId) {
        throw new Error('Method not implemented');
    }

    /**
     * Get all unique labels
     * @returns {Promise<Array<string>>}
     */
    async getAllLabels() {
        throw new Error('Method not implemented');
    }

    /**
     * Rename a label across all events
     * @param {string} oldName - Current label name
     * @param {string} newName - New label name
     * @returns {Promise<void>}
     */
    async renameLabel(oldName, newName) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete a label from all events
     * @param {string} labelName - Label to delete
     * @returns {Promise<void>}
     */
    async deleteLabel(labelName) {
        throw new Error('Method not implemented');
    }
}

/**
 * LocalStorage backend - stores data in browser's LocalStorage
 * Perfect for unauthenticated sessions and trying out the app
 */
class LocalStorageBackend extends StorageBackend {
    constructor() {
        super();
        this.STORAGE_KEY_EVENTS = 'budget_events';
        this.STORAGE_KEY_SETTINGS = 'budget_settings';
        this.initializeStorage();
    }

    initializeStorage() {
        // Initialize with default data if not present
        if (!localStorage.getItem(this.STORAGE_KEY_EVENTS)) {
            localStorage.setItem(this.STORAGE_KEY_EVENTS, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.STORAGE_KEY_SETTINGS)) {
            const defaultSettings = {
                starting_balance: 1000.00,
                current_date: new Date().toISOString().split('T')[0]
            };
            localStorage.setItem(this.STORAGE_KEY_SETTINGS, JSON.stringify(defaultSettings));
        }
    }

    async isAuthenticated() {
        return false; // LocalStorage is always unauthenticated
    }

    async getCurrentUser() {
        return null; // No user in LocalStorage
    }

    async getSettings() {
        const data = localStorage.getItem(this.STORAGE_KEY_SETTINGS);
        return JSON.parse(data);
    }

    async setSettings(settings) {
        const current = await this.getSettings();
        const updated = { ...current, ...settings };
        localStorage.setItem(this.STORAGE_KEY_SETTINGS, JSON.stringify(updated));
    }

    async getAllEvents() {
        const data = localStorage.getItem(this.STORAGE_KEY_EVENTS);
        return JSON.parse(data) || [];
    }

    async addEvent(eventData) {
        const events = await this.getAllEvents();
        const eventId = Date.now(); // Simple ID generation
        const newEvent = {
            id: eventId,
            ...eventData,
            created_at: new Date().toISOString()
        };
        events.push(newEvent);
        localStorage.setItem(this.STORAGE_KEY_EVENTS, JSON.stringify(events));
        return eventId;
    }

    async updateEvent(eventId, eventData) {
        const events = await this.getAllEvents();
        const index = events.findIndex(e => e.id === eventId);
        if (index !== -1) {
            events[index] = { ...events[index], ...eventData };
            localStorage.setItem(this.STORAGE_KEY_EVENTS, JSON.stringify(events));
        }
    }

    async deleteEvent(eventId) {
        const events = await this.getAllEvents();
        const filtered = events.filter(e => e.id !== eventId);
        localStorage.setItem(this.STORAGE_KEY_EVENTS, JSON.stringify(filtered));
    }

    async getAllLabels() {
        const events = await this.getAllEvents();
        const labelSet = new Set();
        events.forEach(event => {
            if (event.labels && Array.isArray(event.labels)) {
                event.labels.forEach(label => labelSet.add(label));
            }
        });
        return Array.from(labelSet).sort();
    }

    async renameLabel(oldName, newName) {
        const events = await this.getAllEvents();
        events.forEach(event => {
            if (event.labels && Array.isArray(event.labels)) {
                const index = event.labels.indexOf(oldName);
                if (index !== -1) {
                    event.labels[index] = newName;
                }
            }
        });
        localStorage.setItem(this.STORAGE_KEY_EVENTS, JSON.stringify(events));
    }

    async deleteLabel(labelName) {
        const events = await this.getAllEvents();
        events.forEach(event => {
            if (event.labels && Array.isArray(event.labels)) {
                event.labels = event.labels.filter(label => label !== labelName);
            }
        });
        localStorage.setItem(this.STORAGE_KEY_EVENTS, JSON.stringify(events));
    }

    /**
     * Export all data (for migration to cloud)
     * @returns {Promise<object>} All data
     */
    async exportData() {
        return {
            settings: await this.getSettings(),
            events: await this.getAllEvents()
        };
    }

    /**
     * Clear all data (after successful migration)
     * @returns {Promise<void>}
     */
    async clearData() {
        localStorage.removeItem(this.STORAGE_KEY_EVENTS);
        localStorage.removeItem(this.STORAGE_KEY_SETTINGS);
        this.initializeStorage();
    }
}

/**
 * Firebase backend - stores data in Firebase Firestore
 * Requires authentication and provides cloud persistence
 */
class FirebaseBackend extends StorageBackend {
    constructor(firebaseApp, auth, firestore) {
        super();
        this.app = firebaseApp;
        this.auth = auth;
        this.db = firestore;
        this.currentUser = null;

        // Listen for auth state changes
        this.auth.onAuthStateChanged((user) => {
            this.currentUser = user;
        });
    }

    async isAuthenticated() {
        return this.currentUser !== null;
    }

    async getCurrentUser() {
        if (!this.currentUser) return null;
        return {
            uid: this.currentUser.uid,
            email: this.currentUser.email,
            displayName: this.currentUser.displayName,
            photoURL: this.currentUser.photoURL
        };
    }

    getUserDocPath(collection) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }
        return `users/${this.currentUser.uid}/${collection}`;
    }

    async getSettings() {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        const docRef = this.db.collection(this.getUserDocPath('settings')).doc('config');
        const doc = await docRef.get();

        if (doc.exists) {
            return doc.data();
        } else {
            // Return defaults if no settings yet
            const defaults = {
                starting_balance: 1000.00,
                current_date: new Date().toISOString().split('T')[0]
            };
            // Create the document
            await docRef.set(defaults);
            return defaults;
        }
    }

    async setSettings(settings) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        const docRef = this.db.collection(this.getUserDocPath('settings')).doc('config');
        await docRef.set(settings, { merge: true });
    }

    async getAllEvents() {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        const snapshot = await this.db.collection(this.getUserDocPath('events'))
            .orderBy('created_at', 'desc')
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    async addEvent(eventData) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        const newEvent = {
            ...eventData,
            created_at: new Date().toISOString()
        };

        const docRef = await this.db.collection(this.getUserDocPath('events')).add(newEvent);
        return docRef.id;
    }

    async updateEvent(eventId, eventData) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        await this.db.collection(this.getUserDocPath('events'))
            .doc(eventId)
            .update(eventData);
    }

    async deleteEvent(eventId) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        await this.db.collection(this.getUserDocPath('events'))
            .doc(eventId)
            .delete();
    }

    async getAllLabels() {
        const events = await this.getAllEvents();
        const labelSet = new Set();
        events.forEach(event => {
            if (event.labels && Array.isArray(event.labels)) {
                event.labels.forEach(label => labelSet.add(label));
            }
        });
        return Array.from(labelSet).sort();
    }

    async renameLabel(oldName, newName) {
        const events = await this.getAllEvents();
        const batch = this.db.batch();

        events.forEach(event => {
            if (event.labels && Array.isArray(event.labels)) {
                const index = event.labels.indexOf(oldName);
                if (index !== -1) {
                    event.labels[index] = newName;
                    const docRef = this.db.collection(this.getUserDocPath('events')).doc(event.id);
                    batch.update(docRef, { labels: event.labels });
                }
            }
        });

        await batch.commit();
    }

    async deleteLabel(labelName) {
        const events = await this.getAllEvents();
        const batch = this.db.batch();

        events.forEach(event => {
            if (event.labels && Array.isArray(event.labels)) {
                const newLabels = event.labels.filter(label => label !== labelName);
                if (newLabels.length !== event.labels.length) {
                    const docRef = this.db.collection(this.getUserDocPath('events')).doc(event.id);
                    batch.update(docRef, { labels: newLabels });
                }
            }
        });

        await batch.commit();
    }

    /**
     * Import data from another backend (e.g., LocalStorage)
     * @param {object} data - Data to import {settings, events}
     * @returns {Promise<void>}
     */
    async importData(data) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        // Import settings
        if (data.settings) {
            await this.setSettings(data.settings);
        }

        // Import events
        if (data.events && Array.isArray(data.events)) {
            const batch = this.db.batch();
            data.events.forEach(event => {
                const { id, ...eventData } = event; // Remove old ID
                const docRef = this.db.collection(this.getUserDocPath('events')).doc();
                batch.set(docRef, eventData);
            });
            await batch.commit();
        }
    }

    /**
     * Sign in with Google
     * @returns {Promise<object>} User object
     */
    async signInWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await this.auth.signInWithPopup(provider);
        return result.user;
    }

    /**
     * Sign in with GitHub
     * @returns {Promise<object>} User object
     */
    async signInWithGithub() {
        const provider = new firebase.auth.GithubAuthProvider();
        const result = await this.auth.signInWithPopup(provider);
        return result.user;
    }

    /**
     * Sign out
     * @returns {Promise<void>}
     */
    async signOut() {
        await this.auth.signOut();
    }
}
