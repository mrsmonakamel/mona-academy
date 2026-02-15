// ================ FIREBASE IMPORTS ================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, get, child, push, onValue, set, update, query, orderByChild, limitToLast, off } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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
let listeners = [];
let selectedRating = null;
let studentDataCache = {};
let cacheTime = {};
const CACHE_DURATION = 60000; // دقيقة واحدة

// ================ HANDLE FIREBASE ERRORS ================
const handleFirebaseError = (error, customMessage = 'حدث خطأ') => {
    console.error('Firebase Error:', error);
    let message = customMessage;
    
    if (error.code === 'PERMISSION_DENIED') {
        message = 'ليس لديك صلاحية للوصول إلى هذه البيانات';
    } else if (error.code === 'NETWORK_ERROR') {
        message = 'مشكلة في الاتصال بالإنترنت';
    } else if (error.code === 'auth/user-not-found') {
        message = 'المستخدم غير موجود';
    } else if (error.code === 'auth/wrong-password') {
        message = 'كلمة المرور غير صحيحة';
    } else if (error.code === 'auth/email-already-in-use') {
        message = 'البريد الإلكتروني مستخدم بالفعل';
    } else if (error.code === 'auth/invalid-email') {
        message = 'البريد الإلكتروني غير صالح';
    } else if (error.code === 'auth/weak-password') {
        message = 'كلمة المرور ضعيفة جداً';
    } else if (error.code === 'auth/network-request-failed') {
        message = 'مشكلة في الاتصال بالإنترنت';
    }
    
    showToast(`❌ ${message}`, 'error');
};

const ADMIN_EMAIL = "mrsmonakamel6@gmail.com";

// ================ POINTS & BADGES SYSTEM ================
const POINTS = {
    WATCH_VIDEO: 10,
    PERFECT_QUIZ: 50,
    PASS_QUIZ: 20,
    SUBSCRIBE_COURSE: 30,
    ADD_REVIEW: 15,
    FIRST_VIDEO: 50,
    FIRST_EXAM: 50
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

// ================ PROGRESS INDICATOR ================
let progressInterval;

function startProgress() {
    const indicator = document.getElementById('progressIndicator');
    if (indicator) {
        indicator.classList.add('loading');
        if (progressInterval) clearInterval(progressInterval);
    }
}

function stopProgress() {
    const indicator = document.getElementById('progressIndicator');
    if (indicator) {
        indicator.classList.remove('loading');
        if (progressInterval) clearInterval(progressInterval);
    }
}

// ================ HELPER: ESCAPE HTML ================
function escapeHTML(str) {
    if (!str) return '';
    if (typeof str !== 'string') str = String(str);
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ================ TOAST NOTIFICATION ================
let toastTimeout;

function showToast(message, type = 'success', duration = 3000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    if (toastTimeout) clearTimeout(toastTimeout);
    
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                type === 'error' ? 'fa-exclamation-circle' : 
                'fa-exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${escapeHTML(message)}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

window.showToast = showToast;

// ================ CACHE FUNCTIONS ================
async function getCachedStudentData(uid) {
    const now = Date.now();
    if (cacheTime[uid] && (now - cacheTime[uid] < CACHE_DURATION)) {
        return studentDataCache[uid];
    }
    const snap = await get(child(dbRef, `students/${uid}`));
    if (snap.exists()) {
        studentDataCache[uid] = snap.val();
        cacheTime[uid] = now;
    }
    return studentDataCache[uid] || null;
}

// ================ RETRY FUNCTION ================
async function firebaseFetchWithRetry(fetchFunction, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fetchFunction();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

// ================ دالة توليد كود طالب فريد ================
async function generateUniqueStudentId() {
    const studentsSnap = await get(child(dbRef, 'students'));
    const existingIds = new Set();
    
    if (studentsSnap.exists()) {
        studentsSnap.forEach(studentSnapshot => {
            const studentData = studentSnapshot.val();
            if (studentData.shortId) existingIds.add(studentData.shortId);
        });
    }
    
    let newId;
    do {
        newId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    } while (existingIds.has(newId));
    
    return newId;
}

// ================ STEP VALIDATION ================
window.checkStep1Completion = function() {
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
        errorDiv.innerHTML = escapeHTML(errorMessage);
        return false;
    }
};

window.checkStep2Completion = function() {
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
window.handleRegisterEmail = async function() {
    if (!window.checkStep1Completion() || !window.checkStep2Completion()) {
        showToast('❌ يرجى إكمال جميع البيانات المطلوبة أولاً', 'error');
        return;
    }
    
    const n1 = document.getElementById('n1')?.value.trim() || '';
    const n2 = document.getElementById('n2')?.value.trim() || '';
    const n3 = document.getElementById('n3')?.value.trim() || '';
    const n4 = document.getElementById('n4')?.value.trim() || '';
    const fullName = `${n1} ${n2} ${n3} ${n4}`.replace(/\s+/g, ' ').trim();
    const countryCode = document.getElementById('countryCode')?.value || '';
    const whatsapp = countryCode + (document.getElementById('regWhatsapp')?.value.trim() || '');
    const parentCountryCode = document.getElementById('parentCountryCode')?.value || '';
    const parentPhone = parentCountryCode + (document.getElementById('regParentPhone')?.value.trim() || '');
    const grade = document.getElementById('regGrade')?.value || '';
    const email = document.getElementById('regEmail')?.value.trim() || '';
    const pass = document.getElementById('regPass')?.value || '';
    const passConfirm = document.getElementById('regPassConfirm')?.value || '';
    
    if (!email || !pass) {
        showToast('❌ يرجى إدخال البريد الإلكتروني وكلمة المرور', 'error');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('❌ البريد الإلكتروني غير صالح', 'error');
        return;
    }
    
    if (pass.length < 6) {
        showToast('❌ يجب أن تكون كلمة المرور مكونة من 6 أحرف أو أكثر', 'error');
        return;
    }
    if (pass !== passConfirm) {
        showToast('❌ كلمة المرور غير متطابقة!', 'error');
        return;
    }

    const btn = document.getElementById('regBtn');
    if (!btn) return;
    
    btn.disabled = true;
    btn.innerText = "جاري التحميل...";
    btn.classList.add('btn-loading');
    startProgress();
    
    try {
        const studentsSnap = await get(child(dbRef, 'students'));
        let emailExists = false;
        
        if (studentsSnap.exists()) {
            studentsSnap.forEach(studentSnapshot => {
                const studentData = studentSnapshot.val();
                if (studentData.email && studentData.email.toLowerCase() === email.toLowerCase()) {
                    emailExists = true;
                }
            });
        }
        
        if (emailExists) {
            showToast('❌ هذا البريد الإلكتروني مستخدم بالفعل. الرجاء تسجيل الدخول.', 'error');
            btn.disabled = false;
            btn.innerText = "تسجيل";
            btn.classList.remove('btn-loading');
            stopProgress();
            return;
        }
        
        const sid = await generateUniqueStudentId();
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(res.user, { displayName: fullName });
        
        await set(ref(db, 'students/' + res.user.uid), { 
            name: fullName, 
            grade: grade, 
            whatsapp: whatsapp,
            parentPhone: parentPhone || '',
            shortId: sid,
            email: email,
            points: 0,
            badges: [],
            subscriptions: {},
            watchedVideos: {},
            examResults: {},
            createdAt: new Date().toLocaleString('ar-EG')
        });
        
        showToast(`✅ تم التسجيل بنجاح! كود الطالب: ${sid}`, 'success');
        window.closeLogin();
    } catch(err) {
        console.error('Registration error:', err);
        
        if (err.code === 'auth/email-already-in-use') {
            showToast('❌ هذا البريد الإلكتروني مستخدم بالفعل في نظام authentication', 'error');
        } else if (err.code === 'auth/invalid-email') {
            showToast('❌ البريد الإلكتروني غير صالح', 'error');
        } else if (err.code === 'auth/weak-password') {
            showToast('❌ كلمة المرور ضعيفة جداً', 'error');
        } else {
            showToast('❌ حدث خطأ: ' + (err.message || 'يرجى المحاولة مرة أخرى'), 'error');
        }
    } finally {
        btn.disabled = false;
        btn.innerText = "تسجيل";
        btn.classList.remove('btn-loading');
        stopProgress();
    }
};

window.handleRegisterUsername = async function() {
    if (!window.checkStep1Completion() || !window.checkStep2Completion()) {
        showToast('❌ يرجى إكمال جميع البيانات المطلوبة أولاً', 'error');
        return;
    }
    
    const n1 = document.getElementById('n1')?.value.trim() || '';
    const n2 = document.getElementById('n2')?.value.trim() || '';
    const n3 = document.getElementById('n3')?.value.trim() || '';
    const n4 = document.getElementById('n4')?.value.trim() || '';
    const fullName = `${n1} ${n2} ${n3} ${n4}`.replace(/\s+/g, ' ').trim();
    const countryCode = document.getElementById('countryCode')?.value || '';
    const whatsapp = countryCode + (document.getElementById('regWhatsapp')?.value.trim() || '');
    const parentCountryCode = document.getElementById('parentCountryCode')?.value || '';
    const parentPhone = parentCountryCode + (document.getElementById('regParentPhone')?.value.trim() || '');
    const grade = document.getElementById('regGrade')?.value || '';
    const username = document.getElementById('regUsername')?.value.trim().toLowerCase() || '';
    const pass = document.getElementById('regPassUser')?.value || '';
    const passConfirm = document.getElementById('regPassUserConfirm')?.value || '';
    
    if (!username || !pass) {
        showToast('❌ يرجى إدخال اسم المستخدم وكلمة المرور', 'error');
        return;
    }
    
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
        showToast('❌ اسم المستخدم يجب أن يكون 3-20 حرفاً (أحرف إنجليزية، أرقام، _ فقط)', 'error');
        return;
    }
    
    const reservedUsernames = ['admin', 'administrator', 'superuser', 'root', 'mona', 'monakamel', 'msmona'];
    if (reservedUsernames.includes(username.toLowerCase())) {
        showToast('❌ اسم المستخدم غير متاح', 'error');
        return;
    }
    
    if (pass.length < 6) {
        showToast('❌ يجب أن تكون كلمة المرور مكونة من 6 أحرف أو أكثر', 'error');
        return;
    }
    if (pass !== passConfirm) {
        showToast('❌ كلمة المرور غير متطابقة!', 'error');
        return;
    }
    
    const btn = document.getElementById('regBtnUser');
    if (!btn) return;
    
    btn.disabled = true;
    btn.innerText = "جاري التحميل...";
    btn.classList.add('btn-loading');
    startProgress();
    
    try {
        const studentsSnap = await get(child(dbRef, 'students'));
        let usernameExists = false;
        
        if (studentsSnap.exists()) {
            studentsSnap.forEach(studentSnapshot => {
                const studentData = studentSnapshot.val();
                if (studentData.username && studentData.username.toLowerCase() === username) {
                    usernameExists = true;
                }
            });
        }
        
        if (usernameExists) {
            showToast('❌ اسم المستخدم هذا مستخدم بالفعل. الرجاء اختيار اسم آخر.', 'error');
            btn.disabled = false;
            btn.innerText = "تسجيل";
            btn.classList.remove('btn-loading');
            stopProgress();
            return;
        }
        
        const sid = await generateUniqueStudentId();
        const fakeEmail = `${username}_${Date.now()}@monaacademy.local`;
        const res = await createUserWithEmailAndPassword(auth, fakeEmail, pass);
        await updateProfile(res.user, { displayName: fullName });
        
        await set(ref(db, 'students/' + res.user.uid), { 
            name: fullName, 
            grade: grade, 
            whatsapp: whatsapp,
            parentPhone: parentPhone || '',
            shortId: sid,
            username: username,
            points: 0,
            badges: [],
            subscriptions: {},
            watchedVideos: {},
            examResults: {},
            createdAt: new Date().toLocaleString('ar-EG')
        });
        
        showToast(`✅ تم التسجيل بنجاح! كود الطالب: ${sid}`, 'success');
        window.closeLogin();
    } catch(err) {
        console.error('Username registration error:', err);
        
        if (err.code === 'auth/email-already-in-use') {
            showToast('❌ حدث تعارض في اسم المستخدم. يرجى المحاولة مرة أخرى.', 'error');
        } else if (err.code === 'auth/weak-password') {
            showToast('❌ كلمة المرور ضعيفة جداً', 'error');
        } else {
            showToast('❌ حدث خطأ: ' + (err.message || 'يرجى المحاولة مرة أخرى'), 'error');
        }
    } finally {
        btn.disabled = false;
        btn.innerText = "تسجيل";
        btn.classList.remove('btn-loading');
        stopProgress();
    }
};

window.registerWithGoogle = async function() {
    if (!window.checkStep1Completion() || !window.checkStep2Completion()) {
        showToast('❌ يرجى إكمال جميع البيانات المطلوبة أولاً', 'error');
        return;
    }
    
    const n1 = document.getElementById('n1')?.value.trim() || '';
    const n2 = document.getElementById('n2')?.value.trim() || '';
    const n3 = document.getElementById('n3')?.value.trim() || '';
    const n4 = document.getElementById('n4')?.value.trim() || '';
    const fullName = `${n1} ${n2} ${n3} ${n4}`.replace(/\s+/g, ' ').trim();
    const countryCode = document.getElementById('countryCode')?.value || '';
    const whatsapp = countryCode + (document.getElementById('regWhatsapp')?.value.trim() || '');
    const parentCountryCode = document.getElementById('parentCountryCode')?.value || '';
    const parentPhone = parentCountryCode + (document.getElementById('regParentPhone')?.value.trim() || '');
    const grade = document.getElementById('regGrade')?.value || '';
    
    const btn = document.getElementById('registerGoogleBtn');
    if (btn) {
        btn.disabled = true;
        btn.classList.add('btn-loading');
    }
    startProgress();
    
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        const userSnap = await get(child(dbRef, `students/${user.uid}`));
        if(userSnap.exists()) {
            showToast('❌ هذا الحساب موجود بالفعل. يرجى تسجيل الدخول مباشرة.', 'error');
            await signOut(auth);
            return;
        }
        
        const studentsSnap = await get(child(dbRef, 'students'));
        let emailExists = false;
        
        if (studentsSnap.exists()) {
            studentsSnap.forEach(studentSnapshot => {
                const studentData = studentSnapshot.val();
                if (studentData.email && studentData.email.toLowerCase() === user.email.toLowerCase()) {
                    emailExists = true;
                }
            });
        }
        
        if (emailExists) {
            showToast('❌ هذا البريد الإلكتروني مستخدم بالفعل في حساب آخر. الرجاء تسجيل الدخول.', 'error');
            await signOut(auth);
            return;
        }
        
        const sid = await generateUniqueStudentId();
        await updateProfile(user, { displayName: fullName });
        
        await set(ref(db, 'students/' + user.uid), {
            name: fullName,
            grade: grade,
            whatsapp: whatsapp,
            parentPhone: parentPhone || '',
            shortId: sid,
            email: user.email,
            points: 0,
            badges: [],
            subscriptions: {},
            watchedVideos: {},
            examResults: {},
            createdAt: new Date().toLocaleString('ar-EG')
        });
        
        showToast(`✅ تم التسجيل بنجاح! كود الطالب: ${sid}`, 'success');
        window.closeLogin();
    } catch(err) {
        console.error('Google registration error:', err);
        showToast('❌ ' + (err.message || 'حدث خطأ في التسجيل'), 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('btn-loading');
        }
        stopProgress();
    }
};

// ================ LOGIN FUNCTIONS ================
window.loginEmailSubmit = async function() {
    const e = document.getElementById('stEmail')?.value.trim() || '';
    const p = document.getElementById('stPass')?.value || '';
    
    if(!e || !p) {
        showToast('❌ يرجى إدخال البيانات', 'error');
        return;
    }
    
    const btn = document.getElementById('loginEmailSubmitBtn');
    if (btn) {
        btn.disabled = true;
        btn.classList.add('btn-loading');
    }
    startProgress();
    
    try {
        await signInWithEmailAndPassword(auth, e, p);
        window.closeLogin();
        showToast('✅ تم تسجيل الدخول بنجاح', 'success');
    } catch(err) {
        console.error('Login error:', err);
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            showToast('❌ البريد الإلكتروني أو كلمة المرور غير صحيحة', 'error');
        } else if (err.code === 'auth/invalid-email') {
            showToast('❌ البريد الإلكتروني غير صالح', 'error');
        } else {
            showToast('❌ فشل تسجيل الدخول', 'error');
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('btn-loading');
        }
        stopProgress();
    }
};

window.loginUsernameSubmit = async function() {
    const username = document.getElementById('stUsername')?.value.trim().toLowerCase() || '';
    const pass = document.getElementById('stPassUsername')?.value || '';
    
    if(!username || !pass) {
        showToast('❌ يرجى إدخال البيانات', 'error');
        return;
    }
    
    const btn = document.getElementById('loginUsernameSubmitBtn');
    if (btn) {
        btn.disabled = true;
        btn.classList.add('btn-loading');
    }
    startProgress();
    
    try {
        const studentsSnap = await get(child(dbRef, 'students'));
        let foundUid = null;
        let foundEmail = null;
        
        if (studentsSnap.exists()) {
            studentsSnap.forEach(studentSnapshot => {
                const studentData = studentSnapshot.val();
                if (studentData.username && studentData.username.toLowerCase() === username) {
                    foundUid = studentSnapshot.key;
                    foundEmail = studentData.email;
                }
            });
        }
        
        if (!foundUid) {
            showToast('❌ اسم المستخدم غير موجود', 'error');
            return;
        }
        
        try {
            await signInWithEmailAndPassword(auth, foundEmail, pass);
            window.closeLogin();
            showToast('✅ تم تسجيل الدخول بنجاح', 'success');
        } catch (loginErr) {
            showToast('❌ اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
        }
    } catch(err) {
        console.error('Username login error:', err);
        showToast('❌ اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('btn-loading');
        }
        stopProgress();
    }
};

window.loginGoogle = async function() {
    const btn = document.getElementById('loginGoogleBtn');
    if (btn) {
        btn.disabled = true;
        btn.classList.add('btn-loading');
    }
    startProgress();
    
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const userSnap = await get(child(dbRef, `students/${user.uid}`));
        
        if(!userSnap.exists()) {
            showToast('❌ لم يتم العثور على حساب. يرجى التسجيل أولاً.', 'error');
            await signOut(auth);
        } else {
            window.closeLogin();
            showToast('✅ تم تسجيل الدخول بنجاح', 'success');
        }
    } catch(err) {
        console.error('Google login error:', err);
        showToast('❌ ' + (err.message || 'حدث خطأ في تسجيل الدخول'), 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('btn-loading');
        }
        stopProgress();
    }
};

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
        const isAddedAdmin = admins && Object.values(admins).some(a => a.email === user.email);
        isAdminUser = isAdmin || isAddedAdmin;
        
        const userSnap = await get(child(dbRef, `students/${user.uid}`));
        let displayName = user.displayName || '';
        
        if (userSnap.exists()) {
            const data = userSnap.val();
            myShortId = data.shortId || '';
            displayName = data.name || user.displayName || '';
            currentStudentGrade = data.grade;
        }
        
        statusDiv.innerHTML = `
            <span class="student-id-badge" style="margin-left: 10px;">
                <i class="fas fa-id-card"></i> ${escapeHTML(myShortId)}
            </span>
            <div class="hamburger-menu" onclick="window.toggleMenu()">
                <i class="fas fa-bars"></i>
            </div>
        `;
        
        if (isAdminUser) {
            statusDiv.innerHTML += `<button class="auth-btn" onclick="window.location.href='mx_2026_ctrl_p8.html'" style="margin-right:10px; background:var(--dark); color:white; border:none; padding:8px 16px; border-radius:10px; font-weight:bold; cursor:pointer;">الإدارة</button>`;
        }
        
        if (reviewContainer) {
            reviewContainer.innerHTML = `<div class="add-review-box"><h3>اكتب رأيك 👇</h3><textarea id="stuText" rows="3" placeholder="اكتب رأيك هنا..."></textarea><button onclick="window.sendStuReview()" style="background:var(--main); color:white; border:none; padding:12px; border-radius:50px; cursor:pointer; font-weight:bold; width:100%;">إرسال التقييم</button></div>`;
        }
        
        updateMenuItems(true);
        
        window.loadFolders();
        await window.loadLeaderboard();
        await window.loadPerfectScores();
    } else {
        isAdminUser = false;
        myShortId = "";
        statusDiv.innerHTML = `<button class="auth-btn" onclick="window.openLogin()" style="background:var(--main); color:white; border:none; padding:8px 20px; border-radius:10px; font-weight:bold; cursor:pointer;">تسجيل الدخول</button>`;
        
        if (reviewContainer) {
            reviewContainer.innerHTML = `<div class="review-locked"><i class="fas fa-lock"></i> يرجى تسجيل الدخول أولاً لتتمكن من إضافة رأيك.</div>`;
        }
        
        updateMenuItems(false);
        
        window.loadFolders();
        await window.loadPerfectScores();
    }
});

// ================ HAMBURGER MENU ================
window.toggleMenu = function() {
    const menu = document.getElementById('menuDropdown');
    if (menu) {
        if (menu.style.display === 'none' || menu.style.display === '') {
            menu.style.display = 'block';
        } else {
            menu.style.display = 'none';
        }
    }
};

window.closeMenu = function() {
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

// ================ تحديث عناصر القائمة ================
function updateMenuItems(isLoggedIn) {
    const dashboardItem = document.getElementById('dashboardMenuItem');
    const homeItem = document.getElementById('homeMenuItem');
    const continueItem = document.getElementById('continueWatchingMenuItem');
    const divider = document.getElementById('menuDivider');
    const logoutItem = document.getElementById('logoutMenuItem');
    
    if (isLoggedIn) {
        if (dashboardItem) {
            dashboardItem.style.display = 'block';
            dashboardItem.onclick = function(e) {
                e.preventDefault();
                window.openDashboard();
                window.closeMenu();
            };
        }
        if (homeItem) {
            homeItem.style.display = 'block';
            homeItem.onclick = function(e) {
                e.preventDefault();
                window.goHome();
                window.closeMenu();
            };
        }
        if (continueItem) {
            continueItem.style.display = 'block';
            continueItem.onclick = function(e) {
                e.preventDefault();
                window.openDashboard();
                window.closeMenu();
            };
        }
        if (divider) divider.style.display = 'block';
        if (logoutItem) {
            logoutItem.style.display = 'block';
            logoutItem.onclick = function(e) {
                e.preventDefault();
                window.logout();
                window.closeMenu();
            };
        }
    } else {
        if (dashboardItem) dashboardItem.style.display = 'none';
        if (homeItem) homeItem.style.display = 'none';
        if (continueItem) continueItem.style.display = 'none';
        if (divider) divider.style.display = 'none';
        if (logoutItem) logoutItem.style.display = 'none';
    }
}

// ================ LEADERBOARD ================
window.loadLeaderboard = async function() {
    try {
        const studentsRef = ref(db, 'students');
        const topStudentsQuery = query(studentsRef, orderByChild('points'), limitToLast(50));
        const snapshot = await get(topStudentsQuery);
        
        const leaderboardSection = document.getElementById('leaderboardSection');
        const leaderboardContainer = document.getElementById('leaderboardContainer');
        const topThreeContainer = document.getElementById('topThreeContainer');
        
        if (!leaderboardSection || !leaderboardContainer || !topThreeContainer) return;
        
        if (!snapshot.exists()) {
            leaderboardSection.style.display = 'none';
            return;
        }
        
        let leaderboard = [];
        snapshot.forEach(s => {
            const data = s.val();
            if (data.points && data.points > 0) {
                leaderboard.push({
                    name: data.name || 'طالب',
                    points: data.points || 0,
                    shortId: data.shortId || ''
                });
            }
        });
        
        leaderboard.sort((a, b) => b.points - a.points);
        leaderboard = leaderboard.slice(0, 20);
        
        if (leaderboard.length === 0) {
            leaderboardSection.style.display = 'none';
            return;
        }
        
        leaderboardSection.style.display = 'block';
        
        let top3Html = '';
        const top3 = leaderboard.slice(0, 3);
        const medals = ['🥇', '🥈', '🥉'];
        const classes = ['first', 'second', 'third'];
        
        top3.forEach((student, index) => {
            top3Html += `
                <div class="top-card ${classes[index]}">
                    <div class="top-crown">${medals[index]}</div>
                    <div class="top-avatar">${escapeHTML(student.name.charAt(0))}</div>
                    <div class="top-name">${escapeHTML(student.name)}</div>
                    <div class="top-points">${student.points} <i class="fas fa-star"></i></div>
                    <div class="top-badge">#${index + 1} في النقاط</div>
                </div>
            `;
        });
        topThreeContainer.innerHTML = top3Html;
        
        let html = '';
        leaderboard.slice(3).forEach((student, index) => {
            html += `<div class="leaderboard-item">
                <div class="leaderboard-rank-circle">#${index + 4}</div>
                <div class="leaderboard-info">
                    <h4>${escapeHTML(student.name)}</h4>
                    <div class="leaderboard-points"><i class="fas fa-star" style="color: var(--gold);"></i> ${student.points} نقطة</div>
                </div>
            </div>`;
        });
        
        leaderboardContainer.innerHTML = html;
    } catch(error) {
        console.error("Error loading leaderboard:", error);
    }
};

// ================ PERFECT SCORES SECTION ================
window.loadPerfectScores = async function() {
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

// ================ COURSE LOADING ================
window.loadFolders = function() {
    const foldersRef = ref(db, 'folders');
    const listener = onValue(foldersRef, async (snapshot) => {
        const grid = document.getElementById('foldersGrid');
        if (!grid) return;
        
        document.querySelectorAll('.skeleton').forEach(el => el.remove());
        
        grid.innerHTML = "";
        
        if (!snapshot.exists()) {
            grid.innerHTML = "<p style='text-align:center; grid-column:1/-1;'>لا توجد كورسات بعد</p>";
            return;
        }
        
        const courses = [];
        snapshot.forEach(c => {
            courses.push({
                id: c.key,
                data: c.val()
            });
        });
        
        let filteredCourses = courses;
        if (currentUser && currentStudentGrade) {
            filteredCourses = courses.filter(course => {
                if (!course.data.grade) return true;
                return course.data.grade === currentStudentGrade;
            });
        }
        
        filteredCourses.forEach(course => {
            const courseData = course.data;
            const courseId = course.id;
            const courseName = courseData.name || '';
            const avgRating = courseData.avgRating ? parseFloat(courseData.avgRating).toFixed(1) : '0.0';
            const stars = '★'.repeat(Math.round(parseFloat(avgRating))) + '☆'.repeat(5 - Math.round(parseFloat(avgRating)));
            
            const card = document.createElement('div');
            card.className = 'folder-card touch-feedback';
            
            const img = document.createElement('img');
            img.src = courseData.img && courseData.img.startsWith('data:image') ? courseData.img : (courseData.img || 'mona.jpg');
            img.loading = 'lazy';
            img.alt = courseName;
            img.onerror = () => img.src = 'mona.jpg';
            
            const h3 = document.createElement('h3');
            h3.textContent = courseName;
            
            card.appendChild(img);
            card.appendChild(h3);
            
            if (courseData.grade) {
                const gradeBadge = document.createElement('div');
                gradeBadge.className = 'course-grade-badge';
                gradeBadge.textContent = courseData.grade;
                card.appendChild(gradeBadge);
            }
            
            const ratingDiv = document.createElement('div');
            ratingDiv.className = 'course-rating';
            ratingDiv.innerHTML = `<span style="color: #ffd700;">${stars}</span><span>(${courseData.reviewCount || 0})</span>`;
            card.appendChild(ratingDiv);
            
            card.addEventListener('click', () => window.openContent(courseId, courseName));
            
            grid.appendChild(card);
        });
        
        if (filteredCourses.length === 0) {
            grid.innerHTML = "<p style='text-align:center; grid-column:1/-1;'>لا توجد كورسات متاحة لمرحلتك الدراسية حالياً</p>";
        }
    });
    
    listeners.push({ ref: foldersRef, listener });
};

// ================ LOAD REVIEWS ================
function loadReviews() {
    const reviewsRef = ref(db, 'reviews');
    const listener = onValue(reviewsRef, snapshot => {
        let html = "";
        if (snapshot.exists()) {
            snapshot.forEach(c => {
                const review = c.val();
                html += `<div class="review-card">
                    <p>"${escapeHTML(review.text || '')}"</p>
                    <h4 style="color:var(--main);">- ${escapeHTML(review.student || '')}</h4>
                    <span style="color: #999; font-size:0.75rem;">${escapeHTML(review.timestamp || '')}</span>
                </div>`; 
            });
        } else {
            html = "<p style='text-align:center;'>لا توجد آراء بعد</p>";
        }
        
        const testiGrid = document.getElementById('testiGrid');
        if (testiGrid) testiGrid.innerHTML = html;
    });
    
    listeners.push({ ref: reviewsRef, listener });
}

// ================ DASHBOARD ================
window.openDashboard = async function() {
    if (!currentUser) { 
        window.openLogin(); 
        return; 
    }
    
    if (isAdminUser) {
        window.location.href = 'mx_2026_ctrl_p8.html';
        return;
    }
    
    startProgress();
    
    const homePage = document.getElementById('homePage');
    const contentArea = document.getElementById('contentArea');
    const studentDashboard = document.getElementById('studentDashboard');
    
    if (homePage) homePage.style.display = 'none';
    if (contentArea) contentArea.style.display = 'none';
    if (studentDashboard) studentDashboard.style.display = 'block';
    
    try {
        const studentSnap = await getCachedStudentData(currentUser.uid);
        if (!studentSnap) return;
        
        const student = studentSnap;
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
                
                const card = document.createElement('div');
                card.className = 'folder-card touch-feedback';
                
                const img = document.createElement('img');
                img.src = course.img && course.img.startsWith('data:image') ? course.img : (course.img || 'mona.jpg');
                img.loading = 'lazy';
                img.onerror = () => img.src = 'mona.jpg';
                card.appendChild(img);
                
                const h3 = document.createElement('h3');
                h3.textContent = course.name || '';
                card.appendChild(h3);
                
                const progressDiv = document.createElement('div');
                progressDiv.style.padding = '0 20px 20px';
                progressDiv.innerHTML = `
                    <div class="progress-bar-bg"><div class="progress-fill-green" style="width: ${progress}%;"></div></div>
                    <span style="color: var(--main); font-weight: bold;">${progress}% مكتمل</span>
                `;
                card.appendChild(progressDiv);
                
                card.addEventListener('click', () => window.openContent(courseId, course.name));
                
                coursesHtml += card.outerHTML;
            }
        }
        
        const myCoursesGrid = document.getElementById('myCoursesGrid');
        if (myCoursesGrid) {
            myCoursesGrid.innerHTML = coursesHtml || `<p style="text-align:center; color:#999;">لم تشترك في أي كورس بعد</p>`;
        }
        
        let continueHtml = '';
        const watchedEntries = Object.entries(watchedVideos);
        if (watchedEntries.length > 0) {
            watchedEntries
                .sort((a, b) => (b[1].watchedAt || '').localeCompare(a[1].watchedAt || ''))
                .slice(0, 3)
                .forEach(([videoId, video]) => {
                    continueHtml += `
                        <div class="continue-card">
                            <div>
                                <h4>${escapeHTML(video.videoTitle || '')}</h4>
                                <p style="color: #666;">من كورس: ${escapeHTML(video.courseName || '')}</p>
                            </div>
                            <button class="btn-continue touch-feedback" onclick="window.continueWatching('${escapeHTML(video.courseId)}')">
                                <i class="fas fa-play"></i> متابعة
                            </button>
                        </div>
                    `;
                });
        }
        const continueGrid = document.getElementById('continueWatchingGrid');
        if (continueGrid) {
            continueGrid.innerHTML = continueHtml || '<p class="empty-state">لم تشاهد أي فيديو بعد</p>';
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
    } catch (error) {
        console.error('Dashboard error:', error);
        showToast('❌ حدث خطأ في تحميل لوحة التحكم', 'error');
    } finally {
        stopProgress();
    }
};

// ================ OPEN CONTENT ================
window.openContent = async function(folderId, folderName) {
    if (!currentUser) { 
        window.openLogin(); 
        return; 
    }
    
    startProgress();
    
    try {
        currentFolderId = folderId;
        currentFolderName = folderName;
        
        const studentData = await getCachedStudentData(currentUser.uid);
        const isSubscribed = studentData && studentData.subscriptions && studentData.subscriptions[folderId];
        
        if (!isSubscribed) {
            window.showSubscriptionModal(folderId, folderName);
            return;
        }
        
        await window.loadCourseContent(folderId, folderName, true);
    } catch (error) {
        console.error('Open content error:', error);
        showToast('❌ حدث خطأ في فتح المحتوى', 'error');
    } finally {
        stopProgress();
    }
};

window.showSubscriptionModal = function(folderId, folderName) {
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

window.closeSubscriptionModal = function() {
    const modal = document.getElementById('subscriptionModal');
    if (modal) modal.style.display = 'none';
};

window.confirmSubscription = async function() {
    const subIdInput = document.getElementById('subscriptionIdInput');
    const subError = document.getElementById('subError');
    
    if (!subIdInput || !subError) return;
    
    const enteredId = subIdInput.value.trim();
    if (!enteredId) {
        subError.innerHTML = '❌ يرجى إدخال كود الطالب';
        return;
    }
    
    if (enteredId.length !== 10) {
        subError.innerHTML = '❌ كود الطالب يجب أن يكون 10 أرقام';
        return;
    }
    
    startProgress();
    
    try {
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
        
        await window.awardPoints(currentUser.uid, 'SUBSCRIBE_COURSE', { courseId: currentFolderId, courseName: currentFolderName });
        showToast('✅ تم الاشتراك بنجاح! يمكنك الآن مشاهدة المحتوى كاملاً.', 'success');
        window.closeSubscriptionModal();
        await window.loadCourseContent(currentFolderId, currentFolderName, true);
    } catch (error) {
        console.error('Subscription error:', error);
        subError.innerHTML = '❌ حدث خطأ في الاشتراك';
    } finally {
        stopProgress();
    }
};

window.loadCourseContent = async function(folderId, folderName, hasAccess) {
    const homePage = document.getElementById('homePage');
    const studentDashboard = document.getElementById('studentDashboard');
    const contentArea = document.getElementById('contentArea');
    const folderTitleName = document.getElementById('folderTitleName');
    
    if (homePage) homePage.style.display = "none";
    if (studentDashboard) studentDashboard.style.display = "none";
    if (contentArea) contentArea.style.display = "block";
    if (folderTitleName) folderTitleName.innerText = folderName;

    await window.loadCourseRatingUI(folderId);

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

    if (vSnap.exists()) {
        const videosArray = [];
        vSnap.forEach(v => {
            const videoData = v.val();
            videosArray.push({
                id: v.key,
                ...videoData,
                order: videoData.order || 999
            });
        });
        
        videosArray.sort((a, b) => a.order - b.order);
        
        videosArray.forEach(videoData => {
            const videoUrl = videoData.url || '';
            let vidId = "error";
            const match = videoUrl.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
            if (match && match[2] && match[2].length == 11) vidId = match[2];
            
            const card = document.createElement('div');
            card.className = `item-card ${hasAccess ? '' : 'disabled'} touch-feedback`;
            
            if (!hasAccess) {
                const lockIcon = document.createElement('i');
                lockIcon.className = 'fas fa-lock lock-icon';
                card.appendChild(lockIcon);
            }
            
            const img = document.createElement('img');
            img.src = `https://img.youtube.com/vi/${vidId}/mqdefault.jpg`;
            img.className = 'v-thumb';
            img.loading = 'lazy';
            img.onerror = () => img.src = 'mona.jpg';
            card.appendChild(img);
            
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'item-details';
            
            const badge = document.createElement('span');
            badge.className = 'badge badge-video';
            badge.textContent = 'فيديو شرح';
            detailsDiv.appendChild(badge);
            
            const title = document.createElement('h4');
            title.textContent = videoData.title || '';
            detailsDiv.appendChild(title);
            
            if (!hasAccess) {
                const lockMsg = document.createElement('span');
                lockMsg.style.cssText = 'color:#ff7675; font-size:0.8rem;';
                lockMsg.textContent = 'اشترك لتشاهد';
                detailsDiv.appendChild(lockMsg);
            }
            
            card.appendChild(detailsDiv);
            
            if (hasAccess) {
                card.addEventListener('click', () => window.openVideo(videoData.url, videoData.title, videoData.id, folderId));
            }
            
            grid.appendChild(card);
        });
    }

    if (qSnap.exists()) {
        qSnap.forEach(q => {
            const quizData = q.val();
            if (quizData.videoRel === "all" || !quizData.videoRel) {
                const quizId = q.key;
                const isCompleted = examResultsMap[quizId] ? true : false;
                
                const card = document.createElement('div');
                card.className = `item-card ${hasAccess ? '' : 'disabled'} touch-feedback`;
                
                if (!hasAccess) {
                    const lockIcon = document.createElement('i');
                    lockIcon.className = 'fas fa-lock lock-icon';
                    card.appendChild(lockIcon);
                }
                
                const iconDiv = document.createElement('div');
                iconDiv.style.cssText = 'height:160px; background:#f0eeff; display:flex; align-items:center; justify-content:center;';
                const icon = document.createElement('i');
                icon.className = 'fas fa-file-signature fa-3x';
                icon.style.cssText = 'color: var(--main);';
                iconDiv.appendChild(icon);
                card.appendChild(iconDiv);
                
                const detailsDiv = document.createElement('div');
                detailsDiv.className = 'item-details';
                
                const badge = document.createElement('span');
                badge.className = 'badge';
                if (isCompleted) {
                    badge.textContent = '✅ تم الحل - مراجعة';
                    badge.style.cssText = 'background: var(--success); color: white;';
                } else {
                    badge.textContent = 'ابدأ الامتحان';
                }
                detailsDiv.appendChild(badge);
                
                const title = document.createElement('h4');
                title.textContent = quizData.name || '';
                detailsDiv.appendChild(title);
                
                if (!hasAccess) {
                    const lockMsg = document.createElement('span');
                    lockMsg.style.cssText = 'color:#ff7675; font-size:0.8rem;';
                    lockMsg.textContent = 'اشترك لتؤدي الامتحان';
                    detailsDiv.appendChild(lockMsg);
                }
                
                if (isCompleted) {
                    const scoreSpan = document.createElement('span');
                    scoreSpan.style.cssText = 'display:block; margin-top:8px; color: var(--success); font-size:0.85rem;';
                    scoreSpan.innerHTML = `<i class="fas fa-check-circle"></i> النتيجة: ${examResultsMap[quizId].score}/${examResultsMap[quizId].total} (${examResultsMap[quizId].percentage}%)`;
                    detailsDiv.appendChild(scoreSpan);
                }
                
                card.appendChild(detailsDiv);
                
                if (hasAccess) {
                    if (isCompleted) {
                        card.addEventListener('click', () => window.viewQuizResult(folderId, quizId));
                    } else {
                        card.addEventListener('click', () => window.startQuiz(folderId, quizId));
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

// ================ OPEN VIDEO ================
window.openVideo = async function(url, title, videoId, folderId) {
    if (!currentUser) {
        window.openLogin();
        return;
    }

    const match = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    if (!match || !match[2] || match[2].length !== 11) {
        showToast("❌ رابط الفيديو غير صالح", 'error');
        return;
    }
    const videoIdentifier = match[2];

    startProgress();

    try {
        await set(ref(db, `students/${currentUser.uid}/watchedVideos/${videoId}`), {
            courseId: folderId,
            courseName: document.getElementById('folderTitleName')?.innerText || '',
            videoTitle: title,
            watchedAt: new Date().toLocaleString('ar-EG')
        });
        
        await window.updateCourseProgress(currentUser.uid, folderId);
        
        const studentSnap = await get(child(dbRef, `students/${currentUser.uid}/watchedVideos`));
        const watchedVideos = studentSnap.val() || {};
        const watchedCount = Object.keys(watchedVideos).length;
        
        if (watchedCount === 1) {
            await window.awardPoints(currentUser.uid, 'FIRST_VIDEO', { videoId, title });
        } else {
            await window.awardPoints(currentUser.uid, 'WATCH_VIDEO', { videoId, title });
        }
        
        const quizTitle = document.getElementById('quizTitle');
        const quizOverlay = document.getElementById('quizOverlay');
        const quizContainer = document.getElementById('quizContainer');
        
        if (quizTitle) quizTitle.innerText = title;
        if (quizOverlay) quizOverlay.style.display = 'block';
        if (quizContainer) {
            quizContainer.innerHTML = `<iframe width="100%" height="400px" src="https://www.youtube.com/embed/${videoIdentifier}?autoplay=1" frameborder="0" allowfullscreen style="border-radius:15px; background:#000;"></iframe>`;
        }
    } catch (error) {
        console.error('Error opening video:', error);
        showToast('❌ حدث خطأ في تشغيل الفيديو', 'error');
    } finally {
        stopProgress();
    }
};

window.updateCourseProgress = async function(uid, courseId) {
    try {
        const watchedSnap = await get(child(dbRef, `students/${uid}/watchedVideos`));
        const videosSnap = await get(child(dbRef, `folders/${courseId}/videos`));
        
        if (watchedSnap.exists() && videosSnap.exists()) {
            const watchedVideos = watchedSnap.val() || {};
            const watchedVideosInCourse = Object.values(watchedVideos).filter(v => v.courseId === courseId).length;
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
};

window.awardPoints = async function(uid, action, metadata = {}) {
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
        
        await window.checkBadges(uid, newPoints, student);
        await window.loadLeaderboard();
    } catch(error) {
        console.error("Error awarding points:", error);
    }
};

window.checkBadges = async function(uid, totalPoints, studentData) {
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
            showToast('🎉 تهانينا! حصلت على شارة: ' + newBadges.map(b => BADGES[b].name).join(', '), 'success');
        }
    } catch(error) {
        console.error("Error checking badges:", error);
    }
};

// ================ QUIZ FUNCTIONS ================
window.startQuiz = async function(folderId, quizId) {
    if (!currentUser) {
        window.openLogin();
        return;
    }
    
    startProgress();
    
    try {
        const resultSnap = await get(child(dbRef, `students/${currentUser.uid}/examResults/${quizId}`));
        if (resultSnap.exists()) {
            showToast('❌ لقد قمت بحل هذا الامتحان من قبل. يمكنك مراجعة إجاباتك فقط.', 'error');
            window.viewQuizResult(folderId, quizId);
            return;
        }
        
        const quizSnap = await get(child(dbRef, `quizzes/${folderId}/${quizId}`));
        if(!quizSnap.exists()) {
            showToast('❌ خطأ في تحميل الامتحان', 'error');
            return;
        }
        
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
    } catch (error) {
        console.error('Start quiz error:', error);
        showToast('❌ حدث خطأ في بدء الامتحان', 'error');
    } finally {
        stopProgress();
    }
};

window.selectOption = function(label) {
    const container = label.closest('.opt-container');
    if (!container) return;
    
    container.querySelectorAll('.opt-label').forEach(l => l.classList.remove('selected'));
    label.classList.add('selected');
    const input = label.querySelector('input');
    if (input) input.checked = true;
};

window.submitQuiz = async function(folderId, quizId) {
    const quizSnap = await get(child(dbRef, `quizzes/${folderId}/${quizId}`));
    if (!quizSnap.exists()) {
        showToast('❌ حدث خطأ في تحميل الامتحان', 'error');
        return;
    }
    
    const quizData = quizSnap.val();
    const questions = quizData.questions || {};
    let score = 0, total = Object.keys(questions).length;
    const userAnswers = {};

    startProgress();

    try {
        Object.keys(questions).forEach((qKey, idx) => {
            const selected = document.querySelector(`input[name="q${idx}"]:checked`);
            const answer = selected ? selected.value : null;
            userAnswers[qKey] = answer;
            if (answer && answer === questions[qKey].correct) {
                score++;
            }
        });

        const percentage = Math.round((score / total) * 100);
        showToast(`✅ النتيجة: ${score}/${total} (${percentage}%)`, 'success');
        
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
                Object.keys(questions).map(qKey => [qKey, questions[qKey].correct])
            )
        });

        await push(ref(db, 'quiz_results'), {
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
            await window.awardPoints(currentUser.uid, 'PERFECT_QUIZ', { quizId, quizName: quizData.name });
        } else {
            await window.awardPoints(currentUser.uid, 'PASS_QUIZ', { quizId, quizName: quizData.name, score, total });
        }
        
        const examResultsSnap = await get(child(dbRef, `students/${currentUser.uid}/examResults`));
        const examResults = examResultsSnap.val() || {};
        const examCount = Object.keys(examResults).length;
        if (examCount === 1) {
            await window.awardPoints(currentUser.uid, 'FIRST_EXAM', {});
        }

        await window.loadPerfectScores();
        await window.loadLeaderboard();
        window.closeQuiz();
    } catch (error) {
        console.error('Submit quiz error:', error);
        showToast('❌ حدث خطأ في تسليم الامتحان', 'error');
    } finally {
        stopProgress();
    }
};

window.viewQuizResult = async function(folderId, quizId) {
    if (!currentUser) {
        window.openLogin();
        return;
    }
    
    startProgress();
    
    try {
        const [quizSnap, resultSnap] = await Promise.all([
            get(child(dbRef, `quizzes/${folderId}/${quizId}`)),
            get(child(dbRef, `students/${currentUser.uid}/examResults/${quizId}`))
        ]);

        if (!quizSnap.exists()) {
            showToast('❌ الامتحان غير موجود', 'error');
            return;
        }
        if (!resultSnap.exists()) {
            showToast('❌ لا يوجد نتيجة لهذا الامتحان', 'error');
            return;
        }

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
            const userAnswer = userAnswers[qKey];
            const correctAnswer = correctAnswers[qKey] || questions[qKey].correct;
            const isCorrect = userAnswer === correctAnswer || 
                             (correctAnswer && userAnswer && userAnswer.toString() === correctAnswer.toString());

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
    } catch (error) {
        console.error('View quiz result error:', error);
        showToast('❌ حدث خطأ في عرض النتيجة', 'error');
    } finally {
        stopProgress();
    }
};

window.closeQuiz = function() { 
    const quizOverlay = document.getElementById('quizOverlay');
    const quizContainer = document.getElementById('quizContainer');
    
    if (quizOverlay) quizOverlay.style.display = 'none';
    if (quizContainer) quizContainer.innerHTML = "";
};

// ================ COURSE RATING ================
window.loadCourseRatingUI = async function(courseId) {
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
};

window.setRating = function(val) { 
    selectedRating = val; 
};

window.submitCourseRating = async function(courseId) {
    if (!currentUser) {
        window.openLogin();
        return;
    }
    
    const rating = selectedRating;
    if (!rating) {
        showToast('❌ يرجى اختيار تقييم', 'error');
        return;
    }
    
    const reviewTextEl = document.getElementById('reviewText');
    const review = reviewTextEl ? reviewTextEl.value : '';
    
    startProgress();
    
    try {
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
        
        await window.awardPoints(currentUser.uid, 'ADD_REVIEW', { courseId });
        showToast('✅ تم إرسال تقييمك، شكراً لك!', 'success');
        window.loadCourseRatingUI(courseId);
    } catch (error) {
        console.error('Submit rating error:', error);
        showToast('❌ حدث خطأ في إرسال التقييم', 'error');
    } finally {
        stopProgress();
    }
};

window.sendStuReview = async function() {
    const stuText = document.getElementById('stuText');
    if (!stuText) return;
    
    const text = stuText.value.trim();
    if(text && currentUser) {
        startProgress();
        try {
            await push(ref(db, 'reviews'), { 
                student: currentUser.displayName || currentUser.email || '', 
                text: text,
                timestamp: new Date().toLocaleString('ar-EG')
            });
            stuText.value = "";
            showToast('✅ شكراً لك! تم إرسال تقييمك.', 'success');
        } catch (error) {
            console.error('Send review error:', error);
            showToast('❌ حدث خطأ في إرسال التقييم', 'error');
        } finally {
            stopProgress();
        }
    }
};

window.updateGrades = function() {
    const level = document.getElementById('regLevel')?.value || '';
    const gradeSelect = document.getElementById('regGrade');
    
    if (!gradeSelect) return;
    
    gradeSelect.innerHTML = "";
    
    const grades = { 
        primary: ["الرابع الابتدائي", "الخامس الابتدائي", "السادس الابتدائي"],
        middle: ["الأول الإعدادي", "الثاني الإعدادي", "الثالث الإعدادي"],
        secondary: ["الأول الثانوي", "الثاني الثانوي", "الثالث الثانوي"]
    };
    
    if (level && grades[level]) {
        grades[level].forEach(g => {
            const option = document.createElement('option');
            option.value = g;
            option.textContent = g;
            gradeSelect.appendChild(option);
        });
        gradeSelect.value = grades[level][0];
    } else {
        gradeSelect.innerHTML = `<option value="">-- اختر المرحلة أولاً --</option>`;
    }
    
    window.checkStep2Completion();
};

// ================ UTILITY FUNCTIONS ================
window.logout = function() { 
    signOut(auth);
    showToast('👋 تم تسجيل الخروج', 'success');
};

window.openLogin = function() { 
    window.showAuthForm('choice'); 
    const loginModal = document.getElementById('loginModal');
    if (loginModal) loginModal.style.display = 'flex'; 
};

window.closeLogin = function() { 
    const loginModal = document.getElementById('loginModal');
    if (loginModal) loginModal.style.display = 'none'; 
};

window.goHome = function() { 
    const homePage = document.getElementById('homePage');
    const contentArea = document.getElementById('contentArea');
    const studentDashboard = document.getElementById('studentDashboard');
    
    if (homePage) homePage.style.display = "block";
    if (contentArea) contentArea.style.display = "none";
    if (studentDashboard) studentDashboard.style.display = "none";
    
    window.loadFolders();
    window.loadPerfectScores();
    window.loadLeaderboard();
};

window.showAuthForm = function(type) {
    const authChoice = document.getElementById('authChoice');
    const loginChoice = document.getElementById('loginChoice');
    const loginEmail = document.getElementById('loginEmail');
    const loginUsername = document.getElementById('loginUsername');
    const registerForm = document.getElementById('registerForm');
    
    if (authChoice) authChoice.style.display = 'none';
    if (loginChoice) loginChoice.style.display = 'none';
    if (loginEmail) loginEmail.style.display = 'none';
    if (loginUsername) loginUsername.style.display = 'none';
    if (registerForm) registerForm.style.display = 'none';
    
    if (type === 'choice' && authChoice) authChoice.style.display = 'block';
    else if (type === 'loginChoice' && loginChoice) loginChoice.style.display = 'block';
    else if (type === 'loginEmail' && loginEmail) loginEmail.style.display = 'block';
    else if (type === 'loginUsername' && loginUsername) loginUsername.style.display = 'block';
    else if (type === 'register' && registerForm) {
        registerForm.style.display = 'block';
        setTimeout(() => { 
            window.checkStep1Completion(); 
            window.checkStep2Completion(); 
        }, 200);
    }
};

window.showRegMethod = function(method) {
    const step3Email = document.getElementById('step3Email');
    const step3Username = document.getElementById('step3Username');
    
    if (step3Email) step3Email.classList.remove('active');
    if (step3Username) step3Username.classList.remove('active');
    
    if(method === 'email' && step3Email) {
        step3Email.classList.add('active');
    } else if(method === 'username' && step3Username) {
        step3Username.classList.add('active');
    }
};

window.nextStep = function(s) {
    document.querySelectorAll('.step-container').forEach(sc => sc.classList.remove('active'));
    
    const stepEl = document.getElementById('step' + s);
    if (stepEl) stepEl.classList.add('active');
    
    const regProgress = document.getElementById('regProgress');
    if (regProgress) {
        regProgress.style.width = (s === 1 ? '33%' : s === 2 ? '66%' : '100%');
    }
    
    if (s === 1) setTimeout(window.checkStep1Completion, 100);
    else if (s === 2) setTimeout(window.checkStep2Completion, 100);
};

// ================ CONTINUE WATCHING ================
window.continueWatching = function(courseId) {
    get(child(dbRef, `folders/${courseId}`)).then((snap) => {
        if (snap.exists()) {
            const courseData = snap.val();
            window.openContent(courseId, courseData.name || 'الكورس');
        } else {
            window.openContent(courseId, 'الكورس');
        }
    }).catch(() => {
        window.openContent(courseId, 'الكورس');
    });
};

// ================ CLEANUP LISTENERS ================
window.cleanupListeners = function() {
    listeners.forEach(item => {
        off(item.ref, 'value', item.listener);
    });
    listeners = [];
};

// ================ EVENT LISTENERS FOR SUBSCRIPTION ================
document.addEventListener('DOMContentLoaded', function() {
    const previewBtn = document.getElementById('previewBtn');
    if (previewBtn) {
        previewBtn.addEventListener('click', async () => {
            window.closeSubscriptionModal();
            await window.loadCourseContent(currentFolderId, currentFolderName, false);
        });
    }

    const subscribeBtn = document.getElementById('subscribeBtn');
    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', () => {
            const subIdSection = document.getElementById('subscriptionIdSection');
            if (subIdSection) subIdSection.style.display = 'block';
        });
    }
    
    const confirmSubscribeBtn = document.getElementById('confirmSubscribeBtn');
    if (confirmSubscribeBtn) {
        confirmSubscribeBtn.addEventListener('click', window.confirmSubscription);
    }
});

// ================ ربط أحداث التسجيل ================
document.addEventListener('DOMContentLoaded', function() {
    const showLoginChoiceBtn = document.getElementById('showLoginChoiceBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const showLoginEmailBtn = document.getElementById('showLoginEmailBtn');
    const showLoginUsernameBtn = document.getElementById('showLoginUsernameBtn');
    const loginGoogleBtn = document.getElementById('loginGoogleBtn');
    const loginEmailSubmitBtn = document.getElementById('loginEmailSubmitBtn');
    const loginUsernameSubmitBtn = document.getElementById('loginUsernameSubmitBtn');
    const registerGoogleBtn = document.getElementById('registerGoogleBtn');
    const showRegEmailBtn = document.getElementById('showRegEmailBtn');
    const showRegUsernameBtn = document.getElementById('showRegUsernameBtn');
    const regBtn = document.getElementById('regBtn');
    const regBtnUser = document.getElementById('regBtnUser');
    
    const backToChoiceFromLogin = document.getElementById('backToChoiceFromLogin');
    const backToLoginChoiceFromEmail = document.getElementById('backToLoginChoiceFromEmail');
    const backToLoginChoiceFromUsername = document.getElementById('backToLoginChoiceFromUsername');
    const backToChoiceFromRegister = document.getElementById('backToChoiceFromRegister');
    
    const step1NextBtn = document.getElementById('step1NextBtn');
    const step2PrevBtn = document.getElementById('step2PrevBtn');
    const step2NextBtn = document.getElementById('step2NextBtn');
    const step3PrevBtn = document.getElementById('step3PrevBtn');
    const step3CancelBtn = document.getElementById('step3CancelBtn');
    
    const n1 = document.getElementById('n1');
    const n4 = document.getElementById('n4');
    const regWhatsapp = document.getElementById('regWhatsapp');
    const regParentPhone = document.getElementById('regParentPhone');
    const regLevel = document.getElementById('regLevel');
    const regGrade = document.getElementById('regGrade');
    
    if (showLoginChoiceBtn) showLoginChoiceBtn.addEventListener('click', () => window.showAuthForm('loginChoice'));
    if (showRegisterBtn) showRegisterBtn.addEventListener('click', () => window.showAuthForm('register'));
    if (showLoginEmailBtn) showLoginEmailBtn.addEventListener('click', () => window.showAuthForm('loginEmail'));
    if (showLoginUsernameBtn) showLoginUsernameBtn.addEventListener('click', () => window.showAuthForm('loginUsername'));
    if (loginGoogleBtn) loginGoogleBtn.addEventListener('click', window.loginGoogle);
    if (loginEmailSubmitBtn) loginEmailSubmitBtn.addEventListener('click', window.loginEmailSubmit);
    if (loginUsernameSubmitBtn) loginUsernameSubmitBtn.addEventListener('click', window.loginUsernameSubmit);
    if (registerGoogleBtn) registerGoogleBtn.addEventListener('click', window.registerWithGoogle);
    if (showRegEmailBtn) showRegEmailBtn.addEventListener('click', () => window.showRegMethod('email'));
    if (showRegUsernameBtn) showRegUsernameBtn.addEventListener('click', () => window.showRegMethod('username'));
    if (regBtn) regBtn.addEventListener('click', window.handleRegisterEmail);
    if (regBtnUser) regBtnUser.addEventListener('click', window.handleRegisterUsername);
    
    if (backToChoiceFromLogin) backToChoiceFromLogin.addEventListener('click', () => window.showAuthForm('choice'));
    if (backToLoginChoiceFromEmail) backToLoginChoiceFromEmail.addEventListener('click', () => window.showAuthForm('loginChoice'));
    if (backToLoginChoiceFromUsername) backToLoginChoiceFromUsername.addEventListener('click', () => window.showAuthForm('loginChoice'));
    if (backToChoiceFromRegister) backToChoiceFromRegister.addEventListener('click', () => window.showAuthForm('choice'));
    
    if (step1NextBtn) step1NextBtn.addEventListener('click', () => window.nextStep(2));
    if (step2PrevBtn) step2PrevBtn.addEventListener('click', () => window.nextStep(1));
    if (step2NextBtn) step2NextBtn.addEventListener('click', () => window.nextStep(3));
    if (step3PrevBtn) step3PrevBtn.addEventListener('click', () => window.nextStep(2));
    if (step3CancelBtn) step3CancelBtn.addEventListener('click', () => window.showAuthForm('choice'));
    
    if (n1) n1.addEventListener('input', window.checkStep1Completion);
    if (n4) n4.addEventListener('input', window.checkStep1Completion);
    if (regWhatsapp) regWhatsapp.addEventListener('input', window.checkStep1Completion);
    if (regParentPhone) regParentPhone.addEventListener('input', window.checkStep1Completion);
    if (regLevel) regLevel.addEventListener('change', () => {
        window.updateGrades();
        window.checkStep2Completion();
    });
    if (regGrade) regGrade.addEventListener('change', window.checkStep2Completion);
    
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
                    window.checkStep1Completion(); 
                }
            });
        }
    });
});

// ================ INIT ================
document.addEventListener('DOMContentLoaded', () => {
    window.loadFolders();
    loadReviews();
    window.loadPerfectScores();
    window.loadLeaderboard();
    
    onValue(ref(db, 'quiz_results'), () => {
        window.loadPerfectScores();
        window.loadLeaderboard();
    });
});

// تنظيف المستمعين عند إغلاق الصفحة
window.addEventListener('beforeunload', () => {
    window.cleanupListeners();
});