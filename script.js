// ================ FIREBASE IMPORTS ================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, get, child, push, onValue, set, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ================ FIREBASE CONFIG ================
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
const provider = new GoogleAuthProvider();
const dbRef = ref(db);

// ================ GLOBAL VARIABLES ================
let currentUser = null;
let myShortId = "";
let currentFolderId = null;
let currentFolderName = "";
let currentStudentGrade = null;
let messaging = null;
const ADMIN_EMAIL = "mrsmonakamel6@gmail.com";

// ================ POINTS & BADGES SYSTEM ================
const POINTS = {
    WATCH_VIDEO: 10,
    PERFECT_QUIZ: 50,
    PASS_QUIZ: 20,
    SUBSCRIBE_COURSE: 30,
    ADD_REVIEW: 15
};

const BADGES = {
    BRONZE: { threshold: 100, name: '🥉 برونزي', icon: 'fas fa-medal' },
    SILVER: { threshold: 300, name: '🥈 فضي', icon: 'fas fa-medal' },
    GOLD: { threshold: 600, name: '🥇 ذهبي', icon: 'fas fa-medal' },
    PLATINUM: { threshold: 1000, name: '💎 بلاتيني', icon: 'fas fa-crown' },
    FIRST_VIDEO: { name: '🎬 أول فيديو', icon: 'fas fa-play-circle' },
    FIRST_EXAM: { name: '📝 أول امتحان', icon: 'fas fa-file-alt' },
    PERFECT_SCORE: { name: '🏆 درجة نهائية', icon: 'fas fa-trophy' }
};

// ================ DARK MODE ================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}
window.toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
};
initTheme();

// ================ MULTI-LANGUAGE ================
let currentLang = localStorage.getItem('lang') || 'ar';
function t(key) {
    const keys = key.split('.');
    let value = translations[currentLang];
    for (const k of keys) {
        if (value && value[k]) value = value[k];
        else return key;
    }
    return value || key;
}
window.switchLanguage = (lang) => {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    translatePage();
};
function translatePage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerHTML = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
}
// Load initial language
document.addEventListener('DOMContentLoaded', () => switchLanguage(currentLang));

// ================ HAMBURGER MENU ================
window.toggleMenu = () => {
    const menu = document.getElementById('menuDropdown');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
};
document.addEventListener('click', (e) => {
    const menu = document.getElementById('menuDropdown');
    const hamburger = document.querySelector('.hamburger-menu');
    if (menu && hamburger && !menu.contains(e.target) && !hamburger.contains(e.target)) {
        menu.style.display = 'none';
    }
});

// ================ STEP VALIDATION (REGISTRATION) ================
window.checkStep1Completion = () => {
    const n1 = document.getElementById('n1').value.trim();
    const n4 = document.getElementById('n4').value.trim();
    const whatsapp = document.getElementById('regWhatsapp').value.trim();
    const parentPhone = document.getElementById('regParentPhone').value.trim();
    const nextBtn = document.getElementById('step1NextBtn');
    const errorDiv = document.getElementById('step1Error');
    
    const isNameValid = n1 !== '' && n4 !== '';
    const isWhatsappValid = whatsapp !== '' && whatsapp.length >= 10 && /^[0-9]+$/.test(whatsapp);
    const isParentPhoneValid = parentPhone === '' || (parentPhone.length >= 10 && /^[0-9]+$/.test(parentPhone));
    
    let errorMessage = '';
    if (!isNameValid) errorMessage = '❌ يرجى إدخال الاسم الأول واللقب على الأقل';
    else if (!isWhatsappValid) errorMessage = '❌ يرجى إدخال رقم واتساب صحيح (10 أرقام على الأقل)';
    else if (!isParentPhoneValid) errorMessage = '❌ رقم ولي الأمر غير صحيح (10 أرقام على الأقل)';
    
    if (isNameValid && isWhatsappValid && isParentPhoneValid) {
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'auto';
        errorDiv.style.display = 'none';
        return true;
    } else {
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.6';
        nextBtn.style.pointerEvents = 'none';
        errorDiv.style.display = 'block';
        errorDiv.innerHTML = errorMessage;
        return false;
    }
};

window.checkStep2Completion = () => {
    const level = document.getElementById('regLevel').value;
    const grade = document.getElementById('regGrade').value;
    const nextBtn = document.getElementById('step2NextBtn');
    const errorDiv = document.getElementById('step2Error');
    
    if (level !== '' && grade !== '') {
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'auto';
        errorDiv.style.display = 'none';
        return true;
    } else {
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.6';
        nextBtn.style.pointerEvents = 'none';
        errorDiv.style.display = 'block';
        errorDiv.innerHTML = '❌ يرجى اختيار المرحلة والصف الدراسي';
        return false;
    }
};

// ================ REGISTRATION FUNCTIONS ================
window.handleRegisterEmail = async () => {
    if (!checkStep1Completion() || !checkStep2Completion()) {
        return alert(t('error') + " ❌ يرجى إكمال جميع البيانات المطلوبة أولاً");
    }
    const n1 = document.getElementById('n1').value.trim();
    const n2 = document.getElementById('n2').value.trim();
    const n3 = document.getElementById('n3').value.trim();
    const n4 = document.getElementById('n4').value.trim();
    const fullName = `${n1} ${n2} ${n3} ${n4}`.trim();
    const whatsapp = document.getElementById('countryCode').value + document.getElementById('regWhatsapp').value.trim();
    const parentPhone = document.getElementById('parentCountryCode').value + document.getElementById('regParentPhone').value.trim();
    const grade = document.getElementById('regGrade').value;
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value;
    const passConfirm = document.getElementById('regPassConfirm').value;
    
    const sid = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    if (!email || !pass) return alert(t('error') + " ❌ يرجى إدخال البريد الإلكتروني وكلمة المرور");
    if (pass.length < 6) return alert(t('error') + " ❌ يجب أن تكون كلمة المرور مكونة من 6 أحرف أو أكثر");
    if (pass !== passConfirm) return alert(t('error') + " ❌ كلمة المرور غير متطابقة!");

    const btn = document.getElementById('regBtn');
    btn.disabled = true; btn.innerText = t('loading') + "...";
    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(res.user, { displayName: fullName });
        await set(ref(db, 'students/' + res.user.uid), { 
            name: fullName, 
            grade: grade, 
            whatsapp: whatsapp,
            parentPhone: parentPhone,
            shortId: sid,
            email: email,
            points: 0,
            badges: [],
            subscriptions: {},
            watchedVideos: {},
            examResults: {}
        });
        alert(t('success') + " ✅ تم التسجيل بنجاح! كود الـ ID الخاص بك هو: " + sid); 
        closeLogin();
    } catch(err) {
        alert(t('error') + " ❌ " + err.message);
    } finally {
        btn.disabled = false; btn.innerText = t('register');
    }
};

window.handleRegisterUsername = async () => {
    if (!checkStep1Completion() || !checkStep2Completion()) return alert(t('error') + " ❌ يرجى إكمال جميع البيانات المطلوبة أولاً");
    const n1 = document.getElementById('n1').value.trim();
    const n2 = document.getElementById('n2').value.trim();
    const n3 = document.getElementById('n3').value.trim();
    const n4 = document.getElementById('n4').value.trim();
    const fullName = `${n1} ${n2} ${n3} ${n4}`.trim();
    const whatsapp = document.getElementById('countryCode').value + document.getElementById('regWhatsapp').value.trim();
    const parentPhone = document.getElementById('parentCountryCode').value + document.getElementById('regParentPhone').value.trim();
    const grade = document.getElementById('regGrade').value;
    const username = document.getElementById('regUsername').value.trim();
    const pass = document.getElementById('regPassUser').value;
    const passConfirm = document.getElementById('regPassUserConfirm').value;
    const sid = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    if (!username || !pass) return alert(t('error') + " ❌ يرجى إدخال اسم المستخدم وكلمة المرور");
    if (pass.length < 6) return alert(t('error') + " ❌ يجب أن تكون كلمة المرور مكونة من 6 أحرف أو أكثر");
    if (pass !== passConfirm) return alert(t('error') + " ❌ كلمة المرور غير متطابقة!");
    const btn = document.getElementById('regBtnUser');
    btn.disabled = true; btn.innerText = t('loading') + "...";
    try {
        const fakeEmail = `${username}@monaacademy.local`;
        const res = await createUserWithEmailAndPassword(auth, fakeEmail, pass);
        await updateProfile(res.user, { displayName: fullName });
        await set(ref(db, 'students/' + res.user.uid), { 
            name: fullName, 
            grade: grade, 
            whatsapp: whatsapp,
            parentPhone: parentPhone,
            shortId: sid,
            username: username,
            points: 0,
            badges: [],
            subscriptions: {},
            watchedVideos: {},
            examResults: {}
        });
        alert(t('success') + " ✅ تم التسجيل بنجاح! كود الـ ID الخاص بك هو: " + sid + "\nاليوزر نيم: " + username); 
        closeLogin();
    } catch(err) {
        alert(t('error') + " ❌ " + err.message);
    } finally {
        btn.disabled = false; btn.innerText = t('register');
    }
};

window.registerWithGoogle = async () => {
    if (!checkStep1Completion() || !checkStep2Completion()) return alert(t('error') + " ❌ يرجى إكمال جميع البيانات المطلوبة أولاً");
    const n1 = document.getElementById('n1').value.trim();
    const n2 = document.getElementById('n2').value.trim();
    const n3 = document.getElementById('n3').value.trim();
    const n4 = document.getElementById('n4').value.trim();
    const fullName = `${n1} ${n2} ${n3} ${n4}`.trim();
    const whatsapp = document.getElementById('countryCode').value + document.getElementById('regWhatsapp').value.trim();
    const parentPhone = document.getElementById('parentCountryCode').value + document.getElementById('regParentPhone').value.trim();
    const grade = document.getElementById('regGrade').value;
    const sid = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        await updateProfile(user, { displayName: fullName });
        await set(ref(db, 'students/' + user.uid), {
            name: fullName,
            grade: grade,
            whatsapp: whatsapp,
            parentPhone: parentPhone,
            shortId: sid,
            email: user.email,
            points: 0,
            badges: [],
            subscriptions: {},
            watchedVideos: {},
            examResults: {}
        });
        alert(t('success') + " ✅ تم التسجيل بنجاح! كود الـ ID الخاص بك هو: " + sid);
        closeLogin();
    } catch(err) {
        alert(t('error') + " ❌ " + err.message);
    }
};

// ================ LOGIN FUNCTIONS ================
window.loginEmailSubmit = () => {
    const e = document.getElementById('stEmail').value.trim(), p = document.getElementById('stPass').value;
    if(!e || !p) return alert(t('error') + " يرجى إدخال البيانات");
    signInWithEmailAndPassword(auth, e, p).then(() => closeLogin()).catch(() => alert(t('error') + " خطأ في الدخول"));
};

window.loginUsernameSubmit = () => {
    const username = document.getElementById('stUsername').value.trim();
    const pass = document.getElementById('stPassUsername').value;
    if(!username || !pass) return alert(t('error') + " يرجى إدخال البيانات");
    const fakeEmail = `${username}@monaacademy.local`;
    signInWithEmailAndPassword(auth, fakeEmail, pass).then(() => closeLogin()).catch(() => alert(t('error') + " خطأ في الدخول - تأكد من اليوزر نيم وكلمة المرور"));
};

window.loginGoogle = () => {
    signInWithPopup(auth, provider).then(async (result) => {
        const user = result.user;
        const userSnap = await get(child(dbRef, `students/${user.uid}`));
        if(!userSnap.exists()) {
            const sid = Math.floor(1000000000 + Math.random() * 9000000000).toString();
            await set(ref(db, 'students/' + user.uid), {
                name: user.displayName,
                grade: "غير محدد",
                whatsapp: "",
                parentPhone: "",
                shortId: sid,
                email: user.email,
                points: 0,
                badges: [],
                subscriptions: {},
                watchedVideos: {},
                examResults: {}
            });
        } else {
            const studentData = userSnap.val();
            if (studentData.name && studentData.name !== user.displayName) {
                await updateProfile(user, { displayName: studentData.name });
            }
        }
        closeLogin();
    }).catch(err => alert(t('error') + " ❌ " + err.message));
};

// ================ COURSE LOADING (NO GRADE FILTER) ================
function loadFolders() {
    onValue(ref(db, 'folders'), async (snapshot) => {
        let html = "";
        snapshot.forEach(c => {
            const course = c.val();
            const avgRating = course.avgRating ? parseFloat(course.avgRating).toFixed(1) : '0.0';
            const stars = '★'.repeat(Math.round(avgRating)) + '☆'.repeat(5 - Math.round(avgRating));
            html += `<div class="folder-card" onclick="openContent('${c.key}', '${course.name}')">
                <img src="${course.img || 'mona.jpg'}" loading="lazy">
                <h3>${course.name}</h3>
                <div class="course-rating">
                    <span style="color: #ffd700;">${stars}</span>
                    <span>(${course.reviewCount || 0})</span>
                </div>
            </div>`;
        });
        if (html === "") html = "<p style='text-align:center; grid-column:1/-1;'>لا توجد كورسات حالياً</p>";
        document.getElementById('foldersGrid').innerHTML = html;
    });
}

// ================ PERFECT SCORES SECTION ================
window.loadPerfectScores = async () => {
    try {
        const resultsSnap = await get(child(dbRef, 'quiz_results'));
        const studentsSnap = await get(child(dbRef, 'students'));
        
        if (!resultsSnap.exists() || !studentsSnap.exists()) {
            document.getElementById('perfectScoresSection').style.display = 'none';
            return;
        }

        const students = studentsSnap.val();
        const gradeMap = {};
        Object.values(students).forEach(student => {
            if (student.shortId) {
                gradeMap[student.shortId] = student.grade || 'غير محدد';
            }
        });

        const perfectScores = [];
        resultsSnap.forEach(result => {
            const res = result.val();
            if (res.score === res.total && res.score > 0) {
                perfectScores.push({
                    studentName: res.student || 'طالب',
                    studentId: res.studentId || '',
                    examName: res.quiz || 'امتحان',
                    grade: gradeMap[res.studentId] || 'غير محدد',
                    score: res.score,
                    total: res.total,
                    time: res.time || ''
                });
            }
        });

        const unique = {};
        perfectScores.forEach(ps => {
            const key = `${ps.studentId}-${ps.examName}`;
            if (!unique[key] || ps.time > unique[key].time) {
                unique[key] = ps;
            }
        });

        const finalList = Object.values(unique);
        
        if (finalList.length > 0) {
            document.getElementById('perfectScoresSection').style.display = 'block';
            const audio = document.getElementById('successSound');
            if (audio) audio.play().catch(e => console.log('Sound play failed:', e));
            
            let html = '';
            finalList.forEach(ps => {
                html += `<div class="perfect-card">
                    <div class="perfect-name">
                        <i class="fas fa-user-graduate" style="color: var(--main);"></i>
                        ${ps.studentName}
                    </div>
                    <div class="perfect-exam">
                        <i class="fas fa-file-alt" style="margin-left: 5px; color: var(--main);"></i>
                        ${ps.examName}
                    </div>
                    <div class="perfect-grade">
                        <i class="fas fa-graduation-cap" style="margin-left: 5px;"></i>
                        الصف: ${ps.grade}
                    </div>
                    <div class="perfect-score">
                        <i class="fas fa-check-circle"></i> ممتاز - ${ps.score}/${ps.total}
                    </div>
                </div>`;
            });
            document.getElementById('perfectScoresGrid').innerHTML = html;
        } else {
            document.getElementById('perfectScoresSection').style.display = 'none';
        }
    } catch (error) {
        console.error("Error loading perfect scores:", error);
        document.getElementById('perfectScoresSection').style.display = 'none';
    }
};

// ================ LEADERBOARD ================
window.loadLeaderboard = async () => {
    const studentsSnap = await get(ref(db, 'students'));
    if (!studentsSnap.exists()) return;
    let leaderboard = [];
    studentsSnap.forEach(s => {
        const data = s.val();
        if (data.points > 0) {
            leaderboard.push({
                name: data.name || 'طالب',
                points: data.points || 0,
                badges: data.badges?.length || 0
            });
        }
    });
    leaderboard.sort((a, b) => b.points - a.points);
    leaderboard = leaderboard.slice(0, 20);
    
    let html = '<div class="leaderboard-row"><span class="leaderboard-rank">#</span><span>' + t('student') + '</span><span>' + t('points') + '</span></div>';
    leaderboard.forEach((s, i) => {
        html += `<div class="leaderboard-row">
            <span class="leaderboard-rank">#${i+1}</span>
            <span>${s.name}</span>
            <span>${s.points} <i class="fas fa-star" style="color: var(--gold);"></i></span>
        </div>`;
    });
    document.getElementById('leaderboardContainer').innerHTML = html;
    document.getElementById('leaderboardSection').style.display = leaderboard.length ? 'block' : 'none';
};

// ================ POINTS & BADGES ================
async function awardPoints(uid, action, metadata = {}) {
    const points = POINTS[action];
    if (!points) return;
    const studentRef = ref(db, `students/${uid}`);
    const snap = await get(studentRef);
    if (!snap.exists()) return;
    const student = snap.val();
    const currentPoints = student.points || 0;
    const newPoints = currentPoints + points;
    await update(studentRef, { points: newPoints });
    // Log activity
    await push(ref(db, `student_activities/${uid}`), {
        action: action,
        points: points,
        metadata: metadata,
        timestamp: new Date().toLocaleString('ar-EG')
    });
    await checkBadges(uid, newPoints, student);
}

async function checkBadges(uid, totalPoints, studentData) {
    const earnedBadges = studentData.badges || [];
    const newBadges = [];
    for (const [key, badge] of Object.entries(BADGES)) {
        if (badge.threshold && totalPoints >= badge.threshold) {
            if (!earnedBadges.includes(key)) {
                newBadges.push(key);
                earnedBadges.push(key);
            }
        }
    }
    if (newBadges.length > 0) {
        await update(ref(db, `students/${uid}`), { badges: earnedBadges });
        alert(`🎉 تهانينا! حصلت على شارة: ${newBadges.map(b => BADGES[b].name).join(', ')}`);
    }
}

// ================ SUBSCRIPTION SYSTEM ================
window.openContent = async (folderId, folderName) => {
    if (!currentUser) { openLogin(); return; }
    currentFolderId = folderId;
    currentFolderName = folderName;
    const subSnap = await get(child(dbRef, `students/${currentUser.uid}/subscriptions/${folderId}`));
    const isSubscribed = subSnap.exists();
    if (!isSubscribed) {
        showSubscriptionModal(folderId, folderName);
        return;
    }
    await loadCourseContent(folderId, folderName, true);
};

window.showSubscriptionModal = (folderId, folderName) => {
    currentFolderId = folderId;
    currentFolderName = folderName;
    document.getElementById('subCourseInfo').innerText = folderName;
    document.getElementById('subscriptionModal').style.display = 'flex';
    document.getElementById('subscriptionIdSection').style.display = 'none';
    document.getElementById('subError').innerHTML = '';
    document.getElementById('subscriptionIdInput').value = '';
};

window.closeSubscriptionModal = () => {
    document.getElementById('subscriptionModal').style.display = 'none';
};

document.getElementById('previewBtn')?.addEventListener('click', async () => {
    closeSubscriptionModal();
    await loadCourseContent(currentFolderId, currentFolderName, false);
});

document.getElementById('subscribeBtn')?.addEventListener('click', () => {
    document.getElementById('subscriptionIdSection').style.display = 'block';
});

window.confirmSubscription = async () => {
    const enteredId = document.getElementById('subscriptionIdInput').value.trim();
    if (!enteredId) {
        document.getElementById('subError').innerHTML = '❌ يرجى إدخال كود الطالب';
        return;
    }
    const userSnap = await get(child(dbRef, `students/${currentUser.uid}`));
    if (!userSnap.exists()) {
        document.getElementById('subError').innerHTML = '❌ لم يتم العثور على بياناتك';
        return;
    }
    const studentData = userSnap.val();
    if (studentData.shortId !== enteredId) {
        document.getElementById('subError').innerHTML = '❌ كود الطالب غير صحيح';
        return;
    }
    const subscriptionData = {
        courseId: currentFolderId,
        courseName: currentFolderName,
        subscribedAt: new Date().toLocaleString('ar-EG'),
        studentName: studentData.name,
        studentId: studentData.shortId,
        progress: 0
    };
    await set(ref(db, `students/${currentUser.uid}/subscriptions/${currentFolderId}`), subscriptionData);
    await push(ref(db, 'subscription_notifications'), {
        ...subscriptionData,
        studentUid: currentUser.uid,
        timestamp: new Date().toLocaleString('ar-EG')
    });
    // Award points for subscription
    await awardPoints(currentUser.uid, 'SUBSCRIBE_COURSE', { courseId: currentFolderId, courseName: currentFolderName });
    alert('✅ تم الاشتراك بنجاح! يمكنك الآن مشاهدة المحتوى كاملاً.');
    closeSubscriptionModal();
    await loadCourseContent(currentFolderId, currentFolderName, true);
};

// ================ LOAD COURSE CONTENT (WITH QUIZ REVIEW & RATING) ================
window.loadCourseContent = async (folderId, folderName, hasAccess) => {
    document.getElementById('homePage').style.display = "none";
    document.getElementById('studentDashboard').style.display = "none";
    document.getElementById('contentArea').style.display = "block";
    document.getElementById('folderTitleName').innerText = folderName;

    // Load course rating section
    await loadCourseRatingUI(folderId);

    const [vSnap, qSnap] = await Promise.all([
        get(child(dbRef, `folders/${folderId}/videos`)),
        get(child(dbRef, `quizzes/${folderId}`))
    ]);

    let examResultsMap = {};
    if (hasAccess && currentUser) {
        const resultsSnap = await get(child(dbRef, `students/${currentUser.uid}/examResults`));
        if (resultsSnap.exists()) {
            const results = resultsSnap.val();
            Object.keys(results).forEach(quizId => {
                if (results[quizId].courseId === folderId) {
                    examResultsMap[quizId] = results[quizId];
                }
            });
        }
    }

    let html = "";

    // Videos
    if (vSnap.exists()) {
        vSnap.forEach(v => {
            const videoData = v.val();
            let vidId = "error";
            const match = videoData.url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
            if (match && match[2].length == 11) vidId = match[2];
            const disabledClass = hasAccess ? '' : 'disabled';
            const onclickAttr = hasAccess ? `onclick="openVideo('${videoData.url}', '${videoData.title}', '${v.key}', '${folderId}')"` : '';
            html += `<div class="item-card ${disabledClass}" ${onclickAttr}>
                ${!hasAccess ? '<i class="fas fa-lock lock-icon"></i>' : ''}
                <img src="https://img.youtube.com/vi/${vidId}/mqdefault.jpg" class="v-thumb" onerror="this.src='mona.jpg'" loading="lazy">
                <div class="item-details">
                    <span class="badge badge-video">${t('badge.video') || 'فيديو شرح'}</span>
                    <h4>${videoData.title}</h4>
                    ${!hasAccess ? '<span style="color:#ff7675; font-size:0.8rem;">' + (t('subscribeToWatch') || 'اشترك لتشاهد') + '</span>' : ''}
                </div>
            </div>`;
        });
    }

    // Quizzes
    if (qSnap.exists()) {
        qSnap.forEach(q => {
            const quizData = q.val();
            if (quizData.videoRel === "all" || !quizData.videoRel) {
                const disabledClass = hasAccess ? '' : 'disabled';
                const quizId = q.key;
                const isCompleted = examResultsMap[quizId] ? true : false;
                
                let buttonHtml = '';
                let badgeText = t('startQuiz') || 'امتحان شامل';
                let badgeStyle = '';
                
                if (isCompleted) {
                    badgeText = t('reviewQuiz') || '✅ تم الحل - مراجعة';
                    badgeStyle = 'background: var(--success); color: white;';
                    buttonHtml = `onclick="viewQuizResult('${folderId}', '${quizId}')"`;
                } else {
                    buttonHtml = hasAccess ? `onclick="startQuiz('${folderId}', '${quizId}')"` : '';
                }

                html += `<div class="item-card ${disabledClass}" ${buttonHtml}>
                    ${!hasAccess ? '<i class="fas fa-lock lock-icon"></i>' : ''}
                    <div style="height:160px; background:#f0eeff; display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-file-signature fa-3x" style="color:var(--main)"></i>
                    </div>
                    <div class="item-details">
                        <span class="badge" style="${badgeStyle}">${badgeText}</span>
                        <h4>${quizData.name}</h4>
                        ${!hasAccess ? '<span style="color:#ff7675; font-size:0.8rem;">' + (t('subscribeToTake') || 'اشترك لتؤدي الامتحان') + '</span>' : ''}
                        ${isCompleted ? `<span style="display:block; margin-top:8px; color: var(--success); font-size:0.85rem;">
                            <i class="fas fa-check-circle"></i> ${t('score') || 'النتيجة'}: ${examResultsMap[quizId].score}/${examResultsMap[quizId].total} (${examResultsMap[quizId].percentage}%)
                        </span>` : ''}
                    </div>
                </div>`;
            }
        });
    }

    document.getElementById('combinedGrid').innerHTML = html || "<p style='text-align:center; grid-column:1/-1;'>" + (t('comingSoon') || 'قريباً...') + "</p>";
};

// ================ COURSE RATING UI ================
async function loadCourseRatingUI(courseId) {
    const ratingDiv = document.getElementById('courseRatingSection');
    if (!currentUser) {
        ratingDiv.style.display = 'none';
        return;
    }
    const courseSnap = await get(ref(db, `folders/${courseId}`));
    const avgRating = courseSnap.val()?.avgRating || 0;
    const reviewCount = courseSnap.val()?.reviewCount || 0;
    const stars = '★'.repeat(Math.round(avgRating)) + '☆'.repeat(5 - Math.round(avgRating));
    
    let html = `<div class="average-rating">
        <span style="font-weight: bold;">${t('averageRating')}:</span>
        <span class="stars-display">${stars}</span>
        <span>(${reviewCount} ${t('reviews')})</span>
    </div>`;
    
    // Check if user already reviewed this course
    const userReviewsSnap = await get(child(dbRef, `course_reviews/${courseId}`));
    let userReviewed = false;
    if (userReviewsSnap.exists()) {
        userReviewsSnap.forEach(r => {
            if (r.val().studentId === currentUser.uid) userReviewed = true;
        });
    }
    if (!userReviewed) {
        html += `<div class="star-rating">
            <input type="radio" id="star5" name="rating" value="5"><label for="star5" onclick="setRating(5)">★</label>
            <input type="radio" id="star4" name="rating" value="4"><label for="star4" onclick="setRating(4)">★</label>
            <input type="radio" id="star3" name="rating" value="3"><label for="star3" onclick="setRating(3)">★</label>
            <input type="radio" id="star2" name="rating" value="2"><label for="star2" onclick="setRating(2)">★</label>
            <input type="radio" id="star1" name="rating" value="1"><label for="star1" onclick="setRating(1)">★</label>
        </div>
        <textarea id="reviewText" rows="3" placeholder="${t('writeReview')}" style="width:100%; padding:10px; border-radius:10px; border:1px solid #ddd; margin:10px 0;"></textarea>
        <button onclick="submitCourseRating('${courseId}')" class="btn" style="background:var(--main); color:white;">${t('submitReview')}</button>`;
    }
    ratingDiv.innerHTML = html;
    ratingDiv.style.display = 'block';
}
window.setRating = (val) => { window.selectedRating = val; };
window.submitCourseRating = async (courseId) => {
    if (!currentUser) return openLogin();
    const rating = window.selectedRating;
    if (!rating) return alert('❌ يرجى اختيار تقييم');
    const review = document.getElementById('reviewText')?.value || '';
    const userSnap = await get(child(dbRef, `students/${currentUser.uid}`));
    const studentName = userSnap.val()?.name || currentUser.displayName || 'طالب';
    await push(ref(db, `course_reviews/${courseId}`), {
        studentId: currentUser.uid,
        studentName: studentName,
        rating: rating,
        review: review,
        timestamp: new Date().toLocaleString('ar-EG')
    });
    // Update average rating
    const reviewsSnap = await get(child(dbRef, `course_reviews/${courseId}`));
    let total = 0, count = 0;
    reviewsSnap.forEach(r => { total += r.val().rating; count++; });
    const avg = count > 0 ? (total / count).toFixed(1) : 0;
    await update(ref(db, `folders/${courseId}`), { avgRating: avg, reviewCount: count });
    // Award points
    await awardPoints(currentUser.uid, 'ADD_REVIEW', { courseId });
    alert('✅ تم إرسال تقييمك، شكراً لك!');
    loadCourseRatingUI(courseId);
};

// ================ VIDEO WATCHING & PROGRESS ================
window.openVideo = async (url, title, videoId, folderId) => {
    if (!currentUser) return openLogin();
    await set(ref(db, `students/${currentUser.uid}/watchedVideos/${videoId}`), {
        courseId: folderId,
        courseName: document.getElementById('folderTitleName').innerText,
        videoTitle: title,
        watchedAt: new Date().toLocaleString('ar-EG')
    });
    await updateCourseProgress(currentUser.uid, folderId);
    // Award points for first video watch
    const studentSnap = await get(child(dbRef, `students/${currentUser.uid}/watchedVideos`));
    const watchedCount = Object.keys(studentSnap.val() || {}).length;
    if (watchedCount === 1) {
        await awardPoints(currentUser.uid, 'FIRST_VIDEO', { videoId, title });
        // Grant FIRST_VIDEO badge
        const student = (await get(ref(db, `students/${currentUser.uid}`))).val();
        const badges = student.badges || [];
        if (!badges.includes('FIRST_VIDEO')) {
            badges.push('FIRST_VIDEO');
            await update(ref(db, `students/${currentUser.uid}`), { badges });
            alert('🎉 حصلت على شارة: أول فيديو!');
        }
    } else {
        await awardPoints(currentUser.uid, 'WATCH_VIDEO', { videoId, title });
    }
    const match = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    document.getElementById('quizTitle').innerText = title;
    document.getElementById('quizOverlay').style.display = 'block';
    document.getElementById('quizContainer').innerHTML = `<iframe width="100%" height="400px" src="https://www.youtube.com/embed/${match[2]}?autoplay=1" frameborder="0" allowfullscreen style="border-radius:15px; background:#000;"></iframe>`;
};

async function updateCourseProgress(uid, courseId) {
    const watchedSnap = await get(child(dbRef, `students/${uid}/watchedVideos`));
    const videosSnap = await get(child(dbRef, `folders/${courseId}/videos`));
    if (watchedSnap.exists() && videosSnap.exists()) {
        const watchedVideosInCourse = Object.values(watchedSnap.val() || {}).filter(v => v.courseId === courseId).length;
        const totalVideos = Object.keys(videosSnap.val() || {}).length;
        const progress = totalVideos > 0 ? Math.round((watchedVideosInCourse / totalVideos) * 100) : 0;
        await update(ref(db, `students/${uid}/subscriptions/${courseId}`), {
            progress: progress,
            lastWatched: new Date().toLocaleString('ar-EG')
        });
    }
}

// ================ QUIZ FUNCTIONS ================
window.startQuiz = async (folderId, quizId) => {
    if (!currentUser) return openLogin();
    
    const resultSnap = await get(child(dbRef, `students/${currentUser.uid}/examResults/${quizId}`));
    if (resultSnap.exists()) {
        alert("❌ لقد قمت بحل هذا الامتحان من قبل. يمكنك مراجعة إجاباتك فقط.");
        viewQuizResult(folderId, quizId);
        return;
    }
    
    const quizSnap = await get(child(dbRef, `quizzes/${folderId}/${quizId}`));
    if(!quizSnap.exists()) return alert("خطأ في تحميل الامتحان");
    const quizData = quizSnap.val();
    document.getElementById('quizTitle').innerText = quizData.name;
    document.getElementById('quizOverlay').style.display = 'block';
    
    let html = `<div style="margin-bottom: 20px; color: var(--main); font-weight: bold;">⏳ ${t('startQuiz')}</div>`;
    const questions = quizData.questions || {};
    Object.keys(questions).forEach((qKey, idx) => {
        const q = questions[qKey];
        html += `<div class="q-form-card">
            <span class="q-text">س${idx + 1}: ${q.text}</span>
            <div class="opt-container">`;
        ['a', 'b', 'c', 'd'].forEach(opt => {
            if(q[opt]) {
                html += `<label class="opt-label" onclick="selectOption(this)">
                    <input type="radio" name="q${idx}" value="${opt}">
                    <span>${q[opt]}</span>
                </label>`;
            }
        });
        html += `</div></div>`;
    });
    html += `<button onclick="submitQuiz('${folderId}', '${quizId}')" style="background:var(--main); color:white; border:none; padding:15px; border-radius:15px; cursor:pointer; font-weight:bold; width:100%; font-size:1.1rem; font-family:'Cairo';">${t('submitAnswers')}</button>`;
    document.getElementById('quizContainer').innerHTML = html;
};

window.selectOption = (label) => {
    const container = label.closest('.opt-container');
    container.querySelectorAll('.opt-label').forEach(l => l.classList.remove('selected'));
    label.classList.add('selected');
    label.querySelector('input').checked = true;
};

window.submitQuiz = async (folderId, quizId) => {
    const quizSnap = await get(child(dbRef, `quizzes/${folderId}/${quizId}`));
    const quizData = quizSnap.val();
    const questions = quizData.questions || {};
    let score = 0, total = Object.keys(questions).length;
    const userAnswers = {};

    Object.keys(questions).forEach((qKey, idx) => {
        const selected = document.querySelector(`input[name="q${idx}"]:checked`);
        const answer = selected ? selected.value : null;
        userAnswers[`q${idx}`] = answer;
        if (answer && answer === questions[qKey].correct) {
            score++;
        }
    });

    const percentage = Math.round((score / total) * 100);
    alert(`✅ ${t('score')}: ${score}/${total} (${percentage}%)`);
    
    await set(ref(db, `students/${currentUser.uid}/examResults/${quizId}`), {
        courseId: folderId,
        courseName: document.getElementById('folderTitleName').innerText,
        quizName: quizData.name,
        score: score,
        total: total,
        percentage: percentage,
        completedAt: new Date().toLocaleString('ar-EG'),
        answers: userAnswers,
        correctAnswers: Object.fromEntries(
            Object.keys(questions).map((qKey, idx) => [`q${idx}`, questions[qKey].correct])
        )
    });

    push(ref(db, 'quiz_results'), {
        student: currentUser.displayName,
        studentId: myShortId,
        uid: currentUser.uid,
        quizId: quizId,
        quiz: quizData.name,
        score: score,
        total: total,
        percentage: percentage,
        time: new Date().toLocaleString('ar-EG')
    });

    // Award points
    const isPerfect = (score === total);
    if (isPerfect) {
        await awardPoints(currentUser.uid, 'PERFECT_QUIZ', { quizId, quizName: quizData.name });
        // Grant PERFECT_SCORE badge
        const student = (await get(ref(db, `students/${currentUser.uid}`))).val();
        const badges = student.badges || [];
        if (!badges.includes('PERFECT_SCORE')) {
            badges.push('PERFECT_SCORE');
            await update(ref(db, `students/${currentUser.uid}`), { badges });
            alert('🏆 تهانينا! حصلت على شارة الدرجة النهائية!');
        }
    } else {
        await awardPoints(currentUser.uid, 'PASS_QUIZ', { quizId, quizName: quizData.name, score, total });
    }
    // Check for FIRST_EXAM badge
    const examResultsSnap = await get(child(dbRef, `students/${currentUser.uid}/examResults`));
    const examCount = Object.keys(examResultsSnap.val() || {}).length;
    if (examCount === 1) {
        const student = (await get(ref(db, `students/${currentUser.uid}`))).val();
        const badges = student.badges || [];
        if (!badges.includes('FIRST_EXAM')) {
            badges.push('FIRST_EXAM');
            await update(ref(db, `students/${currentUser.uid}`), { badges });
            alert('📝 حصلت على شارة: أول امتحان!');
        }
    }

    await loadPerfectScores();
    await loadLeaderboard();
    closeQuiz();
};

window.viewQuizResult = async (folderId, quizId) => {
    if (!currentUser) return openLogin();
    
    const [quizSnap, resultSnap] = await Promise.all([
        get(child(dbRef, `quizzes/${folderId}/${quizId}`)),
        get(child(dbRef, `students/${currentUser.uid}/examResults/${quizId}`))
    ]);

    if (!quizSnap.exists()) return alert("❌ الامتحان غير موجود");
    if (!resultSnap.exists()) return alert("❌ لا يوجد نتيجة لهذا الامتحان");

    const quizData = quizSnap.val();
    const resultData = resultSnap.val();
    const questions = quizData.questions || {};
    const userAnswers = resultData.answers || {};
    const correctAnswers = resultData.correctAnswers || {};

    document.getElementById('quizTitle').innerHTML = `📝 ${t('reviewQuiz')}: ${quizData.name} <span style="font-size:0.9rem; color:var(--success); margin-right:15px;">${t('score')}: ${resultData.score}/${resultData.total} (${resultData.percentage}%)</span>`;
    document.getElementById('quizOverlay').style.display = 'block';

    let html = `<div style="margin-bottom: 20px; color: #666; font-weight: bold;">🔍 ${t('reviewOnly') || 'هذه مراجعة لإجاباتك، لا يمكنك تعديلها.'}</div>`;

    Object.keys(questions).forEach((qKey, idx) => {
        const q = questions[qKey];
        const userAnswer = userAnswers[`q${idx}`];
        const correctAnswer = correctAnswers[`q${idx}`] || questions[qKey].correct;
        const isCorrect = userAnswer === correctAnswer;

        html += `<div class="q-form-card" style="border-right-color: ${isCorrect ? 'var(--success)' : 'var(--danger)'};">`;
        html += `<span class="q-text">س${idx + 1}: ${q.text}</span>`;
        html += `<div class="opt-container">`;

        ['a', 'b', 'c', 'd'].forEach(opt => {
            if (q[opt]) {
                let style = '';
                if (correctAnswer === opt) {
                    style = 'background: #d4edda; border-color: var(--success);';
                }
                if (userAnswer === opt && !isCorrect) {
                    style = 'background: #f8d7da; border-color: var(--danger);';
                }
                html += `<label class="opt-label" style="${style}">`;
                html += `<input type="radio" name="q${idx}" value="${opt}" ${userAnswer === opt ? 'checked' : ''} disabled>`;
                html += `<span>${q[opt]}</span>`;
                if (correctAnswer === opt) {
                    html += ` <span style="color: var(--success); font-size: 0.85rem;">(${t('correctAnswer')})</span>`;
                }
                html += `</label>`;
            }
        });

        html += `</div>`;
        html += `<div style="margin-top:15px; font-size:0.9rem;">`;
        if (isCorrect) {
            html += `<span style="color: var(--success);"><i class="fas fa-check-circle"></i> ${t('correct')}</span>`;
        } else {
            html += `<span style="color: var(--danger);"><i class="fas fa-times-circle"></i> ${t('wrong')} (${t('yourAnswer')}: ${userAnswer ? q[userAnswer] : '—'})</span>`;
        }
        html += `</div>`;
        html += `</div>`;
    });

    html += `<button onclick="closeQuiz()" style="background:var(--dark); color:white; border:none; padding:15px; border-radius:15px; cursor:pointer; font-weight:bold; width:100%; font-size:1.1rem; font-family:'Cairo';">${t('close')}</button>`;
    document.getElementById('quizContainer').innerHTML = html;
};

window.closeQuiz = () => { 
    document.getElementById('quizOverlay').style.display = 'none'; 
    document.getElementById('quizContainer').innerHTML = ""; 
};

// ================ DASHBOARD ================
window.openDashboard = async () => {
    if (!currentUser) { openLogin(); return; }
    document.getElementById('homePage').style.display = 'none';
    document.getElementById('contentArea').style.display = 'none';
    document.getElementById('studentDashboard').style.display = 'block';
    
    const studentSnap = await get(child(dbRef, `students/${currentUser.uid}`));
    if (!studentSnap.exists()) return;
    const student = studentSnap.val();
    myShortId = student.shortId || '';
    document.getElementById('studentNameDashboard').innerText = student.name || currentUser.displayName;
    document.getElementById('dashboardStudentId').innerHTML = `<i class="fas fa-id-card"></i> ${t('studentId') || 'كود الطالب'}: ${myShortId}`;

    const subscriptions = student.subscriptions || {};
    const watchedVideos = student.watchedVideos || {};
    const examResults = student.examResults || {};
    const points = student.points || 0;
    const badges = student.badges || [];

    document.getElementById('statCourses').innerText = Object.keys(subscriptions).length;
    document.getElementById('statVideos').innerText = Object.keys(watchedVideos).length;
    document.getElementById('statExams').innerText = Object.keys(examResults).length;
    let totalPercentage = 0;
    Object.values(examResults).forEach(ex => totalPercentage += ex.percentage || 0);
    const avg = Object.keys(examResults).length > 0 ? Math.round(totalPercentage / Object.keys(examResults).length) : 0;
    document.getElementById('statAvgScore').innerText = avg + '%';
    document.getElementById('statPoints').innerText = points;

    // Display badges
    let badgesHtml = '';
    badges.forEach(b => {
        const badge = BADGES[b];
        if (badge) badgesHtml += `<span class="badge-item"><i class="${badge.icon}"></i> ${badge.name}</span>`;
    });
    document.getElementById('badgesContainer').innerHTML = badgesHtml || '<p style="color:#666;">لم تحصل على شارات بعد</p>';

    let coursesHtml = '';
    for (const [courseId, subData] of Object.entries(subscriptions)) {
        const courseSnap = await get(child(dbRef, `folders/${courseId}`));
        if (courseSnap.exists()) {
            const course = courseSnap.val();
            const progress = subData.progress || 0;
            coursesHtml += `<div class="folder-card" onclick="openContent('${courseId}', '${course.name}')">
                <img src="${course.img || 'mona.jpg'}" loading="lazy">
                <h3>${course.name}</h3>
                <div style="padding: 0 20px 20px;">
                    <div class="progress-bar-bg"><div class="progress-fill-green" style="width: ${progress}%;"></div></div>
                    <span style="color: var(--main); font-weight: bold;">${progress}% ${t('completed') || 'مكتمل'}</span>
                </div>
            </div>`;
        }
    }
    document.getElementById('myCoursesGrid').innerHTML = coursesHtml || `<p style="text-align:center; color:#999;">${t('noCourses') || 'لم تشترك في أي كورس بعد'}</p>`;

    let examsHtml = '';
    Object.entries(examResults).sort((a,b) => b[1].completedAt.localeCompare(a[1].completedAt)).slice(0,5).forEach(([id, exam]) => {
        examsHtml += `<div class="exam-item">
            <div><strong style="color: var(--main);">${exam.quizName}</strong><div style="color: #666; font-size: 0.85rem;">${exam.courseName}</div></div>
            <div><span class="exam-score">${exam.score}/${exam.total}</span><span style="color: #666; margin-right: 10px;">${exam.completedAt}</span></div>
        </div>`;
    });
    document.getElementById('recentExamsList').innerHTML = examsHtml || `<p style="text-align:center; color:#999;">${t('noExams') || 'لم تؤد أي امتحان بعد'}</p>`;

    let videosHtml = '';
    Object.entries(watchedVideos).sort((a,b) => b[1].watchedAt.localeCompare(a[1].watchedAt)).slice(0,5).forEach(([id, video]) => {
        videosHtml += `<div class="video-item">
            <div><strong>${video.videoTitle}</strong><div style="color: #666; font-size: 0.85rem;">${video.courseName}</div></div>
            <span style="color: #f1c40f;">${video.watchedAt}</span>
        </div>`;
    });
    document.getElementById('recentVideosList').innerHTML = videosHtml || `<p style="text-align:center; color:#999;">${t('noVideos') || 'لم تشاهد أي فيديو بعد'}</p>`;

    await loadContinueWatching();
};

// ================ CONTINUE WATCHING ================
window.loadContinueWatching = async () => {
    if (!currentUser) return;
    const studentSnap = await get(child(dbRef, `students/${currentUser.uid}`));
    if (!studentSnap.exists()) return;
    const student = studentSnap.val();
    const subscriptions = student.subscriptions || {};
    const watchedVideos = student.watchedVideos || {};

    let continueHtml = "";

    for (const [courseId, subData] of Object.entries(subscriptions)) {
        const courseSnap = await get(child(dbRef, `folders/${courseId}`));
        if (!courseSnap.exists()) continue;
        const course = courseSnap.val();
        const videos = course.videos || {};

        const videoList = Object.entries(videos).sort((a,b) => (a[1].order||0) - (b[1].order||0));
        if (videoList.length === 0) continue;

        let nextVideo = null;
        for (let [vidId, vidData] of videoList) {
            if (!watchedVideos[vidId]) {
                nextVideo = { id: vidId, ...vidData };
                break;
            }
        }

        if (!nextVideo) {
            const lastWatched = Object.values(watchedVideos)
                .filter(v => v.courseId === courseId)
                .sort((a,b) => b.watchedAt.localeCompare(a.watchedAt))[0];
            if (lastWatched) {
                continueHtml += `<div class="continue-card">
                    <div>
                        <h4>${course.name}</h4>
                        <p style="color: #666;">✨ ${t('allCompleted') || 'أكملت كل الفيديوهات! راجع الامتحانات'}</p>
                    </div>
                    <a href="#" onclick="openContent('${courseId}', '${course.name}'); return false;" class="btn-continue">${t('viewCourse') || 'عرض الكورس'}</a>
                </div>`;
            }
            continue;
        }

        continueHtml += `<div class="continue-card">
            <div>
                <h4>${course.name}</h4>
                <p style="color: var(--main);">▶️ ${t('continue') || 'تابع'}: ${nextVideo.title}</p>
            </div>
            <a href="#" onclick="openVideo('${nextVideo.url}', '${nextVideo.title}', '${nextVideo.id}', '${courseId}'); return false;" class="btn-continue">${t('watch') || 'مشاهدة'}</a>
        </div>`;
    }

    if (continueHtml === "") {
        continueHtml = `<div class="empty-state">${t('noContinue') || 'لا توجد فيديوهات للمتابعة حالياً. اشترك في كورس وابدأ المشاهدة!'}</div>`;
    }
    document.getElementById('continueWatchingGrid').innerHTML = continueHtml;
};

// ================ NOTIFICATIONS (FCM) ================
async function initializeMessaging() {
    try {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const { getMessaging, getToken, onMessage } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js");
                messaging = getMessaging(app);
                // Replace with your VAPID key from Firebase Console -> Project Settings -> Cloud Messaging
                const token = await getToken(messaging, { 
                    vapidKey: 'BDOUZ-b6cP7s1L0q8s3kLq9YpQn2w5x8zA1cE3fG4hI5jK6lM7nO8pP9qR0sT1uV' 
                });
                console.log('FCM Token:', token);
                if (currentUser) {
                    await set(ref(db, `students/${currentUser.uid}/notificationTokens/${token}`), {
                        token: token,
                        timestamp: new Date().toLocaleString('ar-EG')
                    });
                }
                onMessage(messaging, (payload) => {
                    console.log('Foreground message:', payload);
                    showNotification(payload.notification?.title || 'Mona Academy', 
                                   payload.notification?.body || '');
                });
            }
        }
    } catch (error) {
        console.error('Messaging init error:', error);
    }
}
function showNotification(title, body) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 80px; left: 20px; background: var(--main); color: white;
        padding: 15px 25px; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        z-index: 10000; max-width: 300px; animation: slideIn 0.3s ease; direction: rtl;
    `;
    toast.innerHTML = `<strong>${title}</strong><br>${body}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// ================ AUTH STATE ================
onAuthStateChanged(auth, async user => {
    currentUser = user;
    const statusDiv = document.getElementById('authStatus');
    const reviewContainer = document.getElementById('reviewSectionContainer');
    if (user) {
        const isAdmin = user.email === ADMIN_EMAIL;
        const userSnap = await get(child(dbRef, `students/${user.uid}`));
        let displayName = user.displayName;
        if (userSnap.exists()) {
            const data = userSnap.val();
            myShortId = data.shortId || '';
            displayName = data.name || user.displayName;
            if (data.name && data.name !== user.displayName) {
                await updateProfile(user, { displayName: data.name });
                displayName = data.name;
            }
            currentStudentGrade = data.grade;
        }
        statusDiv.innerHTML = `
            <div class="hamburger-menu" onclick="toggleMenu()">
                <i class="fas fa-bars"></i>
            </div>
        `;
        if (isAdmin) {
            statusDiv.innerHTML += `<button class="auth-btn" onclick="window.location.href='mx_2026_ctrl_p8.html'" style="margin-right:10px; background:var(--dark); color:white; border:none; padding:8px 16px; border-radius:10px; font-weight:bold; cursor:pointer;">${t('adminPanel')}</button>`;
        }
        reviewContainer.innerHTML = `<div class="add-review-box"><h3>${t('writeReview')} 👇</h3><textarea id="stuText" rows="3" placeholder="${t('writeReview')}..."></textarea><button onclick="sendStuReview()" style="background:var(--main); color:white; border:none; padding:12px; border-radius:50px; cursor:pointer; font-weight:bold; width:100%;">${t('submitReview')}</button></div>`;
        loadFolders();
        await loadLeaderboard();
        initializeMessaging();
    } else {
        statusDiv.innerHTML = `<button class="auth-btn" onclick="openLogin()" style="background:var(--main); color:white; border:none; padding:8px 20px; border-radius:10px; font-weight:bold; cursor:pointer;">${t('login')}</button>`;
        reviewContainer.innerHTML = `<div class="review-locked"><i class="fas fa-lock"></i> ${t('loginToReview') || 'يرجى تسجيل الدخول أولاً لتتمكن من إضافة رأيك.'}</div>`;
        loadFolders();
    }
});

// ================ UTILITY FUNCTIONS ================
window.logout = () => signOut(auth);
window.openLogin = () => { window.showAuthForm('choice'); document.getElementById('loginModal').style.display = 'flex'; };
window.closeLogin = () => { document.getElementById('loginModal').style.display = 'none'; };
window.goHome = () => { 
    document.getElementById('homePage').style.display = "block"; 
    document.getElementById('contentArea').style.display = "none";
    document.getElementById('studentDashboard').style.display = "none";
};
window.sendStuReview = async () => {
    const text = document.getElementById('stuText').value.trim();
    if(text && currentUser) {
        await push(ref(db, 'reviews'), { 
            student: currentUser.displayName || currentUser.email, 
            text: text,
            timestamp: new Date().toLocaleString('ar-EG')
        });
        document.getElementById('stuText').value = "";
        alert("✅ شكراً لك!");
    }
};

window.showAuthForm = (type) => {
    document.getElementById('authChoice').style.display = type === 'choice' ? 'block' : 'none';
    document.getElementById('loginChoice').style.display = type === 'loginChoice' ? 'block' : 'none';
    document.getElementById('loginEmail').style.display = type === 'loginEmail' ? 'block' : 'none';
    document.getElementById('loginUsername').style.display = type === 'loginUsername' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = type === 'register' ? 'block' : 'none';
    if (type === 'register') {
        setTimeout(() => { checkStep1Completion(); checkStep2Completion(); }, 200);
    }
};

window.showRegMethod = (method) => {
    document.querySelectorAll('.step-container').forEach(sc => sc.classList.remove('active'));
    if(method === 'email') document.getElementById('step3Email').classList.add('active');
    else if(method === 'username') document.getElementById('step3Username').classList.add('active');
};

window.nextStep = (s) => {
    document.querySelectorAll('.step-container').forEach(sc => sc.classList.remove('active'));
    document.getElementById('step' + s).classList.add('active');
    document.getElementById('regProgress').style.width = (s === 1 ? '33%' : s === 2 ? '66%' : '100%');
    if (s === 1) setTimeout(checkStep1Completion, 100);
    else if (s === 2) setTimeout(checkStep2Completion, 100);
};

window.updateGrades = () => {
    const level = document.getElementById('regLevel').value;
    const gradeSelect = document.getElementById('regGrade');
    gradeSelect.innerHTML = "";
    const grades = { primary: ["الرابع الابتدائي", "الخامس الابتدائي", "السادس الابتدائي"], middle: ["الأول الإعدادي", "الثاني الإعدادي", "الثالث الإعدادي"] };
    if (level) {
        grades[level].forEach(g => gradeSelect.innerHTML += `<option value="${g}">${g}</option>`);
        gradeSelect.value = grades[level][0];
    } else {
        gradeSelect.innerHTML = `<option value="">يرجى اختيار المرحلة أولاً</option>`;
    }
    checkStep2Completion();
};

function loadReviews() {
    onValue(ref(db, 'reviews'), snapshot => {
        let html = "";
        snapshot.forEach(c => { 
            html += `<div class="review-card">
                <p>"${c.val().text}"</p>
                <h4 style="color:var(--main);">- ${c.val().student}</h4>
                <span style="color: #999; font-size:0.75rem;">${c.val().timestamp || ''}</span>
            </div>`; 
        });
        document.getElementById('testiGrid').innerHTML = html;
    });
}

// ================ INIT ================
window.addEventListener('DOMContentLoaded', () => {
    loadFolders();
    loadReviews();
    loadPerfectScores();
    loadLeaderboard();
    
    onValue(ref(db, 'quiz_results'), () => {
        loadPerfectScores();
        loadLeaderboard();
    });
    
    const phoneInputs = ['regWhatsapp', 'regParentPhone'];
    phoneInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keypress', (e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); });
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData('text');
                if (/^\d+$/.test(text)) { input.value = text; checkStep1Completion(); }
            });
        }
    });
});