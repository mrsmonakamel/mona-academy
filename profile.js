// profile.js - ملف JavaScript خاص بصفحة الملف الشخصي
// ============================================

// ================ FIREBASE IMPORTS ================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, get, update, push, set, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ================ CONFIG ================
const firebaseConfig = {
    apiKey: "AIzaSyA8KQAQgu4nIiomoDpoTLnBz_uAtab63sY",
    authDomain: "monaacademy-cd983.firebaseapp.com",
    databaseURL: "https://monaacademy-cd983-default-rtdb.firebaseio.com",
    projectId: "monaacademy-cd983",
    storageBucket: "monaacademy-cd983.appspot.com",
    appId: "1:410646694761:web:bea49c51d3b0ff5eb9cbf8"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const dbRef = ref(db);

// ================ GLOBAL VARIABLES ================
let currentUser = null;
let currentStudentData = null;

// ================ THEME MANAGEMENT ================
function initTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// ================ MOBILE MENU DROPDOWN ================
function initMobileMenu() {
    const menuBtn = document.getElementById('menuBtn');
    const menuDropdown = document.getElementById('menuDropdown');
    const menuOverlay = document.getElementById('menuOverlay');

    if (!menuBtn || !menuDropdown) {
        console.warn('Mobile menu elements not found');
        return;
    }

    // Toggle menu on button click
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menuDropdown.classList.toggle('show');
        if (menuOverlay) {
            menuOverlay.classList.toggle('show');
        }
    });

    // Close menu when clicking overlay
    if (menuOverlay) {
        menuOverlay.addEventListener('click', () => {
            menuDropdown.classList.remove('show');
            menuOverlay.classList.remove('show');
        });
    }

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!menuDropdown.contains(e.target) && !menuBtn.contains(e.target)) {
            menuDropdown.classList.remove('show');
            if (menuOverlay) {
                menuOverlay.classList.remove('show');
            }
        }
    });

    // Close menu when clicking on a link
    const menuLinks = menuDropdown.querySelectorAll('a');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            menuDropdown.classList.remove('show');
            if (menuOverlay) {
                menuOverlay.classList.remove('show');
            }
        });
    });
}

// ================ TOAST NOTIFICATIONS ================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer') || (() => {
        const div = document.createElement('div');
        div.id = 'toastContainer';
        div.className = 'toast-container';
        document.body.appendChild(div);
        return div;
    })();

    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${escapeHTML(message)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ================ ESCAPE HTML ================
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

// ================ TAB NAVIGATION ================
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            // Remove active from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active to current
            btn.classList.add('active');
            document.getElementById(tabId)?.classList.add('active');

            // Load tab content if needed
            if (tabId === 'badgesTab' && currentUser) {
                loadUserBadges(currentUser.uid);
            } else if (tabId === 'statsTab' && currentUser) {
                loadProgressVisuals();
            }
        });
    });
}

// ================ LOAD USER DATA ================
async function loadUserData(userId) {
    try {
        const studentSnap = await get(child(dbRef, `students/${userId}`));
        if (studentSnap.exists()) {
            currentStudentData = studentSnap.val();
            displayUserData(currentStudentData);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function displayUserData(data) {
    // Update profile header
    const nameEl = document.getElementById('profileName');
    const idEl = document.getElementById('profileId');
    const gradeEl = document.getElementById('profileGrade');

    if (nameEl) nameEl.textContent = data.name || 'مستخدم';
    if (idEl) idEl.textContent = data.shortId || '';
    if (gradeEl) gradeEl.textContent = data.grade || 'غير محدد';

    // Update stats
    const watchedCount = data.watchedVideos ? Object.keys(data.watchedVideos).length : 0;
    const examsCount = data.examResults ? Object.keys(data.examResults).length : 0;
    const points = data.points || 0;

    const videosEl = document.getElementById('statVideos');
    const examsEl = document.getElementById('statExams');
    const pointsEl = document.getElementById('statPoints');

    if (videosEl) videosEl.textContent = watchedCount;
    if (examsEl) examsEl.textContent = examsCount;
    if (pointsEl) pointsEl.textContent = points;

    // Update progress bars
    updateProgressBars(data);
}

function updateProgressBars(data) {
    // Calculate progress based on watched videos
    const maxVideos = 100;
    const watchedCount = data.watchedVideos ? Object.keys(data.watchedVideos).length : 0;
    const progressPercent = Math.min((watchedCount / maxVideos) * 100, 100);

    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    if (progressFill) progressFill.style.width = `${progressPercent}%`;
    if (progressText) progressText.textContent = `${Math.round(progressPercent)}%`;
}

// ================ LOAD SUBSCRIPTIONS ================
async function loadSubscriptions(userId) {
    const container = document.getElementById('subscriptionsList');
    if (!container) return;

    try {
        const subsSnap = await get(child(dbRef, `students/${userId}/subscriptions`));
        const foldersSnap = await get(child(dbRef, 'folders'));

        let html = '';
        if (subsSnap.exists() && foldersSnap.exists()) {
            const folders = foldersSnap.val();

            subsSnap.forEach(sub => {
                const folderId = sub.key;
                const folder = folders[folderId];
                if (folder) {
                    html += `
                        <div class="subscription-card">
                            <img src="${escapeHTML(folder.img || 'mona.jpg')}" alt="${escapeHTML(folder.name)}" onerror="this.src='mona.jpg'">
                            <div class="subscription-info">
                                <h4>${escapeHTML(folder.name)}</h4>
                                <span class="badge-grade">${escapeHTML(folder.grade || 'غير محدد')}</span>
                            </div>
                        </div>
                    `;
                }
            });
        }

        container.innerHTML = html || '<p class="empty-state">لا توجد اشتراكات</p>';
    } catch (error) {
        console.error('Error loading subscriptions:', error);
    }
}

// ================ LOAD EXAM RESULTS ================
async function loadExamResults(userId) {
    const container = document.getElementById('examResultsList');
    if (!container) return;

    try {
        const resultsSnap = await get(child(dbRef, `students/${userId}/examResults`));

        let html = '';
        if (resultsSnap.exists()) {
            const results = [];
            resultsSnap.forEach(result => {
                results.push(result.val());
            });

            results.sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));

            results.forEach(result => {
                const percentage = result.percentage || 0;
                const scoreClass = percentage >= 90 ? 'excellent' : percentage >= 70 ? 'good' : percentage >= 50 ? 'average' : 'low';

                html += `
                    <div class="exam-result-card ${scoreClass}">
                        <div class="exam-info">
                            <h4>${escapeHTML(result.examName || 'امتحان')}</h4>
                            <span class="exam-date">${escapeHTML(result.completedAt || '')}</span>
                        </div>
                        <div class="exam-score">
                            <span class="score-value">${result.score}/${result.total}</span>
                            <span class="score-percent">${percentage}%</span>
                        </div>
                    </div>
                `;
            });
        }

        container.innerHTML = html || '<p class="empty-state">لا توجد نتائج امتحانات</p>';
    } catch (error) {
        console.error('Error loading exam results:', error);
    }
}

// ================ LOAD BADGES ================
async function loadUserBadges(userId) {
    const container = document.getElementById('badgesList');
    if (!container) return;

    try {
        const badgesSnap = await get(child(dbRef, `students/${userId}/badges`));

        let html = '';
        if (badgesSnap.exists()) {
            const badges = [];
            badgesSnap.forEach(badge => {
                badges.push(badge.val());
            });

            badges.sort((a, b) => new Date(b.earnedAt || 0) - new Date(a.earnedAt || 0));

            badges.forEach(badge => {
                const levelColor = getBadgeLevelColor(badge.level);
                html += `
                    <div class="badge-card" style="border-color: ${levelColor};">
                        <div class="badge-icon" style="background: ${levelColor}">
                            <i class="fas ${badge.icon || 'fa-medal'}"></i>
                        </div>
                        <div class="badge-info">
                            <h4>${escapeHTML(badge.name)}</h4>
                            <p>${escapeHTML(badge.description)}</p>
                            <span class="badge-points">+${badge.points} نقطة</span>
                        </div>
                    </div>
                `;
            });
        }

        container.innerHTML = html || '<p class="empty-state">لا توجد شارات بعد</p>';
    } catch (error) {
        console.error('Error loading badges:', error);
    }
}

function getBadgeLevelColor(level) {
    const colors = {
        bronze: '#cd7f32',
        silver: '#c0c0c0',
        gold: '#ffd700',
        platinum: '#e5e4e2'
    };
    return colors[level] || '#6c5ce7';
}

// ================ LOAD PROGRESS VISUALS ================
async function loadProgressVisuals() {
    if (!currentUser || !currentStudentData) return;

    try {
        if (typeof Chart !== 'undefined') {
            drawScoresChart(currentStudentData.examResults);
            drawActivityChart(currentStudentData);
        }
    } catch (error) {
        console.error('Error loading progress visuals:', error);
    }
}

function drawScoresChart(examResults) {
    const canvas = document.getElementById('scoresChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (window.scoresChartInstance) {
        window.scoresChartInstance.destroy();
    }

    if (!examResults) {
        canvas.parentElement.innerHTML += '<p class="empty-state">لا توجد نتائج</p>';
        return;
    }

    const exams = Object.values(examResults);
    if (exams.length === 0) return;

    exams.sort((a, b) => new Date(a.completedAt || 0) - new Date(b.completedAt || 0));

    const labels = exams.map((e, i) => `امتحان ${i + 1}`);
    const scores = exams.map(e => e.percentage || 0);

    window.scoresChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'النسبة المئوية',
                data: scores,
                borderColor: '#6c5ce7',
                backgroundColor: 'rgba(108, 92, 231, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function drawActivityChart(studentData) {
    const canvas = document.getElementById('activityChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (window.activityChartInstance) {
        window.activityChartInstance.destroy();
    }

    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const activityData = [0, 0, 0, 0, 0, 0, 0];

    if (studentData.watchedVideos) {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        Object.values(studentData.watchedVideos).forEach(video => {
            if (video.watchedAt) {
                const date = new Date(video.watchedAt);
                if (date >= oneWeekAgo) {
                    activityData[date.getDay()]++;
                }
            }
        });
    }

    window.activityChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [{
                label: 'عدد المشاهدات',
                data: activityData,
                backgroundColor: '#6c5ce7',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// ================ LOGOUT ================
function logout() {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Logout error:', error);
        showToast('حدث خطأ أثناء تسجيل الخروج', 'error');
    });
}

// ================ INITIALIZATION ================
function initProfilePage() {
    initTabs();

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData(user.uid);
            await loadSubscriptions(user.uid);
            await loadExamResults(user.uid);
            await loadUserBadges(user.uid);
        } else {
            window.location.href = 'index.html';
        }
    });

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// ================ DOM READY ================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileMenu();
    initProfilePage();
});

// Expose functions to window
window.toggleTheme = toggleTheme;
window.logout = logout;
