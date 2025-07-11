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
                <div class="stats-section">
                    <h2>Global Statistics</h2>
                    <div class="stats-grid">
                        <p>N-Levels: <span class="stat-value">${stats.completedJlptLevels}/${stats.totalJlptLevels}</span></p>
                        <p>Total Lessons: <span class="stat-value">${stats.completedLessons}/${stats.totalLessons}</span></p>
                        <p>Total Grammar Points: <span class="stat-value">${stats.completedGrammarPoints}/${stats.totalGrammarPoints}</span></p>
                        <p>Bookmarked: <span class="stat-value">${stats.bookmarkedGrammarPoints}</span></p>
                    </div>
                </div>
                <div class="stats-section">
                    <h2>Detailed JLPT Statistics</h2>
                    <div class="stats-grid">
        `;

        const jlptLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
        jlptLevels.forEach(nLevelKey => {
            const nLevelStat = stats.nLevelStats[nLevelKey];
            if (nLevelStat && nLevelStat.grammarPoints > 0) { // Only show if N-level has grammar points
                statsHtml += `
                    <p>${nLevelKey} Lessons: <span class="stat-value">${nLevelStat.lessons}</span></p>
                    <p>${nLevelKey} Grammar Points: <span class="stat-value">${nLevelStat.completedGrammarPoints}/${nLevelStat.grammarPoints}</span></p>
                `;
            }
        });

        if (stats.nLevelStats['Non-JLPT'] && stats.nLevelStats['Non-JLPT'].lessons > 0) {
            statsHtml += `
                <p>Non-JLPT Lessons: <span class="stat-value">${stats.nonJlptLessons}</span></p>
                <p>Non-JLPT Grammar Points: <span class="stat-value">${stats.nonJlptCompletedGPs}/${stats.nonJlptGrammarPoints}</span></p>
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

    function addResetButton() {
        const resetContainer = document.createElement('div');
        resetContainer.id = 'resetUserDataContainer';
        resetContainer.innerHTML = `
            <button id="resetAllProgressBtn">Reset All Saved Progress</button>
        `;
        // Insert it after the main heading but before the grammar content or statistics
        const mainHeading = document.querySelector('h1');
        if (mainHeading) {
            mainHeading.after(resetContainer);
        } else {
            containerDiv.prepend(resetContainer);
        }

        document.getElementById('resetAllProgressBtn').addEventListener('click', resetAllUserData);
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
                    // Insert into the new header-right-controls div
                    header.querySelector('.header-right-controls').insertBefore(countSpan, header.querySelector('.mark-level-complete-btn'));
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
                        // Insert into the new header-right-controls div
                        lessonHeader.querySelector('.header-right-controls').insertBefore(countSpan, lessonHeader.querySelector('.mark-level-complete-btn'));
                    }
                    const completedGPs = lessonData.grammar_points.filter((gp, gpIdx) => {
                        const gpId = generateGrammarPointId(nLevelKey, lesson.lesson_num, gpIdx);
                        return getGrammarPointState(gpId).completed;
                    }).length;
                    countSpan.textContent = `${completedGPs}/${grammarPointsInLesson} Grammar Points`;

                    const bookmarkedGPs = lessonData.grammar_points.filter((gp, gpIdx) => {
                        const gpId = generateGrammarPointId(nLevelKey, lesson.lesson_num, gpIdx);
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
                            <div class="header-right-controls">
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
                                <span class="header-counts"></span>
                                <span class="toggle-icon">&#9654;</span>
                            </div>
                        </div>
                        <div class="n-level-content">
                `;
                data[nLevelKey].forEach((lesson, lessonIdx) => {
                    html += `
                            <div class="lesson" data-lesson-num="${lesson.lesson_num}" data-n-level-key="${nLevelKey}">
                                <div class="lesson-header">
                                    <span>Lesson ${lesson.lesson_num}</span>
                                    <div class="header-right-controls">
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
                                        <span class="header-counts"></span>
                                        <span class="toggle-icon">&#9654;</span>
                                    </div>
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

    // Existing functions for expand/collapse and mark complete/reset
    function collapseSection(element, header) {
        const sectionHeight = element.scrollHeight;
        const elementTransition = element.style.transition;
        element.style.transition = '';

        requestAnimationFrame(() => {
            element.style.height = sectionHeight + 'px';
            element.style.transition = elementTransition;
            requestAnimationFrame(() => {
                element.style.height = '0px';
            });
        });
        header.classList.remove('expanded');
        element.addEventListener('transitionend', onTransitionEnd);
    }

    function expandSection(element, header) {
        const sectionHeight = element.scrollHeight;
        element.style.height = sectionHeight + 'px';
        header.classList.add('expanded');
        element.addEventListener('transitionend', onTransitionEnd);
    }

    function onTransitionEnd(e) {
        if (e.propertyName === 'height') {
            e.target.removeEventListener('transitionend', onTransitionEnd);
            if (e.target.style.height !== '0px') {
                e.target.style.height = null; // Remove explicit height after expansion
            }
        }
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

    function addMarkLevelCompleteListeners() {
        // Handle press-and-hold for complete/reset buttons
        let pressTimer;
        const holdDuration = 1000; // 1 second

        document.querySelectorAll('.mark-level-complete-btn, .mark-level-reset-btn').forEach(button => {
            button.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return; // Only react to left click
                button.classList.add('holding');
                const progressCircleFg = button.querySelector('.progress-circle-fg');
                if (progressCircleFg) {
                    progressCircleFg.style.transitionDuration = `${holdDuration / 1000}s`;
                    progressCircleFg.style.strokeDashoffset = '0';
                }

                pressTimer = setTimeout(() => {
                    button.classList.remove('holding'); // Remove holding class immediately after timeout for visual reset
                    if (progressCircleFg) {
                        progressCircleFg.style.transitionDuration = '0s'; // Reset transition
                        progressCircleFg.style.strokeDashoffset = '100.53'; // Reset dashoffset
                    }
                    performLevelAction(button);
                }, holdDuration);
            });

            button.addEventListener('mouseup', () => {
                clearTimeout(pressTimer);
                button.classList.remove('holding');
                const progressCircleFg = button.querySelector('.progress-circle-fg');
                if (progressCircleFg) {
                    progressCircleFg.style.transitionDuration = '0.1s'; // Quick reset animation
                    progressCircleFg.style.strokeDashoffset = '100.53'; // Reset dashoffset
                }
            });

            button.addEventListener('mouseleave', () => {
                clearTimeout(pressTimer);
                button.classList.remove('holding');
                const progressCircleFg = button.querySelector('.progress-circle-fg');
                if (progressCircleFg) {
                    progressCircleFg.style.transitionDuration = '0.1s'; // Quick reset animation
                    progressCircleFg.style.strokeDashoffset = '100.53'; // Reset dashoffset
                }
            });
        });
    }

    function performLevelAction(button) {
        const actionType = button.dataset.actionType; // 'complete' or 'reset'
        const levelType = button.dataset.levelType;   // 'n-level' or 'lesson'
        const nLevelKey = button.dataset.nLevelKey;
        const lessonNum = button.dataset.lessonNum ? parseInt(button.dataset.lessonNum) : null;

        let itemsToUpdate = [];

        if (levelType === 'n-level' && allGrammarData[nLevelKey]) {
            allGrammarData[nLevelKey].forEach(lesson => {
                lesson.grammar_points.forEach((gp, gpIdx) => {
                    itemsToUpdate.push(generateGrammarPointId(nLevelKey, lesson.lesson_num, gpIdx));
                });
            });
        } else if (levelType === 'lesson' && nLevelKey && lessonNum && allGrammarData[nLevelKey]) {
            const lessonData = allGrammarData[nLevelKey].find(l => l.lesson_num === lessonNum);
            if (lessonData) {
                lessonData.grammar_points.forEach((gp, gpIdx) => {
                    itemsToUpdate.push(generateGrammarPointId(nLevelKey, lessonData.lesson_num, gpIdx));
                });
            }
        }

        itemsToUpdate.forEach(gpId => {
            const currentState = getGrammarPointState(gpId);
            let newState = { ...currentState };
            if (actionType === 'complete') {
                newState.completed = true;
            } else if (actionType === 'reset') {
                newState.completed = false;
                newState.bookmarked = false; // Reset bookmarks too on level reset
            }
            updateGrammarPointState(gpId, newState);
        });

        // Visually update affected elements
        itemsToUpdate.forEach(gpId => {
            const grammarPointItemElement = document.querySelector(`[data-gp-id="${gpId}"]`);
            if (grammarPointItemElement) {
                const state = getGrammarPointState(gpId);
                grammarPointItemElement.classList.toggle('completed', state.completed);
                grammarPointItemElement.classList.toggle('bookmarked', state.bookmarked);
                renderActionButtons(grammarPointItemElement, gpId);
            }
        });

        // Trigger updates for parent headers after bulk action
        updateParentHeaderStates();
    }


    function renderActionButtons(grammarPointItemElement, gpId) {
        const actionButtonsContainer = grammarPointItemElement.closest('.grammar-point-wrapper').querySelector('.action-buttons');
        const currentState = getGrammarPointState(gpId);

        let buttonHtml = ``;
        if (currentState.completed) {
            buttonHtml += `<button class="action-btn unmark-complete-btn" data-gp-id="${gpId}" title="Unmark as Complete">
                                <img src="${ICON_PATHS.checkSolid}" alt="Unmark Complete">
                            </button>`;
        } else {
            buttonHtml += `<button class="action-btn mark-complete-btn" data-gp-id="${gpId}" title="Mark as Complete">
                                <img src="${ICON_PATHS.checkSolid}" alt="Mark Complete">
                            </button>`;
        }

        if (currentState.bookmarked) {
            buttonHtml += `<button class="action-btn unbookmark-btn" data-gp-id="${gpId}" title="Remove Bookmark">
                                <img src="${ICON_PATHS.bookmarkSolid}" alt="Unbookmark">
                            </button>`;
        } else {
            buttonHtml += `<button class="action-btn bookmark-btn" data-gp-id="${gpId}" title="Bookmark">
                                <img src="${ICON_PATHS.bookmarkSolid}" alt="Bookmark">
                            </button>`;
        }

        actionButtonsContainer.innerHTML = buttonHtml;

        // Re-attach listeners for newly rendered buttons
        actionButtonsContainer.querySelectorAll('.mark-complete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gpId = btn.dataset.gpId;
                toggleComplete(gpId, grammarPointItemElement);
            });
        });

        actionButtonsContainer.querySelectorAll('.unmark-complete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gpId = btn.dataset.gpId;
                toggleComplete(gpId, grammarPointItemElement);
            });
        });

        actionButtonsContainer.querySelectorAll('.bookmark-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gpId = btn.dataset.gpId;
                toggleBookmark(gpId, grammarPointItemElement);
            });
        });

        actionButtonsContainer.querySelectorAll('.unbookmark-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gpId = btn.dataset.gpId;
                toggleBookmark(gpId, grammarPointItemElement);
            });
        });
    }

    loadGrammarData();
});