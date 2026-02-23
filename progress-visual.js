// progress-visual.js
// ================ الرسوم البيانية لتقدم الطالب ================

// دالة رئيسية لتحميل كل الإحصائيات والرسوم البيانية
window.loadProgressVisuals = async function() {
    if (!window.currentUser) return;
    
    try {
        const studentSnap = await window.get(window.child(window.dbRef, `students/${window.currentUser.uid}`));
        if (!studentSnap.exists()) return;
        
        const studentData = studentSnap.val();
        
        updateStatsNumbers(studentData);
        
        if (typeof window.loadUserBadges === 'function') {
            setTimeout(() => {
                drawBadgesChart();
                drawLevelsDistribution();
            }, 500);
        }
        
        if (studentData.examResults) {
            drawScoresChart(studentData.examResults);
        }
        
        drawActivityChart(studentData);
        
    } catch (error) {
        console.error('❌ خطأ في تحميل الرسوم البيانية:', error);
    }
};

function updateStatsNumbers(studentData) {
    const watchedCount = studentData.watchedVideos ? Object.keys(studentData.watchedVideos).length : 0;
    const examsCount = studentData.examResults ? Object.keys(studentData.examResults).length : 0;
    const points = studentData.points || 0;
    
    const el = id => document.getElementById(id);
    if (el('profileVideosCount')) el('profileVideosCount').textContent = watchedCount;
    if (el('profileExamsCount')) el('profileExamsCount').textContent = examsCount;
    if (el('profilePoints')) el('profilePoints').textContent = points;
    
    let avgScore = 0;
    if (studentData.examResults) {
        const scores = Object.values(studentData.examResults).map(e => e.percentage || 0);
        if (scores.length > 0) avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }
    if (el('statAvgScore')) el('statAvgScore').textContent = avgScore + '%';
    
    setTimeout(() => {
        const badgesCount = document.querySelectorAll('#userBadges .badge-card').length;
        if (el('profileBadgesCount')) el('profileBadgesCount').textContent = badgesCount;
    }, 600);
}

function drawBadgesChart() {
    const canvas = document.getElementById('badgesChart');
    if (!canvas) return;
    if (window.badgesChartInstance) window.badgesChartInstance.destroy();
    
    const levels = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    document.querySelectorAll('#userBadges .badge-card').forEach(badge => {
        const levelEl = badge.querySelector('.badge-level');
        if (levelEl) {
            const t = levelEl.textContent.trim();
            if (t.includes('برونزي')) levels.bronze++;
            else if (t.includes('فضي')) levels.silver++;
            else if (t.includes('ذهبي')) levels.gold++;
            else if (t.includes('بلاتيني')) levels.platinum++;
        }
    });
    
    window.badgesChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['برونزي', 'فضي', 'ذهبي', 'بلاتيني'],
            datasets: [{ data: [levels.bronze, levels.silver, levels.gold, levels.platinum], backgroundColor: ['#cd7f32', '#c0c0c0', '#ffd700', '#e5e4e2'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

function drawScoresChart(examResults) {
    const canvas = document.getElementById('scoresChart');
    if (!canvas) return;
    if (window.scoresChartInstance) window.scoresChartInstance.destroy();
    
    const exams = Object.values(examResults);
    if (exams.length === 0) { canvas.parentElement.innerHTML += '<p class="empty-state">لا توجد نتائج بعد</p>'; return; }
    
    exams.sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt.split(' ').reverse().join('-')) : 0;
        const dateB = b.completedAt ? new Date(b.completedAt.split(' ').reverse().join('-')) : 0;
        return dateA - dateB;
    });
    
    window.scoresChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: exams.map((e, i) => `امتحان ${i+1}`),
            datasets: [{ label: 'النسبة المئوية', data: exams.map(e => e.percentage || 0), borderColor: '#6c5ce7', backgroundColor: 'rgba(108, 92, 231, 0.1)', tension: 0.4, fill: true, pointBackgroundColor: '#6c5ce7' }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.05)' } } } }
    });
}

function drawActivityChart(studentData) {
    const canvas = document.getElementById('activityChart');
    if (!canvas) return;
    if (window.activityChartInstance) window.activityChartInstance.destroy();

    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const activityData = [0, 0, 0, 0, 0, 0, 0];

    // حساب النشاط الحقيقي من بيانات المشاهدة في آخر 7 أيام
    if (studentData.watchedVideos) {
        const now = Date.now();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        Object.values(studentData.watchedVideos).forEach(video => {
            if (video.watchedAt) {
                try {
                    const watchedDate = new Date(video.watchedAt);
                    if (!isNaN(watchedDate) && (now - watchedDate.getTime()) <= sevenDaysMs) {
                        const dayIndex = watchedDate.getDay(); // 0=الأحد
                        activityData[dayIndex]++;
                    }
                } catch (e) { /* تجاهل تواريخ غير صالحة */ }
            }
        });
    }

    window.activityChartInstance = new Chart(canvas, {
        type: 'bar',
        data: { labels: days, datasets: [{ label: 'عدد المشاهدات (آخر 7 أيام)', data: activityData, backgroundColor: '#6c5ce7', borderRadius: 5 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
}

function drawLevelsDistribution() {
    const container = document.getElementById('levelsDistribution');
    if (!container) return;
    
    const levels = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    document.querySelectorAll('#userBadges .badge-card .badge-level').forEach(el => {
        const text = el.textContent.trim();
        if (text.includes('برونزي')) levels.bronze++;
        else if (text.includes('فضي')) levels.silver++;
        else if (text.includes('ذهبي')) levels.gold++;
        else if (text.includes('بلاتيني')) levels.platinum++;
    });
    
    const total = levels.bronze + levels.silver + levels.gold + levels.platinum;
    if (total === 0) return;
    
    const colors = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', platinum: '#e5e4e2' };
    const names = { bronze: 'برونزي', silver: 'فضي', gold: 'ذهبي', platinum: 'بلاتيني' };
    
    let html = '<h4>توزيع الشارات حسب المستوى</h4><div style="display: flex; gap: 20px; flex-wrap: wrap;">';
    for (let level in levels) {
        const percent = Math.round((levels[level] / total) * 100);
        html += `<div style="flex: 1; min-width: 120px;"><div style="display: flex; align-items: center; gap: 5px;"><span style="display: inline-block; width: 12px; height: 12px; background: ${colors[level]}; border-radius: 3px;"></span><span>${names[level]}</span><span style="font-weight: bold;">${levels[level]}</span><span style="color: #666;">(${percent}%)</span></div></div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}
