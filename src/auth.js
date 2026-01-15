// auth.js
export const AuthManager = {
    userPubkey: null,
    profileCache: JSON.parse(localStorage.getItem('nostr_profiles')) || {},

    /**
     * Intenta obtener la pubkey de la extensión (Alby, nos2x, etc.)
     */
    async login() {
        if (!window.nostr) {
            throw new Error("Por favor, instala una extensión de Nostr (Alby o nos2x).");
        }

        try {
            this.userPubkey = await window.nostr.getPublicKey();
            console.log("Login exitoso. Pubkey:", this.userPubkey);
            return this.userPubkey;
        } catch (error) {
            console.error("Error en login:", error);
            throw error;
        }
    },

    /**
     * Guarda un perfil en la caché y en localStorage
     */
    saveProfile(pubkey, profileData) {
        this.profileCache[pubkey] = profileData;
        localStorage.setItem('nostr_profiles', JSON.stringify(this.profileCache));
    },

    /**
     * Obtiene el nombre legible de un pubkey
     */
    getDisplayName(pubkey) {
        return this.profileCache[pubkey]?.name || pubkey.substring(0, 8);
    },

    isLoggedIn() {
        return !!this.userPubkey;
    }
};