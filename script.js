// ================ FIREBASE IMPORTS ================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, get, child, push, onValue, set, update, off } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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
let selectedRating = null;
let studentDataCache = {};
let cacheTime = {};
const CACHE_DURATION = 60000;

// ================ LISTENER MANAGER ================
class ListenerManager {
    constructor() {
        this.listeners = new Map();
    }
    
    add(name, ref, listener, context = 'global') {
        const listenerId = `${context}_${name}_${Date.now()}`;
        this.listeners.set(listenerId, {
            name,
            ref,
            listener,
            context,
            createdAt: Date.now()
        });
        return listenerId;
    }
    
    removeByContext(context) {
        let removed = 0;
        for (const [id, data] of this.listeners.entries()) {
            if (data.context === context) {
                off(data.ref, 'value', data.listener);
                this.listeners.delete(id);
                removed++;
            }
        }
        return removed;
    }
    
    removeAll() {
        for (const [id, data] of this.listeners.entries()) {
            off(data.ref, 'value', data.listener);
        }
        this.listeners.clear();
    }
}

const listenerManager = new ListenerManager();

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
function showToast(message, type = 'success', duration = 3000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
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

function clearExpiredCache() {
    const now = Date.now();
    Object.keys(cacheTime).forEach(uid => {
        if (now - cacheTime[uid] > CACHE_DURATION) {
            delete studentDataCache[uid];
            delete cacheTime[uid];
        }
    });
}

setInterval(clearExpiredCache, 60000);

// ================ دالة توليد كود طالب فريد ================
async function generateUniqueStudentId() {
    try {
        const studentsSnap = await get(child(dbRef, 'students'));
        const existingIds = new Set();
        
        if (studentsSnap.exists()) {
            studentsSnap.forEach(studentSnapshot => {
                const studentData = studentSnapshot.val();
                if (studentData.shortId) existingIds.add(studentData.shortId);
            });
        }
        
        let newId;
        let attempts = 0;
        const MAX_ATTEMPTS = 100;
        
        do {
            newId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
            attempts++;
            if (attempts >= MAX_ATTEMPTS) {
                throw new Error('فشل توليد كود طالب فريد بعد محاولات عديدة');
            }
        } while (existingIds.has(newId));
        
        return newId;
    } catch (error) {
        console.error('❌ خطأ في توليد كود الطالب:', error);
        throw new Error('فشل في توليد كود الطالب');
    }
}

// ================ PHONE VALIDATION ================
function validatePhoneNumber(phone) {
    const phoneRegex = /^[0-9]{10,15}$/;
    const isRepeated = /^(.)\1+$/.test(phone);
    return phoneRegex.test(phone) && !isRepeated;
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
    const isWhatsappValid = whatsapp !== '' && validatePhoneNumber(whatsapp);
    const isParentPhoneValid = parentPhone === '' || validatePhoneNumber(parentPhone);
    
    let errorMessage = '';
    if (!isNameValid) errorMessage = '❌ يرجى إدخال الاسم الأول واللقب على الأقل';
    else if (!isWhatsappValid) errorMessage = '❌ يرجى إدخال رقم واتساب صحيح (10-15 رقماً)';
    else if (!isParentPhoneValid) errorMessage = '❌ رقم ولي الأمر غير صحيح (10-15 رقماً)';
    
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
        errorDiv.textContent = errorMessage;
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
        errorDiv.textContent = '❌ يرجى اختيار المرحلة والصف الدراسي';
        return false;
    }
};

// ================ HANDLE FIREBASE ERRORS ================
const handleFirebaseError = (error, customMessage = 'حدث خطأ') => {
    console.error('Firebase Error:', error);
    
    const errorMap = {
        'PERMISSION_DENIED': 'ليس لديك صلاحية للوصول إلى هذه البيانات',
        'NETWORK_ERROR': 'مشكلة في الاتصال بالإنترنت',
        'auth/user-not-found': 'المستخدم غير موجود',
        'auth/wrong-password': 'كلمة المرور غير صحيحة',
        'auth/email-already-in-use': 'البريد الإلكتروني مستخدم بالفعل',
        'auth/invalid-email': 'البريد الإلكتروني غير صالح',
        'auth/weak-password': 'كلمة المرور ضعيفة جداً',
        'auth/network-request-failed': 'مشكلة في الاتصال بالإنترنت',
        'auth/too-many-requests': 'تم حظر الحساب مؤقتاً. يرجى المحاولة لاحقاً',
        'auth/invalid-credential': 'بيانات الدخول غير صحيحة',
        'auth/account-exists-with-different-credential': 'هذا البريد الإلكتروني مستخدم بطريقة تسجيل مختلفة',
        'auth/popup-closed-by-user': 'تم إغلاق نافذة التسجيل',
        'auth/cancelled-popup-request': 'تم إلغاء طلب التسجيل',
        'auth/popup-blocked': 'تم حظر النافذة المنبثقة، يرجى السماح بالنوافذ المنبثقة'
    };
    
    const message = errorMap[error.code] || customMessage;
    showToast(`❌ ${message}`, 'error');
    return message;
};

const ADMIN_EMAIL = "mrsmonakamel6@gmail.com";

// ================ دوال مساعدة للتحقق من البيانات المكررة ================
async function isEmailExists(email) {
    try {
        const studentsSnap = await get(child(dbRef, 'students'));
        if (!studentsSnap.exists()) return false;
        
        let exists = false;
        studentsSnap.forEach(studentSnapshot => {
            const studentData = studentSnapshot.val();
            if (studentData.email && studentData.email.toLowerCase() === email.toLowerCase()) {
                exists = true;
            }
        });
        return exists;
    } catch (error) {
        console.error('Error checking email:', error);
        return false;
    }
}

async function isUsernameExists(username) {
    try {
        const studentsSnap = await get(child(dbRef, 'students'));
        if (!studentsSnap.exists()) return false;
        
        let exists = false;
        studentsSnap.forEach(studentSnapshot => {
            const studentData = studentSnapshot.val();
            if (studentData.username && studentData.username.toLowerCase() === username.toLowerCase()) {
                exists = true;
            }
        });
        return exists;
    } catch (error) {
        console.error('Error checking username:', error);
        return false;
    }
}

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
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('❌ يرجى إدخال بريد إلكتروني صحيح', 'error');
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
        // التحقق من وجود البريد الإلكتروني مسبقاً
        const emailExists = await isEmailExists(email);
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
        
        // حفظ جميع البيانات بما في ذلك username فارغ
        await set(ref(db, 'students/' + res.user.uid), { 
            name: fullName, 
            grade: grade, 
            whatsapp: whatsapp,
            parentPhone: parentPhone || '',
            shortId: sid,
            email: email,
            username: '', // إضافة حقل username فارغ
            authMethod: 'email',
            subscriptions: {},
            watchedVideos: {},
            examResults: {},
            createdAt: new Date().toLocaleString('ar-EG')
        });
        
        showToast(`✅ تم التسجيل بنجاح! كود الطالب: ${sid}`, 'success', 5000);
        window.closeLogin();
    } catch(err) {
        console.error('Registration error:', err);
        handleFirebaseError(err, 'حدث خطأ في التسجيل');
    } finally {
        btn.disabled = false;
        btn.innerText = "تسجيل";
        btn.classList.remove('btn-loading');
        stopProgress();
    }
};

window.handleRegisterUsername = async function() {
    console.log('🔵 تم استدعاء handleRegisterUsername');
    
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
    
    console.log('📝 البيانات المدخلة:', { username, fullName, grade });
    
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
    if (!btn) {
        console.error('❌ زر التسجيل غير موجود');
        return;
    }
    
    btn.disabled = true;
    btn.innerText = "جاري التحميل...";
    btn.classList.add('btn-loading');
    startProgress();
    
    try {
        console.log('🔍 التحقق من وجود اسم المستخدم...');
        // التحقق من وجود اسم المستخدم
        const usernameExists = await isUsernameExists(username);
        if (usernameExists) {
            showToast('❌ اسم المستخدم هذا مستخدم بالفعل. الرجاء اختيار اسم آخر.', 'error');
            btn.disabled = false;
            btn.innerText = "تسجيل";
            btn.classList.remove('btn-loading');
            stopProgress();
            return;
        }
        
        console.log('✅ اسم المستخدم متاح');
        const sid = await generateUniqueStudentId();
        console.log('✅ تم توليد كود الطالب:', sid);
        
        // إنشاء بريد إلكتروني وهمي
        const email = `${username}@monastudent.local`;
        
        // التحقق من عدم وجود هذا البريد الإلكتروني الوهمي
        const emailExists = await isEmailExists(email);
        if (emailExists) {
            // هذا لا يجب أن يحدث، ولكن للاحتياط
            showToast('❌ حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.', 'error');
            btn.disabled = false;
            btn.innerText = "تسجيل";
            btn.classList.remove('btn-loading');
            stopProgress();
            return;
        }
        
        console.log('🔐 إنشاء حساب Firebase...');
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(res.user, { displayName: fullName });
        
        console.log('💾 حفظ البيانات في قاعدة البيانات...');
        await set(ref(db, 'students/' + res.user.uid), { 
            name: fullName, 
            grade: grade, 
            whatsapp: whatsapp,
            parentPhone: parentPhone || '',
            shortId: sid,
            username: username,
            email: email,
            authMethod: 'username',
            subscriptions: {},
            watchedVideos: {},
            examResults: {},
            createdAt: new Date().toLocaleString('ar-EG')
        });
        
        console.log('✅ تم التسجيل بنجاح!');
        showToast(`✅ تم التسجيل بنجاح! كود الطالب: ${sid}`, 'success', 5000);
        window.closeLogin();
    } catch(err) {
        console.error('❌ خطأ في التسجيل باليوزرنيم:', err);
        handleFirebaseError(err, 'حدث خطأ في التسجيل');
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
        // استخدام signInWithPopup للحصول على بيانات المستخدم أولاً
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // التحقق من عدم وجود هذا البريد الإلكتروني في قاعدة البيانات
        const emailExists = await isEmailExists(user.email);
        if (emailExists) {
            showToast('❌ هذا البريد الإلكتروني مستخدم بالفعل. يرجى تسجيل الدخول مباشرة.', 'error');
            await signOut(auth); // تسجيل الخروج لأن المستخدم موجود بالفعل
            return;
        }
        
        const sid = await generateUniqueStudentId();
        
        // تحديث اسم المستخدم
        await updateProfile(user, { displayName: fullName });
        
        // حفظ البيانات في Realtime Database
        await set(ref(db, 'students/' + user.uid), {
            name: fullName,
            grade: grade,
            whatsapp: whatsapp,
            parentPhone: parentPhone || '',
            shortId: sid,
            email: user.email,
            username: '', // إضافة حقل username فارغ
            authMethod: 'google',
            subscriptions: {},
            watchedVideos: {},
            examResults: {},
            createdAt: new Date().toLocaleString('ar-EG')
        });
        
        showToast(`✅ تم التسجيل بنجاح! كود الطالب: ${sid}`, 'success', 5000);
        window.closeLogin();
    } catch(err) {
        console.error('Google registration error:', err);
        // إذا كان المستخدم قد سجل دخول لكن حدث خطأ في الحفظ، نسجله خروج
        if (auth.currentUser) {
            await signOut(auth);
        }
        handleFirebaseError(err, 'حدث خطأ في التسجيل');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('btn-loading');
        }
        stopProgress();
    }
};

// ================ LOGIN FUNCTIONS ================
window.loginEmailSubmit = async function(e) {
    if (e) e.preventDefault();
    
    const emailInput = document.getElementById('stEmail');
    const passwordInput = document.getElementById('stPass');
    
    if (!emailInput || !passwordInput) {
        showToast('❌ خطأ في النظام - يرجى تحديث الصفحة', 'error');
        return;
    }
    
    const e_mail = emailInput.value.trim();
    const p = passwordInput.value;
    
    if(!e_mail || !p) {
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
        await signInWithEmailAndPassword(auth, e_mail, p);
        window.closeLogin();
        showToast('✅ مرحباً بك مجدداً!', 'success');
    } catch(err) {
        console.error('❌ Login error:', err);
        handleFirebaseError(err, 'فشل تسجيل الدخول');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('btn-loading');
        }
        stopProgress();
    }
};

window.loginUsernameSubmit = async function(e) {
    if (e) e.preventDefault();
    
    const usernameInput = document.getElementById('stUsername');
    const passwordInput = document.getElementById('stPassUsername');
    
    if (!usernameInput || !passwordInput) {
        showToast('❌ خطأ في النظام - يرجى تحديث الصفحة', 'error');
        return;
    }
    
    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    
    if(!username || !password) {
        showToast('❌ يرجى إدخال اسم المستخدم وكلمة المرور', 'error');
        return;
    }
    
    const btn = document.getElementById('loginUsernameSubmitBtn');
    if (btn) {
        btn.disabled = true;
        btn.classList.add('btn-loading');
    }
    startProgress();
    
    try {
        const studentsRef = ref(db, 'students');
        const studentsSnap = await get(studentsRef);
        
        if (!studentsSnap.exists()) {
            showToast('❌ اسم المستخدم غير موجود', 'error');
            return;
        }
        
        let foundUser = null;
        let foundUid = null;
        
        studentsSnap.forEach((studentSnapshot) => {
            const studentData = studentSnapshot.val();
            if (studentData.username && studentData.username.toLowerCase() === username) {
                foundUser = studentData;
                foundUid = studentSnapshot.key;
            }
        });
        
        if (!foundUser || !foundUid) {
            showToast('❌ اسم المستخدم غير موجود', 'error');
            return;
        }
        
        let email = foundUser.email;
        if (!email) {
            // إنشاء بريد إلكتروني وهمي إذا لم يكن موجوداً
            email = `${username}@monastudent.local`;
            await update(ref(db, `students/${foundUid}`), {
                email: email,
                authMethod: 'username'
            });
        } else if (email.endsWith('@monastudent.local') && email.split('@')[0] !== username) {
            // تحديث البريد الإلكتروني إذا تغير اسم المستخدم (حالة نادرة)
            email = `${username}@monastudent.local`;
            await update(ref(db, `students/${foundUid}`), {
                email: email
            });
        }
        
        await signInWithEmailAndPassword(auth, email, password);
        window.closeLogin();
        showToast('✅ مرحباً بك مجدداً!', 'success');
    } catch(err) {
        console.error('❌ Username login error:', err);
        handleFirebaseError(err, 'حدث خطأ في تسجيل الدخول');
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
            showToast('✅ مرحباً بك مجدداً!', 'success');
        }
    } catch(err) {
        console.error('Google login error:', err);
        handleFirebaseError(err, 'حدث خطأ في تسجيل الدخول');
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
        startProgress();
        try {
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
            } else {
                currentStudentGrade = null;
                myShortId = "";
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
            await window.loadPerfectScores();
        } catch (error) {
            console.error("خطأ في جلب بيانات المستخدم:", error);
            showToast("حدث خطأ أثناء تحميل بياناتك.", 'error');
        } finally {
            stopProgress();
        }
    } else {
        isAdminUser = false;
        myShortId = "";
        currentStudentGrade = null;
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
        menu.style.display = menu.style.display === 'none' || menu.style.display === '' ? 'block' : 'none';
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

function updateMenuItems(isLoggedIn) {
    const homeItem = document.getElementById('homeMenuItem');
    const divider = document.getElementById('menuDivider');
    const logoutItem = document.getElementById('logoutMenuItem');
    
    if (isLoggedIn) {
        if (homeItem) {
            homeItem.style.display = 'block';
            homeItem.onclick = function(e) {
                e.preventDefault();
                window.goHome();
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
        if (homeItem) homeItem.style.display = 'none';
        if (divider) divider.style.display = 'none';
        if (logoutItem) logoutItem.style.display = 'none';
    }
}

// ================ PERFECT SCORES ================
window.loadPerfectScores = async function() {
    try {
        const resultsSnap = await get(child(dbRef, 'quiz_results'));
        const studentsSnap = await get(child(dbRef, 'students'));
        
        const perfectScoresSection = document.getElementById('perfectScoresSection');
        const perfectScoresGrid = document.getElementById('perfectScoresGrid');
        
        if (!perfectScoresSection || !perfectScoresGrid) return;
        
        // ✅ إظهار القسم دائماً (حتى لو كان فارغاً)
        perfectScoresSection.style.display = 'block';
        
        if (!resultsSnap.exists() || !studentsSnap.exists()) {
            perfectScoresGrid.innerHTML = '<div class="empty-state" style="text-align:center; padding:40px; color:#999;"><i class="fas fa-trophy" style="font-size:3rem; opacity:0.3; margin-bottom:15px;"></i><br>🎉 لا توجد درجات نهائية بعد. كن أنت الأول!</div>';
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
            // ✅ رسالة عند عدم وجود نتائج
            perfectScoresGrid.innerHTML = '<div class="empty-state" style="text-align:center; padding:40px; color:#999;"><i class="fas fa-star" style="font-size:3rem; opacity:0.3; margin-bottom:15px;"></i><br>🎉 لا توجد درجات نهائية بعد. كن أنت الأول!</div>';
        }
    } catch (error) {
        console.error("Error loading perfect scores:", error);
        const perfectScoresSection = document.getElementById('perfectScoresSection');
        const perfectScoresGrid = document.getElementById('perfectScoresGrid');
        
        if (perfectScoresSection && perfectScoresGrid) {
            perfectScoresSection.style.display = 'block';
            perfectScoresGrid.innerHTML = '<div class="empty-state" style="text-align:center; padding:40px; color:#e74c3c;"><i class="fas fa-exclamation-triangle" style="font-size:3rem; margin-bottom:15px;"></i><br>حدث خطأ في تحميل الدرجات النهائية</div>';
        }
    }
};

// ================ FOLDERS LOADING ================
window.loadFolders = function() {
    listenerManager.removeByContext('folders');
    
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
        
        // ✅ عرض جميع الكورسات لجميع المستخدمين (تم إزالة التصفية)
        let filteredCourses = courses;
        
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
    
    listenerManager.add('folders', foldersRef, listener, 'folders');
};

// ================ REVIEWS LOADING ================
function loadReviews() {
    listenerManager.removeByContext('reviews');
    
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
    
    listenerManager.add('reviews', reviewsRef, listener, 'reviews');
}

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
        };
        
        await set(ref(db, `students/${currentUser.uid}/subscriptions/${currentFolderId}`), subscriptionData);
        await push(ref(db, 'subscription_notifications'), {
            ...subscriptionData,
            studentUid: currentUser.uid,
            timestamp: new Date().toLocaleString('ar-EG')
        });
        
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

// ================ LOAD COURSE CONTENT ================
window.loadCourseContent = async function(folderId, folderName, hasAccess) {
    const homePage = document.getElementById('homePage');
    const contentArea = document.getElementById('contentArea');
    const folderTitleName = document.getElementById('folderTitleName');
    
    if (homePage) homePage.style.display = "none";
    if (contentArea) contentArea.style.display = "block";
    if (folderTitleName) folderTitleName.innerText = folderName;

    await window.loadCourseRatingUI(folderId);

    // ✅ تحسين الأداء بجلب كل شيء دفعة واحدة
    let vSnap, qSnap, resultsSnap;
    let examResultsMap = {};

    if (hasAccess && currentUser) {
        // جلب كل البيانات المطلوبة في نفس الوقت
        const promises = [
            get(child(dbRef, `folders/${folderId}/videos`)),
            get(child(dbRef, `quizzes/${folderId}`)),
            get(child(dbRef, `students/${currentUser.uid}/examResults`))
        ];
        
        const results = await Promise.all(promises);
        vSnap = results[0];
        qSnap = results[1];
        resultsSnap = results[2];
        
        if (resultsSnap.exists()) {
            const results = resultsSnap.val();
            Object.keys(results).forEach(quizId => {
                if (results[quizId].courseId === folderId) {
                    examResultsMap[quizId] = results[quizId];
                }
            });
        }
    } else {
        // المستخدم ليس لديه صلاحية أو غير مسجل - جلب الفيديوهات والاختبارات فقط
        const promises = [
            get(child(dbRef, `folders/${folderId}/videos`)),
            get(child(dbRef, `quizzes/${folderId}`))
        ];
        
        const results = await Promise.all(promises);
        vSnap = results[0];
        qSnap = results[1];
    }

    const grid = document.getElementById('combinedGrid');
    if (!grid) return;
    
    grid.innerHTML = "";

    // عرض الفيديوهات
    if (vSnap.exists()) {
        const videosArray = [];
        vSnap.forEach(v => {
            videosArray.push({
                id: v.key,
                ...v.val(),
                order: v.val().order || 999
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
            
            const title = document.createElement('h3');
            title.textContent = videoData.title || 'فيديو';
            detailsDiv.appendChild(title);
            
            card.appendChild(detailsDiv);
            
            if (hasAccess) {
                card.addEventListener('click', () => window.openVideo(videoData.url, videoData.title, videoData.id, folderId));
            } else {
                card.style.cursor = 'not-allowed';
            }
            
            grid.appendChild(card);
        });
    }

    // عرض الاختبارات
    if (qSnap.exists()) {
        const quizzesArray = [];
        qSnap.forEach(q => {
            quizzesArray.push({
                id: q.key,
                ...q.val(),
                order: q.val().order || 999
            });
        });
        
        quizzesArray.sort((a, b) => a.order - b.order);
        
        quizzesArray.forEach(quizData => {
            const quizId = quizData.id;
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
            
            const title = document.createElement('h3');
            title.textContent = quizData.name || 'امتحان';
            detailsDiv.appendChild(title);
            
            const questionsCount = quizData.questions ? Object.keys(quizData.questions).length : 0;
            const info = document.createElement('p');
            info.innerHTML = `<i class="fas fa-question-circle"></i> ${questionsCount} سؤال`;
            detailsDiv.appendChild(info);
            
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
        });
    }

    if (grid.children.length === 0) {
        grid.innerHTML = "<p style='text-align:center; padding:40px; color:#999;'>لا يوجد محتوى في هذا الكورس بعد</p>";
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

        await window.loadPerfectScores();
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

// ✅ دالة تحديث الصفوف الدراسية - نسخة واحدة فقط
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
    
    if (homePage) homePage.style.display = "block";
    if (contentArea) contentArea.style.display = "none";
    
    window.loadFolders();
    window.loadPerfectScores();
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

// ================ CLEANUP ================
window.cleanupListeners = function(context = null) {
    if (context) {
        return listenerManager.removeByContext(context);
    }
    return listenerManager.removeAll();
};

// ================ DEBUG LOGIN BUTTONS ================
window.debugLoginButtons = function() {
    console.log('=== Debugging Login Buttons ===');
    
    const loginUsernameSubmitBtn = document.getElementById('loginUsernameSubmitBtn');
    const loginEmailSubmitBtn = document.getElementById('loginEmailSubmitBtn');
    
    console.log('loginUsernameSubmitBtn exists:', !!loginUsernameSubmitBtn);
    console.log('loginEmailSubmitBtn exists:', !!loginEmailSubmitBtn);
    
    if (loginUsernameSubmitBtn) {
        loginUsernameSubmitBtn.removeEventListener('click', window.loginUsernameSubmit);
        loginUsernameSubmitBtn.addEventListener('click', window.loginUsernameSubmit);
        console.log('✅ Re-attached click event to loginUsernameSubmitBtn');
    }
    
    if (loginEmailSubmitBtn) {
        loginEmailSubmitBtn.removeEventListener('click', window.loginEmailSubmit);
        loginEmailSubmitBtn.addEventListener('click', window.loginEmailSubmit);
        console.log('✅ Re-attached click event to loginEmailSubmitBtn');
    }
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
    
    // إضافة حقول اسم المستخدم للتحقق
    const regUsername = document.getElementById('regUsername');
    const regPassUser = document.getElementById('regPassUser');
    const regPassUserConfirm = document.getElementById('regPassUserConfirm');
    
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
    if (regBtnUser) {
        // إزالة أي مستمع قديم وإضافة مستمع جديد
        regBtnUser.removeEventListener('click', window.handleRegisterUsername);
        regBtnUser.addEventListener('click', window.handleRegisterUsername);
        console.log('✅ تم ربط زر التسجيل باليوزرنيم بنجاح');
    }
    
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
    // إضافة تحقق من حقول اليوزرنيم
if (regUsername) regUsername.addEventListener('input', window.checkStep1Completion);
if (regPassUser) regPassUser.addEventListener('input', window.checkStep1Completion);
if (regPassUserConfirm) regPassUserConfirm.addEventListener('input', window.checkStep1Completion);

// ✅ إظهار حقول التسجيل عند اختيار الطريقة
const step3Email = document.getElementById('step3Email');
const step3Username = document.getElementById('step3Username');

if (showRegEmailBtn) {
    showRegEmailBtn.addEventListener('click', function() {
        if (step3Email) {
            step3Email.style.display = 'block';
            step3Email.classList.add('active');
        }
        if (step3Username) {
            step3Username.style.display = 'none';
            step3Username.classList.remove('active');
        }
    });
}

if (showRegUsernameBtn) {
    showRegUsernameBtn.addEventListener('click', function() {
        if (step3Username) {
            step3Username.style.display = 'block';
            step3Username.classList.add('active');
        }
        if (step3Email) {
            step3Email.style.display = 'none';
            step3Email.classList.remove('active');
        }
    });
}
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
    
    setTimeout(window.debugLoginButtons, 1000);
});

// ================ INIT ================
document.addEventListener('DOMContentLoaded', () => {
    window.loadFolders();
    loadReviews();
    window.loadPerfectScores();
    
    onValue(ref(db, 'quiz_results'), () => {
        window.loadPerfectScores();
    });
});

// تنظيف المستمعين عند إغلاق الصفحة
window.addEventListener('beforeunload', () => {
    window.cleanupListeners();
});

window.addEventListener('popstate', () => {
    listenerManager.removeByContext('content');
});

// ================ إعادة ربط الأحداث بعد التحميل ================
window.addEventListener('load', function() {
    // تأخير بسيط للتأكد من تحميل DOM بالكامل
    setTimeout(window.debugLoginButtons, 500);
});