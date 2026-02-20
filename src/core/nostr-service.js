import { SimplePool } from 'nostr-tools';
import { AuthManager } from './auth.js';

export class NostrService {
    constructor(relayUrls) {
        this.relays = relayUrls;
        this.pool = new SimplePool();
    }

    /* Subscribes to Kind 1 events with the spatial_anchor tag across configured relays. */
    subscribeToAnchors(onEvent) {
        const mainFilter = {
            kinds: [1],
            "#t": ["spatial_anchor"]
        };

        console.log("🔍 Sending global filter:", mainFilter);

        return this.pool.subscribeMany(
            this.relays, 
            mainFilter, 
            {
                onevent(event) {
                    if (event && event.id) {
                        console.log("✨ Spot found!", event.id);
                        onEvent(event);
                    }
                },
                oneose() {
                    console.log("✅ Clean connection: History synchronized.");
                }
            }
        );
    }
    
    /* Signs and publishes a standard Kind 1 anchor event. */
    async publishAnchor(eventData) {
        const event = {
            kind: 1,
            pubkey: eventData.pubkey,
            created_at: Math.floor(Date.now() / 1000),
            content: eventData.content,
            tags: eventData.tags
        };

        try {
            /* Requests signature from the browser extension (NIP-07). */
            const signedEvent = await window.nostr.signEvent(event);
            
            /* Broadcasts the signed event to all relays. */
            await Promise.any(this.pool.publish(this.relays, signedEvent));
            
            console.log("🚀 Event anchored and published:", signedEvent);
            return signedEvent;
        } catch (err) {
            console.error("❌ Error in anchoring process:", err);
            throw err;
        }
    }

    /* Fetches user profile metadata (Kind 0) with a 3-second timeout. */
    async getUserProfile(pubkey) {
        const filter = { kinds: [0], authors: [pubkey], limit: 1 };
        
        try {
            const event = await this.pool.get(this.relays, filter, { timeout: 3000 });
            
            if (event && event.content) {
                return JSON.parse(event.content);
            }
        } catch (e) {
            console.warn("⚠️ Could not load profile for:", pubkey);
        }
        return null;
    }

    /* Requests a Kind 5 event deletion (NIP-09) for a specific event ID. */
    async deleteEvent(eventId) {
        const event = {
            kind: 5,
            pubkey: AuthManager.userPubkey, 
            created_at: Math.floor(Date.now() / 1000),
            tags: [['e', eventId]],
            content: 'Removing old spatial anchor'
        };

        try {
            const signedEvent = await window.nostr.signEvent(event);
            /* Broadcasts without requesting additional signatures. */
            return await this.broadcastEvent(signedEvent); 
        } catch (err) {
            console.error("Error signing deletion:", err);
            return false;
        }
    }

    /* Queries relays for a specific set of events based on a filter. */
    async fetchEvents(filter) {
        try {
            return await this.pool.querySync(this.relays, filter);
        } catch (err) {
            console.error("Error fetching events:", err);
            return [];
        }
    }

    /* Generic method to sign and broadcast any provided event structure. */
    async publishEvent(event) {
        try {
            const signedEvent = await window.nostr.signEvent(event);
            return await this.broadcastEvent(signedEvent); 
        } catch (err) {
            return false;
        }
    }

    /* Internal method to push signed events to the network via SimplePool. */
    async broadcastEvent(signedEvent) { /* Renamed from sendOnly */
        try {
            await Promise.all(this.pool.publish(this.relays, signedEvent));
            return true;
        } catch (err) {
            console.error("Network failure during broadcast:", err);
            return false;
        }
    }
}