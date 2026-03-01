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

// progress-visual.js
// ================ الرسوم البيانية لتقدم الطالب ================

// دالة رئيسية لتحميل كل الإحصائيات والرسوم البيانية
window.loadProgressVisuals = async function() {
    if (!window.currentUser) return;
    
    try {
        const studentSnap = await window.get(window.child(window.dbRef, `students/${window.currentUser.uid}`));
        if (!studentSnap.exists()) return;
        
        const studentData = studentSnap.val();
        
        // تحديث الأرقام الأساسية
        updateStatsNumbers(studentData);
        
        // رسم بياني للشارات (يحتاج بيانات من badges.js)
        if (typeof window.loadUserBadges === 'function') {
            // ننتظر قليلاً حتى تتحميل الشارات
            setTimeout(() => {
                drawBadgesChart();
                drawLevelsDistribution();
            }, 500);
        }
        
        // رسم بياني لنتائج الامتحانات
        if (studentData.examResults) {
            drawScoresChart(studentData.examResults);
        }
        
        // رسم بياني للنشاط الأسبوعي
        drawActivityChart(studentData);
        
    } catch (error) {
        console.error('❌ خطأ في تحميل الرسوم البيانية:', error);
    }
};

// تحديث الأرقام في بطاقات الإحصائيات
function updateStatsNumbers(studentData) {
    const watchedCount = studentData.watchedVideos ? Object.keys(studentData.watchedVideos).length : 0;
    const examsCount = studentData.examResults ? Object.keys(studentData.examResults).length : 0;
    const points = studentData.points || 0;
    
    document.getElementById('profileVideosCount').textContent = watchedCount;
    document.getElementById('profileExamsCount').textContent = examsCount;
    document.getElementById('profilePoints').textContent = points;
    
    // متوسط الدرجات
    let avgScore = 0;
    if (studentData.examResults) {
        const scores = Object.values(studentData.examResults).map(e => e.percentage || 0);
        if (scores.length > 0) {
            avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }
    }
    document.getElementById('statAvgScore').textContent = avgScore + '%';
    
    // عدد الشارات (يتم تحديثه من badges.js)
    setTimeout(() => {
        const badgesCount = document.querySelectorAll('#userBadges .badge-card').length;
        document.getElementById('profileBadgesCount').textContent = badgesCount;
    }, 600);
}

// رسم بياني لتوزيع الشارات (دائري)
function drawBadgesChart() {
    const canvas = document.getElementById('badgesChart');
    if (!canvas) return;
    if (typeof Chart === 'undefined') { console.warn('Chart.js غير محملة'); return; }
    
    // إتلاف الرسم البياني القديم إن وجد
    if (window.badgesChartInstance) {
        window.badgesChartInstance.destroy();
    }
    
    // حساب عدد الشارات حسب المستوى
    const levels = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    const badges = document.querySelectorAll('#userBadges .badge-card');
    
    badges.forEach(badge => {
        const levelEl = badge.querySelector('.badge-level');
        if (levelEl) {
            const levelText = levelEl.textContent.trim();
            if (levelText.includes('برونزي')) levels.bronze++;
            else if (levelText.includes('فضي')) levels.silver++;
            else if (levelText.includes('ذهبي')) levels.gold++;
            else if (levelText.includes('بلاتيني')) levels.platinum++;
        }
    });
    
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
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// دالة موحدة لتحليل التواريخ (إصلاح #17)
function parseDateSafe(d) {
    if (!d) return 0;
    const t = new Date(d).getTime();
    if (!isNaN(t)) return t;
    const m = String(d).match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (m) return new Date(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`).getTime();
    return 0;
}

// رسم بياني لتقدم الدرجات (خطي)
function drawScoresChart(examResults) {
    const canvas = document.getElementById('scoresChart');
    if (!canvas) return;
    // التحقق من وجود مكتبة Chart.js (إصلاح #16)
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js غير محملة - لا يمكن رسم المخططات');
        return;
    }
    
    // إتلاف القديم
    if (window.scoresChartInstance) {
        window.scoresChartInstance.destroy();
    }
    
    const exams = Object.values(examResults);
    if (exams.length === 0) {
        canvas.parentElement.innerHTML += '<p class="empty-state">لا توجد نتائج بعد</p>';
        return;
    }
    
    // ترتيب حسب التاريخ – يدعم ISO وصيغ محلية
    exams.sort((a, b) => parseDateSafe(a.completedAt) - parseDateSafe(b.completedAt));
    
    const labels = exams.map((e, i) => `امتحان ${i+1}`);
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
}

// رسم بياني للنشاط الأسبوعي (أعمدة)
function drawActivityChart(studentData) {
    const canvas = document.getElementById('activityChart');
    if (!canvas) return;
    if (typeof Chart === 'undefined') { console.warn('Chart.js غير محملة'); return; }
    
    if (window.activityChartInstance) {
        window.activityChartInstance.destroy();
    }
    
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const activityData = [0, 0, 0, 0, 0, 0, 0];
    
        // حساب نشاط الأسبوع الحالي من بيانات الفيديوهات المشاهدة
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

// رسم بياني لتوزيع المستويات (في التبويب الثاني)
function drawLevelsDistribution() {
    const container = document.getElementById('levelsDistribution');
    if (!container) return;
    
    const levels = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    const badges = document.querySelectorAll('#userBadges .badge-card .badge-level');
    
    badges.forEach(el => {
        const text = el.textContent.trim();
        if (text.includes('برونزي')) levels.bronze++;
        else if (text.includes('فضي')) levels.silver++;
        else if (text.includes('ذهبي')) levels.gold++;
        else if (text.includes('بلاتيني')) levels.platinum++;
    });
    
    const total = levels.bronze + levels.silver + levels.gold + levels.platinum;
    if (total === 0) return;
    
    let html = '<h4>توزيع الشارات حسب المستوى</h4>';
    html += '<div style="display: flex; gap: 20px; flex-wrap: wrap;">';
    
    const colors = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', platinum: '#e5e4e2' };
    const names = { bronze: 'برونزي', silver: 'فضي', gold: 'ذهبي', platinum: 'بلاتيني' };
    
    for (let level in levels) {
        const percent = Math.round((levels[level] / total) * 100);
        html += `
            <div style="flex: 1; min-width: 120px;">
                <div style="display: flex; align-items: center; gap: 5px;">
                    <span style="display: inline-block; width: 12px; height: 12px; background: ${colors[level]}; border-radius: 3px;"></span>
                    <span>${names[level]}</span>
                    <span style="font-weight: bold;">${levels[level]}</span>
                    <span style="color: #666;">(${percent}%)</span>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}