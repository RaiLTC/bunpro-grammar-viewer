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
            updateParentHeaderStates();
            addResetButtonListener(); // Add listener for the new reset button
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

    // Activated: Reset All Data function
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
        let totalLessons = 0; // Only JLPT lessons
        let completedLessons = 0; // Only JLPT completed lessons
        let totalGrammarPoints = 0; // Only JLPT grammar points
        let completedGrammarPoints = 0; // Only JLPT completed grammar points
        let bookmarkedGrammarPoints = 0;

        let nonJlptLessons = 0;
        let nonJlptGrammarPoints = 0;
        let nonJlptCompletedGPs = 0;

        const nLevelStats = {};

        const nLevelOrder = ['N5', 'N4', 'N3', 'N2', 'N1', 'Non-JLPT', 'Unknown N-Level'];

        nLevelOrder.forEach(nLevelKey => {
            if (allGrammarData[nLevelKey] && allGrammarData[nLevelKey].length > 0) {

                // Only count JLPT levels for totalJlptLevels
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
                    let lessonGPsCount = 0; // Total GPs in this specific lesson
                    let lessonCompletedGPs = 0; // Completed GPs in this specific lesson


                    lesson.grammar_points.forEach((gp, gpIdx) => {
                        const gpId = generateGrammarPointId(nLevelKey, nLevelKeyLessonNum, gpIdx);
                        const state = getGrammarPointState(gpId);

                        if (nLevelKey === 'Non-JLPT') {
                            nonJlptGrammarPoints++;
                            if (state.completed) {
                                nonJlptCompletedGPs++;
                            }
                        } else {
                             // Only count JLPT grammar points towards totalGrammarPoints
                            if (nLevelKey !== 'Unknown N-Level') {
                                totalGrammarPoints++;
                                if (state.completed) {
                                    completedGrammarPoints++;
                                }
                            }
                        }

                        nLevelGPsCount++; // Count for current N-level

                        if (state.completed) {
                            nLevelCompletedGPs++;
                            lessonCompletedGPs++;
                        }
                        if (state.bookmarked) {
                            bookmarkedGrammarPoints++;
                            nLevelBookmarkedGPs++;
                        }
                        lessonGPsCount++; // Count for current lesson
                    });

                    // Check if current lesson is completed
                    if (lessonGPsCount > 0 && lessonCompletedGPs === lessonGPsCount) {
                        // Only count JLPT lessons towards completedLessons
                        if (nLevelKey !== 'Non-JLPT' && nLevelKey !== 'Unknown N-Level') {
                            completedLessons++;
                        }
                    }

                    // Only count JLPT lessons towards totalLessons
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
            nLevelStats
        };
    }

    function renderStatistics() {
        const stats = calculateStatistics();
        let statsHtml = `
            <div class="statistics-container">
                <h2>Statistics</h2>
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

        statsHtml += `
            <p>N-5 Lessons: <span class="stat-value">${n5Stats.lessons || 0}</span></p>
            <p>N5 Grammar Points: <span class="stat-value">${n5Stats.completedGrammarPoints || 0}/${n5Stats.grammarPoints || 0}</span></p>
            <p>Non-JLPT Lessons: <span class="stat-value">${nonJlptStats.lessons || 0}</span></p>

            <p>N-4 Lessons: <span class="stat-value">${n4Stats.lessons || 0}</span></p>
            <p>N4 Grammar Points: <span class="stat-value">${n4Stats.completedGrammarPoints || 0}/${n4Stats.grammarPoints || 0}</span></p>
            <p>Non-JLPT Grammar Points: <span class="stat-value">${nonJlptStats.completedGrammarPoints || 0}/${nonJlptStats.grammarPoints || 0}</span></p>

            <p>N-3 Lessons: <span class="stat-value">${n3Stats.lessons || 0}</span></p>
            <p>N3 Grammar Points: <span class="stat-value">${n3Stats.completedGrammarPoints || 0}/${n3Stats.grammarPoints || 0}</span></p>
            <div></div> <p>N-2 Lessons: <span class="stat-value">${n2Stats.lessons || 0}</span></p>
            <p>N2 Grammar Points: <span class="stat-value">${n2Stats.completedGrammarPoints || 0}/${n2Stats.grammarPoints || 0}</span></p>
            <div></div> <p>N-1 Lessons: <span class="stat-value">${n1Stats.lessons || 0}</span></p>
            <p>N1 Grammar Points: <span class="stat-value">${n1Stats.completedGrammarPoints || 0}/${n1Stats.grammarPoints || 0}</span></p>
            <div></div> `;

        // If 'Unknown N-Level' exists and has lessons, add it on its own row/lines
        if (stats.nLevelStats['Unknown N-Level'] && stats.nLevelStats['Unknown N-Level'].lessons > 0) {
            const unknownNLevelStats = stats.nLevelStats['Unknown N-Level'];
            statsHtml += `
                <p>Unknown N-Level Lessons: <span class="stat-value">${unknownNLevelStats.lessons || 0}</span></p>
                <p>Unknown N-Level Grammar Points: <span class="stat-value">${unknownNLevelStats.completedGrammarPoints || 0}/${unknownNLevelStats.grammarPoints || 0}</span></p>
                <div></div> `;
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
                    // Insert after the main text span
                    header.insertBefore(countSpan, header.children[1]); // Assuming 0 is the text span, 1 is where header-counts goes
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
                        // Insert after the main text span
                        lessonHeader.insertBefore(countSpan, lessonHeader.children[1]); // Assuming 0 is the text span, 1 is where header-counts goes
                    }
                    const completedGPs = lessonData.grammar_points.filter((gp, gpIdx) => {
                        const gpId = generateGrammarPointId(nLevelKey, lesson.lesson_num, gpIdx);
                        return getGrammarPointState(gpId).completed;
                    }).length;
                    countSpan.textContent = `${completedGPs}/${grammarPointsInLesson}`; // Changed: Removed "Grammar Points" text
                    const bookmarkedGPs = lessonData.grammar_points.filter((gp, gpIdx) => {
                        const gpId = generateGrammarPointId(nLevelKey, lesson.lesson_num, gpIdx);
                        return getGrammarPointState(gpId).bookmarked;
                    }).length;
                    const completeBtn = lessonHeader.querySelector('.mark-lesson-complete-btn'); // Corrected selector
                    if (completeBtn) {
                        completeBtn.classList.toggle('lesson-completed', completedGPs === grammarPointsInLesson && grammarPointsInLesson > 0); // Corrected class
                    }
                    const resetBtn = lessonHeader.querySelector('.mark-lesson-reset-btn'); // Corrected selector
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
                allChildrenCompleted = false; // If no grammar points, it's not "all complete"
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
                            <span class="header-counts"></span> <button class="mark-level-complete-btn n-level-btn" data-action-type="complete" data-level-type="n-level" data-n-level-key="${nLevelKey}">
                                <img src="${ICON_PATHS.checkSolid}" alt="Mark Level Complete">
                                <svg class="progress-circle" viewBox="0 0 36 36">
                                    <path class="progress-circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <path class="progress-circle-fill" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                </svg>
                            </button>
                            <button class="mark-level-reset-btn n-level-btn" data-action-type="reset" data-level-type="n-level" data-n-level-key="${nLevelKey}">
                                <img src="${ICON_PATHS.trashSolid}" alt="Reset Level Progress">
                            </button>
                            <img src="icons/chevron-right-solid.svg" alt="Toggle" class="toggle-icon">
                        </div>
                        <div class="n-level-content">
                `;

                data[nLevelKey].forEach(lesson => {
                    html += `
                            <div class="lesson" id="lesson-${nLevelKey.replace(/ /g, '-')}-${lesson.lesson_num}-container">
                                <div class="lesson-header">
                                    <span>Lesson ${lesson.lesson_num}</span>
                                    <span class="header-counts"></span> <button class="mark-lesson-complete-btn lesson-btn" data-action-type="complete" data-level-type="lesson" data-n-level-key="${nLevelKey}" data-lesson-num="${lesson.lesson_num}">
                                        <img src="${ICON_PATHS.checkSolid}" alt="Mark Lesson Complete">
                                        <svg class="progress-circle" viewBox="0 0 36 36">
                                            <path class="progress-circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                            <path class="progress-circle-fill" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                        </svg>
                                    </button>
                                    <button class="mark-lesson-reset-btn lesson-btn" data-action-type="reset" data-level-type="lesson" data-n-level-key="${nLevelKey}" data-lesson-num="${lesson.lesson_num}">
                                        <img src="${ICON_PATHS.trashSolid}" alt="Reset Lesson Progress">
                                    </button>
                                    <img src="icons/chevron-right-solid.svg" alt="Toggle" class="toggle-icon">
                                </div>
                                <div class="lesson-content">
                                    <ul class="grammar-point-list">
                    `;
                    lesson.grammar_points.forEach((gp, gpIdx) => {
                        const gpId = generateGrammarPointId(nLevelKey, lesson.lesson_num, gpIdx);
                        const state = getGrammarPointState(gpId);
                        const bookmarkedClass = state.bookmarked ? 'bookmarked' : '';
                        const completedClass = state.completed ? 'completed' : '';

                        html += `
                                        <li class="grammar-point-wrapper">
                                            <div class="grammar-point-item ${bookmarkedClass} ${completedClass}" data-gp-id="${gpId}">
                                                <p>${gp.title}</p>
                                                <div class="grammar-point-actions">
                                                    <button class="grammar-point-action-btn bookmark-btn" data-gp-id="${gpId}" data-action="bookmark">
                                                        <img src="${ICON_PATHS.bookmarkSolid}" alt="Bookmark">
                                                    </button>
                                                    <button class="grammar-point-action-btn complete-btn" data-gp-id="${gpId}" data-action="complete">
                                                        <img src="${ICON_PATHS.checkSolid}" alt="Complete">
                                                    </button>
                                                </div>
                                            </div>
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

    function addActionListeners() {
        document.querySelectorAll('.bookmark-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const gpId = button.dataset.gpId;
                const grammarPointItemElement = button.closest('.grammar-point-item');
                toggleBookmark(gpId, grammarPointItemElement);
            });
        });

        document.querySelectorAll('.complete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const gpId = button.dataset.gpId;
                const grammarPointItemElement = button.closest('.grammar-point-item');
                toggleComplete(gpId, grammarPointItemElement);
            });
        });

        document.querySelectorAll('.mark-level-complete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent header collapse
                handleMarkLevelComplete(button);
            });
        });

        document.querySelectorAll('.mark-level-reset-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent header collapse
                handleMarkLevelReset(button);
            });
        });

        document.querySelectorAll('.mark-lesson-complete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent header collapse
                handleMarkLessonComplete(button);
            });
        });

        document.querySelectorAll('.mark-lesson-reset-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent header collapse
                handleMarkLessonReset(button);
            });
        });
    }

    function handleMarkLevelComplete(button) {
        const nLevelKey = button.dataset.nLevelKey;
        const nLevelData = allGrammarData[nLevelKey];
        if (nLevelData) {
            let allCompleted = true;
            nLevelData.forEach(lesson => {
                lesson.grammar_points.forEach((gp, gpIdx) => {
                    const gpId = generateGrammarPointId(nLevelKey, lesson.lesson_num, gpIdx);
                    if (!getGrammarPointState(gpId).completed) {
                        allCompleted = false;
                    }
                });
            });

            const confirmMessage = allCompleted ?
                `This will unmark all grammar points in ${nLevelKey} as complete. Are you sure?` :
                `This will mark all grammar points in ${nLevelKey} as complete. Are you sure?`;

            if (confirm(confirmMessage)) {
                nLevelData.forEach(lesson => {
                    lesson.grammar_points.forEach((gp, gpIdx) => {
                        const gpId = generateGrammarPointId(nLevelKey, lesson.lesson_num, gpIdx);
                        updateGrammarPointState(gpId, { ...getGrammarPointState(gpId), completed: !allCompleted });
                    });
                });
                renderGrammarData(allGrammarData); // Re-render to update states visually
            }
        }
    }

    function handleMarkLevelReset(button) {
        const nLevelKey = button.dataset.nLevelKey;
        if (confirm(`Are you sure you want to reset all progress (completed and bookmarked) for ${nLevelKey}? This cannot be undone.`)) {
            const nLevelData = allGrammarData[nLevelKey];
            if (nLevelData) {
                nLevelData.forEach(lesson => {
                    lesson.grammar_points.forEach((gp, gpIdx) => {
                        const gpId = generateGrammarPointId(nLevelKey, lesson.lesson_num, gpIdx);
                        updateGrammarPointState(gpId, { bookmarked: false, completed: false });
                    });
                });
                renderGrammarData(allGrammarData); // Re-render to update states visually
            }
        }
    }

    function handleMarkLessonComplete(button) {
        const nLevelKey = button.dataset.nLevelKey;
        const lessonNum = parseInt(button.dataset.lessonNum);
        const lessonData = allGrammarData[nLevelKey].find(l => l.lesson_num === lessonNum);

        if (lessonData) {
            let allCompleted = true;
            lessonData.grammar_points.forEach((gp, gpIdx) => {
                const gpId = generateGrammarPointId(nLevelKey, lessonNum, gpIdx);
                if (!getGrammarPointState(gpId).completed) {
                    allCompleted = false;
                }
            });

            const confirmMessage = allCompleted ?
                `This will unmark all grammar points in Lesson ${lessonNum} as complete. Are you sure?` :
                `This will mark all grammar points in Lesson ${lessonNum} as complete. Are you sure?`;

            if (confirm(confirmMessage)) {
                lessonData.grammar_points.forEach((gp, gpIdx) => {
                    const gpId = generateGrammarPointId(nLevelKey, lessonNum, gpIdx);
                    updateGrammarPointState(gpId, { ...getGrammarPointState(gpId), completed: !allCompleted });
                });
                renderGrammarData(allGrammarData);
            }
        }
    }

    function handleMarkLessonReset(button) {
        const nLevelKey = button.dataset.nLevelKey;
        const lessonNum = parseInt(button.dataset.lessonNum);
        if (confirm(`Are you sure you want to reset all progress (completed and bookmarked) for Lesson ${lessonNum} in ${nLevelKey}? This cannot be undone.`)) {
            const lessonData = allGrammarData[nLevelKey].find(l => l.lesson_num === lessonNum);
            if (lessonData) {
                lessonData.grammar_points.forEach((gp, gpIdx) => {
                    const gpId = generateGrammarPointId(nLevelKey, lessonNum, gpIdx);
                    updateGrammarPointState(gpId, { bookmarked: false, completed: false });
                });
                renderGrammarData(allGrammarData);
            }
        }
    }


    // --- Expand/Collapse Logic ---
    function expandSection(contentElement, headerElement) {
        // Remove pulsing class when expanded
        headerElement.classList.remove('pulsing');

        contentElement.style.height = 'auto'; // Set to auto to calculate full height
        const contentHeight = contentElement.scrollHeight + 'px'; // Get the calculated scroll height
        contentElement.style.height = '0'; // Reset to 0 for transition
        // Use a timeout to ensure the browser registers the height: 0 before transitioning
        requestAnimationFrame(() => {
            contentElement.style.height = contentHeight; // Apply calculated height for transition
            contentElement.classList.add('expanded');
            headerElement.classList.add('expanded');
        });

        // Set 'auto' after transition to handle dynamic content changes
        contentElement.addEventListener('transitionend', function onTransitionEnd() {
            if (contentElement.classList.contains('expanded')) {
                contentElement.style.height = 'auto';
            }
            contentElement.removeEventListener('transitionend', onTransitionEnd);
        });
    }


    function collapseSection(contentElement, headerElement) {
        // Before collapsing, set height to its scrollHeight, then transition to 0
        contentElement.style.height = contentElement.scrollHeight + 'px';
        requestAnimationFrame(() => {
            contentElement.style.height = '0';
            contentElement.classList.remove('expanded');
            headerElement.classList.remove('expanded');
        });
    }

    function addToggleListeners() {
        document.querySelectorAll('.n-level-header').forEach(header => {
            header.addEventListener('click', (e) => {
                // Ensure clicks on buttons inside the header don't trigger expand/collapse
                if (e.target.closest('.mark-level-complete-btn') || e.target.closest('.mark-level-reset-btn')) {
                    e.stopPropagation();
                    return;
                }
                const nLevelContent = header.nextElementSibling;
                if (header.classList.contains('expanded')) {
                    collapseSection(nLevelContent, header);
                } else {
                    expandSection(nLevelContent, header);
                    header.classList.add('pulsing'); // Add pulsing effect only on expand
                }
            });
        });

        document.querySelectorAll('.lesson-header').forEach(header => {
            header.addEventListener('click', (e) => {
                // Ensure clicks on buttons inside the header don't trigger expand/collapse
                if (e.target.closest('.mark-lesson-complete-btn') || e.target.closest('.mark-lesson-reset-btn')) { // Corrected selectors
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

    // --- Long Press Listeners (for mark all complete/reset) ---
    const longPressDuration = 700; // milliseconds
    let pressTimer;

    function startPress(button, callback) {
        pressTimer = setTimeout(() => {
            callback(button); // Execute the long press action
            pressTimer = null; // Clear the timer
        }, longPressDuration);
    }

    function endPress() {
        clearTimeout(pressTimer);
        pressTimer = null;
    }

    function addLongPressListeners() {
        document.querySelectorAll('.mark-level-complete-btn, .mark-level-reset-btn, .mark-lesson-complete-btn, .mark-lesson-reset-btn').forEach(button => {
            const actionType = button.dataset.actionType;
            const levelType = button.dataset.levelType;

            // Determine the correct handler based on actionType and levelType
            const longPressHandler = (btn) => {
                if (actionType === 'complete') {
                    if (levelType === 'n-level') {
                        handleMarkLevelComplete(btn);
                    } else if (levelType === 'lesson') {
                        handleMarkLessonComplete(btn);
                    }
                } else if (actionType === 'reset') {
                    if (levelType === 'n-level') {
                        handleMarkLevelReset(btn);
                    } else if (levelType === 'lesson') {
                        handleMarkLessonReset(btn);
                    }
                }
            };

            button.addEventListener('mousedown', (e) => {
                if (e.button === 0) { // Only left-click
                    startPress(button, longPressHandler);
                }
            });
            button.addEventListener('mouseup', endPress);
            button.addEventListener('mouseleave', endPress); // If mouse leaves button during press
            button.addEventListener('touchstart', (e) => { // For mobile devices
                e.preventDefault(); // Prevent default touch behavior (e.g., scrolling)
                startPress(button, longPressHandler);
            }, { passive: false }); // Use passive: false to allow preventDefault
            button.addEventListener('touchend', endPress);
            button.addEventListener('touchcancel', endPress);
        });
    }

    loadGrammarData();
});