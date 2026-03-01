// ======= Firebase globals (مُحمَّلة من script.js عبر window) =======
(function() {
    // انتظار تهيئة Firebase قبل تشغيل الكود
    function waitForFirebase(callback, retries = 50) {
        if (window.db && window.dbRef) {
            callback();
        } else if (retries > 0) {
            setTimeout(() => waitForFirebase(callback, retries - 1), 100);
        } else {
            console.error('Firebase not initialized after timeout');
        }
    }
    window._waitForFirebase = waitForFirebase;
})();

// whatsapp-group.js
// عرض رابط مجموعة الواتساب للكورس (للمشتركين فقط)

window.displayWhatsappGroup = async function(courseId) {
    const container = document.getElementById('whatsappGroupContainer');
    if (!container) return;

    try {
        const snap = await window.get(window.child(window.dbRef, `folders/${courseId}/whatsappGroupLink`));
        if (snap.exists() && snap.val()) {
            const rawLink = snap.val();
            // التحقق من أن الرابط آمن (https أو http فقط)
            let safeLink = '';
            try {
                const parsed = new URL(rawLink);
                if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
                    safeLink = parsed.href;
                }
            } catch (e) {
                console.warn('Invalid WhatsApp group URL:', rawLink);
            }

            if (!safeLink) {
                container.innerHTML = '';
                return;
            }

            const linkEl = document.createElement('a');
            linkEl.href = safeLink;
            linkEl.target = '_blank';
            linkEl.rel = 'noopener noreferrer';
            linkEl.className = 'btn btn-success';
            linkEl.style.cssText = 'background: #25d366; color: white; padding: 10px 20px; border-radius: 50px; text-decoration: none; display: inline-block; margin-top: 10px;';
            linkEl.innerHTML = '<i class="fab fa-whatsapp"></i> انضمام للمجموعة';

            const card = document.createElement('div');
            card.className = 'whatsapp-group-card';
            card.innerHTML = '<i class="fab fa-whatsapp"></i><h3>📱 مجموعة واتساب الكورس</h3><p>انضم للمجموعة للمناقشة والاستفسار مع الزملاء</p>';
            card.appendChild(linkEl);

            container.innerHTML = '';
            container.appendChild(card);
        } else {
            container.innerHTML = ''; // لا يوجد رابط
        }
    } catch (error) {
        console.error('Error loading WhatsApp group link:', error);
        container.innerHTML = '';
    }
};