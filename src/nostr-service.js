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
    filtro.authors = [AuthManager.userPubkey];
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