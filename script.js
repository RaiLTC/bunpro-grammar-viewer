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
            // Using a simple alert for now as per previous implementation, consider a custom modal for better UX.
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
        const changedElement = document.querySelector(`[data-gp-id="${gpId}"]`);
        if (changedElement) {
            updateParentHeaderStates(changedElement);
        } else {
            updateParentHeaderStates(); // If element not found, re-check all headers
        }
    }

    function toggleBookmark(gpId, grammarPointItemElement) {
        const currentState = getGrammarPointState(gpId);
        currentState.bookmarked = !currentState.bookmarked;
        updateGrammarPointState(gpId, currentState);

        // Update classes on the grammar point item itself
        grammarPointItemElement.classList.toggle('bookmarked', currentState.bookmarked);
        // Re-render action buttons to update their state/icon
        renderActionButtons(grammarPointItemElement, gpId);
    }

    function toggleComplete(gpId, grammarPointItemElement) {
        const currentState = getGrammarPointState(gpId);
        currentState.completed = !currentState.completed;
        updateGrammarPointState(gpId, currentState);

        // Update classes on the grammar point item itself
        grammarPointItemElement.classList.toggle('completed', currentState.completed);
        // Re-render action buttons to update their state/icon
        renderActionButtons(grammarPointItemElement, gpId);
    }

    // New: Reset All Data function with confirmation
    function resetAllUserData() {
        // Using confirm() as per previous implementation, consider a custom modal for better UX.
        if (confirm("Are you sure you want to reset ALL your saved progress (bookmarks and completed items)? This action cannot be undone.")) {
            userProgress = {}; // Clear all progress
            localStorage.removeItem(LOCAL_STORAGE_KEY); // Remove from local storage
            alert("All user data has been reset."); // Inform user
            location.reload(); // Reload page to reflect changes
        }
    }

    // New: Add event listener for the global reset button
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

        let unknownNLevelLessons = 0;
        let unknownNLevelGrammarPoints = 0;
        let unknownNLevelCompletedGPs = 0;


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
                        } else if (nLevelKey === 'Unknown N-Level') {
                            unknownNLevelGrammarPoints++;
                            if (state.completed) {
                                unknownNLevelCompletedGPs++;
                            }
                        }
                        else {
                             // Only count JLPT grammar points towards totalGrammarPoints
                            totalGrammarPoints++;
                            if (state.completed) {
                                completedGrammarPoints++;
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
            <div></div> <p>N-2 Lessons: <span class="stat-value">${n2Stats.lessons || 0}</span></p>
            <p>N2 Grammar Points: <span class="stat-value">${n2Stats.completedGrammarPoints || 0}/${n2Stats.grammarPoints || 0}</span></p>
            <div></div> <p>N-1 Lessons: <span class="stat-value">${n1Stats.lessons || 0}</span></p>
            <p>N1 Grammar Points: <span class="stat-value">${n1Stats.completedGrammarPoints || 0}/${n1Stats.grammarPoints || 0}</span></p>
            <div></div> `;

        // If 'Unknown N-Level' exists and has lessons, add it on its own row/lines
        if (unknownNLevelStats.lessons > 0) {
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
            existingStatsContainer.outerHTML = statsHtml; // Replace existing container
        } else {
            containerDiv.insertAdjacentHTML('afterbegin', statsHtml); // Insert if not exists
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
                    // Insert after the main text span (first child)
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
                    resetBtn.style.display = hasProgress ? 'flex' : 'none'; // Show/hide reset button based on progress
                }
            }
        });

        document.querySelectorAll('.lesson').forEach(lessonDiv => {
            const lessonHeader = lessonDiv.querySelector('.lesson-header');
            const nLevelContainer = lessonDiv.closest('.n-level');
            const nLevelKey = nLevelContainer.id.replace('n-level-', '').replace(/-/g, ' ');
            // Extract lesson number from the header text, assuming format "Lesson X"
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
                        // Insert after the main text span (first child)
                        lessonHeader.insertBefore(countSpan, lessonHeader.children[1]);
                    }
                    const completedGPs = lessonData.grammar_points.filter((gp, gpIdx) => {
                        const gpId = generateGrammarPointId(nLevelKey, lessonData.lesson_num, gpIdx); // Use lessonData.lesson_num
                        return getGrammarPointState(gpId).completed;
                    }).length;
                    countSpan.textContent = `${completedGPs}/${grammarPointsInLesson}`; // Displays "X/Y"

                    const bookmarkedGPs = lessonData.grammar_points.filter((gp, gpIdx) => {
                        const gpId = generateGrammarPointId(nLevelKey, lessonData.lesson_num, gpIdx); // Use lessonData.lesson_num
                        return getGrammarPointState(gpId).bookmarked;
                    }).length;

                    const completeBtn = lessonHeader.querySelector('.mark-lesson-complete-btn');
                    if (completeBtn) {
                        completeBtn.classList.toggle('lesson-completed', completedGPs === grammarPointsInLesson && grammarPointsInLesson > 0);
                    }
                     const resetBtn = lessonHeader.querySelector('.mark-lesson-reset-btn');
                    if (resetBtn) {
                        const hasProgress = completedGPs > 0 || bookmarkedGPs > 0;
                        resetBtn.style.display = hasProgress ? 'flex' : 'none'; // Show/hide reset button based on progress
                    }
                }
            }
        });
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
                            <span>${nLevelKey} Grammar</span>
                            <span class="header-counts"></span> <button class="mark-level-complete-btn" data-action-type="complete" data-level-type="n-level" data-n-level-key="${nLevelKey}" title="Press and hold to mark all grammar points in this N-level as complete">
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
                                    <span class="header-counts"></span> <button class="mark-lesson-complete-btn" data-action-type="complete" data-level-type="lesson" data-n-level-key="${nLevelKey}" data-lesson-num="${lesson.lesson_num}" title="Press and hold to mark all grammar points in this lesson as complete">
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
        addToggleListeners(); // Add listeners for expanding/collapsing sections
        addActionListeners(); // Add listeners for individual grammar point actions
        addLongPressListeners(); // Add listeners for the new long-press buttons
    }

    // --- Action Button Listeners (Individual Grammar Points) ---
    function addActionListeners() {
        document.querySelectorAll('.grammar-point-wrapper').forEach(wrapper => {
            const grammarPointItem = wrapper.querySelector('.grammar-point-item');
            const gpId = grammarPointItem.dataset.gpId;
            const actionButtonsDiv = wrapper.querySelector('.action-buttons');
            renderActionButtons(grammarPointItem, gpId, actionButtonsDiv); // Render buttons for each grammar point
        });
    }

    function renderActionButtons(grammarPointItem, gpId, actionButtonsDiv = null) {
        if (!actionButtonsDiv) {
            actionButtonsDiv = grammarPointItem.nextElementSibling; // Assuming it's the next sibling div
            if (!actionButtonsDiv || !actionButtonsDiv.classList.contains('action-buttons')) {
                console.error("Action buttons div not found for grammar point:", gpId);
                return;
            }
        }
        actionButtonsDiv.innerHTML = ''; // Clear existing buttons to re-render

        const state = getGrammarPointState(gpId);

        // Bookmark button
        const bookmarkButton = document.createElement('button');
        bookmarkButton.classList.add('bookmark-btn');
        if (state.bookmarked) {
            bookmarkButton.classList.add('bookmarked');
        }
        bookmarkButton.innerHTML = `<img src="${ICON_PATHS.bookmarkSolid}" alt="Bookmark">`;
        bookmarkButton.title = state.bookmarked ? "Remove Bookmark" : "Bookmark this grammar point";
        bookmarkButton.addEventListener('click', () => toggleBookmark(gpId, grammarPointItem));
        actionButtonsDiv.appendChild(bookmarkButton);

        // Complete button
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
    const holdTimers = new Map(); // Maps element to its setTimeout ID
    const holdProgressBar = new Map(); // Maps element to its progress bar SVG element
    const holdButtonIcon = new Map(); // Maps element to its icon image element

    const N_LEVEL_HOLD_DURATION = 3000; // 3 seconds for N-level
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

            const startPress = () => {
                button.classList.add('holding');
                buttonIcon.style.filter = 'brightness(2)'; // Brighter icon when holding
                progressBarFg.style.transition = 'none'; // Reset transition instantly
                progressBarFg.style.strokeDashoffset = '100.53'; // Fully hidden
                progressBarFg.style.opacity = '1';

                // Force reflow to ensure reset is applied before starting new transition
                void progressBarFg.offsetWidth;

                progressBarFg.style.transition = `stroke-dashoffset ${holdDuration}ms linear, opacity ${holdDuration / 3}ms ease-out`;
                progressBarFg.style.strokeDashoffset = '0'; // Start filling

                pressTimer = setTimeout(() => {
                    button.classList.remove('holding');
                    buttonIcon.style.removeProperty('filter');
                    progressBarFg.style.opacity = '0';
                    executeLongPressAction(button);
                }, holdDuration);
                holdTimers.set(button, pressTimer);
            };

            const endPress = () => {
                clearTimeout(holdTimers.get(button));
                holdTimers.delete(button);

                // Stop animation and reset immediately
                button.classList.remove('holding');
                buttonIcon.style.removeProperty('filter');
                progressBarFg.style.transition = 'none';
                progressBarFg.style.strokeDashoffset = '100.53'; // Reset to hidden
                progressBarFg.style.opacity = '0';

                // Add a small delay for icon to reset filter if it was mid-animation
                if (buttonIcon.classList.contains('flash-white-icon')) {
                    buttonIcon.classList.remove('flash-white-icon');
                    void buttonIcon.offsetWidth; // Trigger reflow
                    buttonIcon.classList.add('flash-white-icon');
                }
            };

            button.addEventListener('mousedown', startPress);
            button.addEventListener('touchstart', startPress, { passive: true }); // Use passive for touch events

            button.addEventListener('mouseup', endPress);
            button.addEventListener('mouseleave', endPress); // If mouse leaves button while holding
            button.addEventListener('touchend', endPress);
            button.addEventListener('touchcancel', endPress);
        });
    }

    function executeLongPressAction(button) {
        const actionType = button.dataset.actionType; // 'complete' or 'reset'
        const levelType = button.dataset.levelType;   // 'n-level' or 'lesson'
        const nLevelKey = button.dataset.nLevelKey;
        const lessonNum = button.dataset.lessonNum; // Only present for lesson buttons

        button.querySelector('img').classList.add('flash-white-icon');
        setTimeout(() => {
            button.querySelector('img').classList.remove('flash-white-icon');
        }, 300); // Match animation duration

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
                    updateGrammarPointState(gpId, currentState);
                    grammarPointsUpdated++;
                }
            });
        });

        if (grammarPointsUpdated > 0) {
            console.log(`Marked ${grammarPointsUpdated} grammar points in ${nLevelKey} as complete.`);
            updateParentHeaderStates();
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
                    updateGrammarPointState(gpId, currentState);
                    grammarPointsUpdated++;
                }
            });
        });

        if (grammarPointsUpdated > 0) {
            console.log(`Reset ${grammarPointsUpdated} grammar points in ${nLevelKey}.`);
            updateParentHeaderStates();
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
                updateGrammarPointState(gpId, currentState);
                grammarPointsUpdated++;
            }
        });

        if (grammarPointsUpdated > 0) {
            console.log(`Marked ${grammarPointsUpdated} grammar points in ${nLevelKey} Lesson ${lessonNum} as complete.`);
            updateParentHeaderStates();
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
                updateGrammarPointState(gpId, currentState);
                grammarPointsUpdated++;
            }
        });

        if (grammarPointsUpdated > 0) {
            console.log(`Reset ${grammarPointsUpdated} grammar points in ${nLevelKey} Lesson ${lessonNum}.`);
            updateParentHeaderStates();
        }
    }


    // --- Section Expansion/Collapse Logic ---
    function addToggleListeners() {
        document.querySelectorAll('.n-level-header').forEach(header => {
            header.addEventListener('click', (e) => {
                // Prevent click on header from triggering toggle if a button within it was clicked
                if (e.target.closest('button')) {
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

            header.addEventListener('animationend', (e) => {
                if (e.animationName === 'pulse-header') {
                    header.classList.remove('pulsing');
                }
            });
        });

        document.querySelectorAll('.lesson-header').forEach(header => {
            header.addEventListener('click', (e) => {
                 // Prevent click on header from triggering toggle if a button within it was clicked
                if (e.target.closest('button')) {
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

    function expandSection(element, header) {
        const sectionType = element.classList.contains('n-level-content') ? 'n-level' : 'lesson';
        // Before expanding, ensure it's not set to height: 0
        element.style.height = 'auto'; // Set to auto to measure full height

        const contentHeight = element.scrollHeight; // Get the natural height of the content

        element.style.height = '0px'; // Set back to 0 to prepare for transition
        void element.offsetWidth; // Trigger reflow to ensure the height:0 is applied
        element.style.height = `${contentHeight}px`; // Animate to full height

        header.classList.add('expanded');
        header.querySelector('.toggle-icon').innerHTML = '&#9660;'; // Down arrow

        // Once transition is complete, remove fixed height for flexible content
        const onTransitionEnd = () => {
            if (element.style.height === `${contentHeight}px`) {
                element.style.height = 'auto'; // Allow content to adjust if dynamic
            }
            element.removeEventListener('transitionend', onTransitionEnd);
        };
        element.addEventListener('transitionend', onTransitionEnd);

        // If it's an N-level, and it's being expanded, collapse other N-levels
        if (sectionType === 'n-level') {
            document.querySelectorAll('.n-level-header.expanded').forEach(otherHeader => {
                if (otherHeader !== header) {
                    collapseSection(otherHeader.nextElementSibling, otherHeader);
                }
            });
        }
    }

    function collapseSection(element, header) {
        const sectionType = element.classList.contains('n-level-content') ? 'n-level' : 'lesson';
        // Set a fixed height before transitioning to 0
        element.style.height = `${element.scrollHeight}px`;
        void element.offsetWidth; // Trigger reflow
        element.style.height = '0px';

        header.classList.remove('expanded');
        header.querySelector('.toggle-icon').innerHTML = '&#9654;'; // Right arrow

        // Remove the 'pulsing' class immediately if collapsing an N-level
        if (sectionType === 'n-level' && header.classList.contains('pulsing')) {
            header.classList.remove('pulsing');
        }

        const onTransitionEnd = () => {
            // Clean up: Ensure height is 0 and remove listener
            if (element.style.height === '0px') {
                 // Nothing specific to do, height is already 0
            }
            element.removeEventListener('transitionend', onTransitionEnd);
        };
        element.addEventListener('transitionend', onTransitionEnd);
    }


    loadGrammarData();
});