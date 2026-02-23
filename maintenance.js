// maintenance.js
window.checkMaintenanceMode = async function() {
    try {
        // انتظر حتى يتم تهيئة Firebase
        let waitAttempts = 0;
        while ((!window.db || !window.ref || !window.get) && waitAttempts < 30) {
            await new Promise(r => setTimeout(r, 200));
            waitAttempts++;
        }
        
        if (!window.db || !window.ref || !window.get) {
            console.warn('maintenance: Firebase لم يتم تهيئته');
            return false;
        }
        
        const settingsRef = window.ref(window.db, 'settings/maintenanceMode');
        const snap = await window.get(settingsRef);
        
        if (!snap.exists() || !snap.val().enabled) {
            return false;
        }
        
        // وضع الصيانة مفعل - الآن نتحقق من صلاحيات المستخدم
        // انتظر حتى يكتمل onAuthStateChanged (بحد أقصى 5 ثواني)
        let authWaitAttempts = 0;
        while (window.currentUser === undefined && authWaitAttempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            authWaitAttempts++;
        }
        
        // إذا كان المستخدم ادمن فلا نعرض صفحة الصيانة
        if (window.currentUser && window.isAdminUser) {
            return false;
        }
        
        // إذا كان المستخدم مسجل دخوله (لكن ليس ادمن) أو غير مسجل، نتحقق مرة إضافية
        // نعطي وقتًا إضافيًا لـ isAdminUser لكي يتحدد
        if (window.currentUser) {
            // منحظر وقتًا إضافيًا قصيرًا للتحقق من صلاحية الادمن
            await new Promise(r => setTimeout(r, 500));
            if (window.isAdminUser) return false;
        }
        
        showMaintenancePage(snap.val().message || 'الموقع تحت الصيانة');
        return true;
    } catch (error) {
        console.error('Maintenance check error:', error);
        return false;
    }
};

function showMaintenancePage(message) {
    // استخدام textContent بدلاً من innerHTML لمنع XSS
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#6c5ce7,#4834d4);color:white;text-align:center;padding:20px;';
    
    const inner = document.createElement('div');
    inner.style.maxWidth = '500px';
    
    const icon = document.createElement('i');
    icon.className = 'fas fa-tools fa-4x';
    icon.style.marginBottom = '20px';
    
    const title = document.createElement('h1');
    title.style.fontSize = '2rem';
    title.textContent = 'جاري الصيانة';
    
    const msg = document.createElement('p');
    msg.style.marginBottom = '30px';
    msg.textContent = message; // textContent آمن من XSS
    
    const btn = document.createElement('button');
    btn.style.cssText = 'background:white;color:#6c5ce7;padding:12px 30px;border-radius:50px;border:none;font-weight:bold;cursor:pointer;';
    btn.textContent = 'إعادة المحاولة';
    btn.onclick = () => location.reload();
    
    inner.appendChild(icon);
    inner.appendChild(title);
    inner.appendChild(msg);
    inner.appendChild(btn);
    wrapper.appendChild(inner);
    
    document.body.innerHTML = '';
    document.body.appendChild(wrapper);
}

window.updateMaintenanceMode = async function(enabled, message) {
    if (!window.db || !window.ref || !window.set) {
        throw new Error('Firebase غير مهيأ');
    }
    await window.set(window.ref(window.db, 'settings/maintenanceMode'), {
        enabled: Boolean(enabled),
        message: String(message || ''),
        updatedAt: new Date().toISOString()
    });
    return true;
};

window.getMaintenanceStatus = async function() {
    if (!window.db || !window.ref || !window.get) {
        return { enabled: false, message: '' };
    }
    const snap = await window.get(window.ref(window.db, 'settings/maintenanceMode'));
    return snap.exists() ? snap.val() : { enabled: false, message: '' };
};
