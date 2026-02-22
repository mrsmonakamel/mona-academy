// profile.js
// دالة تحديث قائمة الهامبرجر في صفحة الملف الشخصي
// هذه الدالة تُستخدم في profile.html فقط وتتعامل مع نفس عناصر script.js

function updateMenuItems(isLoggedIn) {
    const profileItem = document.getElementById('profileMenuItem');
    const homeItem = document.getElementById('homeMenuItem');
    const divider = document.getElementById('menuDivider');
    const logoutItem = document.getElementById('logoutMenuItem');

    if (isLoggedIn) {
        if (profileItem) profileItem.style.display = 'block';
        if (homeItem) {
            homeItem.style.display = 'block';
            homeItem.onclick = function(e) {
                e.preventDefault();
                window.goHome ? window.goHome() : (window.location.href = 'index.html');
                if (window.closeMenu) window.closeMenu();
            };
        }
        if (divider) divider.style.display = 'block';
        if (logoutItem) {
            logoutItem.style.display = 'block';
            logoutItem.onclick = function(e) {
                e.preventDefault();
                if (window.logout) window.logout();
                if (window.closeMenu) window.closeMenu();
            };
        }
    } else {
        if (profileItem) profileItem.style.display = 'none';
        if (homeItem) homeItem.style.display = 'none';
        if (divider) divider.style.display = 'none';
        if (logoutItem) logoutItem.style.display = 'none';
    }
}
