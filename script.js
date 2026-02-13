// ================ FIREBASE IMPORTS ================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, get, child, push, onValue, set, update, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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
let isAdminUser = false;
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

// ================ HELPER: ESCAPE HTML ================
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ================ HELPER: CREATE ELEMENT SAFELY ================
function createElementSafely(tag, properties = {}) {
    const element = document.createElement(tag);
    Object.entries(properties).forEach(([key, value]) => {
        if (key === 'textContent' || key === 'innerText') {
            element.textContent = value;
        } else if (key === 'innerHTML') {
            element.innerHTML = value;
        } else if (key === 'className') {
            element.className = value;
        } else if (key === 'style') {
            element.style.cssText = value;
        } else if (key.startsWith('data-')) {
            element.setAttribute(key, value);
        } else {
            element[key] = value;
        }
    });
    return element;
}

// ================ HAMBURGER MENU ================
window.toggleMenu = () => {
    const menu = document.getElementById('menuDropdown');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
};

window.closeMenu = () => {
    const menu = document.getElementById('menuDropdown');
    if (menu) menu.style.display = 'none';
};

document.addEventListener('click', (e) => {
    const menu = document.getElementById('menuDropdown');
    const hamburger = document.querySelector('.hamburger-menu');
    if (menu && hamburger && !menu.contains(e.target) && !hamburger.contains(e.target)) {
        menu.style.display = 'none';
    }
});

// ================ STEP VALIDATION ================
window.checkStep1Completion = () => {
    const n1 = document.getElementById('n1')?.value.trim() || '';
    const n4 = document.getElementById('n4')?.value.trim() || '';
    const whatsapp = document.getElementById('regWhatsapp')?.value.trim() || '';
    const parentPhone = document.getElementById('regParentPhone')?.value.trim() || '';
    const nextBtn = document.getElementById('step1NextBtn');
    const errorDiv = document.getElementById('step1Error');
    
    if (!nextBtn || !errorDiv) return false;
    
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
    const level = document.getElementById('regLevel')?.value || '';
    const grade = document.getElementById('regGrade')?.value || '';
    const nextBtn = document.getElementById('step2NextBtn');
    const errorDiv = document.getElementById('step2Error');
    
    if (!nextBtn || !errorDiv) return false;
    
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
        return alert('خطأ ❌ يرجى إكمال جميع البيانات المطلوبة أولاً');
    }
    
    const n1 = document.getElementById('n1')?.value.trim() || '';
    const n2 = document.getElementById('n2')?.value.trim() || '';
    const n3 = document.getElementById('n3')?.value.trim() || '';
    const n4 = document.getElementById('n4')?.value.trim() || '';
    const fullName = `${n1} ${n2} ${n3} ${n4}`.trim();
    const countryCode = document.getElementById('countryCode')?.value || '';
    const whatsapp = countryCode + (document.getElementById('regWhatsapp')?.value.trim() || '');
    const parentCountryCode = document.getElementById('parentCountryCode')?.value || '';
    const parentPhone = parentCountryCode + (document.getElementById('regParentPhone')?.value.trim() || '');
    const grade = document.getElementById('regGrade')?.value || '';
    const email = document.getElementById('regEmail')?.value.trim() || '';
    const pass = document.getElementById('regPass')?.value || '';
    const passConfirm = document.getElementById('regPassConfirm')?.value || '';
    
    const sid = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    
    if (!email || !pass) return alert('خطأ ❌ يرجى إدخال البريد الإلكتروني وكلمة المرور');
    if (pass.length < 6) return alert('خطأ ❌ يجب أن تكون كلمة المرور مكونة من 6 أحرف أو أكثر');
    if (pass !== passConfirm) return alert('خطأ ❌ كلمة المرور غير متطابقة!');

    const btn = document.getElementById('regBtn');
    if (!btn) return;
    
    btn.disabled = true;
    btn.innerText = "جاري التحميل...";
    
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
        alert(`نجاح ✅ تم التسجيل بنجاح! كود الطالب: ${sid}`); 
        closeLogin();
    } catch(err) {
        alert('خطأ ❌ ' + (err.message || err.toString()));
    } finally {
        btn.disabled = false;
        btn.innerText = "تسجيل";
    }
};

window.handleRegisterUsername = async () => {
    if (!checkStep1Completion() || !checkStep2Completion()) {
        return alert('خطأ ❌ يرجى إكمال جميع البيانات المطلوبة أولاً');
    }
    
    const n1 = document.getElementById('n1')?.value.trim() || '';
    const n2 = document.getElementById('n2')?.value.trim() || '';
    const n3 = document.getElementById('n3')?.value.trim() || '';
    const n4 = document.getElementById('n4')?.value.trim() || '';
    const fullName = `${n1} ${n2} ${n3} ${n4}`.trim();
    const countryCode = document.getElementById('countryCode')?.value || '';
    const whatsapp = countryCode + (document.getElementById('regWhatsapp')?.value.trim() || '');
    const parentCountryCode = document.getElementById('parentCountryCode')?.value || '';
    const parentPhone = parentCountryCode + (document.getElementById('regParentPhone')?.value.trim() || '');
    const grade = document.getElementById('regGrade')?.value || '';
    const username = document.getElementById('regUsername')?.value.trim() || '';
    const pass = document.getElementById('regPassUser')?.value || '';
    const passConfirm = document.getElementById('regPassUserConfirm')?.value || '';
    const sid = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    
    if (!username || !pass) return alert('خطأ ❌ يرجى إدخال اسم المستخدم وكلمة المرور');
    if (pass.length < 6) return alert('خطأ ❌ يجب أن تكون كلمة المرور مكونة من 6 أحرف أو أكثر');
    if (pass !== passConfirm) return alert('خطأ ❌ كلمة المرور غير متطابقة!');
    
    const btn = document.getElementById('regBtnUser');
    if (!btn) return;
    
    btn.disabled = true;
    btn.innerText = "جاري التحميل...";
    
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
        alert(`نجاح ✅ تم التسجيل بنجاح! كود الطالب: ${sid}\nاسم المستخدم: ${username}`); 
        closeLogin();
    } catch(err) {
        alert('خطأ ❌ ' + (err.message || err.toString()));
    } finally {
        btn.disabled = false;
        btn.innerText = "تسجيل";
    }
};

window.registerWithGoogle = async () => {
    if (!checkStep1Completion() || !checkStep2Completion()) {
        return alert('خطأ ❌ يرجى إكمال جميع البيانات المطلوبة أولاً');
    }
    
    const n1 = document.getElementById('n1')?.value.trim() || '';
    const n2 = document.getElementById('n2')?.value.trim() || '';
    const n3 = document.getElementById('n3')?.value.trim() || '';
    const n4 = document.getElementById('n4')?.value.trim() || '';
    const fullName = `${n1} ${n2} ${n3} ${n4}`.trim();
    const countryCode = document.getElementById('countryCode')?.value || '';
    const whatsapp = countryCode + (document.getElementById('regWhatsapp')?.value.trim() || '');
    const parentCountryCode = document.getElementById('parentCountryCode')?.value || '';
    const parentPhone = parentCountryCode + (document.getElementById('regParentPhone')?.value.trim() || '');
    const grade = document.getElementById('regGrade')?.value || '';
    const sid = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        const userSnap = await get(child(dbRef, `students/${user.uid}`));
        if(userSnap.exists()) {
            alert('❌ هذا الحساب موجود بالفعل. يرجى تسجيل الدخول مباشرة.');
            await signOut(auth);
            return;
        }
        
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
        alert(`نجاح ✅ تم التسجيل بنجاح! كود الطالب: ${sid}`);
        closeLogin();
    } catch(err) {
        alert('خطأ ❌ ' + (err.message || err.toString()));
    }
};

// ================ LOGIN FUNCTIONS ================
window.loginEmailSubmit = async () => {
    const e = document.getElementById('stEmail')?.value.trim() || '';
    const p = document.getElementById('stPass')?.value || '';
    
    if(!e || !p) return alert('خطأ ❌ يرجى إدخال البيانات');
    
    try {
        await signInWithEmailAndPassword(auth, e, p);
        closeLogin();
    } catch(err) {
        alert('خطأ ❌ فشل تسجيل الدخول');
    }
};

window.loginUsernameSubmit = async () => {
    const username = document.getElementById('stUsername')?.value.trim() || '';
    const pass = document.getElementById('stPassUsername')?.value || '';
    
    if(!username || !pass) return alert('خطأ ❌ يرجى إدخال البيانات');
    
    const fakeEmail = `${username}@monaacademy.local`;
    
    try {
        await signInWithEmailAndPassword(auth, fakeEmail, pass);
        closeLogin();
    } catch(err) {
        alert('خطأ ❌ فشل تسجيل الدخول');
    }
};

window.loginGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const userSnap = await get(child(dbRef, `students/${user.uid}`));
        
        if(!userSnap.exists()) {
            alert('❌ لم يتم العثور على حساب. يرجى التسجيل أولاً عبر نموذج إنشاء حساب.');
            await signOut(auth);
            openLogin();
        } else {
            closeLogin();
        }
    } catch(err) {
        alert('خطأ ❌ ' + (err.message || err.toString()));
    }
};

// ================ COURSE LOADING ================
function loadFolders() {
    onValue(ref(db, 'folders'), async (snapshot) => {
        const grid = document.getElementById('foldersGrid');
        if (!grid) return;
        
        grid.innerHTML = "";
        
        snapshot.forEach(c => {
            const course = c.val();
            const courseId = c.key;
            const courseName = course.name || '';
            const avgRating = course.avgRating ? parseFloat(course.avgRating).toFixed(1) : '0.0';
            const stars = '★'.repeat(Math.round(parseFloat(avgRating))) + '☆'.repeat(5 - Math.round(parseFloat(avgRating)));
            
            const card = createElementSafely('div', { className: 'folder-card' });
            
            const img = createElementSafely('img', {
                src: course.img || 'mona.jpg',
                loading: 'lazy',
                alt: courseName
            });
            img.onerror = () => img.src = 'mona.jpg';
            
            const h3 = createElementSafely('h3', { textContent: courseName });
            
            const ratingDiv = createElementSafely('div', { className: 'course-rating' });
            ratingDiv.innerHTML = `<span style="color: #ffd700;">${stars}</span><span>(${course.reviewCount || 0})</span>`;
            
            card.appendChild(img);
            card.appendChild(h3);
            card.appendChild(ratingDiv);
            card.addEventListener('click', () => openContent(courseId, courseName));
            
            grid.appendChild(card);
        });
        
        if (grid.children.length === 0) {
            grid.innerHTML = "<p style='text-align:center; grid-column:1/-1;'>لا توجد كورسات بعد</p>";
        }
    });
}

// ================ PERFECT SCORES SECTION ================
window.loadPerfectScores = async () => {
    try {
        const resultsSnap = await get(child(dbRef, 'quiz_results'));
        const studentsSnap = await get(child(dbRef, 'students'));
        
        const perfectScoresSection = document.getElementById('perfectScoresSection');
        const perfectScoresGrid = document.getElementById('perfectScoresGrid');
        
        if (!perfectScoresSection || !perfectScoresGrid) return;
        
        if (!resultsSnap.exists() || !studentsSnap.exists()) {
            perfectScoresSection.style.display = 'none';
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
            perfectScoresSection.style.display = 'block';
            
            let html = '';
            finalList.forEach(ps => {
                html += `<div class="perfect-card">
                    <div class="perfect-name">
                        <i class="fas fa-user-graduate" style="color: var(--main);"></i>
                        ${escapeHTML(ps.studentName)}
                    </div>
                    <div class="perfect-exam">
                        <i class="fas fa-file-alt" style="margin-left: 5px; color: var(--main);"></i>
                        ${escapeHTML(ps.examName)}
                    </div>
                    <div class="perfect-grade">
                        <i class="fas fa-graduation-cap" style="margin-left: 5px;"></i>
                        الصف: ${escapeHTML(ps.grade)}
                    </div>
                    <div class="perfect-score">
                        <i class="fas fa-check-circle"></i> ممتاز - ${ps.score}/${ps.total}
                    </div>
                </div>`;
            });
            perfectScoresGrid.innerHTML = html;
        } else {
            perfectScoresSection.style.display = 'none';
        }
    } catch (error) {
        console.error("Error loading perfect scores:", error);
        const perfectScoresSection = document.getElementById('perfectScoresSection');
        if (perfectScoresSection) perfectScoresSection.style.display = 'none';
    }
};

// ================ LEADERBOARD ================
window.loadLeaderboard = async () => {
    try {
        const studentsRef = ref(db, 'students');
        const topStudentsQuery = query(studentsRef, orderByChild('points'), limitToLast(20));
        const snapshot = await get(topStudentsQuery);
        
        const leaderboardSection = document.getElementById('leaderboardSection');
        const leaderboardContainer = document.getElementById('leaderboardContainer');
        
        if (!leaderboardSection || !leaderboardContainer) return;
        
        if (!snapshot.exists()) {
            leaderboardSection.style.display = 'none';
            return;
        }
        
        let leaderboard = [];
        snapshot.forEach(s => {
            const data = s.val();
            if (data.points > 0) {
                leaderboard.push({
                    name: data.name || 'طالب',
                    points: data.points || 0
                });
            }
        });
        
        leaderboard.sort((a, b) => b.points - a.points);
        
        let html = '<div class="leaderboard-row"><span class="leaderboard-rank">#</span><span>الطالب</span><span>النقاط</span></div>';
        leaderboard.forEach((s, i) => {
            html += `<div class="leaderboard-row">
                <span class="leaderboard-rank">#${i+1}</span>
                <span>${escapeHTML(s.name)}</span>
                <span>${s.points} <i class="fas fa-star" style="color: var(--gold);"></i></span>
            </div>`;
        });
        leaderboardContainer.innerHTML = html;
        leaderboardSection.style.display = leaderboard.length ? 'block' : 'none';
    } catch(error) {
        console.error("Error loading leaderboard:", error);
    }
};

// ================ POINTS & BADGES ================
async function awardPoints(uid, action, metadata = {}) {
    try {
        const points = POINTS[action];
        if (!points) return;
        
        const studentRef = ref(db, `students/${uid}`);
        const snap = await get(studentRef);
        if (!snap.exists()) return;
        
        const student = snap.val();
        const currentPoints = student.points || 0;
        const newPoints = currentPoints + points;
        
        await update(studentRef, { points: newPoints });
        await push(ref(db, `student_activities/${uid}`), {
            action: action,
            points: points,
            metadata: metadata,
            timestamp: new Date().toLocaleString('ar-EG')
        });
        
        await checkBadges(uid, newPoints, student);
        await loadLeaderboard();
    } catch(error) {
        console.error("Error awarding points:", error);
    }
}

async function checkBadges(uid, totalPoints, studentData) {
    try {
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
            alert('🎉 تهانينا! حصلت على شارة: ' + newBadges.map(b => BADGES[b].name).join(', '));
        }
    } catch(error) {
        console.error("Error checking badges:", error);
    }
}

// ================ SUBSCRIPTION SYSTEM ================
window.openContent = async (folderId, folderName) => {
    if (!currentUser) { 
        openLogin(); 
        return; 
    }
    
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
    
    const modal = document.getElementById('subscriptionModal');
    const subCourseInfo = document.getElementById('subCourseInfo');
    const subIdSection = document.getElementById('subscriptionIdSection');
    const subError = document.getElementById('subError');
    const subIdInput = document.getElementById('subscriptionIdInput');
    
    if (!modal) return;
    
    if (subCourseInfo) subCourseInfo.innerText = folderName;
    modal.style.display = 'flex';
    if (subIdSection) subIdSection.style.display = 'none';
    if (subError) subError.innerHTML = '';
    if (subIdInput) subIdInput.value = '';
};

window.closeSubscriptionModal = () => {
    const modal = document.getElementById('subscriptionModal');
    if (modal) modal.style.display = 'none';
};

// ================ EVENT LISTENERS FOR SUBSCRIPTION ================
const previewBtn = document.getElementById('previewBtn');
if (previewBtn) {
    previewBtn.addEventListener('click', async () => {
        closeSubscriptionModal();
        await loadCourseContent(currentFolderId, currentFolderName, false);
    });
}

const subscribeBtn = document.getElementById('subscribeBtn');
if (subscribeBtn) {
    subscribeBtn.addEventListener('click', () => {
        const subIdSection = document.getElementById('subscriptionIdSection');
        if (subIdSection) subIdSection.style.display = 'block';
    });
}

window.confirmSubscription = async () => {
    const subIdInput = document.getElementById('subscriptionIdInput');
    const subError = document.getElementById('subError');
    
    if (!subIdInput || !subError) return;
    
    const enteredId = subIdInput.value.trim();
    if (!enteredId) {
        subError.innerHTML = '❌ يرجى إدخال كود الطالب';
        return;
    }
    
    const userSnap = await get(child(dbRef, `students/${currentUser.uid}`));
    if (!userSnap.exists()) {
        subError.innerHTML = '❌ لم يتم العثور على بياناتك';
        return;
    }
    
    const studentData = userSnap.val();
    if (studentData.shortId !== enteredId) {
        subError.innerHTML = '❌ كود الطالب غير صحيح';
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
    
    await awardPoints(currentUser.uid, 'SUBSCRIBE_COURSE', { courseId: currentFolderId, courseName: currentFolderName });
    alert('✅ تم الاشتراك بنجاح! يمكنك الآن مشاهدة المحتوى كاملاً.');
    closeSubscriptionModal();
    await loadCourseContent(currentFolderId, currentFolderName, true);
};

// ================ LOAD COURSE CONTENT ================
window.loadCourseContent = async (folderId, folderName, hasAccess) => {
    const homePage = document.getElementById('homePage');
    const studentDashboard = document.getElementById('studentDashboard');
    const contentArea = document.getElementById('contentArea');
    const folderTitleName = document.getElementById('folderTitleName');
    
    if (homePage) homePage.style.display = "none";
    if (studentDashboard) studentDashboard.style.display = "none";
    if (contentArea) contentArea.style.display = "block";
    if (folderTitleName) folderTitleName.innerText = folderName;

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

    const grid = document.getElementById('combinedGrid');
    if (!grid) return;
    
    grid.innerHTML = "";

    // Videos
    if (vSnap.exists()) {
        vSnap.forEach(v => {
            const videoData = v.val();
            const videoUrl = videoData.url || '';
            let vidId = "error";
            const match = videoUrl.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
            if (match && match[2].length == 11) vidId = match[2];
            
            const card = createElementSafely('div', { 
                className: `item-card ${hasAccess ? '' : 'disabled'}` 
            });
            
            if (!hasAccess) {
                const lockIcon = createElementSafely('i', { 
                    className: 'fas fa-lock lock-icon' 
                });
                card.appendChild(lockIcon);
            }
            
            const img = createElementSafely('img', {
                src: `https://img.youtube.com/vi/${vidId}/mqdefault.jpg`,
                className: 'v-thumb',
                loading: 'lazy'
            });
            img.onerror = () => img.src = 'mona.jpg';
            card.appendChild(img);
            
            const detailsDiv = createElementSafely('div', { className: 'item-details' });
            
            const badge = createElementSafely('span', {
                className: 'badge badge-video',
                textContent: 'فيديو شرح'
            });
            detailsDiv.appendChild(badge);
            
            const title = createElementSafely('h4', { 
                textContent: videoData.title || '' 
            });
            detailsDiv.appendChild(title);
            
            if (!hasAccess) {
                const lockMsg = createElementSafely('span', {
                    style: 'color:#ff7675; font-size:0.8rem;',
                    textContent: 'اشترك لتشاهد'
                });
                detailsDiv.appendChild(lockMsg);
            }
            
            card.appendChild(detailsDiv);
            
            if (hasAccess) {
                card.addEventListener('click', () => openVideo(videoData.url, videoData.title, v.key, folderId));
            }
            
            grid.appendChild(card);
        });
    }

    // Quizzes
    if (qSnap.exists()) {
        qSnap.forEach(q => {
            const quizData = q.val();
            if (quizData.videoRel === "all" || !quizData.videoRel) {
                const quizId = q.key;
                const isCompleted = examResultsMap[quizId] ? true : false;
                
                const card = createElementSafely('div', {
                    className: `item-card ${hasAccess ? '' : 'disabled'}`
                });
                
                if (!hasAccess) {
                    const lockIcon = createElementSafely('i', {
                        className: 'fas fa-lock lock-icon'
                    });
                    card.appendChild(lockIcon);
                }
                
                const iconDiv = createElementSafely('div', {
                    style: 'height:160px; background:#f0eeff; display:flex; align-items:center; justify-content:center;'
                });
                const icon = createElementSafely('i', {
                    className: 'fas fa-file-signature fa-3x',
                    style: 'color: var(--main);'
                });
                iconDiv.appendChild(icon);
                card.appendChild(iconDiv);
                
                const detailsDiv = createElementSafely('div', { className: 'item-details' });
                
                const badge = createElementSafely('span', { className: 'badge' });
                if (isCompleted) {
                    badge.textContent = '✅ تم الحل - مراجعة';
                    badge.style.cssText = 'background: var(--success); color: white;';
                } else {
                    badge.textContent = 'ابدأ الامتحان';
                }
                detailsDiv.appendChild(badge);
                
                const title = createElementSafely('h4', {
                    textContent: quizData.name || ''
                });
                detailsDiv.appendChild(title);
                
                if (!hasAccess) {
                    const lockMsg = createElementSafely('span', {
                        style: 'color:#ff7675; font-size:0.8rem;',
                        textContent: 'اشترك لتؤدي الامتحان'
                    });
                    detailsDiv.appendChild(lockMsg);
                }
                
                if (isCompleted) {
                    const scoreSpan = createElementSafely('span', {
                        style: 'display:block; margin-top:8px; color: var(--success); font-size:0.85rem;'
                    });
                    scoreSpan.innerHTML = `<i class="fas fa-check-circle"></i> النتيجة: ${examResultsMap[quizId].score}/${examResultsMap[quizId].total} (${examResultsMap[quizId].percentage}%)`;
                    detailsDiv.appendChild(scoreSpan);
                }
                
                card.appendChild(detailsDiv);
                
                if (hasAccess) {
                    if (isCompleted) {
                        card.addEventListener('click', () => viewQuizResult(folderId, quizId));
                    } else {
                        card.addEventListener('click', () => startQuiz(folderId, quizId));
                    }
                }
                
                grid.appendChild(card);
            }
        });
    }

    if (grid.children.length === 0) {
        grid.innerHTML = "<p style='text-align:center; grid-column:1/-1;'>قريباً...</p>";
    }
};

// ================ COURSE RATING UI ================
async function loadCourseRatingUI(courseId) {
    const ratingDiv = document.getElementById('courseRatingSection');
    if (!ratingDiv) return;
    
    if (!currentUser) {
        ratingDiv.style.display = 'none';
        return;
    }
    
    const courseSnap = await get(ref(db, `folders/${courseId}`));
    const courseData = courseSnap.val() || {};
    const avgRating = courseData.avgRating || 0;
    const reviewCount = courseData.reviewCount || 0;
    const stars = '★'.repeat(Math.round(parseFloat(avgRating))) + '☆'.repeat(5 - Math.round(parseFloat(avgRating)));
    
    let html = `<div class="average-rating">
        <span style="font-weight: bold;">متوسط التقييم:</span>
        <span class="stars-display">${stars}</span>
        <span>(${reviewCount} تقييم)</span>
    </div>`;
    
    const userReviewsSnap = await get(child(dbRef, `course_reviews/${courseId}`));
    let userReviewed = false;
    if (userReviewsSnap.exists()) {
        userReviewsSnap.forEach(r => {
            if (r.val().studentId === currentUser.uid) userReviewed = true;
        });
    }
    
    if (!userReviewed) {
        html += `<div class="star-rating">
            <input type="radio" id="star5" name="rating" value="5"><label for="star5" onclick="window.setRating(5)">★</label>
            <input type="radio" id="star4" name="rating" value="4"><label for="star4" onclick="window.setRating(4)">★</label>
            <input type="radio" id="star3" name="rating" value="3"><label for="star3" onclick="window.setRating(3)">★</label>
            <input type="radio" id="star2" name="rating" value="2"><label for="star2" onclick="window.setRating(2)">★</label>
            <input type="radio" id="star1" name="rating" value="1"><label for="star1" onclick="window.setRating(1)">★</label>
        </div>
        <textarea id="reviewText" rows="3" placeholder="اكتب رأيك هنا..." style="width:100%; padding:10px; border-radius:10px; border:1px solid #ddd; margin:10px 0;"></textarea>
        <button onclick="window.submitCourseRating('${courseId}')" class="btn" style="background:var(--main); color:white;">إرسال التقييم</button>`;
    }
    
    ratingDiv.innerHTML = html;
    ratingDiv.style.display = 'block';
}

window.setRating = (val) => { 
    window.selectedRating = val; 
};

window.submitCourseRating = async (courseId) => {
    if (!currentUser) return openLogin();
    
    const rating = window.selectedRating;
    if (!rating) return alert('❌ يرجى اختيار تقييم');
    
    const reviewTextEl = document.getElementById('reviewText');
    const review = reviewTextEl ? reviewTextEl.value : '';
    
    const userSnap = await get(child(dbRef, `students/${currentUser.uid}`));
    const studentName = userSnap.val()?.name || currentUser.displayName || 'طالب';
    
    await push(ref(db, `course_reviews/${courseId}`), {
        studentId: currentUser.uid,
        studentName: studentName,
        rating: rating,
        review: review,
        timestamp: new Date().toLocaleString('ar-EG')
    });
    
    const reviewsSnap = await get(child(dbRef, `course_reviews/${courseId}`));
    let total = 0, count = 0;
    reviewsSnap.forEach(r => { 
        total += r.val().rating; 
        count++; 
    });
    const avg = count > 0 ? (total / count).toFixed(1) : 0;
    
    await update(ref(db, `folders/${courseId}`), { 
        avgRating: avg, 
        reviewCount: count 
    });
    
    await awardPoints(currentUser.uid, 'ADD_REVIEW', { courseId });
    alert('✅ تم إرسال تقييمك، شكراً لك!');
    loadCourseRatingUI(courseId);
};

// ================ VIDEO WATCHING & PROGRESS ================
window.openVideo = async (url, title, videoId, folderId) => {
    if (!currentUser) return openLogin();

    const match = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    if (!match || match[2].length !== 11) {
        alert("❌ رابط الفيديو غير صالح");
        return;
    }
    const videoIdentifier = match[2];

    await set(ref(db, `students/${currentUser.uid}/watchedVideos/${videoId}`), {
        courseId: folderId,
        courseName: document.getElementById('folderTitleName')?.innerText || '',
        videoTitle: title,
        watchedAt: new Date().toLocaleString('ar-EG')
    });
    
    await updateCourseProgress(currentUser.uid, folderId);
    
    const studentSnap = await get(child(dbRef, `students/${currentUser.uid}/watchedVideos`));
    const watchedCount = Object.keys(studentSnap.val() || {}).length;
    
    if (watchedCount === 1) {
        await awardPoints(currentUser.uid, 'FIRST_VIDEO', { videoId, title });
        const student = (await get(ref(db, `students/${currentUser.uid}`))).val();
        const badges = student.badges || [];
        if (!badges.includes('FIRST_VIDEO')) {
            badges.push('FIRST_VIDEO');
            await update(ref(db, `students/${currentUser.uid}`), { badges });
            alert('🎬 حصلت على شارة: أول فيديو!');
        }
    } else {
        await awardPoints(currentUser.uid, 'WATCH_VIDEO', { videoId, title });
    }
    
    const quizTitle = document.getElementById('quizTitle');
    const quizOverlay = document.getElementById('quizOverlay');
    const quizContainer = document.getElementById('quizContainer');
    
    if (quizTitle) quizTitle.innerText = title;
    if (quizOverlay) quizOverlay.style.display = 'block';
    if (quizContainer) {
        quizContainer.innerHTML = `<iframe width="100%" height="400px" src="https://www.youtube.com/embed/${videoIdentifier}?autoplay=1" frameborder="0" allowfullscreen style="border-radius:15px; background:#000;"></iframe>`;
    }
};

async function updateCourseProgress(uid, courseId) {
    try {
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
    } catch(error) {
        console.error("Error updating course progress:", error);
    }
}

// ================ QUIZ FUNCTIONS ================
window.startQuiz = async (folderId, quizId) => {
    if (!currentUser) return openLogin();
    
    const resultSnap = await get(child(dbRef, `students/${currentUser.uid}/examResults/${quizId}`));
    if (resultSnap.exists()) {
        alert('❌ لقد قمت بحل هذا الامتحان من قبل. يمكنك مراجعة إجاباتك فقط.');
        viewQuizResult(folderId, quizId);
        return;
    }
    
    const quizSnap = await get(child(dbRef, `quizzes/${folderId}/${quizId}`));
    if(!quizSnap.exists()) return alert('❌ خطأ في تحميل الامتحان');
    
    const quizData = quizSnap.val();
    
    const quizTitle = document.getElementById('quizTitle');
    const quizOverlay = document.getElementById('quizOverlay');
    const quizContainer = document.getElementById('quizContainer');
    
    if (quizTitle) quizTitle.innerText = quizData.name || '';
    if (quizOverlay) quizOverlay.style.display = 'block';
    
    if (!quizContainer) return;
    
    let html = `<div style="margin-bottom: 20px; color: var(--main); font-weight: bold;">⏳ ابدأ الامتحان</div>`;
    const questions = quizData.questions || {};
    
    Object.keys(questions).forEach((qKey, idx) => {
        const q = questions[qKey];
        html += `<div class="q-form-card">
            <span class="q-text">س${idx + 1}: ${escapeHTML(q.text || '')}</span>
            <div class="opt-container">`;
        
        ['a', 'b', 'c', 'd'].forEach(opt => {
            if(q[opt]) {
                html += `<label class="opt-label" onclick="window.selectOption(this)">
                    <input type="radio" name="q${idx}" value="${opt}">
                    <span>${escapeHTML(q[opt])}</span>
                </label>`;
            }
        });
        
        html += `</div></div>`;
    });
    
    html += `<button onclick="window.submitQuiz('${folderId}', '${quizId}')" style="background:var(--main); color:white; border:none; padding:15px; border-radius:15px; cursor:pointer; font-weight:bold; width:100%; font-size:1.1rem; font-family:'Cairo';">تسليم الإجابات</button>`;
    quizContainer.innerHTML = html;
};

window.selectOption = (label) => {
    const container = label.closest('.opt-container');
    if (!container) return;
    
    container.querySelectorAll('.opt-label').forEach(l => l.classList.remove('selected'));
    label.classList.add('selected');
    const input = label.querySelector('input');
    if (input) input.checked = true;
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
    alert(`✅ النتيجة: ${score}/${total} (${percentage}%)`);
    
    const folderTitleName = document.getElementById('folderTitleName');
    const courseName = folderTitleName ? folderTitleName.innerText : '';
    
    await set(ref(db, `students/${currentUser.uid}/examResults/${quizId}`), {
        courseId: folderId,
        courseName: courseName,
        quizName: quizData.name || '',
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
        student: currentUser.displayName || '',
        studentId: myShortId,
        uid: currentUser.uid,
        quizId: quizId,
        quiz: quizData.name || '',
        score: score,
        total: total,
        percentage: percentage,
        time: new Date().toLocaleString('ar-EG')
    });

    const isPerfect = (score === total);
    if (isPerfect) {
        await awardPoints(currentUser.uid, 'PERFECT_QUIZ', { quizId, quizName: quizData.name });
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

    if (!quizSnap.exists()) return alert('❌ الامتحان غير موجود');
    if (!resultSnap.exists()) return alert('❌ لا يوجد نتيجة لهذا الامتحان');

    const quizData = quizSnap.val();
    const resultData = resultSnap.val();
    const questions = quizData.questions || {};
    const userAnswers = resultData.answers || {};
    const correctAnswers = resultData.correctAnswers || {};

    const quizTitle = document.getElementById('quizTitle');
    const quizOverlay = document.getElementById('quizOverlay');
    const quizContainer = document.getElementById('quizContainer');
    
    if (quizTitle) {
        quizTitle.innerHTML = `📝 مراجعة الامتحان: ${quizData.name || ''} <span style="font-size:0.9rem; color:var(--success); margin-right:15px;">النتيجة: ${resultData.score}/${resultData.total} (${resultData.percentage}%)</span>`;
    }
    if (quizOverlay) quizOverlay.style.display = 'block';
    
    if (!quizContainer) return;

    let html = `<div style="margin-bottom: 20px; color: #666; font-weight: bold;">🔍 هذه مراجعة لإجاباتك، لا يمكنك تعديلها.</div>`;

    Object.keys(questions).forEach((qKey, idx) => {
        const q = questions[qKey];
        const userAnswer = userAnswers[`q${idx}`];
        const correctAnswer = correctAnswers[`q${idx}`] || questions[qKey].correct;
        const isCorrect = userAnswer === correctAnswer;

        html += `<div class="q-form-card" style="border-right-color: ${isCorrect ? 'var(--success)' : 'var(--danger)'};">`;
        html += `<span class="q-text">س${idx + 1}: ${escapeHTML(q.text || '')}</span>`;
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
                html += `<span>${escapeHTML(q[opt])}</span>`;
                if (correctAnswer === opt) {
                    html += ` <span style="color: var(--success); font-size: 0.85rem;">(الإجابة الصحيحة)</span>`;
                }
                html += `</label>`;
            }
        });

        html += `</div>`;
        html += `<div style="margin-top:15px; font-size:0.9rem;">`;
        if (isCorrect) {
            html += `<span style="color: var(--success);"><i class="fas fa-check-circle"></i> إجابة صحيحة</span>`;
        } else {
            const userAnswerText = userAnswer && q[userAnswer] ? escapeHTML(q[userAnswer]) : '—';
            html += `<span style="color: var(--danger);"><i class="fas fa-times-circle"></i> إجابة خاطئة (إجابتك: ${userAnswerText})</span>`;
        }
        html += `</div>`;
        html += `</div>`;
    });

    html += `<button onclick="window.closeQuiz()" style="background:var(--dark); color:white; border:none; padding:15px; border-radius:15px; cursor:pointer; font-weight:bold; width:100%; font-size:1.1rem; font-family:'Cairo';">إغلاق</button>`;
    quizContainer.innerHTML = html;
};

window.closeQuiz = () => { 
    const quizOverlay = document.getElementById('quizOverlay');
    const quizContainer = document.getElementById('quizContainer');
    
    if (quizOverlay) quizOverlay.style.display = 'none';
    if (quizContainer) quizContainer.innerHTML = "";
};

// ================ DASHBOARD ================
window.openDashboard = async () => {
    if (!currentUser) { 
        openLogin(); 
        return; 
    }
    
    if (isAdminUser) {
        window.location.href = 'mx_2026_ctrl_p8.html';
        return;
    }
    
    const homePage = document.getElementById('homePage');
    const contentArea = document.getElementById('contentArea');
    const studentDashboard = document.getElementById('studentDashboard');
    
    if (homePage) homePage.style.display = 'none';
    if (contentArea) contentArea.style.display = 'none';
    if (studentDashboard) studentDashboard.style.display = 'block';
    
    const studentSnap = await get(child(dbRef, `students/${currentUser.uid}`));
    if (!studentSnap.exists()) return;
    
    const student = studentSnap.val();
    myShortId = student.shortId || '';
    
    const studentNameDashboard = document.getElementById('studentNameDashboard');
    const dashboardStudentId = document.getElementById('dashboardStudentId');
    
    if (studentNameDashboard) studentNameDashboard.innerText = student.name || currentUser.displayName || '';
    if (dashboardStudentId) {
        dashboardStudentId.innerHTML = `<i class="fas fa-id-card"></i> كود الطالب: ${escapeHTML(myShortId)}`;
    }

    const subscriptions = student.subscriptions || {};
    const watchedVideos = student.watchedVideos || {};
    const examResults = student.examResults || {};
    const points = student.points || 0;
    const badges = student.badges || [];

    const statCourses = document.getElementById('statCourses');
    const statVideos = document.getElementById('statVideos');
    const statExams = document.getElementById('statExams');
    const statAvgScore = document.getElementById('statAvgScore');
    const statPoints = document.getElementById('statPoints');
    
    if (statCourses) statCourses.innerText = Object.keys(subscriptions).length;
    if (statVideos) statVideos.innerText = Object.keys(watchedVideos).length;
    if (statExams) statExams.innerText = Object.keys(examResults).length;
    
    let totalPercentage = 0;
    Object.values(examResults).forEach(ex => totalPercentage += ex.percentage || 0);
    const avg = Object.keys(examResults).length > 0 ? Math.round(totalPercentage / Object.keys(examResults).length) : 0;
    if (statAvgScore) statAvgScore.innerText = avg + '%';
    if (statPoints) statPoints.innerText = points;

    let badgesHtml = '';
    badges.forEach(b => {
        const badge = BADGES[b];
        if (badge) badgesHtml += `<span class="badge-item"><i class="${badge.icon}"></i> ${badge.name}</span>`;
    });
    
    const badgesContainer = document.getElementById('badgesContainer');
    if (badgesContainer) {
        badgesContainer.innerHTML = badgesHtml || '<p style="color:#666;">لم تحصل على شارات بعد</p>';
    }

    let coursesHtml = '';
    for (const [courseId, subData] of Object.entries(subscriptions)) {
        const courseSnap = await get(child(dbRef, `folders/${courseId}`));
        if (courseSnap.exists()) {
            const course = courseSnap.val();
            const progress = subData.progress || 0;
            
            const card = createElementSafely('div', { className: 'folder-card' });
            
            const img = createElementSafely('img', {
                src: course.img || 'mona.jpg',
                loading: 'lazy'
            });
            img.onerror = () => img.src = 'mona.jpg';
            card.appendChild(img);
            
            const h3 = createElementSafely('h3', { textContent: course.name || '' });
            card.appendChild(h3);
            
            const progressDiv = createElementSafely('div', {
                style: 'padding: 0 20px 20px'
            });
            progressDiv.innerHTML = `
                <div class="progress-bar-bg"><div class="progress-fill-green" style="width: ${progress}%;"></div></div>
                <span style="color: var(--main); font-weight: bold;">${progress}% مكتمل</span>
            `;
            card.appendChild(progressDiv);
            
            card.addEventListener('click', () => openContent(courseId, course.name));
            
            coursesHtml += card.outerHTML;
        }
    }
    
    const myCoursesGrid = document.getElementById('myCoursesGrid');
    if (myCoursesGrid) {
        myCoursesGrid.innerHTML = coursesHtml || `<p style="text-align:center; color:#999;">لم تشترك في أي كورس بعد</p>`;
    }

    let examsHtml = '';
    Object.entries(examResults)
        .sort((a,b) => (b[1].completedAt || '').localeCompare(a[1].completedAt || ''))
        .slice(0,5)
        .forEach(([id, exam]) => {
            examsHtml += `<div class="exam-item">
                <div><strong style="color: var(--main);">${escapeHTML(exam.quizName || '')}</strong><div style="color: #666; font-size: 0.85rem;">${escapeHTML(exam.courseName || '')}</div></div>
                <div><span class="exam-score">${exam.score}/${exam.total}</span><span style="color: #666; margin-right: 10px;">${exam.completedAt || ''}</span></div>
            </div>`;
        });
    
    const recentExamsList = document.getElementById('recentExamsList');
    if (recentExamsList) {
        recentExamsList.innerHTML = examsHtml || `<p style="text-align:center; color:#999;">لم تؤد أي امتحان بعد</p>`;
    }

    let videosHtml = '';
    Object.entries(watchedVideos)
        .sort((a,b) => (b[1].watchedAt || '').localeCompare(a[1].watchedAt || ''))
        .slice(0,5)
        .forEach(([id, video]) => {
            videosHtml += `<div class="video-item">
                <div><strong>${escapeHTML(video.videoTitle || '')}</strong><div style="color: #666; font-size: 0.85rem;">${escapeHTML(video.courseName || '')}</div></div>
                <span style="color: #f1c40f;">${video.watchedAt || ''}</span>
            </div>`;
        });
    
    const recentVideosList = document.getElementById('recentVideosList');
    if (recentVideosList) {
        recentVideosList.innerHTML = videosHtml || `<p style="text-align:center; color:#999;">لم تشاهد أي فيديو بعد</p>`;
    }

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
                .sort((a,b) => (b.watchedAt || '').localeCompare(a.watchedAt || ''))[0];
            
            if (lastWatched) {
                const card = createElementSafely('div', { className: 'continue-card' });
                
                const div1 = createElementSafely('div');
                const h4 = createElementSafely('h4', { textContent: course.name || '' });
                const p = createElementSafely('p', {
                    style: 'color: #666;',
                    textContent: '✨ أكملت كل الفيديوهات! راجع الامتحانات'
                });
                div1.appendChild(h4);
                div1.appendChild(p);
                card.appendChild(div1);
                
                const btn = createElementSafely('a', {
                    href: '#',
                    className: 'btn-continue',
                    textContent: 'عرض الكورس'
                });
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    openContent(courseId, course.name);
                });
                card.appendChild(btn);
                
                continueHtml += card.outerHTML;
            }
            continue;
        }

        const card = createElementSafely('div', { className: 'continue-card' });
        
        const div1 = createElementSafely('div');
        const h4 = createElementSafely('h4', { textContent: course.name || '' });
        const p = createElementSafely('p', {
            style: 'color: var(--main);',
            textContent: '▶️ تابع: ' + (nextVideo.title || '')
        });
        div1.appendChild(h4);
        div1.appendChild(p);
        card.appendChild(div1);
        
        const btn = createElementSafely('a', {
            href: '#',
            className: 'btn-continue',
            textContent: 'مشاهدة'
        });
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openVideo(nextVideo.url, nextVideo.title, nextVideo.id, courseId);
        });
        card.appendChild(btn);
        
        continueHtml += card.outerHTML;
    }

    if (continueHtml === "") {
        continueHtml = `<div class="empty-state">لا توجد فيديوهات للمتابعة حالياً. اشترك في كورس وابدأ المشاهدة!</div>`;
    }
    
    const continueWatchingGrid = document.getElementById('continueWatchingGrid');
    if (continueWatchingGrid) {
        continueWatchingGrid.innerHTML = continueHtml;
    }
};

// ================ NOTIFICATIONS (FCM) ================
async function initializeMessaging() {
    try {
        if (!('Notification' in window)) {
            console.log('هذا المتصفح لا يدعم الإشعارات');
            return;
        }
        
        if ('Notification' in window && 'serviceWorker' in navigator) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const registration = await navigator.serviceWorker.register('/mona-academy/firebase-messaging-sw.js');
                console.log('FCM SW registered:', registration);
                
                const { getMessaging, getToken, onMessage } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js");
                messaging = getMessaging(app);
                
                const token = await getToken(messaging, { 
                    vapidKey: 'BAofIHy3Jf7a13xLzRNZ8InnTV7b3iyWLpnBe-xNc0V7s6AeheOODKcgIsVf5XTsyNPMCb27IL4_9glKaz8KToA',
                    serviceWorkerRegistration: registration
                });
                console.log('FCM Token:', token);
                
                if (currentUser && token) {
                    await set(ref(db, `students/${currentUser.uid}/notificationTokens/${token}`), {
                        token: token,
                        timestamp: new Date().toLocaleString('ar-EG')
                    });
                }
                
                onMessage(messaging, (payload) => {
                    console.log('Foreground message:', payload);
                    const title = payload.notification?.title || 'Mona Academy';
                    const body = payload.notification?.body || '';
                    showNotification(title, body);
                });
            }
        }
    } catch (error) {
        console.error('Messaging init error:', error);
    }
}

function showNotification(title, body) {
    const toast = createElementSafely('div', {
        style: `position: fixed; top: 80px; left: 20px; background: var(--main); color: white;
                padding: 15px 25px; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.2);
                z-index: 10000; max-width: 300px; animation: slideIn 0.3s ease; direction: rtl;`
    });
    toast.innerHTML = `<strong>${escapeHTML(title)}</strong><br>${escapeHTML(body)}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// ================ AUTH STATE ================
onAuthStateChanged(auth, async user => {
    currentUser = user;
    const statusDiv = document.getElementById('authStatus');
    const reviewContainer = document.getElementById('reviewSectionContainer');
    
    if (!statusDiv) return;
    
    if (user) {
        const isAdmin = user.email === ADMIN_EMAIL;
        const adminsSnap = await get(ref(db, 'admins'));
        const admins = adminsSnap.val() || {};
        const isAddedAdmin = admins && admins[user.email];
        isAdminUser = isAdmin || isAddedAdmin;
        
        const userSnap = await get(child(dbRef, `students/${user.uid}`));
        let displayName = user.displayName || '';
        
        if (userSnap.exists()) {
            const data = userSnap.val();
            myShortId = data.shortId || '';
            displayName = data.name || user.displayName || '';
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
        
        if (isAdminUser) {
            statusDiv.innerHTML += `<button class="auth-btn" onclick="window.location.href='mx_2026_ctrl_p8.html'" style="margin-right:10px; background:var(--dark); color:white; border:none; padding:8px 16px; border-radius:10px; font-weight:bold; cursor:pointer;">الإدارة</button>`;
        }
        
        if (reviewContainer) {
            reviewContainer.innerHTML = `<div class="add-review-box"><h3>اكتب رأيك 👇</h3><textarea id="stuText" rows="3" placeholder="اكتب رأيك هنا..."></textarea><button onclick="window.sendStuReview()" style="background:var(--main); color:white; border:none; padding:12px; border-radius:50px; cursor:pointer; font-weight:bold; width:100%;">إرسال التقييم</button></div>`;
        }
        
        loadFolders();
        await loadLeaderboard();
        initializeMessaging();
    } else {
        isAdminUser = false;
        statusDiv.innerHTML = `<button class="auth-btn" onclick="window.openLogin()" style="background:var(--main); color:white; border:none; padding:8px 20px; border-radius:10px; font-weight:bold; cursor:pointer;">تسجيل الدخول</button>`;
        
        if (reviewContainer) {
            reviewContainer.innerHTML = `<div class="review-locked"><i class="fas fa-lock"></i> يرجى تسجيل الدخول أولاً لتتمكن من إضافة رأيك.</div>`;
        }
        
        loadFolders();
    }
});

// ================ UTILITY FUNCTIONS ================
window.logout = () => signOut(auth);

window.openLogin = () => { 
    window.showAuthForm('choice'); 
    const loginModal = document.getElementById('loginModal');
    if (loginModal) loginModal.style.display = 'flex'; 
};

window.closeLogin = () => { 
    const loginModal = document.getElementById('loginModal');
    if (loginModal) loginModal.style.display = 'none'; 
};

window.goHome = () => { 
    const homePage = document.getElementById('homePage');
    const contentArea = document.getElementById('contentArea');
    const studentDashboard = document.getElementById('studentDashboard');
    
    if (homePage) homePage.style.display = "block";
    if (contentArea) contentArea.style.display = "none";
    if (studentDashboard) studentDashboard.style.display = "none";
};

window.sendStuReview = async () => {
    const stuText = document.getElementById('stuText');
    if (!stuText) return;
    
    const text = stuText.value.trim();
    if(text && currentUser) {
        await push(ref(db, 'reviews'), { 
            student: currentUser.displayName || currentUser.email || '', 
            text: text,
            timestamp: new Date().toLocaleString('ar-EG')
        });
        stuText.value = "";
        alert('✅ شكراً لك! تم إرسال تقييمك.');
    }
};

window.showAuthForm = (type) => {
    const forms = {
        'authChoice': document.getElementById('authChoice'),
        'loginChoice': document.getElementById('loginChoice'),
        'loginEmail': document.getElementById('loginEmail'),
        'loginUsername': document.getElementById('loginUsername'),
        'registerForm': document.getElementById('registerForm')
    };
    
    Object.values(forms).forEach(form => {
        if (form) form.style.display = 'none';
    });
    
    if (type === 'choice' && forms.authChoice) forms.authChoice.style.display = 'block';
    else if (type === 'loginChoice' && forms.loginChoice) forms.loginChoice.style.display = 'block';
    else if (type === 'loginEmail' && forms.loginEmail) forms.loginEmail.style.display = 'block';
    else if (type === 'loginUsername' && forms.loginUsername) forms.loginUsername.style.display = 'block';
    else if (type === 'register' && forms.registerForm) {
        forms.registerForm.style.display = 'block';
        setTimeout(() => { 
            checkStep1Completion(); 
            checkStep2Completion(); 
        }, 200);
    }
};

window.showRegMethod = (method) => {
    document.querySelectorAll('.step-container').forEach(sc => sc.classList.remove('active'));
    
    if(method === 'email') {
        const step3Email = document.getElementById('step3Email');
        if (step3Email) step3Email.classList.add('active');
    } else if(method === 'username') {
        const step3Username = document.getElementById('step3Username');
        if (step3Username) step3Username.classList.add('active');
    }
};

window.nextStep = (s) => {
    document.querySelectorAll('.step-container').forEach(sc => sc.classList.remove('active'));
    
    const stepEl = document.getElementById('step' + s);
    if (stepEl) stepEl.classList.add('active');
    
    const regProgress = document.getElementById('regProgress');
    if (regProgress) {
        regProgress.style.width = (s === 1 ? '33%' : s === 2 ? '66%' : '100%');
    }
    
    if (s === 1) setTimeout(checkStep1Completion, 100);
    else if (s === 2) setTimeout(checkStep2Completion, 100);
};

window.updateGrades = () => {
    const level = document.getElementById('regLevel')?.value || '';
    const gradeSelect = document.getElementById('regGrade');
    
    if (!gradeSelect) return;
    
    gradeSelect.innerHTML = "";
    
    const grades = { 
        primary: ["الرابع الابتدائي", "الخامس الابتدائي", "السادس الابتدائي"], 
        middle: ["الأول الإعدادي", "الثاني الإعدادي", "الثالث الإعدادي"] 
    };
    
    if (level && grades[level]) {
        grades[level].forEach(g => {
            const option = createElementSafely('option', {
                value: g,
                textContent: g
            });
            gradeSelect.appendChild(option);
        });
        gradeSelect.value = grades[level][0];
    } else {
        gradeSelect.innerHTML = `<option value="">-- اختر المرحلة أولاً --</option>`;
    }
    
    checkStep2Completion();
};

function loadReviews() {
    onValue(ref(db, 'reviews'), snapshot => {
        let html = "";
        snapshot.forEach(c => {
            const review = c.val();
            html += `<div class="review-card">
                <p>"${escapeHTML(review.text || '')}"</p>
                <h4 style="color:var(--main);">- ${escapeHTML(review.student || '')}</h4>
                <span style="color: #999; font-size:0.75rem;">${escapeHTML(review.timestamp || '')}</span>
            </div>`; 
        });
        
        const testiGrid = document.getElementById('testiGrid');
        if (testiGrid) testiGrid.innerHTML = html;
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
            input.addEventListener('keypress', (e) => { 
                if (!/[0-9]/.test(e.key)) e.preventDefault(); 
            });
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData('text');
                if (/^\d+$/.test(text)) { 
                    input.value = text; 
                    checkStep1Completion(); 
                }
            });
        }
    });
});