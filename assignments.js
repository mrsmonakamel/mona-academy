// assignments.js
// نظام الواجبات المنزلية

// ================ عرض الواجبات في صفحة الكورس ================
window.loadAssignments = async function(courseId, hasAccess) {
    const container = document.getElementById('assignmentsContainer');
    if (!container) return;

    if (!hasAccess) {
        container.innerHTML = '';
        return;
    }

    try {
        const snap = await window.get(window.child(window.dbRef, `assignments/${courseId}`));
        if (!snap.exists()) {
            container.innerHTML = '';
            return;
        }

        const assignments = [];
        snap.forEach(child => {
            assignments.push({ id: child.key, ...child.val() });
        });

        if (assignments.length === 0) {
            container.innerHTML = '';
            return;
        }

        // ترتيب حسب تاريخ التسليم
        assignments.sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });

        let html = `<h3 style="margin-bottom:15px; color:var(--main); border-bottom:2px solid var(--main); padding-bottom:8px;">
            <i class="fas fa-tasks"></i> الواجبات المنزلية
        </h3>`;

        const now = new Date();

        for (const a of assignments) {
            const dueDate = a.dueDate ? new Date(a.dueDate) : null;
            const isExpired = dueDate && dueDate < now;

            // هل قدّم الطالب الواجب؟
            let submissionStatus = '';
            if (window.currentUser) {
                const subSnap = await window.get(window.child(window.dbRef,
                    `assignmentSubmissions/${courseId}/${a.id}/${window.currentUser.uid}`));
                if (subSnap.exists()) {
                    submissionStatus = `<span style="color:#00b894; font-weight:bold;">
                        <i class="fas fa-check-circle"></i> تم التسليم
                    </span>`;
                } else if (isExpired) {
                    submissionStatus = `<span style="color:#d63031; font-weight:bold;">
                        <i class="fas fa-times-circle"></i> فات الميعاد
                    </span>`;
                } else {
                    submissionStatus = `<span style="color:#fdcb6e; font-weight:bold;">
                        <i class="fas fa-clock"></i> لم يُسلَّم بعد
                    </span>`;
                }
            }

            const dueDateStr = dueDate
                ? dueDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
                : 'غير محدد';

            html += `
                <div class="card" style="margin-bottom:12px; border-right: 4px solid ${isExpired ? '#d63031' : 'var(--main)'}; cursor:pointer;"
                     data-course-id="${window.escapeHTML(courseId)}" data-assignment-id="${window.escapeHTML(a.id)}"
                     onclick="window._openAssignment(this)">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                        <div>
                            <h4 style="margin:0; color:var(--main);">
                                <i class="fas fa-file-alt"></i> ${window.escapeHTML(a.title || 'واجب بدون عنوان')}
                            </h4>
                            ${a.description ? `<p style="margin:5px 0 0; color:#666; font-size:0.9rem;">${window.escapeHTML(a.description)}</p>` : ''}
                        </div>
                        <div style="text-align:left; min-width:130px;">
                            ${submissionStatus}
                            <div style="color:#888; font-size:0.8rem; margin-top:4px;">
                                <i class="fas fa-calendar-alt"></i> التسليم: ${dueDateStr}
                            </div>
                            ${a.totalPoints ? `<div style="color:#888; font-size:0.8rem;"><i class="fas fa-star"></i> الدرجة الكاملة: ${a.totalPoints}</div>` : ''}
                        </div>
                    </div>
                </div>`;
        }

        container.innerHTML = html;

    } catch (error) {
        console.error('❌ خطأ في تحميل الواجبات:', error);
        container.innerHTML = '';
    }
};

// handler آمن لبطاقات الواجبات
window._openAssignment = function(el) {
    const courseId = el.getAttribute('data-course-id');
    const assignmentId = el.getAttribute('data-assignment-id');
    if (courseId && assignmentId) window.viewAssignment(courseId, assignmentId);
};

// ================ عرض واجب معين في الـ Overlay ================
window.viewAssignment = async function(courseId, assignmentId) {
    if (!window.currentUser) {
        window.openLogin();
        return;
    }

    const overlay = document.getElementById('assignmentOverlay');
    const titleEl = document.getElementById('assignmentTitle');
    const container = document.getElementById('assignmentContainer');
    if (!overlay || !container) return;

    overlay.style.display = 'flex';
    container.innerHTML = `<div style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>`;

    try {
        const snap = await window.get(window.child(window.dbRef, `assignments/${courseId}/${assignmentId}`));
        if (!snap.exists()) {
            container.innerHTML = `<p class="empty-state">❌ الواجب غير موجود</p>`;
            return;
        }

        const assignment = snap.val();
        if (titleEl) titleEl.textContent = assignment.title || 'واجب';

        const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
        const isExpired = dueDate && dueDate < new Date();

        // هل قدّم الطالب بالفعل؟
        const subSnap = await window.get(window.child(window.dbRef,
            `assignmentSubmissions/${courseId}/${assignmentId}/${window.currentUser.uid}`));
        const alreadySubmitted = subSnap.exists();

        let html = '';

        if (assignment.description) {
            html += `<p style="margin-bottom:20px; color:#555;">${window.escapeHTML(assignment.description)}</p>`;
        }
        if (dueDate) {
            html += `<p style="color:${isExpired ? '#d63031' : '#00b894'}; margin-bottom:15px;">
                <i class="fas fa-calendar-alt"></i>
                <strong>موعد التسليم:</strong> ${dueDate.toLocaleDateString('ar-EG', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
                ${isExpired ? ' — <strong>انتهى الوقت</strong>' : ''}
            </p>`;
        }

        if (alreadySubmitted) {
            const sub = subSnap.val();
            html += `
                <div style="background:#d4edda; border:1px solid #c3e6cb; border-radius:12px; padding:20px; margin-bottom:20px; text-align:center;">
                    <i class="fas fa-check-circle fa-2x" style="color:#28a745;"></i>
                    <h4 style="color:#28a745; margin:10px 0 5px;">تم تسليم الواجب</h4>
                    <p style="color:#555; margin:0;">تاريخ التسليم: ${sub.submittedAt || 'غير محدد'}</p>
                    ${sub.grade != null ? `<p style="font-weight:bold; margin-top:8px;">الدرجة: ${sub.grade} / ${assignment.totalPoints || '—'}</p>` : ''}
                    ${sub.teacherNote ? `<p style="color:#555; margin-top:5px;">ملاحظة المعلم: ${window.escapeHTML(sub.teacherNote)}</p>` : ''}
                </div>`;

            if (assignment.questions && sub.answers) {
                html += `<hr><h4 style="margin:15px 0;">إجاباتك:</h4>`;
                html += buildQuestionsHTML(assignment.questions, sub.answers, true);
            }
        } else if (isExpired) {
            html += `
                <div style="background:#f8d7da; border:1px solid #f5c6cb; border-radius:12px; padding:20px; text-align:center;">
                    <i class="fas fa-lock fa-2x" style="color:#d63031;"></i>
                    <h4 style="color:#d63031; margin:10px 0 5px;">انتهى وقت التسليم</h4>
                    <p style="color:#555; margin:0;">لا يمكنك تسليم هذا الواجب بعد انتهاء الميعاد المحدد.</p>
                </div>`;
        } else {
            if (assignment.questions) {
                html += `<h4 style="margin-bottom:15px;">أسئلة الواجب:</h4>`;
                html += buildQuestionsHTML(assignment.questions, {}, false);
            }

            html += `
                <div style="margin-top:20px; text-align:center;">
                    <button type="button"
                        data-course-id="${window.escapeHTML(courseId)}" data-assignment-id="${window.escapeHTML(assignmentId)}"
                        onclick="window._submitAssignmentBtn(this)"
                        style="background:var(--main); color:white; border:none; padding:12px 40px; border-radius:50px; font-weight:bold; font-size:1rem; cursor:pointer;">
                        <i class="fas fa-paper-plane"></i> تسليم الواجب
                    </button>
                </div>`;
        }

        container.innerHTML = html;

    } catch (error) {
        console.error('❌ خطأ في تحميل الواجب:', error);
        container.innerHTML = `<p class="empty-state">❌ حدث خطأ أثناء التحميل</p>`;
    }
};

// ================ بناء HTML للأسئلة ================
function buildQuestionsHTML(questions, existingAnswers, readOnly) {
    let html = '';
    let qNum = 1;

    for (const [key, q] of Object.entries(questions)) {
        html += `<div class="card" style="margin-bottom:15px;">
            <p style="font-weight:bold; margin-bottom:10px;">${qNum}. ${window.escapeHTML(q.text || '')}</p>`;

        if (q.type === 'mcq') {
            const options = q.options || {};
            for (const [optKey, optVal] of Object.entries(options)) {
                const checked = existingAnswers[key] === optKey ? 'checked' : '';
                const disabledAttr = readOnly ? 'disabled' : '';
                html += `<label style="display:block; margin:5px 0; cursor:${readOnly ? 'default' : 'pointer'};">
                    <input type="radio" name="q_${key}" value="${window.escapeHTML(optKey)}" ${checked} ${disabledAttr}>
                    &nbsp;${window.escapeHTML(String(optVal))}
                </label>`;
            }
        } else if (q.type === 'tf') {
            const trueChecked = existingAnswers[key] === 'true' ? 'checked' : '';
            const falseChecked = existingAnswers[key] === 'false' ? 'checked' : '';
            const disabledAttr = readOnly ? 'disabled' : '';
            html += `
                <label style="display:inline-block; margin-left:15px; cursor:${readOnly ? 'default' : 'pointer'};">
                    <input type="radio" name="q_${key}" value="true" ${trueChecked} ${disabledAttr}> صح
                </label>
                <label style="display:inline-block; cursor:${readOnly ? 'default' : 'pointer'};">
                    <input type="radio" name="q_${key}" value="false" ${falseChecked} ${disabledAttr}> خطأ
                </label>`;
        } else if (q.type === 'essay') {
            const val = existingAnswers[key] || '';
            html += `<textarea name="q_${key}" class="reg-input" rows="4" placeholder="اكتب إجابتك هنا..." ${readOnly ? 'disabled' : ''}
                style="width:100%;">${window.escapeHTML(val)}</textarea>`;
        } else if (q.type === 'file') {
            if (readOnly) {
                html += `<p style="color:#666; font-size:0.9rem;"><i class="fas fa-file"></i> تم رفع ملف</p>`;
            } else {
                html += `<input type="file" name="q_${key}" class="reg-input">`;
            }
        }

        if (q.points) {
            html += `<small style="color:#888; display:block; margin-top:8px;">الدرجة: ${q.points}</small>`;
        }
        html += `</div>`;
        qNum++;
    }

    return html;
}

// handler آمن لزر تسليم الواجب
window._submitAssignmentBtn = function(btn) {
    const courseId = btn.getAttribute('data-course-id');
    const assignmentId = btn.getAttribute('data-assignment-id');
    if (courseId && assignmentId) window.submitAssignment(courseId, assignmentId);
};

// ================ تسليم الواجب ================
window.submitAssignment = async function(courseId, assignmentId) {
    if (!window.currentUser) {
        window.openLogin();
        return;
    }

    const container = document.getElementById('assignmentContainer');

    try {
        const assignmentSnap = await window.get(window.child(window.dbRef, `assignments/${courseId}/${assignmentId}`));
        if (!assignmentSnap.exists()) return;

        const assignment = assignmentSnap.val();
        const questions = assignment.questions || {};
        const answers = {};

        for (const key of Object.keys(questions)) {
            const q = questions[key];

            if (q.type === 'mcq' || q.type === 'tf') {
                const radio = container.querySelector(`input[name="q_${key}"]:checked`);
                answers[key] = radio ? radio.value : '';
            } else if (q.type === 'essay') {
                const textarea = container.querySelector(`textarea[name="q_${key}"]`);
                answers[key] = textarea ? textarea.value.trim() : '';
            } else if (q.type === 'file') {
                const fileInput = container.querySelector(`input[type="file"][name="q_${key}"]`);
                answers[key] = fileInput && fileInput.files.length > 0 ? fileInput.files[0].name : '';
            }
        }

        // التحقق من الإجابة على أسئلة الاختيار
        for (const [key, q] of Object.entries(questions)) {
            if ((q.type === 'mcq' || q.type === 'tf') && !answers[key]) {
                window.showToast('❌ يرجى الإجابة على جميع الأسئلة', 'error');
                return;
            }
        }

        const submitBtn = container.querySelector('button[data-course-id]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التسليم...';
        }

        const now = new Date();
        await window.set(
            window.ref(window.db, `assignmentSubmissions/${courseId}/${assignmentId}/${window.currentUser.uid}`),
            {
                answers,
                submittedAt: now.toLocaleDateString('ar-EG', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }),
                submittedAtISO: now.toISOString(),
                studentId: window.currentUser.uid
            }
        );

        window.showToast('✅ تم تسليم الواجب بنجاح', 'success');
        window.viewAssignment(courseId, assignmentId);

    } catch (error) {
        console.error('❌ خطأ في تسليم الواجب:', error);
        window.showToast('❌ حدث خطأ أثناء التسليم، حاول مرة أخرى', 'error');
    }
};

// ================ إغلاق نافذة الواجب ================
window.closeAssignmentOverlay = function() {
    const overlay = document.getElementById('assignmentOverlay');
    const container = document.getElementById('assignmentContainer');
    if (overlay) overlay.style.display = 'none';
    if (container) {
        // تنظيف المحتوى والمستمعين المحتملين (إصلاح #50)
        container.innerHTML = '';
    }
};