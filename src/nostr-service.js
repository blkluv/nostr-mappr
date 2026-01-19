import { SimplePool } from 'nostr-tools';
import { AuthManager } from './auth.js';

export class NostrService {
    constructor(relayUrls) {
        this.relays = relayUrls;
        this.pool = new SimplePool();
    }

    
    subscribeToAnchors(onEvent) {
    const filtro = {
    kinds: [1],
    "#t": ["spatial_anchor"],
    limit: 100
};

// Solo añadimos authors si hay pubkey
if (AuthManager.userPubkey) {
        filtros.push({
            kinds: [1],
            authors: [AuthManager.userPubkey],
            limit: 50
        });
    }

   return this.pool.subscribeMany(
    this.relays, 
    [filtro],   // <-- IMPORTANTE: array con UN solo objeto dentro
    {
        onevent(event) {
            if (event && event.id) {
                onEvent(event);
            }
        },
        oneose() {
            console.log("Conexión exitosa: Historial sincronizado.");
        },
        onclose(relay) {
            console.warn("🔌 Relay cerrado:", relay);
        },
        onerror(err) {
            console.error("⚠️ Error de relay:", err);
        }
    }
);

}

async publishAnchor(eventData) {
    // 1. Preparar el evento base
    const event = {
        kind: 1,
        pubkey: eventData.pubkey,
        created_at: Math.floor(Date.now() / 1000),
        content: eventData.content,
        tags: eventData.tags
    };

    // 2. Firmar usando la extensión del navegador (Alby/Nostr)
    try {
        const signedEvent = await window.nostr.signEvent(event);
        
        // 3. Publicar a todos los relays configurados
        await Promise.any(this.pool.publish(this.relays, signedEvent));
        
        console.log("✅ Evento publicado con éxito:", signedEvent);
        return signedEvent;
    } catch (err) {
        console.error("❌ Error al firmar o publicar:", err);
        throw err;
    }
}
    // nostr-service.js version original sin funcionar

   /* async getUserProfile(pubkey) {
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

*/

async getUserProfile(pubkey) {
    const filter = { kinds: [0], authors: [pubkey], limit: 1 };
    
    try {
        // Usamos un timeout para no esperar eternamente a relays lentos
        const event = await this.pool.get(this.relays, filter, { timeout: 3000 });
        
        if (event && event.content) {
            return JSON.parse(event.content);
        }
    } catch (e) {
        console.warn("No se pudo obtener el perfil de:", pubkey);
    }
    return null;
}


}