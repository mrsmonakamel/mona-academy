// ================ BADGES & CHALLENGES SYSTEM ================
// تنبيه: هذا الملف يعتمد على المتغيرات التالية من script.js:
// - db, dbRef, ref, get, child, push, update, set (Firebase)
// - escapeHTML (helper function)
// يجب التأكد من تحميل script.js قبل badges.js

// قائمة الشارات المتاحة
const BADGES = {
    // شارات التسجيل
    WELCOME: {
        id: 'welcome',
        name: '👋 مرحباً بك',
        description: 'أول يوم في المنصة',
        icon: 'fa-hand-peace',
        points: 10,
        category: 'registration',
        level: 'bronze'
    },
    
    // شارات المشاهدة
    WATCH_5: {
        id: 'watch_5',
        name: '🎥 مبتدئ',
        description: 'مشاهدة 5 فيديوهات',
        icon: 'fa-video',
        points: 20,
        category: 'watching',
        level: 'bronze',
        requirement: 5
    },
    WATCH_20: {
        id: 'watch_20',
        name: '🎬 نجم المشاهدة',
        description: 'مشاهدة 20 فيديو',
        icon: 'fa-film',
        points: 50,
        category: 'watching',
        level: 'silver',
        requirement: 20
    },
    WATCH_50: {
        id: 'watch_50',
        name: '📺 مدمن تعلم',
        description: 'مشاهدة 50 فيديو',
        icon: 'fa-tv',
        points: 100,
        category: 'watching',
        level: 'gold',
        requirement: 50
    },
    WATCH_100: {
        id: 'watch_100',
        name: '🎯 أسطورة',
        description: 'مشاهدة 100 فيديو',
        icon: 'fa-crown',
        points: 200,
        category: 'watching',
        level: 'platinum',
        requirement: 100
    },
    
    // شارات الامتحانات
    FIRST_EXAM: {
        id: 'first_exam',
        name: '📝 مبتدئ',
        description: 'أول امتحان',
        icon: 'fa-pencil',
        points: 15,
        category: 'exams',
        level: 'bronze'
    },
    EXAM_5: {
        id: 'exam_5',
        name: '📚 مجتهد',
        description: 'حل 5 امتحانات',
        icon: 'fa-book',
        points: 40,
        category: 'exams',
        level: 'silver',
        requirement: 5
    },
    EXAM_20: {
        id: 'exam_20',
        name: '🧠 نابغة',
        description: 'حل 20 امتحان',
        icon: 'fa-brain',
        points: 100,
        category: 'exams',
        level: 'gold',
        requirement: 20
    },
    
    // شارات الدرجات
    PERFECT_SCORE: {
        id: 'perfect_score',
        name: '🏆 عبقرينو',
        description: 'درجة كاملة في امتحان',
        icon: 'fa-trophy',
        points: 50,
        category: 'scores',
        level: 'gold'
    },
    PERFECT_3: {
        id: 'perfect_3',
        name: '💯 ملك التميز',
        description: '3 درجات كاملة',
        icon: 'fa-star',
        points: 150,
        category: 'scores',
        level: 'platinum',
        requirement: 3
    },
    HIGH_SCORE_90: {
        id: 'high_score_90',
        name: '🎯 نينجا',
        description: '90% في امتحان',
        icon: 'fa-bullseye',
        points: 30,
        category: 'scores',
        level: 'silver'
    },
    
    // شارات الاستمرارية
    LOGIN_7: {
        id: 'login_7',
        name: '⚡ مثابر',
        description: 'الدخول 7 أيام متتالية',
        icon: 'fa-calendar-check',
        points: 50,
        category: 'streak',
        level: 'silver',
        requirement: 7
    },
    LOGIN_30: {
        id: 'login_30',
        name: '🔥 نار',
        description: 'الدخول 30 يوم متتالي',
        icon: 'fa-fire',
        points: 200,
        category: 'streak',
        level: 'gold',
        requirement: 30
    },
    
    // شارات التفاعل
    ADD_REVIEW: {
        id: 'add_review',
        name: '💬 شارك رأيك',
        description: 'إضافة تقييم',
        icon: 'fa-comment',
        points: 15,
        category: 'interaction',
        level: 'bronze'
    },
    SHARE_COURSE: {
        id: 'share_course',
        name: '📢 مبلغ',
        description: 'مشاركة كورس',
        icon: 'fa-share-alt',
        points: 25,
        category: 'interaction',
        level: 'silver'
    },
    
    // شارات الاشتراكات
    FIRST_SUB: {
        id: 'first_sub',
        name: '🔓 مشترك جديد',
        description: 'أول اشتراك في كورس',
        icon: 'fa-star',
        points: 20,
        category: 'subscription',
        level: 'bronze'
    },
    SUB_3: {
        id: 'sub_3',
        name: '📚 موسوعة',
        description: 'الاشتراك في 3 كورسات',
        icon: 'fa-books',
        points: 60,
        category: 'subscription',
        level: 'silver',
        requirement: 3
    },
    SUB_5: {
        id: 'sub_5',
        name: '🏛️ أكاديمية',
        description: 'الاشتراك في 5 كورسات',
        icon: 'fa-university',
        points: 150,
        category: 'subscription',
        level: 'gold',
        requirement: 5
    }
};

// مستويات الشارات
const BADGE_LEVELS = {
    bronze: { name: 'برونزي', color: '#cd7f32' },
    silver: { name: 'فضي', color: '#c0c0c0' },
    gold: { name: 'ذهبي', color: '#ffd700' },
    platinum: { name: 'بلاتيني', color: '#e5e4e2' }
};

// التحقق من إضافة شارة جديدة للطالب
window.checkAndAwardBadge = async function(userId, badgeId) {
    if (!userId || !badgeId) return;
    
    try {
        const badge = BADGES[badgeId];
        if (!badge) return;
        
        const badgeRef = ref(db, `students/${userId}/badges/${badge.id}`);
        const existingBadge = await get(badgeRef);
        
        // لو الشارة موجودة بالفعل، متضفهاش تاني
        if (existingBadge.exists()) return;
        
        // أضف الشارة
        await set(badgeRef, {
            ...badge,
            earnedAt: new Date().toISOString(),
            earnedAtLocal: new Date().toLocaleString('ar-EG')
        });
        
        // زود النقاط
        const studentRef = ref(db, `students/${userId}`);
        const studentSnap = await get(studentRef);
        if (studentSnap.exists()) {
            const currentPoints = studentSnap.val().points || 0;
            await update(studentRef, {
                points: currentPoints + badge.points
            });
        }
        
        // سجل في سجل الشارات
        await push(ref(db, `students/${userId}/badges_history`), {
            badgeId: badge.id,
            badgeName: badge.name,
            points: badge.points,
            earnedAt: new Date().toISOString()
        });
        
        // أرسل إشعار
        if (typeof window.notifyBadgeEarned === 'function') {
            await window.notifyBadgeEarned(userId, badge.name, badge.points);
        }
        
        // اعرض رسالة تهنئة
        window.showToast(`🎉 مبروك! حصلت على شارة "${badge.name}" +${badge.points} نقطة`, 'success', 5000);
        
        // حدث واجهة المستخدم لو احنا في صفحة الملف الشخصي
        if (window.location.pathname.includes('profile.html')) {
            loadUserBadges(userId);
        }
        
    } catch (error) {
        console.error('Error awarding badge:', error);
    }
};

// التحقق من شارات المشاهدة
window.checkWatchingBadges = async function(userId) {
    try {
        const studentSnap = await get(child(dbRef, `students/${userId}`));
        if (!studentSnap.exists()) return;
        
        const studentData = studentSnap.val();
        const watchedCount = studentData.watchedVideos ? Object.keys(studentData.watchedVideos).length : 0;
        
        // شارات المشاهدة
        if (watchedCount >= 100) await window.checkAndAwardBadge(userId, 'WATCH_100');
        if (watchedCount >= 50) await window.checkAndAwardBadge(userId, 'WATCH_50');
        if (watchedCount >= 20) await window.checkAndAwardBadge(userId, 'WATCH_20');
        if (watchedCount >= 5) await window.checkAndAwardBadge(userId, 'WATCH_5');
        
    } catch (error) {
        console.error('Error checking watching badges:', error);
    }
};

// التحقق من شارات الامتحانات
window.checkExamBadges = async function(userId) {
    try {
        const studentSnap = await get(child(dbRef, `students/${userId}`));
        if (!studentSnap.exists()) return;
        
        const studentData = studentSnap.val();
        const examsCount = studentData.examResults ? Object.keys(studentData.examResults).length : 0;
        
        // شارات عدد الامتحانات
        if (examsCount >= 20) await window.checkAndAwardBadge(userId, 'EXAM_20');
        if (examsCount >= 5) await window.checkAndAwardBadge(userId, 'EXAM_5');
        if (examsCount >= 1) await window.checkAndAwardBadge(userId, 'FIRST_EXAM');
        
        // شارات الدرجات الكاملة والعالية
        let perfectCount = 0;
        let highScoreCount = 0;
        if (studentData.examResults) {
            Object.values(studentData.examResults).forEach(exam => {
                if (exam.score === exam.total) perfectCount++;
                if (exam.percentage >= 90) highScoreCount++;
            });
        }
        
        if (perfectCount >= 3) await window.checkAndAwardBadge(userId, 'PERFECT_3');
        if (perfectCount >= 1) await window.checkAndAwardBadge(userId, 'PERFECT_SCORE');
        if (highScoreCount >= 1) await window.checkAndAwardBadge(userId, 'HIGH_SCORE_90');
        
    } catch (error) {
        console.error('Error checking exam badges:', error);
    }
};

// التحقق من شارات الاشتراكات
window.checkSubscriptionBadges = async function(userId) {
    try {
        const studentSnap = await get(child(dbRef, `students/${userId}`));
        if (!studentSnap.exists()) return;
        
        const studentData = studentSnap.val();
        const subsCount = studentData.subscriptions ? Object.keys(studentData.subscriptions).length : 0;
        
        if (subsCount >= 5) await window.checkAndAwardBadge(userId, 'SUB_5');
        if (subsCount >= 3) await window.checkAndAwardBadge(userId, 'SUB_3');
        if (subsCount >= 1) await window.checkAndAwardBadge(userId, 'FIRST_SUB');
        
    } catch (error) {
        console.error('Error checking subscription badges:', error);
    }
};

// التحقق من شارات الاستمرارية
window.checkStreakBadges = async function(userId) {
    try {
        const streakRef = ref(db, `students/${userId}/loginStreak`);
        const streakSnap = await get(streakRef);
        
        if (streakSnap.exists()) {
            const streak = streakSnap.val().current || 0;
            
            if (streak >= 30) await window.checkAndAwardBadge(userId, 'LOGIN_30');
            if (streak >= 7) await window.checkAndAwardBadge(userId, 'LOGIN_7');
        }
        
    } catch (error) {
        console.error('Error checking streak badges:', error);
    }
};

// تحميل شارات الطالب
window.loadUserBadges = async function(userId) {
    if (!userId) return;
    
    try {
        const badgesSnap = await get(child(dbRef, `students/${userId}/badges`));
        const container = document.getElementById('userBadges');
        
        if (!container) return;
        
        if (badgesSnap.exists()) {
            let html = '<div class="badges-grid">';
            let points = 0;
            
            const badges = [];
            badgesSnap.forEach(badge => {
                badges.push(badge.val());
            });
            
            // ترتيب حسب التاريخ (الأحدث أولاً)
            badges.sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));
            
            badges.forEach(badge => {
                const levelColor = BADGE_LEVELS[badge.level]?.color || '#6c5ce7';
                const levelName = BADGE_LEVELS[badge.level]?.name || '';
                
                html += `
                    <div class="badge-card" style="border-color: ${levelColor};" title="${badge.description}">
                        <div class="badge-icon" style="background: ${levelColor}">
                            <i class="fas ${badge.icon}"></i>
                        </div>
                        <div class="badge-info">
                            <h4>${escapeHTML(badge.name)}</h4>
                            <span class="badge-level" style="background: ${levelColor}">${levelName}</span>
                            <span class="badge-points">+${badge.points} نقطة</span>
                            <span class="badge-date">${escapeHTML(badge.earnedAtLocal)}</span>
                        </div>
                    </div>
                `;
                points += badge.points;
            });
            
            html += '</div>';
            
            // عرض إجمالي النقاط
            const pointsEl = document.getElementById('totalPoints');
            if (pointsEl) {
                pointsEl.innerHTML = `<i class="fas fa-star"></i> ${points} نقطة`;
            }
            
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-medal"></i>
                    <p>لا توجد شارات بعد</p>
                    <p class="hint">شاهد فيديوهات واختبر نفسك عشان تكسب شارات</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading badges:', error);
    }
};

// عرض كل الشارات المتاحة
window.loadAllBadges = function() {
    const container = document.getElementById('allBadgesGrid');
    if (!container) return;
    
    let html = '<div class="badges-showcase">';
    
    // تجميع الشارات حسب الفئة
    const categories = {
        registration: { name: '🎉 التسجيل', badges: [] },
        watching: { name: '🎥 المشاهدة', badges: [] },
        exams: { name: '📝 الامتحانات', badges: [] },
        scores: { name: '🏆 الدرجات', badges: [] },
        streak: { name: '⚡ الاستمرارية', badges: [] },
        interaction: { name: '💬 التفاعل', badges: [] },
        subscription: { name: '🔓 الاشتراكات', badges: [] }
    };
    
    Object.values(BADGES).forEach(badge => {
        if (categories[badge.category]) {
            categories[badge.category].badges.push(badge);
        }
    });
    
    // عرض كل فئة
    Object.keys(categories).forEach(catKey => {
        const cat = categories[catKey];
        if (cat.badges.length > 0) {
            html += `
                <div class="badge-category">
                    <h3>${cat.name}</h3>
                    <div class="badge-category-grid">
            `;
            
            cat.badges.forEach(badge => {
                const levelColor = BADGE_LEVELS[badge.level]?.color || '#6c5ce7';
                const levelName = BADGE_LEVELS[badge.level]?.name || '';
                
                html += `
                    <div class="badge-preview" style="border-color: ${levelColor};">
                        <div class="badge-icon" style="background: ${levelColor}">
                            <i class="fas ${badge.icon}"></i>
                        </div>
                        <div class="badge-preview-info">
                            <h4>${escapeHTML(badge.name)}</h4>
                            <p>${escapeHTML(badge.description)}</p>
                            <span class="badge-level" style="background: ${levelColor}">${levelName}</span>
                            <span class="badge-points">+${badge.points} نقطة</span>
                            ${badge.requirement ? `<span class="badge-req">الشرط: ${badge.requirement}</span>` : ''}
                        </div>
                    </div>
                `;
            });
            
            html += '</div></div>';
        }
    });
    
    html += '</div>';
    container.innerHTML = html;
};

// تحديث دالة تسجيل الدخول لتشمل شارات الترحيب
window.checkLoginBadges = async function(userId) {
    await window.checkAndAwardBadge(userId, 'WELCOME');
    await window.checkStreakBadges(userId);
};

// إضافة CSS للشارات
function addBadgesCSS() {
    const style = document.createElement('style');
    style.textContent = `
        /* ================ BADGES STYLES ================ */
        .badges-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .badge-card {
            background: var(--card-bg);
            border-radius: 20px;
            padding: 20px;
            display: flex;
            gap: 15px;
            align-items: flex-start;
            border-right: 6px solid var(--main);
            box-shadow: var(--card-shadow);
            transition: var(--transition);
            position: relative;
            overflow: hidden;
        }
        
        .badge-card::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            opacity: 0;
            transition: opacity 0.3s;
        }
        
        .badge-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(108,92,231,0.15);
        }
        
        .badge-card:hover::before {
            opacity: 1;
            animation: rotate 10s linear infinite;
        }
        
        .badge-icon {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.8rem;
            color: white;
            flex-shrink: 0;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        .badge-info {
            flex: 1;
        }
        
        .badge-info h4 {
            font-size: 1.1rem;
            margin-bottom: 5px;
            color: var(--text-primary);
        }
        
        .badge-level {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 50px;
            color: white;
            font-size: 0.7rem;
            font-weight: bold;
            margin-left: 8px;
        }
        
        .badge-points {
            display: inline-block;
            background: var(--success);
            color: white;
            padding: 3px 10px;
            border-radius: 50px;
            font-size: 0.7rem;
            font-weight: bold;
        }
        
        .badge-date {
            display: block;
            font-size: 0.7rem;
            color: var(--text-muted);
            margin-top: 5px;
        }
        
        /* ================ BADGES SHOWCASE ================ */
        .badges-showcase {
            padding: 20px;
        }
        
        .badge-category {
            margin-bottom: 40px;
        }
        
        .badge-category h3 {
            font-size: 1.4rem;
            color: var(--main);
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid var(--border-color);
        }
        
        .badge-category-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        
        .badge-preview {
            background: var(--card-bg);
            border-radius: 15px;
            padding: 15px;
            display: flex;
            gap: 12px;
            border-right: 4px solid var(--main);
            transition: var(--transition);
        }
        
        .badge-preview:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(108,92,231,0.15);
        }
        
        .badge-preview .badge-icon {
            width: 50px;
            height: 50px;
            font-size: 1.5rem;
        }
        
        .badge-preview-info h4 {
            font-size: 1rem;
            margin-bottom: 3px;
        }
        
        .badge-preview-info p {
            font-size: 0.8rem;
            color: var(--text-secondary);
            margin-bottom: 5px;
        }
        
        .badge-req {
            display: inline-block;
            background: var(--warning);
            color: #2d3436;
            padding: 2px 8px;
            border-radius: 50px;
            font-size: 0.65rem;
            font-weight: bold;
            margin-right: 5px;
        }
        
        .hint {
            font-size: 0.9rem;
            color: var(--text-secondary);
            margin-top: 10px;
        }
        
        /* ================ POINTS DISPLAY ================ */
        .points-badge {
            background: linear-gradient(135deg, var(--gold), #f1c40f);
            color: #2d3436;
            padding: 8px 20px;
            border-radius: 50px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-weight: bold;
            box-shadow: 0 5px 15px rgba(255,215,0,0.3);
        }
        
        .points-badge i {
            color: #2d3436;
        }
        
        /* ================ DARK MODE FOR BADGES ================ */
        body.dark-mode .badge-card,
        body.dark-mode .badge-preview {
            background: #2c2d30;
            border-color: #4a4b4e;
        }
        
        body.dark-mode .badge-card:hover,
        body.dark-mode .badge-preview:hover {
            border-color: var(--main);
        }
        
        body.dark-mode .badge-date {
            color: #b0b0b0;
        }
    `;
    document.head.appendChild(style);
}

// تنفيذ عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    addBadgesCSS();
});