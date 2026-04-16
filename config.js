// Admin Configuration
const CONFIG = {
    admin: {
        username: '@palmaron',
        userId: '12345' // ID admin user
    },
    features: {
        bonus: {
            enabled: true,
            maintenanceMessage: 'Bonus system is under maintenance'
        },
        referrals: {
            enabled: true,
            maintenanceMessage: 'Referral system is under maintenance'
        },
        transactions: {
            enabled: true,
            maintenanceMessage: 'Transaction history is under maintenance'
        },
        wallet: {
            enabled: true,
            maintenanceMessage: 'Wallet connection is under maintenance'
        },
        profile: {
            enabled: true,
            maintenanceMessage: 'Profile system is under maintenance'
        },
        news: {
            enabled: true,
            maintenanceMessage: 'News system is under maintenance'
        },
        settings: {
            enabled: true,
            maintenanceMessage: 'Settings are under maintenance'
        }
    },
    ui: {
        showDeveloperSignature: true,
        developerSignatureText: 'WebDev by TG @palmaron'
    }
};

// Export for use in HTML
window.CONFIG = CONFIG;
