document.addEventListener('DOMContentLoaded', () => {
    const grammarContentDiv = document.getElementById('grammar-content');
    const containerDiv = document.querySelector('.container');

    const LOCAL_STORAGE_KEY = 'bunproGrammarProgress';
    let userProgress = {};

    const ICON_PATHS = {
        bookmarkSolid: 'icons/bookmark-solid.svg',
        checkSolid: 'icons/circle-check-solid.svg',
        warningTriangle: 'icons/triangle-exclamation-solid.svg',
        trashSolid: 'icons/trash-solid.svg'
    };

    let allGrammarData = [];

    // --- Core Data Loading Function (MUST BE DEFINED EARLY) ---
    async function loadGrammarData() {
        try {
            const response = await fetch('bunpro_grammar_data.json');
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`HTTP error! status: ${response.status}, text: ${errorText}`);
                throw new Error(`Failed to load grammar data: ${response.statusText}`);
            }
            allGrammarData = await response.json();
            loadUserProgress();
            renderStatistics();
            renderGrammarData(allGrammarData);
            updateParentHeaderStates();
            addResetButtonListener();
        } catch (error) {
            console.error("Could not load grammar data:", error);
            grammarContentDiv.innerHTML = '<p>Error loading grammar data. Please ensure "bunpro_grammar_data.json" is in the same directory and accessible. Details in console.</p>';
        }
    }

    // --- User Progress Functions ---
    function loadUserProgress() {
        try {
            const storedProgress = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedProgress) {
                userProgress = JSON.parse(storedProgress);
            } else {
                userProgress = {};
            }
        } catch (e) {
            console.error("Failed to load user progress from localStorage:", e);
            userProgress = {};
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
    }

    function saveUserProgress() {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userProgress));
        } catch (e) {
            console.error("Failed to save user progress to localStorage:", e);
            alert("Could not save progress. Your browser's storage might be full or disabled.");
        }
    }

    function generateGrammarPointId(nLevelKey, lessonNum, gpIdx) {
        return `${nLevelKey.replace(/ /g, '_')}_L${lessonNum}_GP${gpIdx}`;
    }

    function getGrammarPointState(gpId) {
        return userProgress[gpId] || { bookmarked: false, completed: false };
    }

    function updateGrammarPointState(gpId, state) {
        userProgress[gpId] = state;
        saveUserProgress();
        renderStatistics(); // Re-render statistics on any state change

        // Find the specific grammar point item in the DOM and update its classes
        const grammarPointItemElement = document.querySelector(`[data-gp-id="${gpId}"]`);
        if (grammarPointItemElement) {
            grammarPointItemElement.classList.toggle('bookmarked', state.bookmarked);
            grammarPointItemElement.classList.toggle('completed', state.completed);

            renderActionButtons(grammarPointItemElement, gpId); // Re-render buttons to apply correct filters
        }

        // Update parent headers (N-level and Lesson)
        const changedElement = grammarPointItemElement; // Pass the grammar point element
        if (changedElement) {
            updateParentHeaderStates(changedElement);
        } else {
            updateParentHeaderStates(); // Fallback to update all if element not found
        }
    }

    function toggleBookmark(gpId, grammarPointItemElement) {
        const currentState = getGrammarPointState(gpId);
        currentState.bookmarked = !currentState.bookmarked;
        updateGrammarPointState(gpId, currentState); // This will trigger DOM update and icon flash
    }

    function toggleComplete(gpId, grammarPointItemElement) {
        const currentState = getGrammarPointState(gpId);
        currentState.completed = !currentState.completed;
        updateGrammarPointState(gpId, currentState); // This will trigger DOM update and icon flash
    }

    function resetAllUserData() {
        if (confirm("Are you sure you want to reset ALL your saved progress (bookmarks and completed items)? This action cannot be undone.")) {
            userProgress = {};
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            alert("All user data has been reset.");
            location.reload();
        }
    }

    function addResetButtonListener() {
        const resetButton = document.getElementById('reset-all-button');
        if (resetButton) {
            resetButton.addEventListener('click', resetAllUserData);
        }
    }

    // --- Statistics Functions ---
    function calculateStatistics() {
        let totalJlptLevels = 0;
        let completedJlptLevels = 0;
        let totalLessons = 0;
        let completedLessons = 0;
        let totalGrammarPoints = 0;
        let completedGrammarPoints = 0;
        let bookmarkedGrammarPoints = 0;

        let nonJlptLessons = 0;
        let nonJlptGrammarPoints = 0;
        let nonJlptCompletedGPs = 0;

        let unknownNLevelLessons = 0;
        let unknownNLevelGrammarPoints = 0;
        let unknownNLevelCompletedGPs = 0;


        const nLevelStats = {};

        const nLevelOrder = ['N5', 'N4', 'N3', 'N2', 'N1', 'Non-JLPT', 'Unknown N-Level'];

        nLevelOrder.forEach(nLevelKey => {
            if (allGrammarData[nLevelKey] && allGrammarData[nLevelKey].length > 0) {

                if (nLevelKey !== 'Non-JLPT' && nLevelKey !== 'Unknown N-Level') {
                    totalJlptLevels++;
                }

                let nLevelLessonsCount = 0;
                let nLevelGPsCount = 0;
                let nLevelCompletedGPs = 0;
                let nLevelBookmarkedGPs = 0;

                allGrammarData[nLevelKey].forEach(lesson => {
                    nLevelLessonsCount++;
                    let nLevelKeyLessonNum = lesson.lesson_num;
                    let lessonGPsCount = 0;
                    let lessonCompletedGPs = 0;


                    lesson.grammar_points.forEach((gp, gpIdx) => {
                        const gpId = generateGrammarPointId(nLevelKey, nLevelKeyLessonNum, gpIdx);
                        const state = getGrammarPointState(gpId);

                        if (nLevelKey === 'Non-JLPT') {
                            nonJlptGrammarPoints++;
                            if (state.completed) {
                                nonJlptCompletedGPs++;
                            }
                        } else if (nLevelKey === 'Unknown N-Level') {
                            unknownNLevelGrammarPoints++;
                            if (state.completed) {
                                unknownNLevelCompletedGPs++;
                            }
                        }
                        else {
                            totalGrammarPoints++;
                            if (state.completed) {
                                completedGrammarPoints++;
                            }
                        }

                        nLevelGPsCount++;
                        if (state.completed) {
                            nLevelCompletedGPs++;
                            lessonCompletedGPs++;
                        }
                        if (state.bookmarked) {
                            bookmarkedGrammarPoints++;
                            nLevelBookmarkedGPs++;
                        }
                        lessonGPsCount++;
                    });

                    if (lessonGPsCount > 0 && lessonCompletedGPs === lessonGPsCount) {
                        if (nLevelKey !== 'Non-JLPT' && nLevelKey !== 'Unknown N-Level') {
                            completedLessons++;
                        }
                    }

                    if (nLevelKey !== 'Non-JLPT' && nLevelKey !== 'Unknown N-Level') {
                        totalLessons++;
                    }
                });

                if (nLevelKey !== 'Non-JLPT' && nLevelKey !== 'Unknown N-Level' && nLevelGPsCount > 0 && nLevelCompletedGPs === nLevelGPsCount) {
                    completedJlptLevels++;
                }

                nLevelStats[nLevelKey] = {
                    lessons: nLevelLessonsCount,
                    grammarPoints: nLevelGPsCount,
                    completedGrammarPoints: nLevelCompletedGPs,
                    bookmarkedGrammarPoints: nLevelBookmarkedGPs
                };
            }
        });

        return {
            totalJlptLevels,
            completedJlptLevels,
            totalLessons,
            completedLessons,
            totalGrammarPoints,
            completedGrammarPoints,
            bookmarkedGrammarPoints,
            nonJlptLessons,
            nonJlptGrammarPoints,
            nonJlptCompletedGPs,
            unknownNLevelLessons,
            unknownNLevelGrammarPoints,
            unknownNLevelCompletedGPs,
            nLevelStats
        };
    }

    function renderStatistics() {
        const stats = calculateStatistics();
        let statsHtml = `
            <div class="statistics-container">
                <div class="global-stats">
                    <h3>Global Statistics</h3>
                    <div class="stats-grid">
                        <p>N-Levels: <span class="stat-value">${stats.completedJlptLevels}/${stats.totalJlptLevels}</span></p>
                        <p>Total Lessons: <span class="stat-value">${stats.completedLessons}/${stats.totalLessons}</span></p>
                        <p>Total Grammar Points: <span class="stat-value">${stats.completedGrammarPoints}/${stats.totalGrammarPoints}</span></p>
                        <p>Bookmarked: <span class="stat-value">${stats.bookmarkedGrammarPoints}</span></p>
                    </div>
                </div>
                <div class="detailed-jlpt-stats">
                    <h3>Detailed JLPT Statistics</h3>
                    <div class="stats-grid">
        `;

        const n5Stats = stats.nLevelStats['N5'] || {};
        const n4Stats = stats.nLevelStats['N4'] || {};
        const n3Stats = stats.nLevelStats['N3'] || {};
        const n2Stats = stats.nLevelStats['N2'] || {};
        const n1Stats = stats.nLevelStats['N1'] || {};
        const nonJlptStats = stats.nLevelStats['Non-JLPT'] || {};
        const unknownNLevelStats = stats.nLevelStats['Unknown N-Level'] || {};


        statsHtml += `
            <p>N-5 Lessons: <span class="stat-value">${n5Stats.lessons || 0}</span></p>
            <p>N5 Grammar Points: <span class="stat-value">${n5Stats.completedGrammarPoints || 0}/${n5Stats.grammarPoints || 0}</span></p>
            <p>Non-JLPT Lessons: <span class="stat-value">${nonJlptStats.lessons || 0}</span></p>

            <p>N-4 Lessons: <span class="stat-value">${n4Stats.lessons || 0}</span></p>
            <p>N4 Grammar Points: <span class="stat-value">${n4Stats.completedGrammarPoints || 0}/${n4Stats.grammarPoints || 0}</span></p>
            <p>Non-JLPT Grammar Points: <span class="stat-value">${nonJlptStats.completedGrammarPoints || 0}/${nonJlptStats.grammarPoints || 0}</span></p>

            <p>N-3 Lessons: <span class="stat-value">${n3Stats.lessons || 0}</span></p>
            <p>N3 Grammar Points: <span class="stat-value">${n3Stats.completedGrammarPoints || 0}/${n3Stats.grammarPoints || 0}</span></p>
            <div></div>

            <p>N-2 Lessons: <span class="stat-value">${n2Stats.lessons || 0}</span></p>
            <p>N2 Grammar Points: <span class="stat-value">${n2Stats.completedGrammarPoints || 0}/${n2Stats.grammarPoints || 0}</span></p>
            <div></div>

            <p>N-1 Lessons: <span class="stat-value">${n1Stats.lessons || 0}</span></p>
            <p>N1 Grammar Points: <span class="stat-value">${n1Stats.completedGrammarPoints || 0}/${n1Stats.grammarPoints || 0}</span></p>
            <div></div>
        `;

        if (unknownNLevelStats.lessons > 0) {
            statsHtml += `
                <p>Unknown N-Level Lessons: <span class="stat-value">${unknownNLevelStats.lessons || 0}</span></p>
                <p>Unknown N-Level Grammar Points: <span class="stat-value">${unknownNLevelStats.completedGrammarPoints || 0}/${unknownNLevelStats.grammarPoints || 0}</span></p>
                <div></div>
            `;
        }

        statsHtml += `
                    </div>
                </div>
            </div>
        `;

        let existingStatsContainer = document.querySelector('.statistics-container');
        if (existingStatsContainer) {
            existingStatsContainer.outerHTML = statsHtml;
        } else {
            containerDiv.insertAdjacentHTML('afterbegin', statsHtml);
        }

        updateHeaderCounts(stats.nLevelStats);
    }

    function updateHeaderCounts(nLevelStats) {
        document.querySelectorAll('.n-level-header').forEach(header => {
            const nLevelId = header.closest('.n-level').id;
            const nLevelKey = nLevelId.replace('n-level-', '').replace(/-/g, ' ');

            if (nLevelStats[nLevelKey]) {
                const stats = nLevelStats[nLevelKey];
                let countSpan = header.querySelector('.header-counts');
                if (!countSpan) {
                    countSpan = document.createElement('span');
                    countSpan.classList.add('header-counts');
                    header.insertBefore(countSpan, header.children[1]);
                }
                countSpan.textContent = `${stats.lessons} Lessons, ${stats.grammarPoints} Grammar Points`;

                const completeBtn = header.querySelector('.mark-level-complete-btn');
                if (completeBtn) {
                    completeBtn.classList.toggle('level-completed', stats.completedGrammarPoints === stats.grammarPoints && stats.grammarPoints > 0);
                }
                const resetBtn = header.querySelector('.mark-level-reset-btn');
                if (resetBtn) {
                    const hasProgress = stats.completedGrammarPoints > 0 || stats.bookmarkedGrammarPoints > 0;
                    resetBtn.style.display = hasProgress ? 'flex' : 'none';
                }

                const bookmarkIndicator = header.querySelector('.n-level-bookmark-indicator');
                if (bookmarkIndicator) {
                    bookmarkIndicator.classList.toggle('active', stats.bookmarkedGrammarPoints > 0);
                }
            }
        });

        document.querySelectorAll('.lesson').forEach(lessonDiv => {
            const lessonHeader = lessonDiv.querySelector('.lesson-header');
            const nLevelContainer = lessonDiv.closest('.n-level');
            const nLevelKey = nLevelContainer.id.replace('n-level-', '').replace(/-/g, ' ');
            const lessonNumText = lessonHeader.querySelector('span').textContent;
            const lessonNumMatch = lessonNumText.match(/\d+/);
            const lessonNum = lessonNumMatch ? parseInt(lessonNumMatch[0]) : null;

            if (nLevelKey && lessonNum && allGrammarData[nLevelKey]) {
                const lessonData = allGrammarData[nLevelKey].find(l => l.lesson_num === lessonNum); // Use strict equality
                if (lessonData) {
                    const grammarPointsInLesson = lessonData.grammar_points.length;
                    let countSpan = lessonHeader.querySelector('.header-counts');
                    if (!countSpan) {
                        countSpan = document.createElement('span');
                        countSpan.classList.add('header-counts');
                        lessonHeader.insertBefore(countSpan, lessonHeader.children[1]);
                    }
                    const completedGPs = lessonData.grammar_points.filter((gp, gpIdx) => {
                        const gpId = generateGrammarPointId(nLevelKey, lessonData.lesson_num, gpIdx);
                        return getGrammarPointState(gpId).completed;
                    }).length;
                    countSpan.textContent = `${completedGPs}/${grammarPointsInLesson}`;

                    const bookmarkedGPs = lessonData.grammar_points.filter((gp, gpIdx) => {
                        const gpId = generateGrammarPointId(nLevelKey, lessonData.lesson_num, gpIdx);
                        return getGrammarPointState(gpId).bookmarked;
                    }).length;

                    const completeBtn = lessonHeader.querySelector('.mark-lesson-complete-btn');
                    if (completeBtn) {
                        completeBtn.classList.toggle('lesson-completed', completedGPs === grammarPointsInLesson && grammarPointsInLesson > 0);
                    }
                     const resetBtn = lessonHeader.querySelector('.mark-lesson-reset-btn');
                    if (resetBtn) {
                        const hasProgress = completedGPs > 0 || bookmarkedGPs > 0;
                        resetBtn.style.display = hasProgress ? 'flex' : 'none';
                    }
                }
            }
        });
    }

    // --- Header Highlighting Logic ---
    function updateParentHeaderStates(startElement = null) {
        let itemsToCheck = new Set();

        if (startElement) {
            let current = startElement;
            while (current) {
                if (current.classList.contains('lesson')) {
                    itemsToCheck.add(current);
                }
                if (current.classList.contains('n-level')) {
                    itemsToCheck.add(current);
                    break;
                }
                current = current.parentElement;
            }
        } else {
            document.querySelectorAll('.lesson, .n-level').forEach(el => itemsToCheck.add(el));
        }

        itemsToCheck.forEach(containerElement => {
            const isNLevel = containerElement.classList.contains('n-level');
            const header = containerElement.querySelector(isNLevel ? '.n-level-header' : '.lesson-header');
            const grammarPointItems = containerElement.querySelectorAll('.grammar-point-item');

            let allChildrenCompleted = true;
            let hasBookmarkedChildren = false;

            if (grammarPointItems.length === 0) {
                allChildrenCompleted = false;
            } else {
                grammarPointItems.forEach(item => {
                    const gpId = item.dataset.gpId;
                    const state = getGrammarPointState(gpId);
                    if (!state.completed) {
                        allChildrenCompleted = false;
                    }
                    if (state.bookmarked) {
                        hasBookmarkedChildren = true;
                    }
                });
            }

            if (header) {
                header.classList.toggle('has-bookmarked-children', hasBookmarkedChildren);
                header.classList.toggle('all-children-complete', allChildrenCompleted);
            }
        });
        renderStatistics();
    }

    // --- Rendering Grammar Data Structure ---
    function renderGrammarData(data) {
        let html = '';
        const nLevelOrder = ['N5', 'N4', 'N3', 'N2', 'N1', 'Non-JLPT', 'Unknown N-Level'];

        nLevelOrder.forEach(nLevelKey => {
            if (data[nLevelKey] && data[nLevelKey].length > 0) {
                const nLevelClass = `n-level n-level-${nLevelKey.replace(/ /g, '-')}`;
                html += `
                    <div class="${nLevelClass}" id="n-level-${nLevelKey.replace(/ /g, '-')}-container">
                        <div class="n-level-header">
                            <span class="n-level-text">${nLevelKey} Grammar</span>
                            <span class="header-counts"></span>
                            <img src="${ICON_PATHS.bookmarkSolid}" alt="Bookmarked" class="n-level-bookmark-indicator">
                            <button class="mark-level-complete-btn" data-action-type="complete" data-level-type="n-level" data-n-level-key="${nLevelKey}" title="Press and hold to mark all grammar points in this N-level as complete">
                                <img src="${ICON_PATHS.checkSolid}" alt="Complete All">
                                <svg class="progress-circle" viewBox="0 0 38 38">
                                    <circle class="progress-circle-bg" cx="19" cy="19" r="16"></circle>
                                    <circle class="progress-circle-fg" cx="19" cy="19" r="16"></circle>
                                </svg>
                            </button>
                            <button class="mark-level-reset-btn" data-action-type="reset" data-level-type="n-level" data-n-level-key="${nLevelKey}" title="Press and hold to reset all grammar points in this N-level">
                                <img src="${ICON_PATHS.trashSolid}" alt="Reset All">
                                <svg class="progress-circle" viewBox="0 0 38 38">
                                    <circle class="progress-circle-bg" cx="19" cy="19" r="16"></circle>
                                    <circle class="progress-circle-fg" cx="19" cy="19" r="16"></circle>
                                </svg>
                            </button>
                            <span class="toggle-icon">&#9654;</span>
                        </div>
                        <div class="n-level-content">
                `;

                data[nLevelKey].forEach(lesson => {
                    html += `
                            <div class="lesson" id="lesson-${nLevelKey.replace(/ /g, '-')}-${lesson.lesson_num}-container">
                                <div class="lesson-header">
                                    <span>Lesson ${lesson.lesson_num}</span>
                                    <span class="header-counts"></span>
                                    <button class="mark-lesson-complete-btn" data-action-type="complete" data-level-type="lesson" data-n-level-key="${nLevelKey}" data-lesson-num="${lesson.lesson_num}" title="Press and hold to mark all grammar points in this lesson as complete">
                                        <img src="${ICON_PATHS.checkSolid}" alt="Complete Lesson">
                                        <svg class="progress-circle" viewBox="0 0 38 38">
                                            <circle class="progress-circle-bg" cx="19" cy="19" r="16"></circle>
                                            <circle class="progress-circle-fg" cx="19" cy="19" r="16"></circle>
                                        </svg>
                                    </button>
                                    <button class="mark-lesson-reset-btn" data-action-type="reset" data-level-type="lesson" data-n-level-key="${nLevelKey}" data-lesson-num="${lesson.lesson_num}" title="Press and hold to reset all grammar points in this lesson">
                                        <img src="${ICON_PATHS.trashSolid}" alt="Reset Lesson">
                                        <svg class="progress-circle" viewBox="0 0 38 38">
                                            <circle class="progress-circle-bg" cx="19" cy="19" r="16"></circle>
                                            <circle class="progress-circle-fg" cx="19" cy="19" r="16"></circle>
                                        </svg>
                                    </button>
                                    <span class="toggle-icon">&#9654;</span>
                                </div>
                                <div class="lesson-content">
                                    <ul class="grammar-point-list">
                    `;
                    lesson.grammar_points.forEach((gp, gpIdx) => {
                        const gpId = generateGrammarPointId(nLevelKey, lesson.lesson_num, gpIdx);
                        const state = getGrammarPointState(gpId);
                        const itemClasses = ['grammar-point-item'];
                        if (state.bookmarked) itemClasses.push('bookmarked');
                        if (state.completed) itemClasses.push('completed');

                        html += `
                                        <li class="grammar-point-wrapper">
                                            <div class="${itemClasses.join(' ')}" data-gp-id="${gpId}">
                                                <div class="grammar-point-content-area">
                                                    <span class="grammar-point-number">${gpIdx + 1}.</span>
                                                    <a href="${gp.link}" target="_blank" rel="noopener noreferrer">
                                                        ${gp.text}
                                                    </a>
                                                </div>
                                            </div>
                                            <div class="action-buttons" data-gp-id="${gpId}"></div>
                                        </li>
                        `;
                    });

                    html += `
                                    </ul>
                                </div>
                            </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            }
        });
        grammarContentDiv.innerHTML = html;
        addToggleListeners();
        addActionListeners();
        addLongPressListeners();
    }

    // --- Action Button Listeners (Individual Grammar Points) ---
    function addActionListeners() {
        document.querySelectorAll('.grammar-point-wrapper').forEach(wrapper => {
            const grammarPointItem = wrapper.querySelector('.grammar-point-item');
            const gpId = grammarPointItem.dataset.gpId;
            const actionButtonsDiv = wrapper.querySelector('.action-buttons');
            renderActionButtons(grammarPointItem, gpId, actionButtonsDiv);
        });
    }

    function renderActionButtons(grammarPointItem, gpId, actionButtonsDiv = null) {
        if (!actionButtonsDiv) {
            actionButtonsDiv = grammarPointItem.nextElementSibling;
            if (!actionButtonsDiv || !actionButtonsDiv.classList.contains('action-buttons')) {
                console.error("Action buttons div not found for grammar point:", gpId);
                return;
            }
        }
        actionButtonsDiv.innerHTML = '';

        const state = getGrammarPointState(gpId);

        const bookmarkButton = document.createElement('button');
        bookmarkButton.classList.add('bookmark-btn');
        if (state.bookmarked) {
            bookmarkButton.classList.add('bookmarked');
        }
        bookmarkButton.innerHTML = `<img src="${ICON_PATHS.bookmarkSolid}" alt="Bookmark">`;
        bookmarkButton.title = state.bookmarked ? "Remove Bookmark" : "Bookmark this grammar point";
        bookmarkButton.addEventListener('click', () => toggleBookmark(gpId, grammarPointItem));
        actionButtonsDiv.appendChild(bookmarkButton);

        const completeButton = document.createElement('button');
        completeButton.classList.add('complete-btn');
        if (state.completed) {
            completeButton.classList.add('completed');
        }
        completeButton.innerHTML = `<img src="${ICON_PATHS.checkSolid}" alt="Complete">`;
        completeButton.title = state.completed ? "Mark as Incomplete" : "Mark as Complete";
        completeButton.addEventListener('click', () => toggleComplete(gpId, grammarPointItem));
        actionButtonsDiv.appendChild(completeButton);
    }

    // --- Long Press Logic for Level/Lesson Buttons ---
    const holdTimers = new Map();
    const holdProgressBar = new Map();
    const holdButtonIcon = new Map();

    const N_LEVEL_HOLD_DURATION = 2000; // 2 seconds for N-level
    const LESSON_HOLD_DURATION = 1000; // 1 second for lesson

    function addLongPressListeners() {
        document.querySelectorAll('.mark-level-complete-btn, .mark-level-reset-btn, .mark-lesson-complete-btn, .mark-lesson-reset-btn').forEach(button => {
            const levelType = button.dataset.levelType;
            const holdDuration = levelType === 'n-level' ? N_LEVEL_HOLD_DURATION : LESSON_HOLD_DURATION;

            const progressBarFg = button.querySelector('.progress-circle-fg');
            const buttonIcon = button.querySelector('img');

            holdProgressBar.set(button, progressBarFg);
            holdButtonIcon.set(button, buttonIcon);

            let pressTimer;

            const startPress = (e) => {
                if (e.type === 'touchstart') {
                    e.preventDefault();
                }

                button.classList.add('holding');
                // Set the progress bar color based on button type
                if (button.classList.contains('mark-level-complete-btn') || button.classList.contains('mark-lesson-complete-btn')) {
                    progressBarFg.style.stroke = '#558B55'; // Green for complete
                    buttonIcon.style.filter = 'invert(61%) sepia(50%) saturate(350%) hue-rotate(70deg) brightness(150%) contrast(100%)'; // Brighter green
                } else if (button.classList.contains('mark-level-reset-btn') || button.classList.contains('mark-lesson-reset-btn')) {
                    progressBarFg.style.stroke = '#cc0000'; // Red for reset
                    buttonIcon.style.filter = 'invert(27%) sepia(80%) saturate(2878%) hue-rotate(345deg) brightness(150%) contrast(100%)'; // Brighter red
                }

                progressBarFg.style.transition = 'none'; // Reset transition instantly
                progressBarFg.style.strokeDashoffset = '100.53'; // Fully hidden
                progressBarFg.style.opacity = '1';

                void progressBarFg.offsetWidth; // Trigger reflow to ensure reset is applied

                // Use CSS variable for transition duration in CSS
                button.style.setProperty('--hold-duration', `${holdDuration}ms`);
                progressBarFg.style.strokeDashoffset = '0'; // Start filling

                pressTimer = setTimeout(() => {
                    button.classList.remove('holding');
                    buttonIcon.style.removeProperty('filter'); // Remove inline filter to let CSS take over
                    progressBarFg.style.opacity = '0';
                    executeLongPressAction(button);
                }, holdDuration);
                holdTimers.set(button, pressTimer);
            };

            const endPress = () => {
                clearTimeout(holdTimers.get(button));
                holdTimers.delete(button);

                button.classList.remove('holding');
                buttonIcon.style.removeProperty('filter'); // Remove inline filter to let CSS take over
                progressBarFg.style.transition = 'none';
                progressBarFg.style.strokeDashoffset = '100.53'; // Reset to hidden
                progressBarFg.style.opacity = '0';

                // Flash the icon briefly after release if action was not completed
                if (buttonIcon && !buttonIcon.classList.contains('flash-white-icon')) {
                    flashIcon(buttonIcon);
                }
            };

            button.addEventListener('mousedown', startPress);
            button.addEventListener('touchstart', startPress, { passive: false });

            button.addEventListener('mouseup', endPress);
            button.addEventListener('mouseleave', endPress);
            button.addEventListener('touchend', endPress);
            button.addEventListener('touchcancel', endPress);
        });
    }

    function executeLongPressAction(button) {
        const actionType = button.dataset.actionType;
        const levelType = button.dataset.levelType;
        const nLevelKey = button.dataset.nLevelKey;
        const lessonNum = button.dataset.lessonNum;

        flashIcon(button.querySelector('img')); // Flash the icon on successful action

        const headerToFlash = button.closest('.n-level-header') || button.closest('.lesson-header');
        if (headerToFlash) {
            flashHeader(headerToFlash);
        }

        if (actionType === 'complete') {
            if (levelType === 'n-level') {
                handleMarkLevelComplete(nLevelKey);
            } else if (levelType === 'lesson') {
                handleMarkLessonComplete(nLevelKey, parseInt(lessonNum));
            }
        } else if (actionType === 'reset') {
            if (levelType === 'n-level') {
                handleMarkLevelReset(nLevelKey);
            } else if (levelType === 'lesson') {
                handleMarkLessonReset(nLevelKey, parseInt(lessonNum));
            }
        }
    }

    function handleMarkLevelComplete(nLevelKey) {
        let grammarPointsUpdated = 0;
        const targetNLevel = allGrammarData[nLevelKey];
        if (!targetNLevel) return;

        targetNLevel.forEach(lesson => {
            lesson.grammar_points.forEach((gp, gpIdx) => {
                const gpId = generateGrammarPointId(nLevelKey, lesson.lesson_num, gpIdx);
                const currentState = getGrammarPointState(gpId);
                if (!currentState.completed) {
                    currentState.completed = true;
                    updateGrammarPointState(gpId, currentState); // This will trigger DOM update and icon flash
                    grammarPointsUpdated++;
                }
            });
        });

        if (grammarPointsUpdated > 0) {
            console.log(`Marked ${grammarPointsUpdated} grammar points in ${nLevelKey} as complete.`);
            updateParentHeaderStates(); // This will re-calculate and update header states
        }
    }

    function handleMarkLevelReset(nLevelKey) {
        let grammarPointsUpdated = 0;
        const targetNLevel = allGrammarData[nLevelKey];
        if (!targetNLevel) return;

        targetNLevel.forEach(lesson => {
            lesson.grammar_points.forEach((gp, gpIdx) => {
                const gpId = generateGrammarPointId(nLevelKey, lesson.lesson_num, gpIdx);
                const currentState = getGrammarPointState(gpId);
                if (currentState.completed || currentState.bookmarked) {
                    currentState.completed = false;
                    currentState.bookmarked = false;
                    updateGrammarPointState(gpId, currentState); // This will trigger DOM update and icon flash
                    grammarPointsUpdated++;
                }
            });
        });

        if (grammarPointsUpdated > 0) {
            console.log(`Reset ${grammarPointsUpdated} grammar points in ${nLevelKey}.`);
            updateParentHeaderStates(); // This will re-calculate and update header states
        }
    }

    function handleMarkLessonComplete(nLevelKey, lessonNum) {
        let grammarPointsUpdated = 0;
        const targetLesson = allGrammarData[nLevelKey]?.find(l => l.lesson_num === lessonNum);
        if (!targetLesson) return;

        targetLesson.grammar_points.forEach((gp, gpIdx) => {
            const gpId = generateGrammarPointId(nLevelKey, lessonNum, gpIdx);
            const currentState = getGrammarPointState(gpId);
            if (!currentState.completed) {
                currentState.completed = true;
                updateGrammarPointState(gpId, currentState); // This will trigger DOM update and icon flash
                grammarPointsUpdated++;
            }
        });

        if (grammarPointsUpdated > 0) {
            console.log(`Marked ${grammarPointsUpdated} grammar points in ${nLevelKey} Lesson ${lessonNum} as complete.`);
            updateParentHeaderStates(); // This will re-calculate and update header states
        }
    }

    function handleMarkLessonReset(nLevelKey, lessonNum) {
        let grammarPointsUpdated = 0;
        const targetLesson = allGrammarData[nLevelKey]?.find(l => l.lesson_num === lessonNum);
        if (!targetLesson) return;

        targetLesson.grammar_points.forEach((gp, gpIdx) => {
            const gpId = generateGrammarPointId(nLevelKey, lessonNum, gpIdx);
            const currentState = getGrammarPointState(gpId);
            if (currentState.completed || currentState.bookmarked) {
                currentState.completed = false;
                currentState.bookmarked = false;
                updateGrammarPointState(gpId, currentState); // This will trigger DOM update and icon flash
                grammarPointsUpdated++;
            }
        });

        if (grammarPointsUpdated > 0) {
            console.log(`Reset ${grammarPointsUpdated} grammar points in ${nLevelKey} Lesson ${lessonNum}.`);
            updateParentHeaderStates(); // This will re-calculate and update header states
        }
    }

    // Function to flash an icon (used for toggle icons and action buttons after long press)
    function flashIcon(iconElement) {
        iconElement.classList.add('flash-white-icon');
        iconElement.addEventListener('animationend', () => {
            iconElement.classList.remove('flash-white-icon');
        }, { once: true });
    }

    // Function to flash the header (N-level or Lesson)
    function flashHeader(headerElement) {
        headerElement.classList.add('flash-action');
        headerElement.addEventListener('animationend', () => {
            headerElement.classList.remove('flash-action');
        }, { once: true });
    }


    // --- Section Expansion/Collapse Logic ---
    function addToggleListeners() {
        document.querySelectorAll('.n-level-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('button') || e.target.closest('.n-level-bookmark-indicator')) {
                    e.stopPropagation();
                    return;
                }
                const nLevelContent = header.nextElementSibling;
                const toggleIcon = header.querySelector('.toggle-icon');
                if (header.classList.contains('expanded')) {
                    collapseSection(nLevelContent, header, toggleIcon);
                } else {
                    expandSection(nLevelContent, header, toggleIcon);
                    header.querySelector('.n-level-text').classList.add('pulsing');
                }
            });

            header.addEventListener('animationend', (e) => {
                if (e.animationName === 'pulse-text') {
                    header.querySelector('.n-level-text').classList.remove('pulsing');
                }
            });
        });

        document.querySelectorAll('.lesson-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('button')) {
                    e.stopPropagation();
                    return;
                }
                const lessonContent = header.nextElementSibling;
                const toggleIcon = header.querySelector('.toggle-icon');
                if (header.classList.contains('expanded')) {
                    collapseSection(lessonContent, header, toggleIcon);
                } else {
                    expandSection(lessonContent, header, toggleIcon);
                }
            });
        });
    }

    function expandSection(element, header, toggleIcon) {
        const sectionType = element.classList.contains('n-level-content') ? 'n-level' : 'lesson';
        const transitionDuration = sectionType === 'n-level' ? '0.6s' : '0.4s';
        const transitionEasing = 'cubic-bezier(0.4, 0, 0.2, 1)'; // Matches the content transition easing

        toggleIcon.style.setProperty('--toggle-transition-duration', transitionDuration);
        toggleIcon.style.setProperty('--toggle-transition-easing', transitionEasing);

        element.style.height = 'auto';
        const contentHeight = element.scrollHeight;
        element.style.height = '0px';
        void element.offsetWidth;
        element.style.height = `${contentHeight}px`;

        header.classList.add('expanded');
        toggleIcon.style.transform = 'rotate(90deg)';

        const onTransitionEnd = () => {
            if (element.style.height === `${contentHeight}px`) {
                element.style.height = 'auto';
            }
            flashIcon(toggleIcon);
            element.removeEventListener('transitionend', onTransitionEnd);
        };
        element.addEventListener('transitionend', onTransitionEnd);

        if (sectionType === 'n-level') {
            document.querySelectorAll('.n-level-header.expanded').forEach(otherHeader => {
                if (otherHeader !== header) {
                    const otherToggleIcon = otherHeader.querySelector('.toggle-icon');
                    collapseSection(otherHeader.nextElementSibling, otherHeader, otherToggleIcon);
                }
            });
        }
    }

    function collapseSection(element, header, toggleIcon) {
        const sectionType = element.classList.contains('n-level-content') ? 'n-level' : 'lesson';
        const transitionDuration = sectionType === 'n-level' ? '0.6s' : '0.4s';
        const transitionEasing = 'cubic-bezier(0.4, 0, 0.2, 1)'; // Matches the content transition easing

        toggleIcon.style.setProperty('--toggle-transition-duration', transitionDuration);
        toggleIcon.style.setProperty('--toggle-transition-easing', transitionEasing);

        element.style.height = `${element.scrollHeight}px`;
        void element.offsetWidth;
        element.style.height = '0px';

        header.classList.remove('expanded');
        toggleIcon.style.transform = 'rotate(0deg)';

        if (sectionType === 'n-level' && header.querySelector('.n-level-text').classList.contains('pulsing')) {
            header.querySelector('.n-level-text').classList.remove('pulsing');
        }

        const onTransitionEnd = () => {
            if (element.style.height === '0px') {
                 // Nothing specific to do
            }
            flashIcon(toggleIcon);
            element.removeEventListener('transitionend', onTransitionEnd);
        };
        element.addEventListener('transitionend', onTransitionEnd);
    }

    loadGrammarData();
});