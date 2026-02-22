// parent-reporter.js
// نظام إرسال تقارير الطلاب عبر تليجرام

// دالة إرسال رسالة إلى تليجرام
async function sendTelegramMessage(chatId, message) {
    // ✅ التوكن محفوظ في Firebase بأمان في: settings/telegramBotToken
    try {
        const tokenSnap = await window.get(window.ref(window.db, 'settings/telegramBotToken'));
        if (!tokenSnap.exists() || !tokenSnap.val()) {
            console.error('❌ Telegram token not found in Firebase at: settings/telegramBotToken');
            return false;
        }
        const token = tokenSnap.val();
        const url = `https://api.telegram.org/bot${token}/sendMessage`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

        return {
            studentName: studentData.name,
            telegramChatId: studentData.telegramChatId,
            videosCount: watchedCount,
            examsCount: examsCount,
            averageScore: avgScore,
            points: studentData.points || 0,
            grade: studentData.grade
        };
    } catch (error) {
        console.error('Error getting student data:', error);
        return null;
    }
}

// إنشاء نص التقرير
function createReportMessage(data) {
    // تأمين البيانات من HTML injection
    const safe = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `
📊 تقرير تقدم الطالب
------------------
👤 الاسم: ${safe(data.studentName)}
📅 التاريخ: ${new Date().toLocaleDateString('ar-EG')}
🎓 المرحلة: ${safe(data.grade) || 'غير محدد'}

📹 الفيديوهات المشاهدة: ${parseInt(data.videosCount) || 0}
📝 الامتحانات التي تم حلها: ${parseInt(data.examsCount) || 0}
📊 متوسط الدرجات: ${parseInt(data.averageScore) || 0}%
⭐ النقاط: ${parseInt(data.points) || 0}

نتمنى لكم دوام التوفيق لأبنائنا 🌹
    `;
}

// إرسال تقرير لولي أمر طالب محدد (بدون alert - يُرجع نتيجة فقط)
async function sendReportToParentSilent(userId) {
    const data = await getStudentReportData(userId);
    if (!data || !data.telegramChatId) return false;
    const message = createReportMessage(data);
    return await sendTelegramMessage(data.telegramChatId, message);
}

// إرسال تقرير لولي أمر طالب محدد (مع إشعار للمستخدم - للاستخدام اليدوي)
window.sendReportToParent = async function(userId) {
    const data = await getStudentReportData(userId);
    if (!data) {
        if (window.showToast) window.showToast('❌ لم يتم العثور على بيانات الطالب', 'error');
        return false;
    }
    if (!data.telegramChatId) {
        if (window.showToast) window.showToast('❌ لا يوجد معرف تليجرام لولي الأمر', 'error');
        return false;
    }
    const message = createReportMessage(data);
    const success = await sendTelegramMessage(data.telegramChatId, message);
    if (success) {
        if (window.showToast) window.showToast(`✅ تم إرسال التقرير إلى ولي أمر ${data.studentName}`, 'success');
        return true;
    } else {
        if (window.showToast) window.showToast('❌ فشل إرسال التقرير', 'error');
        return false;
    }
};

// إرسال تقارير لكل الطلاب (بدون alerts متكررة)
window.sendBulkReports = async function() {
    const studentsSnap = await window.get(window.child(window.dbRef, 'students'));
    if (!studentsSnap.exists()) {
        if (window.showToast) window.showToast('❌ لا يوجد طلاب', 'error');
        return;
    }

    let sentCount = 0;
    let totalWithTelegram = 0;

    const entries = Object.entries(studentsSnap.val());

    for (const [uid, student] of entries) {
        if (student.telegramChatId) {
            totalWithTelegram++;
            try {
                const success = await sendReportToParentSilent(uid);
                if (success) sentCount++;
            } catch (err) {
                console.error(`Error sending report for ${uid}:`, err);
            }
            // تأخير بسيط لتجنب تجاوز حدود Telegram API
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    if (window.showToast) {
        window.showToast(`✅ تم إرسال ${sentCount} تقرير من أصل ${totalWithTelegram}`, 'success', 5000);
    }
};
