/**
 * SkilXP - Learning Platform Logic
 * Manages XP, Course Progress, and Level Locking using localStorage
 */

// --- User Management & Session ---
const USERS_KEY = 'skilxp_users';
const SESSION_KEY = 'skilxp_session';

/**
 * Initialize storage and handle session checks
 */
function initUser() {
    if (!localStorage.getItem(STORAGE_KEY)) {
        saveUserData({
            totalXP: 0,
            courses: {
                html: { completedLevels: [], unlockedLevels: [1], progress: 0 },
                css: { completedLevels: [], unlockedLevels: [1], progress: 0 }
            }
        });
    }

    if (!localStorage.getItem(USERS_KEY)) {
        localStorage.setItem(USERS_KEY, JSON.stringify([]));
    }

    checkLoginStatus();
    updateGlobalUI();
}

/**
 * Register a new user
 */
function registerUser(name, email, password) {
    const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];

    // Check if email already exists
    if (users.find(u => u.email === email)) {
        return false;
    }

    users.push({ name, email, password });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
}

/**
 * Log in a user
 */
function loginUser(email, password) {
    const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, email: user.email }));
        return true;
    }
    return false;
}

/**
 * Log out user
 */
function logoutUser() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
}

/**
 * Toggle mobile menu
 */
function toggleMenu() {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        navLinks.classList.toggle('active');
    }
}

/**
 * Switch exercise tabs on mobile
 */
function switchTab(tabName) {
    const panels = {
        'learn': document.getElementById('learn-panel'),
        'code': document.getElementById('editor-panel'),
        'output': document.getElementById('preview-panel')
    };

    const tabs = document.querySelectorAll('.tab-btn');

    // Remove active class from all tabs
    tabs.forEach(tab => tab.classList.remove('active'));

    // Handle visibility of panels on mobile
    if (window.innerWidth <= 768) {
        Object.values(panels).forEach(panel => {
            if (panel) panel.style.display = 'none';
        });

        // Show selected panel
        if (panels[tabName]) {
            panels[tabName].style.display = 'flex';
        }
    }

    // Add active class to selected tab button
    const activeTabButton = Array.from(tabs).find(t => t.textContent.toLowerCase() === tabName);
    if (activeTabButton) activeTabButton.classList.add('active');

    // Auto-run code if switching to output
    if (tabName === 'output') {
        runCode();
    }
}

/**
 * Check if user is logged in
 */
function checkLoginStatus() {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    const currentPage = window.location.pathname.split('/').pop();
    const isAuthPage = currentPage === 'login.html' || currentPage === 'signup.html';

    if (!session && !isAuthPage && currentPage !== '') {
        // Redirect to login if sensitive page is accessed
        // Allow index.html to be seen but maybe restricted later
        // window.location.href = 'login.html'; 
    }

    return session;
}

const STORAGE_KEY = 'skilxp_user_data';

// Initial state for new users
const defaultData = {
    totalXP: 0,
    courses: {
        html: {
            completedLevels: [], // Array of level IDs
            unlockedLevels: [1], // Level 1 is always unlocked
            progress: 0
        },
        css: {
            completedLevels: [],
            unlockedLevels: [1],
            progress: 0
        }
    }
};

/**
 * Load user data from localStorage or initialize if it doesn't exist
 */
function getUserData() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : defaultData;
}

/**
 * Save current user data to localStorage
 */
function saveUserData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Update global XP counters and nav UI
 */
function updateGlobalUI() {
    const data = getUserData();
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));

    // Update XP displays
    const xpDisplays = document.querySelectorAll('.total-xp');
    xpDisplays.forEach(el => el.textContent = `${data.totalXP} XP`);

    // Update Nav for Session
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        if (session) {
            navLinks.innerHTML = `
                <a href="index.html">Courses</a>
                <a href="dashboard.html">Dashboard</a>
                <div class="user-profile">
                    <span>${session.name}</span>
                    <button onclick="logoutUser()" class="btn-logout">Logout</button>
                </div>
                <span class="xp-badge total-xp">${data.totalXP} XP</span>
            `;
        } else {
            navLinks.innerHTML = `
                <a href="index.html">Courses</a>
                <a href="dashboard.html">Dashboard</a>
                <a href="login.html">Login</a>
                <a href="signup.html" class="btn primary" style="color: white; padding: 0.5rem 1rem;">Register</a>
            `;
        }
    }

    // Update course progress bars (if they exist)
    ['html', 'css'].forEach(courseId => {
        const progressBar = document.getElementById(`${courseId}-progress-bar`);
        const percentageText = document.getElementById(`${courseId}-progress-text`);
        const progress = data.courses[courseId].progress;

        if (progressBar) progressBar.style.width = `${progress}%`;
        if (percentageText) percentageText.textContent = `${progress}%`;

        // Handle completion badge visibility
        const progressItem = document.getElementById(`${courseId}-progress-item`);
        if (progressItem) {
            if (progress === 100) {
                progressItem.classList.add('is-completed');
            } else {
                progressItem.classList.remove('is-completed');
            }
        }
    });
}

/**
 * Complete a level, grant XP, and unlock next level
 * @param {string} courseId - 'html' or 'css'
 * @param {number} levelId - ID of the level
 * @param {number} xpReward - XP to grant (default 10)
 */
function completeLevel(courseId, levelId, xpReward = 10) {
    let data = getUserData();
    const course = data.courses[courseId];
    const totalLevels = Object.keys(exerciseData[courseId]).length;

    // Check if already completed to prevent duplicate XP
    const isFirstTime = !course.completedLevels.includes(levelId);

    if (isFirstTime) {
        course.completedLevels.push(levelId);
        data.totalXP += xpReward;

        // Unlock next level
        const nextLevel = levelId + 1;
        if (nextLevel <= totalLevels && !course.unlockedLevels.includes(nextLevel)) {
            course.unlockedLevels.push(nextLevel);
        }

        // Calculate progress percentage
        course.progress = Math.round((course.completedLevels.length / totalLevels) * 100);

        alert(`🎉 Level ${levelId} Completed! +${xpReward} XP`);
    } else {
        alert(`🎉 Level ${levelId} Completed again! (No extra XP)`);
    }

    saveUserData(data);
    updateGlobalUI();

    // Redirect or update local UI
    location.reload();
}


// --- Exercise Data ---
const exerciseData = {
    html: {
        1: {
            title: "01. Shooting Star",
            description: "HTML is the backbone of the web. Let's start with a heading.",
            instructions: "Create an <code>&lt;h1&gt;</code> tag with the text 'Shooting Star'.",
            example: "&lt;h1&gt;My Title&lt;/h1&gt;",
            hint: "Try typing: &lt;h1&gt;Shooting Star&lt;/h1&gt;",
            initialCode: "<!-- Write code below 💙 -->\n",
            solution: /<h1>\s*Shooting Star\s*<\/h1>/i,
            xp: 10
        },
        2: {
            title: "02. Elemental",
            description: "Headings go from h1 to h6. h2 is for subheadings.",
            instructions: "Create an <code>&lt;h2&gt;</code> tag with the text 'Elemental'.",
            example: "&lt;h2&gt;Subtitle&lt;/h2&gt;",
            hint: "Use the h2 tag for this exercise.",
            initialCode: "<!-- Write code below 💙 -->\n",
            solution: /<h2>\s*Elemental\s*<\/h2>/i,
            xp: 10
        },
        3: {
            title: "03. Newspaper",
            description: "Paragraphs are used for blocks of text.",
            instructions: "Create a <code>&lt;p&gt;</code> tag with the text 'Extra! Extra! Read all about it!'.",
            example: "&lt;p&gt;This is a paragraph.&lt;/p&gt;",
            hint: "Paragraphs use the p tag.",
            initialCode: "<!-- Write code below 💙 -->\n",
            solution: /<p>\s*Extra! Extra! Read all about it!\s*<\/p>/i,
            xp: 10
        },
        4: {
            title: "04. Corporate Talk",
            description: "HTML offers tags for text formatting like <b>bold</b> and <i>italic</i>.",
            instructions: "Wrap 'Important' in a <code>&lt;b&gt;</code> tag and 'ASAP' in an <code>&lt;i&gt;</code> tag.",
            example: "&lt;b&gt;Bold&lt;/b&gt; &lt;i&gt;Italic&lt;/i&gt;",
            hint: "Apply tags around the specific words.",
            initialCode: "<!-- Write code below 💙 -->\n",
            solution: /<b>\s*Important\s*<\/b>.*<i>\s*ASAP\s*<\/i>/i,
            xp: 10
        },
        5: {
            title: "05. Sous-Chef",
            description: "Lists are great for steps and ingredients.",
            instructions: "Create an unordered list <code>&lt;ul&gt;</code> with two list items <code>&lt;li&gt;</code>: 'Salt' and 'Pepper'.",
            example: "&lt;ul&gt;&lt;li&gt;Item&lt;/li&gt;&lt;/ul&gt;",
            hint: "Use ul for the list and li for items.",
            initialCode: "<!-- Write code below 💙 -->\n",
            solution: /<ul>\s*<li>\s*Salt\s*<\/li>\s*<li>\s*Pepper\s*<\/li>\s*<\/ul>/i,
            xp: 15
        },
        6: {
            title: "06. Lost Pet",
            description: "Images help people find things.",
            instructions: "Add an <code>&lt;img&gt;</code> tag with <code>src='pet.jpg'</code>.",
            example: "&lt;img src='url'&gt;",
            hint: "The img tag doesn't need a closing tag.",
            initialCode: "<!-- Write code below 💙 -->\n",
            solution: /<img\s+src=['"]pet\.jpg['"]\s*\/?>/i,
            xp: 15
        },
        7: {
            title: "07. Favorite Band",
            description: "Links connect the web together.",
            instructions: "Create a link <code>&lt;a&gt;</code> to 'https://music.com' with the text 'Listen Now'.",
            example: "&lt;a href='url'&gt;Text&lt;/a&gt;",
            hint: "Use the href attribute for the URL.",
            initialCode: "<!-- Write code below 💙 -->\n",
            solution: /<a\s+href=['"]https:\/\/music\.com['"]\s*>\s*Listen Now\s*<\/a>/i,
            xp: 20
        }
    },
    css: {
        1: {
            title: "01. Picasso",
            description: "CSS selectors allow you to target HTML elements. Let's start with the basic tag selector.",
            instructions: "Change the <code>background-color</code> of the <code>&lt;div&gt;</code> to <code>yellow</code>.",
            example: "div { background-color: yellow; }",
            hint: "Select the 'div' element and use the background-color property.",
            initialCode: "<!-- Write code below 💙 -->\n",
            solution: /div\s*{\s*background-color\s*:\s*yellow\s*;?\s*}/i,
            xp: 10
        },
        2: {
            title: "02. Syntax",
            description: "CSS syntax consists of a selector and a declaration block.",
            instructions: "Make the <code>h1</code> text <code>center</code> aligned using <code>text-align</code>.",
            example: "h1 { text-align: center; }",
            hint: "Use the text-align property on the h1 selector.",
            initialCode: "<!-- Write code below 💙 -->\n",
            solution: /h1\s*{\s*text-align\s*:\s*center\s*;?\s*}/i,
            xp: 10
        },
        3: {
            title: "03. Selectors Pt. 1",
            description: "Class selectors target elements with a specific class attribute.",
            instructions: "Target the class <code>.highlight</code> and set its <code>color</code> to <code>green</code>.",
            example: ".my-class { color: blue; }",
            hint: "Don't forget the dot (.) before the class name in your selector.",
            initialCode: "<!-- Write code below 💙 -->\n",
            solution: /\.highlight\s*{\s*color\s*:\s*green\s*;?\s*}/i,
            xp: 15
        },
        4: {
            title: "04. Selectors Pt. 2",
            description: "ID selectors target a single element with a unique ID.",
            instructions: "Target the ID <code>#main-title</code> and set its <code>font-size</code> to <code>40px</code>.",
            example: "#my-id { font-size: 20px; }",
            hint: "Use the hash (#) symbol for ID selectors.",
            initialCode: "<!-- Write code below 💙 -->\n",
            solution: /#main-title\s*{\s*font-size\s*:\s*40px\s*;?\s*}/i,
            xp: 15
        },
        5: {
            title: "05. Concert Flyer",
            description: "Combining multiple properties to create a design.",
            instructions: "Set the <code>.flyer</code> to have <code>color: white</code>, <code>background: black</code>, and <code>padding: 20px</code>.",
            example: ".box { color: red; background: blue; padding: 10px; }",
            hint: "You can add multiple declarations inside the curly braces.",
            initialCode: "<!-- Write code below 💙 -->\n",
            solution: /\.flyer\s*{\s*(?=.*color\s*:\s*white)(?=.*background\s*:\s*black)(?=.*padding\s*:\s*20px)/i,
            xp: 20
        }
    }
};

// --- Exercise Page Logic ---

/**
 * Execute user code and update the preview iframe
 */
function runCode() {
    const code = document.getElementById('code-editor').value;
    const previewFrame = document.getElementById('preview-frame');
    const previewDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;

    // Dark theme styles to inject into the preview iframe
    const darkStyles = `
        <style>
            body { 
                background-color: #0f172a; 
                color: #f8fafc; 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                padding: 1.5rem;
                margin: 0;
                line-height: 1.6;
            }
            h1, h2, h3, h4, h5, h6 { color: #38bdf8; margin-top: 0; margin-bottom: 1rem; }
            p { margin-bottom: 1rem; color: #cbd5e1; }
            a { color: #6366f1; text-decoration: underline; }
            ul, ol { margin-bottom: 1rem; padding-left: 1.5rem; }
            li { margin-bottom: 0.5rem; }
            code { background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #38bdf8; font-family: monospace; }
        </style>
    `;

    previewDoc.open();
    previewDoc.write(darkStyles + code);
    previewDoc.close();
}

/**
 * Check if user code matches the solution
 */
function checkAnswer(courseId, levelId) {
    const code = document.getElementById('code-editor').value;
    const exercise = exerciseData[courseId][levelId];

    if (exercise.solution.test(code)) {
        document.getElementById('feedback').innerHTML = "<span style='color: var(--success)'>✅ Correct! Moving to next...</span>";
        setTimeout(() => {
            completeLevel(courseId, parseInt(levelId), exercise.xp);
        }, 1500);
    } else {
        document.getElementById('feedback').innerHTML = "<span style='color: #ef4444'>❌ Not quite right. Try again!</span>";
    }
}

/**
 * Toggle hint visibility
 */
function toggleHint() {
    const hintText = document.getElementById('hint-text');
    hintText.style.display = hintText.style.display === 'none' ? 'block' : 'none';
}

/**
 * Load specific exercise into the page
 */
function loadExercise() {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('course');
    const levelId = urlParams.get('level');

    if (!courseId || !levelId || !exerciseData[courseId] || !exerciseData[courseId][levelId]) {
        console.warn("Exercise not found or incomplete parameters");
        return;
    }

    const exercise = exerciseData[courseId][levelId];

    // Use optional chaining or null checks to prevent crashes
    const courseNameEl = document.getElementById('nav-course-name') || document.getElementById('course-name');
    if (courseNameEl) courseNameEl.textContent = `${courseId.toUpperCase()} COURSE`;

    const levelTitleEl = document.getElementById('level-title');
    if (levelTitleEl) levelTitleEl.textContent = exercise.title;

    const lessonDescEl = document.getElementById('lesson-desc');
    if (lessonDescEl) lessonDescEl.textContent = exercise.description;

    const exerciseInstrEl = document.getElementById('exercise-instr');
    if (exerciseInstrEl) exerciseInstrEl.innerHTML = exercise.instructions;

    const codeExampleEl = document.getElementById('code-example');
    if (codeExampleEl) codeExampleEl.innerHTML = exercise.example;

    const hintTextEl = document.getElementById('hint-text');
    if (hintTextEl) hintTextEl.innerHTML = exercise.hint;

    const codeEditorEl = document.getElementById('code-editor');
    if (codeEditorEl) codeEditorEl.value = exercise.initialCode;

    // Set up button handlers
    const runBtn = document.getElementById('run-btn');
    if (runBtn) runBtn.onclick = runCode;

    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) submitBtn.onclick = () => checkAnswer(courseId, levelId);

    // Initial run
    runCode();
}

// Export functions to window for HTML onclick attributes
window.logoutUser = logoutUser;
window.registerUser = registerUser;
window.loginUser = loginUser;
window.toggleMenu = toggleMenu;
window.switchTab = switchTab;
window.toggleHint = toggleHint;
window.runCode = runCode;

document.addEventListener('DOMContentLoaded', () => {
    initUser();

    if (window.location.pathname.includes('exercise.html')) {
        loadExercise();
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        const navLinks = document.querySelector('.nav-links');
        const menuToggle = document.querySelector('.menu-toggle');

        if (navLinks && navLinks.classList.contains('active') &&
            !navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
            navLinks.classList.remove('active');
        }
    });
});
