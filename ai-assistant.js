// ============================================================
// AI ASSISTANT - مساعد منى أكاديمي
// ⚙️ الإعدادات - عدّل القيم دي بس
// ============================================================
const AI_CONFIG = {
    // 🔑 API Key من console.anthropic.com
    // احفظه في Firebase هكذا: settings/anthropicApiKey
    // أو حطه هنا مباشرة (مش مثالي للأمان)
    apiKeyFirebasePath: 'settings/anthropicApiKey',


    // 📞 رقم واتساب المدرسة (مع كود الدولة بدون +)
    teacherWhatsapp: "201128874885",

    // 💬 رابط جروب الواتساب
    whatsappGroupLink: 'https://chat.whatsapp.com/LGRHUx0HcSVK1HhfUCw0yp?mode=gi_t',

    // 📚 اسم المادة
    subjectName: 'اللغة الإنجليزية',

    // 👩‍🏫 اسم المدرسة
    teacherName: 'Ms. Mona Kamel',
};

// ============================================================
// النظام - لا تعدل أي حاجة تحت الخط ده
// ============================================================

const SYSTEM_PROMPT = `أنت مساعد ذكي لمنصة "${AI_CONFIG.teacherName} Academy" التعليمية لمادة ${AI_CONFIG.subjectName}.

قواعدك الأساسية:
1. 📚 لو الطالب سألك سؤالاً من امتحان أو واجب: اشرح له المفهوم والفكرة فقط، لا تعطِ الإجابة المباشرة أبداً. قل له "هأساعدك تفهم الفكرة بس مش هديك الإجابة" ثم اشرح.
2. 🌐 لو سألك عن الموقع أو كيفية الاستخدام: اشرح له خطوة بخطوة.
3. 🔧 لو محتاج دعم فني مباشر: قل له "اضغط على زر الدعم الفني المباشر أسفل الشات".
4. 📞 لو عايز يتواصل مع المدرسة: قل له "اضغط على زر التواصل مع المدرسة".
5. 🤝 كن ودوداً ومشجعاً دايماً، تكلم بالعربي.
6. ❌ لا تجاوب على أي سؤال خارج نطاق المنصة أو المادة.

معلومات عن الموقع:
- منصة تعليمية بتحتوي على فيديوهات شرح وامتحانات تفاعلية وواجبات
- الطالب لازم يسجل دخول ويشترك في الكورس عشان يشوف المحتوى
- كود الطالب (10 أرقام) هو اللي بيستخدمه للاشتراك في الكورسات
- في نظام شارات ونقاط بيكافئ الطلاب على التقدم
- في بروفايل شخصي بيعرض الإحصائيات والشارات والامتحانات`;

// ============================================================
// إنشاء الشات
// ============================================================
(function () {
    let isOpen = false;
    let messages = [];
    let apiKey = null;
    let isLoading = false;

    // ---- جلب الـ API Key من Firebase ----
    async function getApiKey() {
        if (apiKey) return apiKey;
        try {
            if (window.db && window.ref && window.get) {
                const snap = await window.get(window.ref(window.db, AI_CONFIG.apiKeyFirebasePath));
                if (snap.exists() && snap.val()) {
                    apiKey = snap.val();
                    return apiKey;
                }
            }
        } catch (e) { console.error('AI: Error getting API key', e); }
        return null;
    }

    // ---- إرسال رسالة للـ API ----
    async function sendToAI(userMessage) {
        const key = await getApiKey();
        if (!key) {
            return '❌ المساعد غير متاح حالياً. تواصل مع الدعم الفني.';
        }

        // إضافة الرسالة للتاريخ
        messages.push({ role: 'user', content: userMessage });

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': key,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-calls': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: 800,
                    system: SYSTEM_PROMPT,
                    messages: messages.slice(-10) // آخر 10 رسائل فقط لتوفير التكلفة
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                console.error('AI API error:', err);
                return '❌ حدث خطأ في الاتصال. حاول مرة أخرى.';
            }

            const data = await response.json();
            const reply = data.content?.[0]?.text || '❌ لم أفهم، حاول مرة أخرى.';
            messages.push({ role: 'assistant', content: reply });
            return reply;

        } catch (e) {
            console.error('AI fetch error:', e);
            // أزل الرسالة الفاشلة من التاريخ
            messages.pop();
            return '❌ تعذر الاتصال. تحقق من الإنترنت وحاول مرة أخرى.';
        }
    }

    // ---- بناء الـ UI ----
    function buildUI() {
        const style = document.createElement('style');
        style.textContent = `
            #aiChatBtn {
                position: fixed;
                bottom: 25px;
                left: 25px;
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #6c5ce7, #4834d4);
                border-radius: 50%;
                border: none;
                cursor: pointer;
                z-index: 99998;
                box-shadow: 0 8px 25px rgba(108,92,231,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.6rem;
                color: white;
                transition: all 0.3s ease;
                animation: pulse-ai 2.5s ease-in-out infinite;
            }
            @keyframes pulse-ai {
                0%, 100% { box-shadow: 0 8px 25px rgba(108,92,231,0.5); }
                50% { box-shadow: 0 8px 35px rgba(108,92,231,0.85), 0 0 0 10px rgba(108,92,231,0.1); }
            }
            #aiChatBtn:hover { transform: scale(1.1); animation: none; }
            #aiChatBtn .ai-notif {
                position: absolute;
                top: -4px;
                right: -4px;
                width: 18px;
                height: 18px;
                background: #ff7675;
                border-radius: 50%;
                border: 2px solid white;
                font-size: 0.6rem;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
            }
            #aiChatWindow {
                position: fixed;
                bottom: 100px;
                left: 25px;
                width: 360px;
                max-width: calc(100vw - 40px);
                height: 520px;
                max-height: calc(100vh - 140px);
                background: var(--card-bg, #fff);
                border-radius: 25px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.2);
                z-index: 99997;
                display: none;
                flex-direction: column;
                overflow: hidden;
                animation: slideUpChat 0.35s cubic-bezier(0.34,1.56,0.64,1);
                border: 1px solid rgba(108,92,231,0.15);
            }
            @keyframes slideUpChat {
                from { opacity:0; transform: translateY(20px) scale(0.95); }
                to { opacity:1; transform: translateY(0) scale(1); }
            }
            #aiChatWindow.open { display: flex; }
            .ai-header {
                background: linear-gradient(135deg, #6c5ce7, #4834d4);
                padding: 16px 20px;
                display: flex;
                align-items: center;
                gap: 12px;
                flex-shrink: 0;
            }
            .ai-avatar {
                width: 42px;
                height: 42px;
                background: rgba(255,255,255,0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.3rem;
                flex-shrink: 0;
            }
            .ai-header-info { flex: 1; }
            .ai-header-info h4 { margin: 0; color: white; font-size: 0.95rem; font-weight: 700; }
            .ai-header-info p { margin: 0; color: rgba(255,255,255,0.75); font-size: 0.72rem; }
            .ai-status-dot {
                width: 8px; height: 8px;
                background: #00b894;
                border-radius: 50%;
                display: inline-block;
                margin-left: 5px;
                animation: blink 1.5s ease-in-out infinite;
            }
            @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
            .ai-close-btn {
                background: rgba(255,255,255,0.15);
                border: none;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 1rem;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
                flex-shrink: 0;
            }
            .ai-close-btn:hover { background: rgba(255,255,255,0.3); }
            .ai-messages {
                flex: 1;
                overflow-y: auto;
                padding: 15px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                scroll-behavior: smooth;
            }
            .ai-messages::-webkit-scrollbar { width: 4px; }
            .ai-messages::-webkit-scrollbar-thumb { background: rgba(108,92,231,0.3); border-radius: 4px; }
            .ai-msg {
                display: flex;
                gap: 8px;
                align-items: flex-end;
                animation: msgIn 0.25s ease;
            }
            @keyframes msgIn { from{opacity:0; transform:translateY(8px)} to{opacity:1; transform:none} }
            .ai-msg.user { flex-direction: row-reverse; }
            .ai-msg-bubble {
                max-width: 82%;
                padding: 10px 14px;
                border-radius: 18px;
                font-size: 0.88rem;
                line-height: 1.6;
                word-break: break-word;
            }
            .ai-msg.bot .ai-msg-bubble {
                background: var(--hover-bg, #f0eeff);
                color: var(--text-primary, #333);
                border-bottom-right-radius: 4px;
            }
            .ai-msg.user .ai-msg-bubble {
                background: linear-gradient(135deg, #6c5ce7, #4834d4);
                color: white;
                border-bottom-left-radius: 4px;
            }
            .ai-msg-icon {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.85rem;
                flex-shrink: 0;
                background: linear-gradient(135deg, #6c5ce7, #4834d4);
                color: white;
            }
            .ai-msg.user .ai-msg-icon {
                background: #dfe6e9;
                color: #636e72;
            }
            .ai-typing {
                display: flex;
                gap: 5px;
                padding: 12px 16px;
                background: var(--hover-bg, #f0eeff);
                border-radius: 18px;
                border-bottom-right-radius: 4px;
                width: fit-content;
            }
            .ai-typing span {
                width: 7px; height: 7px;
                background: #6c5ce7;
                border-radius: 50%;
                animation: typing 1.2s ease-in-out infinite;
            }
            .ai-typing span:nth-child(2) { animation-delay: 0.2s; }
            .ai-typing span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes typing { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
            .ai-quick-btns {
                padding: 10px 15px 0;
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                flex-shrink: 0;
            }
            .ai-quick-btn {
                background: var(--hover-bg, #f0eeff);
                border: 1px solid rgba(108,92,231,0.2);
                color: var(--main, #6c5ce7);
                padding: 6px 12px;
                border-radius: 50px;
                font-size: 0.75rem;
                cursor: pointer;
                font-family: 'Cairo', sans-serif;
                transition: all 0.2s;
                white-space: nowrap;
            }
            .ai-quick-btn:hover { background: #6c5ce7; color: white; }
            .ai-action-btns {
                padding: 8px 15px 0;
                display: flex;
                gap: 8px;
                flex-shrink: 0;
            }
            .ai-action-btn {
                flex: 1;
                padding: 8px 10px;
                border-radius: 12px;
                border: none;
                cursor: pointer;
                font-family: 'Cairo', sans-serif;
                font-size: 0.75rem;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                transition: all 0.2s;
                text-decoration: none;
            }
            .ai-action-btn.whatsapp { background: #25d366; color: white; }
            .ai-action-btn.teacher { background: #0088cc; color: white; }
            .ai-action-btn:hover { opacity: 0.85; transform: translateY(-1px); }
            .ai-input-area {
                padding: 12px 15px;
                display: flex;
                gap: 8px;
                align-items: flex-end;
                border-top: 1px solid var(--border-color, #eee);
                flex-shrink: 0;
            }
            #aiInput {
                flex: 1;
                border: 2px solid var(--border-color, #eee);
                border-radius: 15px;
                padding: 10px 14px;
                font-family: 'Cairo', sans-serif;
                font-size: 0.88rem;
                background: var(--card-bg, #fff);
                color: var(--text-primary, #333);
                resize: none;
                outline: none;
                max-height: 90px;
                transition: border-color 0.2s;
            }
            #aiInput:focus { border-color: #6c5ce7; }
            #aiSendBtn {
                width: 42px;
                height: 42px;
                background: linear-gradient(135deg, #6c5ce7, #4834d4);
                border: none;
                border-radius: 50%;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1rem;
                transition: all 0.2s;
                flex-shrink: 0;
            }
            #aiSendBtn:hover { transform: scale(1.08); }
            #aiSendBtn:disabled { opacity: 0.5; cursor: not-allowed; }
            body.dark-mode #aiChatWindow {
                border-color: rgba(162,155,254,0.2);
            }
            body.dark-mode .ai-msg.bot .ai-msg-bubble {
                background: #3a3b3e;
                color: #e9e9e9;
            }
            body.dark-mode .ai-quick-btn {
                background: #3a3b3e;
                color: #a29bfe;
                border-color: rgba(162,155,254,0.3);
            }
            body.dark-mode .ai-typing {
                background: #3a3b3e;
            }
            body.dark-mode #aiInput {
                background: #2c2d30;
                color: #e9e9e9;
                border-color: #3a3b3e;
            }
            @media (max-width: 420px) {
                #aiChatWindow { left: 10px; right: 10px; width: auto; bottom: 90px; }
                #aiChatBtn { left: 15px; bottom: 20px; }
            }
        `;
        document.head.appendChild(style);

        // زر الفتح
        const btn = document.createElement('button');
        btn.id = 'aiChatBtn';
        btn.innerHTML = '🤖<span class="ai-notif" id="aiNotif" style="display:none">1</span>';
        btn.title = 'المساعد الذكي';
        btn.onclick = toggleChat;
        document.body.appendChild(btn);

        // نافذة الشات
        const win = document.createElement('div');
        win.id = 'aiChatWindow';
        win.innerHTML = `
            <div class="ai-header">
                <div class="ai-avatar">🤖</div>
                <div class="ai-header-info">
                    <h4>مساعد ${AI_CONFIG.teacherName}</h4>
                    <p><span class="ai-status-dot"></span> متاح الآن - اسألني أي حاجة</p>
                </div>
                <button class="ai-close-btn" onclick="document.getElementById('aiChatBtn').click()">✕</button>
            </div>
            <div class="ai-messages" id="aiMessages"></div>
            <div class="ai-quick-btns" id="aiQuickBtns">
                <button class="ai-quick-btn" onclick="aiQuickSend('كيف أشترك في كورس؟')">🔓 كيف أشترك؟</button>
                <button class="ai-quick-btn" onclick="aiQuickSend('أين أجد كودي؟')">🆔 أين كودي؟</button>
                <button class="ai-quick-btn" onclick="aiQuickSend('كيف أحل الامتحان؟')">📝 كيف أذاكر؟</button>
            </div>
            <div class="ai-action-btns">
                <a class="ai-action-btn whatsapp" href="${AI_CONFIG.whatsappGroupLink}" target="_blank" rel="noopener noreferrer">
                    <i class="fab fa-whatsapp"></i> جروب الدعم
                </a>
                <a class="ai-action-btn teacher" href="https://wa.me/${AI_CONFIG.teacherWhatsapp}" target="_blank" rel="noopener noreferrer">
                    <i class="fas fa-chalkboard-teacher"></i> المدرسة
                </a>
            </div>
            <div class="ai-input-area">
                <textarea id="aiInput" placeholder="اكتب سؤالك هنا..." rows="1"></textarea>
                <button id="aiSendBtn" onclick="aiSend()"><i class="fas fa-paper-plane"></i></button>
            </div>
        `;
        document.body.appendChild(win);

        // رسالة ترحيب
        addMessage('bot', `أهلاً بيك! 👋 أنا المساعد الذكي لـ **${AI_CONFIG.teacherName} Academy**.\n\nأقدر أساعدك في:\n• 📚 شرح دروس ${AI_CONFIG.subjectName} (بدون إجابات الامتحانات 😉)\n• 🌐 استخدام الموقع\n• 🔧 حل مشاكل تقنية\n\nاسألني أي حاجة!`);

        // إعداد الـ input
        const input = document.getElementById('aiInput');
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aiSend(); }
        });
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 90) + 'px';
        });

        // إظهار النوتيفيكيشن بعد 3 ثواني
        setTimeout(() => {
            const notif = document.getElementById('aiNotif');
            if (notif && !isOpen) notif.style.display = 'flex';
        }, 3000);
    }

    function toggleChat() {
        isOpen = !isOpen;
        const win = document.getElementById('aiChatWindow');
        const btn = document.getElementById('aiChatBtn');
        const notif = document.getElementById('aiNotif');
        if (isOpen) {
            win.classList.add('open');
            btn.innerHTML = '✕<span class="ai-notif" id="aiNotif" style="display:none"></span>';
            if (notif) notif.style.display = 'none';
            setTimeout(() => document.getElementById('aiInput')?.focus(), 300);
            scrollToBottom();
        } else {
            win.classList.remove('open');
            btn.innerHTML = '🤖<span class="ai-notif" id="aiNotif" style="display:none"></span>';
        }
    }

    function addMessage(role, text) {
        const container = document.getElementById('aiMessages');
        if (!container) return;
        const div = document.createElement('div');
        div.className = `ai-msg ${role}`;
        const icon = role === 'bot' ? '🤖' : '<i class="fas fa-user"></i>';
        const formatted = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/•/g, '•');
        div.innerHTML = `
            <div class="ai-msg-icon">${icon}</div>
            <div class="ai-msg-bubble">${formatted}</div>
        `;
        container.appendChild(div);
        scrollToBottom();
    }

    function showTyping() {
        const container = document.getElementById('aiMessages');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'ai-msg bot';
        div.id = 'aiTyping';
        div.innerHTML = `<div class="ai-msg-icon">🤖</div><div class="ai-typing"><span></span><span></span><span></span></div>`;
        container.appendChild(div);
        scrollToBottom();
    }

    function hideTyping() {
        document.getElementById('aiTyping')?.remove();
    }

    function scrollToBottom() {
        const container = document.getElementById('aiMessages');
        if (container) setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
    }

    window.aiQuickSend = function(text) {
        const input = document.getElementById('aiInput');
        if (input) { input.value = text; aiSend(); }
        // إخفاء الأزرار السريعة بعد أول استخدام
        const quickBtns = document.getElementById('aiQuickBtns');
        if (quickBtns) quickBtns.style.display = 'none';
    };

    window.aiSend = async function() {
        if (isLoading) return;
        const input = document.getElementById('aiInput');
        const sendBtn = document.getElementById('aiSendBtn');
        if (!input) return;

        const text = input.value.trim();
        if (!text) return;

        // إخفاء الأزرار السريعة
        const quickBtns = document.getElementById('aiQuickBtns');
        if (quickBtns) quickBtns.style.display = 'none';

        input.value = '';
        input.style.height = 'auto';
        isLoading = true;
        if (sendBtn) sendBtn.disabled = true;

        addMessage('user', text);
        showTyping();

        const reply = await sendToAI(text);
        hideTyping();
        addMessage('bot', reply);

        isLoading = false;
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
    };

    // تشغيل بعد تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildUI);
    } else {
        buildUI();
    }
})();
