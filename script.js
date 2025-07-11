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
            addResetButton();
            updateParentHeaderStates();
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
        renderStatistics();
        const changedElement = document.querySelector(`[data-gp-id="${gpId}"]`);
        if (changedElement) {
            updateParentHeaderStates(changedElement);
        } else {
            updateParentHeaderStates();
        }
    }

    function toggleBookmark(gpId, grammarPointItemElement) {
        const currentState = getGrammarPointState(gpId);
        currentState.bookmarked = !currentState.bookmarked;
        updateGrammarPointState(gpId, currentState);

        grammarPointItemElement.classList.toggle('bookmarked', currentState.bookmarked);
        grammarPointItemElement.classList.toggle('completed', currentState.completed);
        renderActionButtons(grammarPointItemElement, gpId);
    }

    function toggleComplete(gpId, grammarPointItemElement) {
        const currentState = getGrammarPointState(gpId);
        currentState.completed = !currentState.completed;
        updateGrammarPointState(gpId, currentState);

        grammarPointItemElement.classList.toggle('completed', currentState.completed);
        grammarPointItemElement.classList.toggle('bookmarked', currentState.bookmarked);
        renderActionButtons(grammarPointItemElement, gpId);
    }

    function resetAllUserData() {
        if (confirm("Are you sure you want to reset ALL your saved progress (bookmarks and completed items)? This action cannot be undone.")) {
            userProgress = {};
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            alert("All user data has been reset.");
            location.reload();
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
                    if (nLevelKey === 'Non-JLPT') {
                        nonJlptLessons++;
                    } else {
                        totalLessons++;
                    }

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
                        } else {
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
                    });

                    if (lessonGPsCount > 0 && lessonCompletedGPs === lessonGPsCount) {
                        completedLessons++;
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
            nLevelStats
        };
    }

    function renderStatistics() {
        const stats = calculateStatistics();
        let statsHtml = `
            <div class="statistics-container">
                <h2>Statistics</h2>
                <div class="stats-grid main-stats-grid">
                    <p>N-Levels: <span class="stat-value">${stats.completedJlptLevels}/${stats.totalJlptLevels}</span></p>
                    <p>Total Lessons: <span class="stat-value">${stats.completedLessons}/${stats.totalLessons}</span></p>
                    <p>Total Grammar Points: <span class="stat-value">${stats.completedGrammarPoints}/${stats.totalGrammarPoints}</span></p>
                    <p>Bookmarked: <span class="stat-value">${stats.bookmarkedGrammarPoints}</span></p>
                </div>
                <h3>Detailed N-Level Statistics</h3>
                <div class="stats-grid detailed-stats-grid">
        `;

        const jlptLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
        jlptLevels.forEach(nLevelKey => {
            const nLevelStat = stats.nLevelStats[nLevelKey];
            if (nLevelStat && nLevelStat.grammarPoints > 0) {
                statsHtml += `
                    <p>${nLevelKey} Lessons: <span class="stat-value">${nLevelStat.lessons}</span></p>
                    <p>${nLevelKey} Grammar Points: <span class="stat-value">${nLevelStat.completedGrammarPoints}/${nLevelStat.grammarPoints}</span></p>
                `;
            }
        });

        // Non-JLPT is placed separately at the end of the detailed grid.
        if (stats.nLevelStats['Non-JLPT'] && stats.nLevelStats['Non-JLPT'].lessons > 0) {
            statsHtml += `
                <p class="non-jlpt-lessons-stat">Non-JLPT Lessons: <span class="stat-value">${stats.nonJlptLessons}</span></p>
                <p class="non-jlpt-grammar-stat">Non-JLPT Grammar Points: <span class="stat-value">${stats.nonJlptCompletedGPs}/${stats.nonJlptGrammarPoints}</span></p>
            `;
        }
        if (stats.nLevelStats['Unknown N-Level'] && stats.nLevelStats['Unknown N-Level'].lessons > 0) {
            statsHtml += `
                <p>Unknown N-Level Lessons: <span class="stat-value">${stats.nLevelStats['Unknown N-Level'].lessons}</span></p>
                <p>Unknown N-Level Grammar Points: <span class="stat-value">${stats.nLevelStats['Unknown N-Level'].completedGrammarPoints}/${stats.nLevelStats['Unknown N-Level'].grammarPoints}</span></p>
            `;
        }


        statsHtml += `
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
                    header.insertBefore(countSpan, header.querySelector('.mark-level-complete-btn'));
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
                const lessonData = allGrammarData[nLevelKey].find(l => l.lesson_num == lessonNum);
                if (lessonData) {
                    const grammarPointsInLesson = lessonData.grammar_points.length;
                    let countSpan = lessonHeader.querySelector('.header-counts');
                    if (!countSpan) {
                        countSpan = document.createElement('span');
                        countSpan.classList.add('header-counts');
                        lessonHeader.insertBefore(countSpan, lessonHeader.querySelector('.mark-level-complete-btn'));
                    }
                    const completedGPs = lessonData.grammar_points.filter((gp, gpIdx) => {
                        const gpId = generateGrammarPointId(nLevelKey, lessonNum, gpIdx);
                        return getGrammarPointState(gpId).completed;
                    }).length;
                    countSpan.textContent = `${completedGPs}/${grammarPointsInLesson} Grammar Points`;

                    const bookmarkedGPs = lessonData.grammar_points.filter((gp, gpIdx) => {
                        const gpId = generateGrammarPointId(nLevelKey, lessonNum, gpIdx);
                        return getGrammarPointState(gpId).bookmarked;
                    }).length;


                    const completeBtn = lessonHeader.querySelector('.mark-level-complete-btn');
                    if (completeBtn) {
                        completeBtn.classList.toggle('level-completed', completedGPs === grammarPointsInLesson && grammarPointsInLesson > 0);
                    }
                     const resetBtn = lessonHeader.querySelector('.mark-level-reset-btn');
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

    // --- Rendering and Event Listeners ---
    function renderGrammarData(data) {
        let html = '';
        const nLevelOrder = ['N5', 'N4', 'N3', 'N2', 'N1', 'Non-JLPT', 'Unknown N-Level'];

        nLevelOrder.forEach(nLevelKey => {
            if (data[nLevelKey] && data[nLevelKey].length > 0) {
                const nLevelClass = `n-level n-level-${nLevelKey.replace(/ /g, '-')}`;
                html += `
                    <div class="${nLevelClass}" id="n-level-${nLevelKey.replace(/ /g, '-')}-container">
                        <div class="n-level-header">
                            <span>${nLevelKey} Grammar</span>
                            <span class="header-counts"></span>
                            <button class="mark-level-complete-btn n-level-btn" data-action-type="complete" data-level-type="n-level" data-n-level-key="${nLevelKey}" title="Press and hold to mark all grammar points in this N-level as complete">
                                <img src="${ICON_PATHS.checkSolid}" alt="Complete All">
                                <svg class="progress-circle" viewBox="0 0 38 38">
                                    <circle class="progress-circle-bg" cx="19" cy="19" r="16" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="3"></circle>
                                    <circle class="progress-circle-fg" cx="19" cy="19" r="16" fill="none" stroke="white" stroke-width="3" stroke-dasharray="100.53 100.53" stroke-dashoffset="100.53" transform="rotate(-90 19 19)"></circle>
                                </svg>
                            </button>
                            <button class="mark-level-reset-btn n-level-btn" data-action-type="reset" data-level-type="n-level" data-n-level-key="${nLevelKey}" title="Press and hold to reset all grammar points in this N-level">
                                <img src="${ICON_PATHS.trashSolid}" alt="Reset All">
                                <svg class="progress-circle" viewBox="0 0 38 38">
                                    <circle class="progress-circle-bg" cx="19" cy="19" r="16" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="3"></circle>
                                    <circle class="progress-circle-fg" cx="19" cy="19" r="16" fill="none" stroke="white" stroke-width="3" stroke-dasharray="100.53 100.53" stroke-dashoffset="100.53" transform="rotate(-90 19 19)"></svg>
                            </button>
                            <span class="toggle-icon">&#9654;</span>
                        </div>
                        <div class="n-level-content">
                `;

                data[nLevelKey].forEach((lesson, lessonIdx) => {
                    html += `
                        <div class="lesson" data-lesson-num="${lesson.lesson_num}" data-n-level-key="${nLevelKey}">
                            <div class="lesson-header">
                                <span>Lesson ${lesson.lesson_num}</span>
                                <span class="header-counts"></span>
                                <button class="mark-level-complete-btn lesson-btn" data-action-type="complete" data-level-type="lesson" data-n-level-key="${nLevelKey}" data-lesson-num="${lesson.lesson_num}" title="Press and hold to mark all grammar points in this lesson as complete">
                                    <img src="${ICON_PATHS.checkSolid}" alt="Complete Lesson">
                                    <svg class="progress-circle" viewBox="0 0 38 38">
                                        <circle class="progress-circle-bg" cx="19" cy="19" r="16" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="3"></circle>
                                        <circle class="progress-circle-fg" cx="19" cy="19" r="16" fill="none" stroke="white" stroke-width="3" stroke-dasharray="100.53 100.53" stroke-dashoffset="100.53" transform="rotate(-90 19 19)"></circle>
                                    </svg>
                                </button>
                                <button class="mark-level-reset-btn lesson-btn" data-action-type="reset" data-level-type="lesson" data-n-level-key="${nLevelKey}" data-lesson-num="${lesson.lesson_num}" title="Press and hold to reset all grammar points in this lesson">
                                    <img src="${ICON_PATHS.trashSolid}" alt="Reset Lesson">
                                    <svg class="progress-circle" viewBox="0 0 38 38">
                                        <circle class="progress-circle-bg" cx="19" cy="19" r="16" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="3"></circle>
                                        <circle class="progress-circle-fg" cx="19" cy="19" r="16" fill="none" stroke="white" stroke-width="3" stroke-dasharray="100.53 100.53" stroke-dashoffset="100.53" transform="rotate(-90 19 19)"></circle>
                                    </svg>
                                </button>
                                <span class="toggle-icon">&#9654;</span>
                            </div>
                            <div class="lesson-content">
                                <ul class="grammar-point-list">
                    `;

                    lesson.grammar_points.forEach((gp, gpIdx) => {
                        const gpId = generateGrammarPointId(nLevelKey, lesson.lesson_num, gpIdx);
                        const gpState = getGrammarPointState(gpId);
                        const itemClasses = ['grammar-point-item'];
                        if (gpState.bookmarked) itemClasses.push('bookmarked');
                        if (gpState.completed) itemClasses.push('completed');

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
        addGrammarPointActionListeners();
        addMarkLevelCompleteListeners();
    }

    function addGrammarPointActionListeners() {
        document.querySelectorAll('.grammar-point-wrapper').forEach(wrapper => {
            const grammarPointItem = wrapper.querySelector('.grammar-point-item');
            const gpId = grammarPointItem.dataset.gpId;
            renderActionButtons(grammarPointItem, gpId);
        });
    }

    function renderActionButtons(grammarPointItemElement, gpId) {
        const actionButtonsContainer = grammarPointItemElement.closest('.grammar-point-wrapper').querySelector('.action-buttons');
        const currentState = getGrammarPointState(gpId);
        actionButtonsContainer.innerHTML = '';

        const bookmarkBtn = document.createElement('button');
        const bookmarkImg = document.createElement('img');
        bookmarkImg.src = ICON_PATHS.bookmarkSolid;
        bookmarkImg.alt = 'Bookmark Icon';
        bookmarkBtn.appendChild(bookmarkImg);
        bookmarkBtn.title = currentState.bookmarked ? 'Unbookmark this grammar point' : 'Bookmark this grammar point';
        bookmarkBtn.classList.toggle('active-bookmark', currentState.bookmarked);
        bookmarkBtn.onclick = (e) => {
            e.stopPropagation();
            toggleBookmark(gpId, grammarPointItemElement);
        };
        actionButtonsContainer.appendChild(bookmarkBtn);

        const completeBtn = document.createElement('button');
        const checkImg = document.createElement('img');
        checkImg.src = ICON_PATHS.checkSolid;
        checkImg.alt = 'Checkmark Icon';
        completeBtn.appendChild(checkImg);
        completeBtn.title = currentState.completed ? 'Mark as incomplete' : 'Mark as complete';
        completeBtn.classList.toggle('active-complete', currentState.completed);
        completeBtn.onclick = (e) => {
            e.stopPropagation();
            toggleComplete(gpId, grammarPointItemElement);
        };
        actionButtonsContainer.appendChild(completeBtn);
    }

    // --- Mark Level Complete / Reset Button Logic (Unified) ---
    let holdTimers = new Map();

    function addMarkLevelCompleteListeners() {
        document.querySelectorAll('.mark-level-complete-btn, .mark-level-reset-btn').forEach(button => {
            let progressBarSVG = button.querySelector('.progress-circle');
            let progressBarFG = progressBarSVG ? progressBarSVG.querySelector('.progress-circle-fg') : null;
            let buttonIcon = button.querySelector('img');

            if (progressBarFG) {
                const circumference = progressBarFG.r.baseVal.value * 2 * Math.PI;
                progressBarFG.style.strokeDasharray = `${circumference} ${circumference}`;
                progressBarFG.style.strokeDashoffset = circumference;
                progressBarFG.style.transition = 'none';
                progressBarFG.style.opacity = '0';
            }
            if (buttonIcon) {
                 buttonIcon.style.transition = 'none';
                 buttonIcon.style.filter = 'invert(45%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(1.2)';
            }

            // Initialize state by simulating an endHold without completion
            endHold({target: button}, button, progressBarFG, buttonIcon, false);

            button.addEventListener('mousedown', (e) => startHold(e, button, progressBarFG, buttonIcon));
            button.addEventListener('touchstart', (e) => startHold(e, button, progressBarFG, buttonIcon), { passive: true });
            button.addEventListener('mouseup', (e) => endHold(e, button, progressBarFG, buttonIcon));
            button.addEventListener('mouseleave', (e) => endHold(e, button, progressBarFG, buttonIcon));
            button.addEventListener('touchend', (e) => endHold(e, button, progressBarFG, buttonIcon));
            button.addEventListener('touchcancel', (e) => endHold(e, button, progressBarFG, buttonIcon));
        });
    }

    function startHold(event, button, progressBarFG, buttonIcon) {
        if (event.button === 0 || event.type === 'touchstart') {
            event.preventDefault();

            const holdDuration = button.dataset.levelType === 'n-level' ? 3000 : 1000;
            const circumference = progressBarFG.r.baseVal.value * 2 * Math.PI;
            const actionType = button.dataset.actionType;

            const existingTimer = holdTimers.get(button);
            if (existingTimer) clearTimeout(existingTimer);

            button.classList.add('holding');
            if (progressBarFG) {
                progressBarFG.style.transition = 'none';
                progressBarFG.style.strokeDashoffset = circumference;
                progressBarFG.style.opacity = '0';
            }
            if (buttonIcon) {
                 buttonIcon.style.transition = 'none';
            }

            void button.offsetWidth; // Trigger reflow to reset transition

            if (progressBarFG) {
                progressBarFG.style.transition = `stroke-dashoffset ${holdDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.1s ease-in`;
                progressBarFG.style.strokeDashoffset = '0';
                progressBarFG.style.opacity = '1';
            }

            if (buttonIcon) {
                buttonIcon.style.transition = `filter ${holdDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
                if (actionType === 'complete') {
                    buttonIcon.style.filter = 'invert(61%) sepia(50%) saturate(350%) hue-rotate(70deg) brightness(100%) contrast(100%)';
                } else if (actionType === 'reset') {
                    buttonIcon.style.filter = 'invert(16%) sepia(90%) saturate(5833%) hue-rotate(357deg) brightness(98%) contrast(124%);'; // A more direct, vibrant red
                }
            }


            const timer = setTimeout(() => {
                const levelType = button.dataset.levelType;
                const nLevelKey = button.dataset.nLevelKey;
                const parentContainer = button.closest(`.${levelType}`);

                if (actionType === 'complete') {
                    if (levelType === 'n-level') {
                        markNLevelComplete(nLevelKey, parentContainer);
                    } else if (levelType === 'lesson') {
                        const lessonNum = parseInt(button.dataset.lessonNum);
                        markLessonComplete(nLevelKey, lessonNum, parentContainer);
                    }
                } else if (actionType === 'reset') {
                    if (levelType === 'n-level') {
                        resetNLevelProgress(nLevelKey, parentContainer);
                    } else if (levelType === 'lesson') {
                        const lessonNum = parseInt(button.dataset.lessonNum);
                        resetLessonProgress(nLevelKey, lessonNum, parentContainer);
                    }
                }
                endHold(event, button, progressBarFG, buttonIcon, true);
            }, holdDuration);

            holdTimers.set(button, timer);
        }
    }

    function endHold(event, button, progressBarFG, buttonIcon, completed = false) {
        const timer = holdTimers.get(button);
        if (timer) {
            clearTimeout(timer);
            holdTimers.delete(button);
        }

        button.classList.remove('holding');

        if (completed && buttonIcon) {
            buttonIcon.classList.remove('flash-white-icon');
            void buttonIcon.offsetWidth; // Trigger reflow
            buttonIcon.classList.add('flash-white-icon');
            buttonIcon.addEventListener('animationend', () => {
                buttonIcon.classList.remove('flash-white-icon');
            }, { once: true });
        }


        if (progressBarFG) {
            progressBarFG.style.transition = 'opacity 0.2s ease-out';
            progressBarFG.style.opacity = '0';
            if (!completed) { // Only reset progress bar if not completed the action
                const circumference = progressBarFG.r.baseVal.value * 2 * Math.PI;
                progressBarFG.style.strokeDashoffset = circumference;
            }
        }
        if (buttonIcon) {
            buttonIcon.style.transition = 'filter 0.2s ease-out';
            // Reset filter based on button state (completed/reset) or default
            const actionType = button.dataset.actionType;
            if (actionType === 'complete' && button.classList.contains('level-completed')) {
                // If it's a complete button and the level is actually completed, keep it green
                buttonIcon.style.filter = 'invert(61%) sepia(50%) saturate(350%) hue-rotate(70deg) brightness(100%) contrast(100%)';
            } else {
                // Otherwise, revert to default dim state
                buttonIcon.style.filter = 'invert(45%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(1.2)';
            }
        }
    }

    function markNLevelComplete(nLevelKey, nLevelContainerElement) {
        if (!allGrammarData[nLevelKey]) return;

        allGrammarData[nLevelKey].forEach(lesson => {
            lesson.grammar_points.forEach((gp, gpIdx) => {
                const gpId = generateGrammarPointId(nLevelKey, lesson.lesson_num, gpIdx);
                const currentState = getGrammarPointState(gpId);
                if (!currentState.completed) {
                    currentState.completed = true;
                    currentState.bookmarked = false;
                    updateGrammarPointState(gpId, currentState);

                    const gpItemElement = document.querySelector(`[data-gp-id="${gpId}"]`);
                    if (gpItemElement) {
                        gpItemElement.classList.add('completed');
                        gpItemElement.classList.remove('bookmarked');
                        renderActionButtons(gpItemElement, gpId);
                    }
                }
            });
        });

        if (nLevelContainerElement) {
            nLevelContainerElement.classList.remove('flash-animation');
            nLevelContainerElement.classList.remove('flash-red-animation');
            void nLevelContainerElement.offsetWidth;
            nLevelContainerElement.classList.add('flash-animation');
            nLevelContainerElement.addEventListener('animationend', () => {
                nLevelContainerElement.classList.remove('flash-animation');
            }, { once: true });
        }

        updateParentHeaderStates(nLevelContainerElement);
    }

    function markLessonComplete(nLevelKey, lessonNum, lessonContainerElement) {
        const nLevelData = allGrammarData[nLevelKey];
        if (!nLevelData) return;

        const lessonData = nLevelData.find(l => l.lesson_num === lessonNum);
        if (!lessonData) return;

        lessonData.grammar_points.forEach((gp, gpIdx) => {
            const gpId = generateGrammarPointId(nLevelKey, lessonNum, gpIdx);
            const currentState = getGrammarPointState(gpId);
            if (!currentState.completed) {
                currentState.completed = true;
                currentState.bookmarked = false;
                updateGrammarPointState(gpId, currentState);

                const gpItemElement = document.querySelector(`[data-gp-id="${gpId}"]`);
                if (gpItemElement) {
                    gpItemElement.classList.add('completed');
                    gpItemElement.classList.remove('bookmarked');
                    renderActionButtons(gpItemElement, gpId);
                }
            }
        });

        if (lessonContainerElement) {
            lessonContainerElement.classList.remove('flash-animation');
            lessonContainerElement.classList.remove('flash-red-animation');
            void lessonContainerElement.offsetWidth;
            lessonContainerElement.classList.add('flash-animation');
            lessonContainerElement.addEventListener('animationend', () => {
                lessonContainerElement.classList.remove('flash-animation');
            }, { once: true });
        }

        updateParentHeaderStates(lessonContainerElement);
    }

    function resetNLevelProgress(nLevelKey, nLevelContainerElement) {
        if (!allGrammarData[nLevelKey]) return;

        allGrammarData[nLevelKey].forEach(lesson => {
            lesson.grammar_points.forEach((gp, gpIdx) => {
                const gpId = generateGrammarPointId(nLevelKey, lesson.lesson_num, gpIdx);
                const currentState = getGrammarPointState(gpId);
                if (currentState.completed || currentState.bookmarked) {
                    currentState.completed = false;
                    currentState.bookmarked = false;
                    updateGrammarPointState(gpId, currentState);

                    const gpItemElement = document.querySelector(`[data-gp-id="${gpId}"]`);
                    if (gpItemElement) {
                        gpItemElement.classList.remove('completed');
                        gpItemElement.classList.remove('bookmarked');
                        renderActionButtons(gpItemElement, gpId);
                    }
                }
            });
        });

        if (nLevelContainerElement) {
            nLevelContainerElement.classList.remove('flash-animation');
            nLevelContainerElement.classList.remove('flash-red-animation');
            void nLevelContainerElement.offsetWidth;
            nLevelContainerElement.classList.add('flash-red-animation');
            nLevelContainerElement.addEventListener('animationend', () => {
                nLevelContainerElement.classList.remove('flash-red-animation');
            }, { once: true });
        }
        updateParentHeaderStates(nLevelContainerElement);
    }

    function resetLessonProgress(nLevelKey, lessonNum, lessonContainerElement) {
        const nLevelData = allGrammarData[nLevelKey];
        if (!nLevelData) return;

        const lessonData = nLevelData.find(l => l.lesson_num === lessonNum);
        if (!lessonData) return;

        lessonData.grammar_points.forEach((gp, gpIdx) => {
            const gpId = generateGrammarPointId(nLevelKey, lessonNum, gpIdx);
            const currentState = getGrammarPointState(gpId);
            if (currentState.completed || currentState.bookmarked) {
                currentState.completed = false;
                currentState.bookmarked = false;
                updateGrammarPointState(gpId, currentState);

                const gpItemElement = document.querySelector(`[data-gp-id="${gpId}"]`);
                if (gpItemElement) {
                    gpItemElement.classList.remove('completed');
                    gpItemElement.classList.remove('bookmarked');
                    renderActionButtons(gpItemElement, gpId);
                }
            }
        });

        if (lessonContainerElement) {
            lessonContainerElement.classList.remove('flash-animation');
            lessonContainerElement.classList.remove('flash-red-animation');
            void lessonContainerElement.offsetWidth;
            lessonContainerElement.classList.add('flash-red-animation');
            lessonContainerElement.addEventListener('animationend', () => {
                lessonContainerElement.classList.remove('flash-red-animation');
            }, { once: true });
        }
        updateParentHeaderStates(lessonContainerElement);
    }


    function addResetButton() {
        if (!document.getElementById('resetUserData')) {
            const resetButton = document.createElement('button');
            resetButton.id = 'resetUserData';
            const warningImg = document.createElement('img');
            warningImg.src = ICON_PATHS.warningTriangle;
            warningImg.alt = 'Warning Icon';
            resetButton.appendChild(warningImg);
            resetButton.appendChild(document.createTextNode('Reset All Saved Progress'));
            resetButton.addEventListener('click', resetAllUserData);
            document.querySelector('.container').appendChild(resetButton);
        }
    }

    // --- Accordion Toggle Functions ---
    function collapseSection(element, header) {
        element.style.height = element.scrollHeight + 'px';
        header.classList.remove('expanded');
        const toggleIcon = header.querySelector('.toggle-icon');

        requestAnimationFrame(() => {
            void element.offsetWidth;
            element.style.height = '0';
        });

        const onTransitionEnd = () => {
            element.removeEventListener('transitionend', onTransitionEnd);
            element.style.height = '';
            header.classList.remove('pulsing');
            if (toggleIcon) {
                toggleIcon.classList.remove('flash-white');
                void toggleIcon.offsetWidth;
                toggleIcon.classList.add('flash-white');
            }
        };
        element.addEventListener('transitionend', onTransitionEnd);
    }

    function expandSection(element, header) {
        element.style.height = 'auto';
        const height = element.scrollHeight;
        element.style.height = '0';
        header.classList.add('expanded');
        const toggleIcon = header.querySelector('.toggle-icon');

        requestAnimationFrame(() => {
            void element.offsetWidth;
            element.style.height = height + 'px';
        });

        const onTransitionEnd = () => {
            element.removeEventListener('transitionend', onTransitionEnd);
            element.style.height = 'auto';
            if (toggleIcon) {
                toggleIcon.classList.remove('flash-white');
                void toggleIcon.offsetWidth;
                toggleIcon.classList.add('flash-white');
            }
        };
        element.addEventListener('transitionend', onTransitionEnd);
    }

    function addToggleListeners() {
        document.querySelectorAll('.n-level-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('.mark-level-complete-btn') || e.target.closest('.mark-level-reset-btn')) {
                    e.stopPropagation();
                    return;
                }
                const nLevelContent = header.nextElementSibling;
                if (header.classList.contains('expanded')) {
                    collapseSection(nLevelContent, header);
                } else {
                    expandSection(nLevelContent, header);
                    header.classList.add('pulsing');
                }
            });
        });

        document.querySelectorAll('.lesson-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('.mark-level-complete-btn') || e.target.closest('.mark-level-reset-btn')) {
                    e.stopPropagation();
                    return;
                }
                const lessonContent = header.nextElementSibling;
                if (header.classList.contains('expanded')) {
                    collapseSection(lessonContent, header);
                } else {
                    expandSection(lessonContent, header);
                }
            });
        });
    }

    loadGrammarData();
});