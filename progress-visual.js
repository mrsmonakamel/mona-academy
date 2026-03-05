// ======= Firebase globals (مُحمَّلة من script.js عبر window) =======
(function() {
    // انتظار تهيئة Firebase قبل تشغيل الكود
    function waitForFirebase(callback, retries = 50) {
        if (window.db && window.dbRef) {
            callback();
        } else if (retries > 0) {
            setTimeout(() => waitForFirebase(callback, retries - 1), 100);
        } else {
            const msg = 'Firebase لم يتم تهيئته بعد انتظار 5 ثوانٍ – تأكد من تحميل script.js أولاً';
            console.error('❌ ' + msg);
            showErrorBanner(msg, 'firebase-timeout');
        }
    }
    window._waitForFirebase = waitForFirebase;
})();

// ================ نظام عرض الأخطاء ================

/**
 * يعرض بانر خطأ مرئي في أعلى الصفحة مع تفاصيل كاملة.
 * @param {string} message - وصف الخطأ بالعربية
 * @param {string} [errorId]  - معرف فريد لتجنب التكرار
 * @param {Error|string} [rawError] - كائن الخطأ الأصلي (اختياري)
 */
function showErrorBanner(message, errorId = '', rawError = null) {
    // تجنب تكرار نفس الخطأ
    if (errorId && document.getElementById('err-' + errorId)) return;

    const banner = document.createElement('div');
    banner.id = errorId ? 'err-' + errorId : 'err-' + Date.now();
    banner.style.cssText = `
        position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
        background: #ff4757; color: #fff; padding: 14px 20px;
        border-radius: 10px; z-index: 99999; max-width: 90vw;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3); font-family: Arial, sans-serif;
        direction: rtl; text-align: right; font-size: 14px; line-height: 1.6;
    `;

    // تجميع تفاصيل الخطأ
    let details = '';
    if (rawError) {
        if (rawError instanceof Error) {
            details += `\n📌 نوع الخطأ: ${rawError.name}`;
            details += `\n💬 الرسالة: ${rawError.message}`;
            if (rawError.stack) {
                const stackLine = rawError.stack.split('\n').slice(0, 3).join(' | ');
                details += `\n📍 المكان: ${stackLine}`;
            }
        } else {
            details += `\n💬 التفاصيل: ${String(rawError)}`;
        }
    }

    banner.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
            <div>
                <strong>⚠️ خطأ في progress-visual.js</strong><br>
                ${message}
                ${details ? `<pre style="margin:6px 0 0;font-size:11px;background:rgba(0,0,0,0.2);padding:6px;border-radius:5px;white-space:pre-wrap;word-break:break-all;">${details.trim()}</pre>` : ''}
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background:none;border:none;color:#fff;font-size:18px;
                cursor:pointer;padding:0;line-height:1;flex-shrink:0;">✕</button>
        </div>
    `;

    document.body.appendChild(banner);

    // إغلاق تلقائي بعد 15 ثانية
    setTimeout(() => { if (banner.parentElement) banner.remove(); }, 15000);
}

/**
 * يعرض خطأ داخل عنصر canvas أو حاويته (للرسوم البيانية).
 * @param {HTMLElement} container
 * @param {string} message
 * @param {Error|string} [rawError]
 */
function showChartError(container, message, rawError = null) {
    if (!container) return;
    let details = '';
    if (rawError instanceof Error) {
        details = `${rawError.name}: ${rawError.message}`;
    } else if (rawError) {
        details = String(rawError);
    }

    const parent = container.parentElement || container;
    const div = document.createElement('div');
    div.style.cssText = `
        padding: 12px; background: #fff0f0; border: 1px solid #ffcccc;
        border-radius: 8px; color: #cc0000; font-size: 13px;
        direction: rtl; text-align: right; margin-top: 8px;
    `;
    div.innerHTML = `
        <strong>⚠️ ${message}</strong>
        ${details ? `<br><code style="font-size:11px;color:#555;">${details}</code>` : ''}
    `;
    parent.appendChild(div);
}

// progress-visual.js
// ================ الرسوم البيانية لتقدم الطالب ================

// دالة رئيسية لتحميل كل الإحصائيات والرسوم البيانية
window.loadProgressVisuals = async function() {
    if (!window.currentUser) {
        showErrorBanner(
            'لا يوجد مستخدم مسجل دخول – window.currentUser فارغ. تأكد من تسجيل الدخول قبل استدعاء loadProgressVisuals()',
            'no-current-user'
        );
        return;
    }

    try {
        // التحقق من توفر دوال Firebase
        if (typeof window.get !== 'function' || typeof window.child !== 'function' || !window.dbRef) {
            throw new Error('دوال Firebase غير متاحة على window (get / child / dbRef). تحقق من تحميل script.js');
        }

        const studentSnap = await window.get(window.child(window.dbRef, `students/${window.currentUser.uid}`));

        if (!studentSnap.exists()) {
            showErrorBanner(
                `لا توجد بيانات للطالب في Firebase – المسار: students/${window.currentUser.uid}`,
                'no-student-data'
            );
            return;
        }

        const studentData = studentSnap.val();

        // تحديث الأرقام الأساسية
        try {
            updateStatsNumbers(studentData);
        } catch (e) {
            showErrorBanner('خطأ أثناء تحديث الأرقام الإحصائية (updateStatsNumbers)', 'stats-err', e);
            console.error('❌ updateStatsNumbers:', e);
        }

        // رسم بياني للشارات (يحتاج بيانات من badges.js)
        if (typeof window.loadUserBadges === 'function') {
            setTimeout(() => {
                try { drawBadgesChart(); } catch (e) {
                    showErrorBanner('خطأ في رسم مخطط الشارات (drawBadgesChart)', 'badges-chart-err', e);
                    console.error('❌ drawBadgesChart:', e);
                }
                try { drawLevelsDistribution(); } catch (e) {
                    showErrorBanner('خطأ في رسم توزيع المستويات (drawLevelsDistribution)', 'levels-dist-err', e);
                    console.error('❌ drawLevelsDistribution:', e);
                }
            }, 500);
        }

        // رسم بياني لنتائج الامتحانات
        if (studentData.examResults) {
            try {
                drawScoresChart(studentData.examResults);
            } catch (e) {
                showErrorBanner('خطأ في رسم مخطط الدرجات (drawScoresChart)', 'scores-chart-err', e);
                console.error('❌ drawScoresChart:', e);
            }
        }

        // رسم بياني للنشاط الأسبوعي
        try {
            drawActivityChart(studentData);
        } catch (e) {
            showErrorBanner('خطأ في رسم مخطط النشاط الأسبوعي (drawActivityChart)', 'activity-chart-err', e);
            console.error('❌ drawActivityChart:', e);
        }

    } catch (error) {
        showErrorBanner(
            `خطأ عام في تحميل الرسوم البيانية (loadProgressVisuals)`,
            'load-visuals-err',
            error
        );
        console.error('❌ loadProgressVisuals:', error);
    }
};

// تحديث الأرقام في بطاقات الإحصائيات
function updateStatsNumbers(studentData) {
    const watchedCount = studentData.watchedVideos ? Object.keys(studentData.watchedVideos).length : 0;
    const examsCount   = studentData.examResults   ? Object.keys(studentData.examResults).length   : 0;
    const points       = studentData.points        || 0;

    const safeSet = (id, val) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = val;
        } else {
            console.warn(`⚠️ العنصر #${id} غير موجود في الصفحة`);
            showErrorBanner(`العنصر #${id} غير موجود في الصفحة – تحقق من HTML`, `missing-el-${id}`);
        }
    };

    safeSet('profileVideosCount', watchedCount);
    safeSet('profileExamsCount',  examsCount);
    safeSet('profilePoints',      points);

    // متوسط الدرجات
    let avgScore = 0;
    if (studentData.examResults) {
        const scores = Object.values(studentData.examResults).map(e => e.percentage || 0);
        if (scores.length > 0) {
            avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }
    }
    safeSet('statAvgScore', avgScore + '%');

    // عدد الشارات (يتم تحديثه من badges.js)
    setTimeout(() => {
        const badgesCount = document.querySelectorAll('#userBadges .badge-card').length;
        safeSet('profileBadgesCount', badgesCount);
    }, 600);
}

// رسم بياني لتوزيع الشارات (دائري)
function drawBadgesChart() {
    const canvas = document.getElementById('badgesChart');
    if (!canvas) {
        showErrorBanner('العنصر #badgesChart غير موجود في الصفحة', 'missing-badges-canvas');
        return;
    }
    if (typeof Chart === 'undefined') {
        showErrorBanner(
            'مكتبة Chart.js غير محملة – أضف: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script> في HTML',
            'chartjs-missing-badges'
        );
        return;
    }

    if (window.badgesChartInstance) {
        window.badgesChartInstance.destroy();
    }

    const levels = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    const badges = document.querySelectorAll('#userBadges .badge-card');

    badges.forEach(badge => {
        const levelEl = badge.querySelector('.badge-level');
        if (levelEl) {
            const levelText = levelEl.textContent.trim();
            if      (levelText.includes('برونزي')) levels.bronze++;
            else if (levelText.includes('فضي'))    levels.silver++;
            else if (levelText.includes('ذهبي'))   levels.gold++;
            else if (levelText.includes('بلاتيني')) levels.platinum++;
        }
    });

    try {
        window.badgesChartInstance = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['برونزي', 'فضي', 'ذهبي', 'بلاتيني'],
                datasets: [{
                    data: [levels.bronze, levels.silver, levels.gold, levels.platinum],
                    backgroundColor: ['#cd7f32', '#c0c0c0', '#ffd700', '#e5e4e2'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    } catch (e) {
        showChartError(canvas, 'فشل إنشاء مخطط الشارات', e);
        showErrorBanner('فشل إنشاء Chart (badgesChart)', 'badges-chart-create-err', e);
        console.error('❌ Chart badgesChart:', e);
    }
}

// دالة موحدة لتحليل التواريخ
function parseDateSafe(d) {
    if (!d) return 0;
    const t = new Date(d).getTime();
    if (!isNaN(t)) return t;
    const m = String(d).match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (m) return new Date(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`).getTime();
    console.warn(`⚠️ parseDateSafe: تنسيق تاريخ غير معروف → "${d}"`);
    return 0;
}

// رسم بياني لتقدم الدرجات (خطي)
function drawScoresChart(examResults) {
    const canvas = document.getElementById('scoresChart');
    if (!canvas) {
        showErrorBanner('العنصر #scoresChart غير موجود في الصفحة', 'missing-scores-canvas');
        return;
    }
    if (typeof Chart === 'undefined') {
        showErrorBanner(
            'مكتبة Chart.js غير محملة – أضف: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script> في HTML',
            'chartjs-missing-scores'
        );
        return;
    }

    if (window.scoresChartInstance) {
        window.scoresChartInstance.destroy();
    }

    const exams = Object.values(examResults);
    if (exams.length === 0) {
        canvas.parentElement.innerHTML += '<p class="empty-state">لا توجد نتائج بعد</p>';
        return;
    }

    exams.sort((a, b) => parseDateSafe(a.completedAt) - parseDateSafe(b.completedAt));

    const labels = exams.map((e, i) => `امتحان ${i + 1}`);
    const scores = exams.map(e => e.percentage || 0);

    try {
        window.scoresChartInstance = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'النسبة المئوية',
                    data: scores,
                    borderColor: '#6c5ce7',
                    backgroundColor: 'rgba(108, 92, 231, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#6c5ce7'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    }
                }
            }
        });
    } catch (e) {
        showChartError(canvas, 'فشل إنشاء مخطط الدرجات', e);
        showErrorBanner('فشل إنشاء Chart (scoresChart)', 'scores-chart-create-err', e);
        console.error('❌ Chart scoresChart:', e);
    }
}

// رسم بياني للنشاط الأسبوعي (أعمدة)
function drawActivityChart(studentData) {
    const canvas = document.getElementById('activityChart');
    if (!canvas) {
        showErrorBanner('العنصر #activityChart غير موجود في الصفحة', 'missing-activity-canvas');
        return;
    }
    if (typeof Chart === 'undefined') {
        showErrorBanner(
            'مكتبة Chart.js غير محملة – أضف: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script> في HTML',
            'chartjs-missing-activity'
        );
        return;
    }

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
                const ts = parseDateSafe(video.watchedAt);
                const dateObj = ts ? new Date(ts) : null;
                if (dateObj && dateObj >= oneWeekAgo) {
                    activityData[dateObj.getDay()]++;
                }
            }
        });
    }

    try {
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
                scales: { y: { beginAtZero: true } }
            }
        });
    } catch (e) {
        showChartError(canvas, 'فشل إنشاء مخطط النشاط الأسبوعي', e);
        showErrorBanner('فشل إنشاء Chart (activityChart)', 'activity-chart-create-err', e);
        console.error('❌ Chart activityChart:', e);
    }
}

// رسم بياني لتوزيع المستويات (في التبويب الثاني)
function drawLevelsDistribution() {
    const container = document.getElementById('levelsDistribution');
    if (!container) {
        showErrorBanner('العنصر #levelsDistribution غير موجود في الصفحة', 'missing-levels-container');
        return;
    }

    const levels = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    const badges = document.querySelectorAll('#userBadges .badge-card .badge-level');

    badges.forEach(el => {
        const text = el.textContent.trim();
        if      (text.includes('برونزي')) levels.bronze++;
        else if (text.includes('فضي'))    levels.silver++;
        else if (text.includes('ذهبي'))   levels.gold++;
        else if (text.includes('بلاتيني')) levels.platinum++;
    });

    const total = levels.bronze + levels.silver + levels.gold + levels.platinum;
    if (total === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;">لا توجد شارات لعرض توزيعها</p>';
        return;
    }

    const colors = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', platinum: '#e5e4e2' };
    const names  = { bronze: 'برونزي', silver: 'فضي',     gold: 'ذهبي',   platinum: 'بلاتيني' };

    let html = '<h4>توزيع الشارات حسب المستوى</h4>';
    html += '<div style="display: flex; gap: 20px; flex-wrap: wrap;">';

    for (let level in levels) {
        const percent = Math.round((levels[level] / total) * 100);
        html += `
            <div style="flex: 1; min-width: 120px;">
                <div style="display: flex; align-items: center; gap: 5px;">
                    <span style="display:inline-block;width:12px;height:12px;background:${colors[level]};border-radius:3px;"></span>
                    <span>${names[level]}</span>
                    <span style="font-weight:bold;">${levels[level]}</span>
                    <span style="color:#666;">(${percent}%)</span>
                </div>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

// ======= Global error catcher لأي خطأ غير متوقع في هذا الملف =======
window.addEventListener('error', function(event) {
    // فلترة: فقط الأخطاء القادمة من progress-visual.js
    if (event.filename && event.filename.includes('progress-visual')) {
        showErrorBanner(
            `خطأ غير متوقع في progress-visual.js – السطر ${event.lineno}، العمود ${event.colno}`,
            'global-err-' + event.lineno,
            event.error || event.message
        );
    }
});
