import { SimplePool } from 'nostr-tools';
import { AuthManager } from './auth.js';

export class NostrService {
    constructor(relayUrls) {
        this.relays = relayUrls;
        this.pool = new SimplePool();
    }

subscribeToAnchors(onEvent) {

    const filtroPrincipal = {
        kinds: [1],
        "#t": ["spatial_anchor"]
    };

    console.log("🔍 Enviando filtro único:", filtroPrincipal);

    /*const filtrosParaEnviar = [filtroPrincipal];*/
    
    return this.pool.subscribeMany(
        this.relays, 
        filtroPrincipal, 
        {
            onevent(event) {
                if (event && event.id) {
                    console.log("✨ ¡Punto encontrado!", event.id);
                    onEvent(event);
                }
            },
            oneose() {
                console.log("✅ Conexión limpia: Historial sincronizado.");
            }
        }
    );
}
    
    async publishAnchor(eventData) {
        const event = {
            kind: 1,
            pubkey: eventData.pubkey,
            created_at: Math.floor(Date.now() / 1000),
            content: eventData.content,
            tags: eventData.tags
        };

        try {
            // Llama a la extensión del navegador para firmar
            const signedEvent = await window.nostr.signEvent(event);
            
            // Publica el evento firmado en todos los relays
            await Promise.any(this.pool.publish(this.relays, signedEvent));
            
            console.log("🚀 Evento anclado y publicado:", signedEvent);
            return signedEvent;
        } catch (err) {
            console.error("❌ Error en el proceso de anclaje:", err);
            throw err;
        }
    }

    async getUserProfile(pubkey) {
        const filter = { kinds: [0], authors: [pubkey], limit: 1 };
        
        try {
            // Intentamos obtener el perfil con un límite de tiempo de 3 segundos
            const event = await this.pool.get(this.relays, filter, { timeout: 3000 });
            
            if (event && event.content) {
                return JSON.parse(event.content);
            }
        } catch (e) {
            console.warn("⚠️ No se pudo cargar el perfil para:", pubkey);
        }
        return null;
    }

    // Método para eliminar un evento (ejemplo de NIP-09)

async deleteEvent(eventId) {
    const event = {
        kind: 5,
        pubkey: AuthManager.userPubkey, 
        created_at: Math.floor(Date.now() / 1000),
        tags: [['e', eventId]],
        content: 'Eliminando anclaje de prueba'
    };

    try {
        const signedEvent = await window.nostr.signEvent(event);
        return await this.publish(signedEvent); 
    } catch (err) {
        console.error("Error al borrar:", err);
        return false;
    }
}
async publish(event) {
    try {
        // Publicamos en todos los relays configurados
        await Promise.all(this.pool.publish(this.relays, event));
        console.log("🚀 Evento de borrado (Kind 5) enviado.");
        return true;
    } catch (err) {
        console.error("❌ Fallo al publicar el borrado:", err);
        return false;
    }
}

}