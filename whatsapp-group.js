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

            // ✅ إصلاح: استخدام DOM API بدلاً من innerHTML مع template literals
            container.innerHTML = '';
            const card = document.createElement('div');
            card.className = 'whatsapp-group-card';

            const icon = document.createElement('i');
            icon.className = 'fab fa-whatsapp';
            card.appendChild(icon);

            const title = document.createElement('h3');
            title.textContent = '📱 مجموعة واتساب الكورس';
            card.appendChild(title);

            const desc = document.createElement('p');
            desc.textContent = 'انضم للمجموعة للمناقشة والاستفسار مع الزملاء';
            card.appendChild(desc);

            const link = document.createElement('a');
            link.href = safeLink; // URL validated above
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.className = 'btn btn-success';
            link.style.cssText = 'background: #25d366; color: white; padding: 10px 20px; border-radius: 50px; text-decoration: none; display: inline-block; margin-top: 10px;';
            const linkIcon = document.createElement('i');
            linkIcon.className = 'fab fa-whatsapp';
            link.appendChild(linkIcon);
            link.appendChild(document.createTextNode(' انضمام للمجموعة'));
            card.appendChild(link);

            container.appendChild(card);
        } else {
            container.innerHTML = '';
        }
    } catch (error) {
        console.error('Error loading WhatsApp group link:', error);
        container.innerHTML = '';
    }
};
