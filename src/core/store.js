/**
 * Centralized Store for managing application state.
 * Uses a Proxy to intercept changes if needed later for reactivity.
 */
class Store {
    constructor() {
        this.state = {
            user: null, // { pubkey, profile }
            relays: ['wss://nos.lol', 'wss://relay.primal.net', 'wss://relay.damus.io'],
            processedEvents: new Set(),
            markers: new Map(),
            isLoggedIn: false
        };
        this.listeners = [];
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notify();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(l => l(this.state));
    }
}

export const store = new Store();
