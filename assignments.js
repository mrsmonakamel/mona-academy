// assignments.js
// نظام الواجبات المنزلية - مكتمل

// ============ عرض الواجبات في صفحة الكورس ============
window.loadAssignments = async function(courseId, hasAccess) {
    const container = document.getElementById('assignmentsContainer');
    if (!container || !hasAccess) {
        if (container) container.innerHTML = '';
        return;
    }

    try {
        // انتظار Firebase
        let wait = 0;
        while ((!window.db || !window.ref || !window.get) && wait < 30) {
            await new Promise(r => setTimeout(r, 200));
            wait++;
        }
        if (!window.db || !window.ref || !window.get) return;

        const snap = await window.get(window.ref(window.db, 'assignments/' + courseId));
        if (!snap.exists()) { container.innerHTML = ''; return; }

        const assignments = [];
        snap.forEach(a => assignments.push(Object.assign({ id: a.key }, a.val())));
        assignments.sort((a, b) => { const da = a.createdAt||''; const db_ = b.createdAt||''; return db_ > da ? 1 : db_ < da ? -1 : 0; });

        let submittedMap = {};
        if (window.currentUser) {
            try {
                const subSnap = await window.get(window.ref(window.db, 'assignment_submissions/' + window.currentUser.uid));
                if (subSnap.exists()) submittedMap = subSnap.val();
            } catch (e) {}
        }

        const safe = (s) => s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';

        let html = '<div style="margin-top:40px;"><h3 style="color:var(--main); margin-bottom:20px; font-weight:900; display:flex; align-items:center; gap:10px;"><i class="fas fa-tasks"></i> الواجبات المنزلية</h3><div style="display:grid; gap:15px;">';

        assignments.forEach(function(assign) {
            const isSubmitted = !!submittedMap[assign.id];
            const dueDate = assign.dueDate || '';
            const isOverdue = dueDate && new Date(dueDate) < new Date() && !isSubmitted;
            const statusColor = isSubmitted ? 'var(--success)' : (isOverdue ? 'var(--danger)' : 'var(--main)');
            const statusText = isSubmitted ? 'تم التسليم ✅' : (isOverdue ? 'متأخر ⚠️' : 'لم يُسلَّم بعد');
            const actionBtn = !isSubmitted
                ? `<button data-assignment-id="${safe(assign.id)}" data-course-id="${safe(courseId)}" class="assign-submit-btn" style="background:var(--main); color:white; border:none; padding:8px 16px; border-radius:10px; cursor:pointer; font-weight:bold; font-family:'Cairo'; font-size:0.85rem; white-space:nowrap;"><i class="fas fa-paper-plane" style="margin-left:5px;"></i>تسليم الواجب</button>`
                : `<button data-assignment-id="${safe(assign.id)}" class="assign-view-btn" style="background:var(--success); color:white; border:none; padding:8px 16px; border-radius:10px; cursor:pointer; font-weight:bold; font-family:'Cairo'; font-size:0.85rem; white-space:nowrap;"><i class="fas fa-eye" style="margin-left:5px;"></i>عرض التسليم</button>`;

            html += '<div style="background:var(--card-bg); border-radius:20px; padding:20px; box-shadow:var(--card-shadow); border-right:5px solid ' + statusColor + ';">';
            html += '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:15px; flex-wrap:wrap;">';
            html += '<div style="flex:1; min-width:0;"><h4 style="margin:0 0 8px; color:var(--text-primary);">' + safe(assign.title||'واجب') + '</h4>';
            if (assign.description) html += '<p style="margin:0 0 10px; color:var(--text-secondary); font-size:0.9rem; line-height:1.7;">' + safe(assign.description) + '</p>';
            if (dueDate) html += '<p style="margin:0; color:' + (isOverdue ? 'var(--danger)' : 'var(--text-muted, #999)') + '; font-size:0.82rem;"><i class="fas fa-calendar-alt" style="margin-left:5px;"></i>الموعد النهائي: ' + safe(dueDate) + '</p>';
            html += '</div>';
            html += '<div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px; flex-shrink:0;">';
            html += '<span style="background:' + statusColor + '20; color:' + statusColor + '; padding:5px 14px; border-radius:50px; font-size:0.8rem; font-weight:bold; white-space:nowrap;">' + statusText + '</span>';
            html += actionBtn + '</div></div></div>';
        });

        html += '</div></div>';
        container.innerHTML = html;

        // ✅ إصلاح: استخدام event delegation بدلاً من onclick مدمج
        container.addEventListener('click', function(e) {
            const submitBtn = e.target.closest('.assign-submit-btn');
            const viewBtn = e.target.closest('.assign-view-btn');
            if (submitBtn) {
                window.showSubmitAssignment(submitBtn.dataset.assignmentId, submitBtn.dataset.courseId);
            } else if (viewBtn) {
                window.viewSubmission(viewBtn.dataset.assignmentId);
            }
        });

    } catch (error) {
        console.error('Error loading assignments:', error);
        container.innerHTML = '';
    }
};

// ============ نافذة تسليم الواجب ============
window.showSubmitAssignment = async function(assignmentId, courseId) {
    if (!window.currentUser) { if (window.openLogin) window.openLogin(); return; }

    var modal = document.getElementById('submitAssignmentModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'submitAssignmentModal';
        modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999; align-items:center; justify-content:center; padding:20px;';
        modal.innerHTML = '<div style="background:var(--card-bg); border-radius:25px; max-width:550px; width:100%; padding:30px; max-height:90vh; overflow-y:auto;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><h3 style="margin:0; color:var(--main); font-size:1.2rem;"><i class="fas fa-paper-plane" style="margin-left:10px;"></i>تسليم الواجب</h3><button id="closeSubmitModalBtn" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--text-secondary);">&#215;</button></div><div style="margin-bottom:15px;"><label style="display:block; margin-bottom:8px; font-weight:bold; color:var(--text-primary);">إجابتك / ملاحظاتك</label><textarea id="assignmentAnswerText" rows="5" placeholder="اكتب إجابتك هنا..." style="width:100%; padding:12px; border:2px solid var(--border-color); border-radius:12px; font-family:\'Cairo\'; font-size:0.95rem; background:var(--card-bg); color:var(--text-primary); resize:vertical;"></textarea></div><div style="margin-bottom:20px;"><label style="display:block; margin-bottom:8px; font-weight:bold; color:var(--text-primary);">رابط الإجابة (اختياري)</label><input type="url" id="assignmentAnswerLink" placeholder="https://..." style="width:100%; padding:12px; border:2px solid var(--border-color); border-radius:12px; font-family:\'Cairo\'; font-size:0.95rem; background:var(--card-bg); color:var(--text-primary);"></div><div style="display:flex; gap:10px;"><button id="submitAssignmentConfirmBtn" style="flex:1; background:var(--main); color:white; border:none; padding:14px; border-radius:12px; cursor:pointer; font-weight:bold; font-family:\'Cairo\'; font-size:1rem;"><i class="fas fa-check" style="margin-left:8px;"></i>تسليم</button><button id="cancelSubmitModalBtn" style="background:var(--border-color); color:var(--text-secondary); border:none; padding:14px 20px; border-radius:12px; cursor:pointer; font-family:\'Cairo\';">إلغاء</button></div></div>';
        // ✅ إصلاح: استخدام addEventListener بدلاً من onclick في HTML
        document.getElementById('closeSubmitModalBtn').addEventListener('click', () => { modal.style.display = 'none'; });
        document.getElementById('cancelSubmitModalBtn').addEventListener('click', () => { modal.style.display = 'none'; });
        document.getElementById('submitAssignmentConfirmBtn').addEventListener('click', window.confirmSubmitAssignment);
        document.body.appendChild(modal);
    }

    modal.dataset.assignmentId = assignmentId;
    modal.dataset.courseId = courseId;
    modal.style.display = 'flex';
    var textEl = document.getElementById('assignmentAnswerText');
    var linkEl = document.getElementById('assignmentAnswerLink');
    if (textEl) textEl.value = '';
    if (linkEl) linkEl.value = '';
};

// ============ تأكيد التسليم ============
window.confirmSubmitAssignment = async function() {
    var modal = document.getElementById('submitAssignmentModal');
    if (!modal || !window.currentUser) return;

    var assignmentId = modal.dataset.assignmentId;
    var courseId = modal.dataset.courseId;
    var answerText = (document.getElementById('assignmentAnswerText')||{value:''}).value.trim();
    var answerLink = (document.getElementById('assignmentAnswerLink')||{value:''}).value.trim();

    if (!answerText && !answerLink) {
        window.showToast && window.showToast('❌ يرجى كتابة إجابتك أو إضافة رابط', 'error'); return;
    }
    if (answerLink) {
        try {
            var url = new URL(answerLink);
            if (!['https:', 'http:'].includes(url.protocol)) {
                window.showToast && window.showToast('❌ رابط غير صالح', 'error'); return;
            }
        } catch (e) {
            window.showToast && window.showToast('❌ يرجى إدخال رابط صحيح', 'error'); return;
        }
    }

    var btn = document.getElementById('submitAssignmentConfirmBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'جاري التسليم...'; }
    window.startProgress && window.startProgress();

    try {
        var studentSnap = await window.get(window.child(window.dbRef, 'students/' + window.currentUser.uid));
        var studentData = studentSnap.exists() ? studentSnap.val() : {};

        var submissionData = {
            assignmentId: assignmentId,
            courseId: courseId,
            studentUid: window.currentUser.uid,
            studentName: studentData.name || window.currentUser.displayName || 'طالب',
            studentShortId: studentData.shortId || '',
            answerText: answerText || '',
            answerLink: answerLink || '',
            submittedAt: new Date().toLocaleString('ar-EG'),
            submittedAtISO: new Date().toISOString()
        };

        await window.set(window.ref(window.db, 'assignment_submissions/' + window.currentUser.uid + '/' + assignmentId), submissionData);
        await window.push(window.ref(window.db, 'all_assignment_submissions/' + courseId + '/' + assignmentId), submissionData);

        window.showToast && window.showToast('✅ تم تسليم الواجب بنجاح!', 'success', 4000);
        modal.style.display = 'none';
        await window.loadAssignments(courseId, true);

    } catch (error) {
        console.error('Error submitting assignment:', error);
        window.showToast && window.showToast('❌ حدث خطأ في التسليم', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check" style="margin-left:8px;"></i>تسليم'; }
        window.stopProgress && window.stopProgress();
    }
};

// ============ عرض تسليم الطالب ============
window.viewSubmission = async function(assignmentId) {
    if (!window.currentUser) return;
    try {
        var snap = await window.get(window.ref(window.db, 'assignment_submissions/' + window.currentUser.uid + '/' + assignmentId));
        if (!snap.exists()) { window.showToast && window.showToast('❌ لا يوجد تسليم مسجل', 'error'); return; }

        var sub = snap.val();
        var safe = function(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''; };
        var linkHtml = '';
        if (sub.answerLink) {
            try {
                var url = new URL(sub.answerLink);
                if (['https:', 'http:'].includes(url.protocol)) {
                    linkHtml = '<a href="' + safe(sub.answerLink) + '" target="_blank" rel="noopener noreferrer" style="color:var(--main); word-break:break-all;">' + safe(sub.answerLink) + '</a>';
                }
            } catch(e) {}
        }

        var modal = document.getElementById('viewSubmissionModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'viewSubmissionModal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999; align-items:center; justify-content:center; padding:20px;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = '<div style="background:var(--card-bg); border-radius:25px; max-width:550px; width:100%; padding:30px; max-height:90vh; overflow-y:auto;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><h3 style="margin:0; color:var(--success);"><i class="fas fa-check-circle" style="margin-left:10px;"></i>تم التسليم</h3><button id="closeViewSubmissionBtn" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--text-secondary);">&#215;</button></div><p style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:20px;">تاريخ التسليم: ' + safe(sub.submittedAt) + '</p>' + (sub.answerText ? '<div style="margin-bottom:15px;"><h4 style="color:var(--text-primary); margin-bottom:8px;">الإجابة:</h4><div style="background:var(--hover-bg); padding:15px; border-radius:12px; color:var(--text-primary); line-height:1.7;">' + safe(sub.answerText) + '</div></div>' : '') + (linkHtml ? '<div><h4 style="color:var(--text-primary); margin-bottom:8px;">الرابط:</h4><div style="background:var(--hover-bg); padding:15px; border-radius:12px;">' + linkHtml + '</div></div>' : '') + '</div>';
        // ✅ إصلاح: استخدام addEventListener
        var closeBtn = document.getElementById('closeViewSubmissionBtn');
        if (closeBtn) closeBtn.addEventListener('click', function() { modal.style.display = 'none'; });
        modal.style.display = 'flex';

    } catch (error) {
        console.error('Error viewing submission:', error);
        window.showToast && window.showToast('❌ حدث خطأ في عرض التسليم', 'error');
    }
};

// ============ إغلاق نافذة الواجب ============
window.closeAssignmentOverlay = function() {
    var overlay = document.getElementById('assignmentOverlay');
    var container = document.getElementById('assignmentContainer');
    if (overlay) overlay.style.display = 'none';
    if (container) container.innerHTML = '';
};
