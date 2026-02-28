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

// parent-reporter.js
// نظام إرسال تقارير الطلاب عبر تليجرام

// دالة إرسال رسالة إلى تليجرام
async function sendTelegramMessage(chatId, message) {
    // ⚠️ تحذير أمني: يجب نقل التوكن إلى Firebase بدلاً من تركه هنا
    // قم بتخزينه في: settings/telegramBotToken في Firebase
    // ثم احضره بـ: const tokenSnap = await window.get(window.ref(window.db, 'settings/telegramBotToken'));
    const tokenSnap = await window.get(window.ref(window.db, 'settings/telegramBotToken'));
    const token = tokenSnap.exists() ? tokenSnap.val() : null;
    if (!token) { console.error('Telegram token not configured in Firebase'); return false; }
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });
        const data = await response.json();
        return data.ok;
    } catch (error) {
        console.error('Error sending telegram message:', error);
        return false;
    }
}

// جلب بيانات تقدم الطالب
async function getStudentReportData(userId) {
    try {
        const studentSnap = await window.get(window.child(window.dbRef, `students/${userId}`));
        if (!studentSnap.exists()) return null;
        const studentData = studentSnap.val();

        const watchedCount = studentData.watchedVideos ? Object.keys(studentData.watchedVideos).length : 0;
        const examsCount = studentData.examResults ? Object.keys(studentData.examResults).length : 0;
        
        let avgScore = 0;
        if (studentData.examResults) {
            const scores = Object.values(studentData.examResults).map(e => e.percentage || 0);
            if (scores.length > 0) {
                avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            }
        }
        
        const points = studentData.points || 0;

        return {
            studentName: studentData.name,
            telegramChatId: studentData.telegramChatId,
            videosCount: watchedCount,
            examsCount: examsCount,
            averageScore: avgScore,
            points: points,
            grade: studentData.grade
        };
    } catch (error) {
        console.error('Error getting student data:', error);
        return null;
    }
}

// إنشاء نص التقرير
function createReportMessage(data) {
    return `
📊 تقرير تقدم الطالب
------------------
👤 الاسم: ${data.studentName}
📅 التاريخ: ${new Date().toLocaleDateString('ar-EG')}
🎓 المرحلة: ${data.grade || 'غير محدد'}

📹 الفيديوهات المشاهدة: ${data.videosCount}
📝 الامتحانات التي تم حلها: ${data.examsCount}
📊 متوسط الدرجات: ${data.averageScore}%
⭐ النقاط: ${data.points}

نتمنى لكم دوام التوفيق لأبنائنا 🌹
    `;
}

// إرسال تقرير لولي أمر طالب محدد
window.sendReportToParent = async function(userId, silent = false) {
    // التحقق من صلاحيات الأدمن (إصلاح #8)
    if (!window.currentUser || !window.isAdminUser) {
        if (!silent) alert('❌ غير مصرح بهذه العملية');
        return false;
    }
    const data = await getStudentReportData(userId);
    if (!data) {
        if (!silent) alert('❌ لم يتم العثور على بيانات الطالب');
        return false;
    }
    if (!data.telegramChatId) {
        if (!silent) alert('❌ لا يوجد معرف تليجرام لولي الأمر');
        return false;
    }
    // التحقق من صحة chatId (يجب أن يكون رقماً أو يبدأ بـ @)
    const chatIdStr = String(data.telegramChatId).trim();
    if (!chatIdStr || (!/^-?\d+$/.test(chatIdStr) && !chatIdStr.startsWith('@'))) {
        if (!silent) alert('❌ معرف تليجرام لولي الأمر غير صحيح');
        return false;
    }

    const message = createReportMessage(data);
    const success = await sendTelegramMessage(data.telegramChatId, message);
    
    if (!silent) {
        if (success) {
            alert(`✅ تم إرسال التقرير إلى ولي أمر ${data.studentName}`);
        } else {
            alert('❌ فشل إرسال التقرير');
        }
    }
    return success;
};

// إرسال تقارير لكل الطلاب
window.sendBulkReports = async function() {
    // التحقق من الصلاحيات (إصلاح #8)
    if (!window.currentUser || !window.isAdminUser) {
        alert('❌ غير مصرح بهذه العملية');
        return;
    }
    const studentsSnap = await window.get(window.child(window.dbRef, 'students'));
    if (!studentsSnap.exists()) {
        alert('❌ لا يوجد طلاب');
        return;
    }

    let sentCount = 0;
    let totalWithTelegram = 0;

    // إرسال متوازي مع تأخير لتجنب flood limits (إصلاح #9)
    const entries = Object.entries(studentsSnap.val()).filter(([, s]) => s.telegramChatId);
    totalWithTelegram = entries.length;
    
    const BATCH_SIZE = 5;
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
            batch.map(([uid]) => window.sendReportToParent(uid, true))
        );
        sentCount += results.filter(r => r.status === 'fulfilled' && r.value).length;
        if (i + BATCH_SIZE < entries.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    alert(`✅ تم إرسال ${sentCount} تقرير من أصل ${totalWithTelegram}`);
};