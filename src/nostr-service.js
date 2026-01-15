import { SimplePool } from 'nostr-tools';
import { AuthManager } from './auth.js';

export class NostrService {
    constructor(relayUrls) {
        this.relays = relayUrls;
        this.pool = new SimplePool();
    }

    subscribeToAnchors(onEvent) {
        // En producción, enviamos dos filtros claros en un array
        const filtros = [
            { kinds: [1], "#t": ["spatial_anchor"] }
        ];

        if (AuthManager.userPubkey) {
            filtros.push({ kinds: [1], authors: [AuthManager.userPubkey] });
        }

        return this.pool.subscribeMany(this.relays, filtros, {
            onevent(event) { onEvent(event); },
            oneose() { console.log("Historial sincronizado."); }
        });
    }

    async publishAnchor(eventData) {
        const event = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            content: eventData.content,
            tags: eventData.tags,
            pubkey: eventData.pubkey
        };
        const signedEvent = await window.nostr.signEvent(event);
        await Promise.any(this.pool.publish(this.relays, signedEvent));
        return signedEvent;
    }

    // nostr-service.js

    async getUserProfile(pubkey) {
        console.log("Buscando metadatos para:", pubkey);
        
        // El filtro para perfiles es Kind 0
        const filter = { kinds: [0], authors: [pubkey], limit: 1 };
        
        // Usamos get() de la pool para obtener el primero que aparezca
        const event = await this.pool.get(this.relays, filter);
        
        if (event) {
            try {
                return JSON.parse(event.content); // Aquí viene 'name', 'picture', 'about', etc.
            } catch (e) {
                console.error("Error al parsear perfil", e);
                return null;
            }
        }
        return null;
}
}

