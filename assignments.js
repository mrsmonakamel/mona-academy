// assignments.js
// نظام الواجبات المنزلية

// دالة عرض الواجبات في صفحة الكورس
window.loadAssignments = async function(courseId, hasAccess) {
    // مش هنكتبها دلوقتي عشان نركز على الأساسيات
};

// دالة عرض صفحة واجب معين
window.viewAssignment = async function(courseId, assignmentId) {
    // هنكتبها بعدين
};

// دالة تسليم الواجب
window.submitAssignment = async function(courseId, assignmentId) {
    // هنكتبها بعدين
};

// دالة إغلاق نافذة الواجب
window.closeAssignmentOverlay = function() {
    document.getElementById('assignmentOverlay').style.display = 'none';
    document.getElementById('assignmentContainer').innerHTML = '';
};