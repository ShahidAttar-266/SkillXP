/**
 * SkillXP - Learning Platform Logic
 * Manages XP, Course Progress, and Level Locking using localStorage
 */

// --- User Management & Session ---
const USERS_KEY = 'skillxp_users';
const SESSION_KEY = 'skillxp_session';

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

const STORAGE_KEY = 'skillxp_user_data';

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
            description: "HTML, or HyperText Markup Language, is the backbone of the web. It marks up every piece of content and defines its type. HTML creates the website skeleton, while CSS handles appearance and JavaScript adds interactivity.",
            instructions: "Type these two lines of code onto line 3:<br><code>&lt;h2&gt;Today's Date&lt;/h2&gt;</code><br><code>&lt;p&gt;My Wish&lt;/p&gt;</code><br>Replace the text with today's date and a wish!",
            example: "<h2>2026-02-25</h2>\n<p>I wish to be a dev!</p>",
            hint: "Try typing: <h2>...</h2> for a heading and <p>...</p> for a paragraph.",
            solution: "<h2>2026-02-25</h2>\n<p>I want to be a master developer!</p>",
            initialCode: "<!-- Write code below 💙 -->\n\n",
            requiredTags: ["h2", "p"],
            xp: 20
        },
        2: {
            title: "02. Elemental",
            description: "HTML elements are the building blocks, consisting of an opening tag, content, and a closing tag. Indentation makes your code easier to read. We recommend two spaces for nesting.",
            instructions: "Create an elemental.html structure that shows the four elements (Fire, Water, Earth, Air). Ensure it's indented nicely!",
            example: "<body>\n  <p>🔥 Fire</p>\n  <p>💧 Water</p>\n</body>",
            hint: "Use the <body> tag to wrap your paragraphs. Indent the <p> tags with two spaces.",
            solution: "<body>\n  <p>🔥 Fire</p>\n  <p>💧 Water</p>\n  <p>🌱 Earth</p>\n  <p>💨 Air</p>\n</body>",
            initialCode: "<!-- Write code below 💙 -->\n",
            requiredTags: ["body", "p"],
            xp: 20
        },
        3: {
            title: "03. Newspaper",
            description: "Headings (h1 to h6) define hierarchy, and <br> adds line breaks. Only one <h1> should be used per file. The break tag is a self-closing tag.",
            instructions: "Create a newspaper article blurb with:<br>- An h1-h3 heading element.<br>- A p paragraph element.<br>- A br line-break element.",
            example: "<h2>Breaking News</h2>\n<p>Florida man vs Alligator.<br>Alligator won.</p>",
            hint: "Use h1, h2, or h3 for the title. The <br> tag goes inside or between paragraphs.",
            solution: "<h3>Daily News</h3>\n<p>The sun rose again today.<br>More at 11.</p>",
            initialCode: "<!-- Write code below 💙 -->\n",
            requiredTags: ["h1|h2|h3", "p", "br"],
            xp: 20
        },
        4: {
            title: "04. Corporate Talk",
            description: "Text formatting tags like b (bold), i (italic), u (underline), and s (strikethrough) make text look fancy. Use them to emphasize specific parts of your content.",
            instructions: "Recreate the corporate jargon using p, b, i, s, and u tags. Make sure to use at least two different formatting tags.",
            example: "<p>We need to <b>double down</b> on <i>revenue</i>.</p>",
            hint: "Use tags like <b>Important</b> or <i>ASAP</i> around your text.",
            solution: "<p>We must <b>leverage</b> our <i>synergy</i> <u>immediately</u>.</p>",
            initialCode: "<!-- Write code below 💙 -->\n",
            requiredTags: ["p", "format:2"],
            xp: 20
        },
        5: {
            title: "05. Sous-Chef",
            description: "Lists manage data: <ul> is for unordered (bullet) lists, and <ol> is for ordered (numbered) lists. Each item is wrapped in an <li> tag.",
            instructions: "Create two lists for a recipe:<br>- An unordered list (ul) of ingredients.<br>- An ordered list (ol) of cooking instructions.",
            example: "<ul><li>Salt</li></ul>\n<ol><li>Cook</li></ol>",
            hint: "Remember to wrap your <li> items inside <ul> or <ol> tags.",
            solution: "<ul>\n  <li>Rice</li>\n  <li>Beans</li>\n</ul>\n<ol>\n  <li>Boil water</li>\n  <li>Add rice</li>\n</ol>",
            initialCode: "<!-- Write code below 💙 -->\n",
            requiredTags: ["ul", "ol", "li"],
            xp: 20
        },
        6: {
            title: "06. Lost Pet",
            description: "Links (a) connect the web, and images (img) add visuals. The anchor tag uses an href attribute, while the image tag uses a src attribute.",
            instructions: "Help find a lost pet with:<br>- The pet name.<br>- A pet pic (img).<br>- Contact info with a link (a).<br>- A short description (p).",
            example: "<h2>Buddy</h2>\n<img src='pet.jpg'>\n<p>Lost cat.</p>\n<a href='mailto:me@test.com'>Contact</a>",
            hint: "Use <img src='...'> for the picture and <a href='...'>Link</a> for contact info.",
            solution: "<h2>Max</h2>\n<img src='https://placedog.net/200'>\n<p>A very friendly golden retriever.</p>\n<a href='tel:123456789'>Call me!</a>",
            initialCode: "<!-- Write code below 💙 -->\n",
            requiredTags: ["img", "a", "p"],
            xp: 20
        },
        7: {
            title: "07. Favorite Band",
            description: "Put everything together! Layout a band page with all the elements you've learned. Use headings, images, lists, and formatting.",
            instructions: "Create a band page using:<br>- Name (h1/h2)<br>- Picture (img)<br>- Blurb<br>- Link (a)<br>- Members list (ul)<br>- Top 5 songs (ol)<br>- At least two types of text formatting.",
            example: "<h1>The Beatles</h1>\n<img src='...'>\n<ul><li>John</li></ul>\n<ol><li>Help</li></ol>\n<b>Rock</b> <i>Pop</i>",
            hint: "Combine h1/h2, img, a, ul, ol, and formatting tags like <b> or <i>.",
            solution: "<h1>Pink Floyd</h1>\n<img src='https://picsum.photos/200'>\n<p>Legendary <i>progressive</i> rock band.</p>\n<ul>\n  <li>Roger Waters</li>\n  <li>David Gilmour</li>\n</ul>\n<ol>\n  <li>Time</li>\n  <li>Money</li>\n</ol>\n<a href='#'>Website</a>",
            initialCode: "<!-- Write code below 💙 -->\n",
            requiredTags: ["h1|h2", "img", "a", "ul", "ol", "format:2"],
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
 * Validation logic based on required tags (simple string check)
 */
function validateHTML(code, requiredTags) {
    const cleanCode = code.toLowerCase();

    for (let tag of requiredTags) {
        // Handle OR logic (e.g., h1|h2|h3)
        if (tag.includes('|')) {
            const options = tag.split('|');
            const found = options.some(opt => cleanCode.includes('<' + opt));
            if (!found) return false;
        }
        // Handle format:N logic
        else if (tag.startsWith('format:')) {
            const count = parseInt(tag.split(':')[1]);
            const formattingTags = ['<b>', '<i>', '<u>', '<s>', '<strong>', '<em>'];
            let foundCount = 0;
            formattingTags.forEach(fmt => {
                const regex = new RegExp(fmt.replace('<', '<'), 'g');
                const matches = cleanCode.match(regex);
                if (matches) foundCount += matches.length;
            });
            if (foundCount < count) return false;
        }
        // Handle single tags
        else {
            if (!cleanCode.includes('<' + tag)) return false;
        }
    }
    return true;
}

/**
 * Check if user code matches the solution
 */
function checkAnswer(courseId, levelId) {
    const code = document.getElementById('code-editor').value;
    const exercise = exerciseData[courseId][levelId];
    const feedbackEl = document.getElementById('feedback');
    const submitBtn = document.getElementById('submit-btn');

    let isCorrect = false;

    if (courseId === 'html') {
        isCorrect = validateHTML(code, exercise.requiredTags);
    } else {
        isCorrect = exercise.solution.test(code);
    }

    if (isCorrect) {
        feedbackEl.innerHTML = "<span style='color: var(--success); font-weight: bold; animation: pulse 0.5s;'>✅ Almost there! XP gain incoming...</span>";
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.5";
        submitBtn.style.cursor = "not-allowed";

        setTimeout(() => {
            completeLevel(courseId, parseInt(levelId), exercise.xp);
        }, 1500);
    } else {
        feedbackEl.innerHTML = "<span style='color: #ef4444; font-weight: bold;'>❌ Almost there! Check the required tags.</span>";
    }
}

/**
 * Toggle solution visibility
 */
function toggleSolution() {
    const solutionText = document.getElementById('solution-text');
    const solutionBtn = document.getElementById('solution-btn');
    const isHidden = solutionText.style.display === 'none';

    solutionText.style.display = isHidden ? 'block' : 'none';
    solutionBtn.textContent = isHidden ? 'Hide Solution' : 'Show Solution';
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

    // --- Update Level Content ---
    const levelTitleEl = document.getElementById('level-title');
    if (levelTitleEl) levelTitleEl.textContent = exercise.title;

    const lessonDescEl = document.getElementById('lesson-desc');
    if (lessonDescEl) lessonDescEl.innerHTML = exercise.description;

    const exerciseInstrEl = document.getElementById('exercise-instr');
    if (exerciseInstrEl) exerciseInstrEl.innerHTML = exercise.instructions;

    const codeExampleEl = document.getElementById('code-example');
    if (codeExampleEl) codeExampleEl.innerHTML = exercise.example;

    const hintTextEl = document.getElementById('hint-text');
    if (hintTextEl) {
        hintTextEl.innerHTML = exercise.hint;
        hintTextEl.style.display = 'none';
    }

    const solutionTextEl = document.getElementById('solution-text');
    const solutionCodeEl = document.getElementById('solution-code');
    const solutionBtn = document.getElementById('solution-btn');
    if (solutionTextEl && solutionCodeEl) {
        solutionTextEl.style.display = 'none';
        solutionCodeEl.textContent = exercise.solution || "No solution provided.";
        if (solutionBtn) solutionBtn.textContent = 'Show Solution';
    }

    const codeEditorEl = document.getElementById('code-editor');
    if (codeEditorEl) codeEditorEl.value = exercise.initialCode;

    // --- Render Sidebar ---
    const sidebar = document.getElementById('sidebar-levels');
    if (sidebar) {
        const data = getUserData();
        const exercises = exerciseData[courseId];
        sidebar.innerHTML = `<div class="sidebar-header">Course Levels</div>`;

        Object.keys(exercises).forEach(id => {
            const ex = exercises[id];
            const isCompleted = data.courses[courseId].completedLevels.includes(parseInt(id));
            const isUnlocked = data.courses[courseId].unlockedLevels.includes(parseInt(id));
            const isActive = parseInt(id) === parseInt(levelId);

            let statusClass = isCompleted ? 'completed' : (isUnlocked ? 'unlocked' : 'locked');
            let statusIcon = isCompleted ? '✓' : (isUnlocked ? '' : '🔒');

            const item = document.createElement('div');
            item.className = `sidebar-item ${isActive ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`;
            item.innerHTML = `
                <div class="status-icon ${statusClass}">${statusIcon}</div>
                <div>
                    <div class="sidebar-level-num">Exercise ${id.padStart(2, '0')}</div>
                    <div class="sidebar-level-title">${ex.title.split('. ')[1] || ex.title}</div>
                </div>
            `;

            if (isUnlocked) {
                item.onclick = () => window.location.href = `exercise.html?course=${courseId}&level=${id}`;
            }
            sidebar.appendChild(item);
        });
    }

    // --- Update Navigation Buttons ---
    const backBtn = document.getElementById('back-btn');
    const nextBtn = document.getElementById('next-btn');
    const currLevelId = parseInt(levelId);
    const exercises = exerciseData[courseId];

    if (backBtn) {
        if (currLevelId > 1) {
            backBtn.style.visibility = 'visible';
            backBtn.href = `exercise.html?course=${courseId}&level=${currLevelId - 1}`;
        } else {
            backBtn.style.visibility = 'hidden';
        }
    }

    if (nextBtn) {
        const nextLevelId = currLevelId + 1;
        const data = getUserData();
        if (exercises[nextLevelId] && data.courses[courseId].unlockedLevels.includes(nextLevelId)) {
            nextBtn.style.visibility = 'visible';
            nextBtn.href = `exercise.html?course=${courseId}&level=${nextLevelId}`;
        } else {
            nextBtn.style.visibility = 'hidden';
        }
    }

    // Update Nav breadcrumb if it exists
    const navCourseName = document.getElementById('nav-course-name');
    if (navCourseName) {
        navCourseName.textContent = `${courseId.toUpperCase()} / ${levelId.toString().padStart(2, '0')}`;
    }

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
window.checkAnswer = checkAnswer;
window.loadExercise = loadExercise;
window.getUserData = getUserData; // Exported for use in exercise.html if needed

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
