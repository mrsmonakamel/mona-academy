// maintenance.js
window.checkMaintenanceMode = async function() {
    try {
        const settingsRef = window.ref(window.db, 'settings/maintenanceMode');
        const snap = await window.get(settingsRef);
        if (snap.exists() && snap.val().enabled) {
            if (window.currentUser && window.isAdminUser) return false;
            showMaintenancePage(snap.val().message || 'الموقع تحت الصيانة');
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
};

function showMaintenancePage(message) {
    document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #6c5ce7, #4834d4); color: white; text-align: center; padding: 20px;">
            <div style="max-width: 500px;">
                <i class="fas fa-tools fa-4x" style="margin-bottom: 20px;"></i>
                <h1 style="font-size: 2rem;">جاري الصيانة</h1>
                <p style="margin-bottom: 30px;">${window.escapeHTML ? window.escapeHTML(message) : message}</p>
                <button onclick="location.reload()" style="background: white; color: #6c5ce7; padding: 12px 30px; border-radius: 50px; border: none; font-weight: bold; cursor: pointer;">إعادة المحاولة</button>
            </div>
        </div>
    `;
}

window.updateMaintenanceMode = async function(enabled, message) {
    await window.set(window.ref(window.db, 'settings/maintenanceMode'), {
        enabled: enabled,
        message: message,
        updatedAt: new Date().toISOString()
    });
    return true;
};

window.getMaintenanceStatus = async function() {
    const snap = await window.get(window.ref(window.db, 'settings/maintenanceMode'));
    return snap.exists() ? snap.val() : { enabled: false, message: '' };
};
