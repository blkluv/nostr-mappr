
export const AuthManager = {
    // 1. Cargamos la pubkey guardada al arrancar (si existe)
    userPubkey: localStorage.getItem('nostr_user_pubkey') || null,
    profileCache: JSON.parse(localStorage.getItem('nostr_profiles')) || {},

    async login() {
        if (!window.nostr) {
            throw new Error("Por favor, instala una extensión de Nostr (Alby o nos2x).");
        }

        try {
            const pubkey = await window.nostr.getPublicKey();
            this.userPubkey = pubkey;
            
            // 2. GUARDAR: Clave fundamental para la persistencia
            localStorage.setItem('nostr_user_pubkey', pubkey);
            
            console.log("Login exitoso. Pubkey:", this.userPubkey);
            return this.userPubkey;
        } catch (error) {
            console.error("Error en login:", error);
            throw error;
        }
    },

    // 3. Método para cerrar sesión (Limpieza)
    logout() {
        this.userPubkey = null;
        localStorage.removeItem('nostr_user_pubkey');
        console.log("Sesión cerrada.");
        location.reload(); // Refrescamos para limpiar la UI
    },

    saveProfile(pubkey, profileData) {
        this.profileCache[pubkey] = profileData;
        localStorage.setItem('nostr_profiles', JSON.stringify(this.profileCache));
    },

    getDisplayName(pubkey) {
        return this.profileCache[pubkey]?.name || 
               this.profileCache[pubkey]?.display_name || 
               pubkey.substring(0, 8);
    },

    isLoggedIn() {
        return !!this.userPubkey;
    }
};