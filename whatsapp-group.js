// whatsapp-group.js
// عرض رابط مجموعة الواتساب للكورس (للمشتركين فقط)

window.displayWhatsappGroup = async function(courseId) {
    const container = document.getElementById('whatsappGroupContainer');
    if (!container) return;

    try {
        const snap = await window.get(window.child(window.dbRef, `folders/${courseId}/whatsappGroupLink`));
        if (snap.exists() && snap.val()) {
            const rawLink = snap.val();

            // التحقق الأمني: السماح فقط بروابط https وروابط واتساب الرسمية
            let safeLink = '';
            try {
                const parsed = new URL(rawLink);
                if (parsed.protocol === 'https:' &&
                    (parsed.hostname === 'chat.whatsapp.com' || parsed.hostname === 'wa.me')) {
                    safeLink = parsed.href;
                }
            } catch (e) {
                // رابط غير صالح
            }

            if (!safeLink) {
                container.innerHTML = '';
                return;
            }

            container.innerHTML = `
                <div class="whatsapp-group-card">
                    <i class="fab fa-whatsapp"></i>
                    <h3>📱 مجموعة واتساب الكورس</h3>
                    <p>انضم للمجموعة للمناقشة والاستفسار مع الزملاء</p>
                    <a href="${window.escapeHTML(safeLink)}" target="_blank" rel="noopener noreferrer" class="btn btn-success" style="background: #25d366; color: white; padding: 10px 20px; border-radius: 50px; text-decoration: none; display: inline-block; margin-top: 10px;">
                        <i class="fab fa-whatsapp"></i> انضمام للمجموعة
                    </a>
                </div>
            `;
        } else {
            container.innerHTML = '';
        }
    } catch (error) {
        console.error('Error loading WhatsApp group link:', error);
        container.innerHTML = '';
    }
};
