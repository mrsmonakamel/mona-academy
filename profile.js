// profile.js
// دالة تحديث قائمة الهامبرجر في صفحة الملف الشخصي

function updateMenuItems(isLoggedIn) {
    const profileItem = document.getElementById('profileMenuItem');
    const homeItem = document.getElementById('homeMenuItem');
    const divider = document.getElementById('menuDivider');
    const logoutItem = document.getElementById('logoutMenuItem');

    if (isLoggedIn) {
        if (profileItem) {
            profileItem.style.display = 'block';
            profileItem.href = 'profile.html';
        }
        if (homeItem) {
            homeItem.style.display = 'block';
            homeItem.href = 'index.html';
            homeItem.onclick = function() {
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
