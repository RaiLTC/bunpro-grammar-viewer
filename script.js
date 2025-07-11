document.addEventListener('DOMContentLoaded', () => {
    const grammarContentDiv = document.getElementById('grammar-content');
    const containerDiv = document.querySelector('.container'); // Get the main container for prepending stats

    const LOCAL_STORAGE_KEY = 'bunproGrammarProgress';
    let userProgress = {}; // In-memory store for user progress

    const ICON_PATHS = {
        bookmarkSolid: 'icons/bookmark-solid.svg',
        checkSolid: 'icons/check-solid.svg',
        warningTriangle: 'icons/warning-triangle.svg'
    };

    let allGrammarData = []; // Store loaded grammar data globally

    async function loadGrammarData() {
        try {
            const response = await fetch('bunpro_grammar_data.json');
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`HTTP error! status: ${response.status}, text: ${errorText}`);
                throw new Error(`Failed to load grammar data: ${response.statusText}`);
            }
            allGrammarData = await response.json(); // Store the data
            loadUserProgress();
            renderStatistics(); // Render statistics first
            renderGrammarData(allGrammarData); // Then render grammar data
            addResetButton();
            updateParentHeaderStates(); // Initial update of headers based on loaded progress
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
            userProgress = {}; // Reset if parsing fails
            localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupt data
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
        // Default to false for both if not found
        return userProgress[gpId] || { bookmarked: false, completed: false };
    }

    function updateGrammarPointState(gpId, state) {
        userProgress[gpId] = state;
        saveUserProgress();
        renderStatistics(); // Update stats whenever a grammar point state changes
        updateParentHeaderStates(document.querySelector(`[data-gp-id="${gpId}"]`)); // Update relevant headers
    }

    // Modified toggle functions to allow both states
    function toggleBookmark(gpId, grammarPointItemElement) {
        const currentState = getGrammarPointState(gpId);
        currentState.bookmarked = !currentState.bookmarked;
        updateGrammarPointState(gpId, currentState);

        grammarPointItemElement.classList.toggle('bookmarked', currentState.bookmarked);
        // Completed class remains if true, but bookmark visual style overrides
        grammarPointItemElement.classList.toggle('completed', currentState.completed);
        renderActionButtons(grammarPointItemElement, gpId);
    }

    function toggleComplete(gpId, grammarPointItemElement) {
        const currentState = getGrammarPointState(gpId);
        currentState.completed = !currentState.completed;
        updateGrammarPointState(gpId, currentState);

        grammarPointItemElement.classList.toggle('completed', currentState.completed);
        // Bookmarked class remains if true
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
        let totalLevels = 0;
        let completedLevels = 0;
        let totalLessons = 0;
        let completedLessons = 0;
        let totalGrammarPoints = 0;
        let completedGrammarPoints = 0;
        let bookmarkedGrammarPoints = 0;

        const nLevelStats = {}; // To store stats for each N-level

        const nLevelOrder = ['N5', 'N4', 'N3', 'N2', 'N1', 'Non-JLPT', 'Unknown N-Level'];

        nLevelOrder.forEach(nLevelKey => {
            if (allGrammarData[nLevelKey] && allGrammarData[nLevelKey].length > 0) {
                totalLevels++;
                let nLevelLessonsCount = 0;
                let nLevelGPsCount = 0;
                let nLevelCompletedGPs = 0;
                let nLevelBookmarkedGPs = 0;

                allGrammarData[nLevelKey].forEach(lesson => {
                    totalLessons++;
                    nLevelLessonsCount++;
                    let lessonGPsCount = 0;
                    let lessonCompletedGPs = 0;

                    lesson.grammar_points.forEach((gp, gpIdx) => {
                        const gpId = generateGrammarPointId(nLevelKey, lesson.lesson_num, gpIdx);
                        const state = getGrammarPointState(gpId);

                        totalGrammarPoints++;
                        nLevelGPsCount++;
                        lessonGPsCount++;

                        if (state.completed) {
                            completedGrammarPoints++;
                            nLevelCompletedGPs++;
                            lessonCompletedGPs++;
                        }
                        if (state.bookmarked) {
                            bookmarkedGrammarPoints++;
                            nLevelBookmarkedGPs++;
                        }
                    });

                    if (lessonCompletedGPs === lessonGPsCount && lessonGPsCount > 0) {
                        completedLessons++;
                    }
                });

                if (nLevelCompletedGPs === nLevelGPsCount && nLevelGPsCount > 0) {
                    completedLevels++;
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
            totalLevels,
            completedLevels,
            totalLessons,
            completedLessons,
            totalGrammarPoints,
            completedGrammarPoints,
            bookmarkedGrammarPoints,
            nLevelStats
        };
    }

    function renderStatistics() {
        const stats = calculateStatistics();
        let statsHtml = `
            <div class="statistics-container">
                <h2>Statistics</h2>
                <div class="stats-grid">
                    <p>Levels Completed: <span class="stat-value">${stats.completedLevels}/${stats.totalLevels}</span></p>
                    <p>Lessons Completed: <span class="stat-value">${stats.completedLessons}/${stats.totalLessons}</span></p>
                    <p>Grammar Points Completed: <span class="stat-value">${stats.completedGrammarPoints}/${stats.totalGrammarPoints}</span></p>
                    <p>Grammar Points Bookmarked: <span class="stat-value">${stats.bookmarkedGrammarPoints}/${stats.totalGrammarPoints}</span></p>
                </div>
            </div>
        `;

        // Check if the statistics container already exists to avoid re-prepending
        let existingStatsContainer = document.querySelector('.statistics-container');
        if (existingStatsContainer) {
            existingStatsContainer.outerHTML = statsHtml; // Replace existing
        } else {
            // Prepend to the main container
            containerDiv.insertAdjacentHTML('afterbegin', statsHtml);
        }

        // Update counts in N-level and Lesson headers
        updateHeaderCounts(stats.nLevelStats);
    }

    function updateHeaderCounts(nLevelStats) {
        // Update N-level headers
        document.querySelectorAll('.n-level-header').forEach(header => {
            const nLevelId = header.closest('.n-level').id;
            const nLevelKey = nLevelId.replace('n-level-', '').replace(/-/g, ' ');

            if (nLevelStats[nLevelKey]) {
                const stats = nLevelStats[nLevelKey];
                let countSpan = header.querySelector('.header-counts');
                if (!countSpan) {
                    countSpan = document.createElement('span');
                    countSpan.classList.add('header-counts');
                    header.appendChild(countSpan);
                }
                countSpan.textContent = `${stats.lessons} Lessons, ${stats.grammarPoints} Grammar Points`;
            }
        });

        // Update Lesson headers
        document.querySelectorAll('.lesson').forEach(lessonDiv => {
            const lessonHeader = lessonDiv.querySelector('.lesson-header');
            const nLevelKey = lessonDiv.closest('.n-level').id.replace('n-level-', '').replace(/-/g, ' ');
            const lessonNum = lessonHeader.querySelector('span').textContent.match(/\d+/)?.[0];

            if (nLevelKey && lessonNum && allGrammarData[nLevelKey]) {
                const lessonData = allGrammarData[nLevelKey].find(l => l.lesson_num == lessonNum);
                if (lessonData) {
                    const grammarPointsInLesson = lessonData.grammar_points.length;
                    let countSpan = lessonHeader.querySelector('.header-counts');
                    if (!countSpan) {
                        countSpan = document.createElement('span');
                        countSpan.classList.add('header-counts');
                        lessonHeader.appendChild(countSpan);
                    }
                    countSpan.textContent = `${grammarPointsInLesson} Grammar Points`;
                }
            }
        });
    }

    // --- Header Highlighting Logic ---
    function updateParentHeaderStates(startElement = null) {
        let itemsToCheck = [];
        if (startElement) {
            // If a specific element changed, check its parent lessons and N-levels
            const lesson = startElement.closest('.lesson');
            if (lesson) itemsToCheck.push(lesson);
            const nLevel = startElement.closest('.n-level');
            if (nLevel) itemsToCheck.push(nLevel);
        } else {
            // On initial load, check all lessons and N-levels
            itemsToCheck = Array.from(document.querySelectorAll('.lesson, .n-level'));
        }

        itemsToCheck.forEach(containerElement => {
            const isNLevel = containerElement.classList.contains('n-level');
            const header = containerElement.querySelector(isNLevel ? '.n-level-header' : '.lesson-header');
            const grammarPointItems = containerElement.querySelectorAll('.grammar-point-item');

            let allChildrenCompleted = true;
            let hasBookmarkedChildren = false;

            if (grammarPointItems.length === 0) { // No grammar points, not "complete" or "bookmarked"
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
                header.classList.toggle('all-children-complete', allChildrenCompleted); // New class for completed state
            }
        });
        renderStatistics(); // Ensure stats are updated after header states
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
                            <button class="mark-nlevel-complete-btn" title="Press and hold to mark all grammar points in this N-level as complete">Mark All Complete</button>
                            <span class="toggle-icon">&#9654;</span>
                        </div>
                        <div class="n-level-content">
                `;

                data[nLevelKey].forEach((lesson, lessonIdx) => {
                    html += `
                        <div class="lesson">
                            <div class="lesson-header">
                                <span>Lesson ${lesson.lesson_num}</span>
                                <span class="header-counts"></span>
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
        addMarkNLevelCompleteListeners(); // Add listener for the new button
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
        actionButtonsContainer.innerHTML = ''; // Clear existing buttons

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

    // --- Mark N-Level Complete Button Logic ---
    let holdTimer;
    let progressBarInterval;
    const HOLD_DURATION = 3000; // 3 seconds

    function addMarkNLevelCompleteListeners() {
        document.querySelectorAll('.mark-nlevel-complete-btn').forEach(button => {
            let progressBar = document.createElement('div');
            progressBar.classList.add('progress-bar');
            button.appendChild(progressBar);

            button.addEventListener('mousedown', (e) => startHold(e, button, progressBar));
            button.addEventListener('touchstart', (e) => startHold(e, button, progressBar), { passive: true });
            button.addEventListener('mouseup', (e) => endHold(e, button, progressBar));
            button.addEventListener('mouseleave', (e) => endHold(e, button, progressBar));
            button.addEventListener('touchend', (e) => endHold(e, button, progressBar));
            button.addEventListener('touchcancel', (e) => endHold(e, button, progressBar));
        });
    }

    function startHold(event, button, progressBar) {
        if (event.button === 0 || event.type === 'touchstart') { // Left click or touch
            // Prevent multiple timers if already holding
            if (holdTimer) return;

            button.classList.add('holding');
            progressBar.style.transition = 'none'; // Reset transition
            progressBar.style.width = '0%';
            progressBar.style.height = '0%'; // Reset circle
            progressBar.classList.remove('active'); // Remove active class to reset animation

            // Request animation frame to ensure styles are applied before adding class
            requestAnimationFrame(() => {
                progressBar.classList.add('active'); // Add active class to start animation
                progressBar.style.transition = `width ${HOLD_DURATION}ms linear, height ${HOLD_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`; // Animate circle
                progressBar.style.width = '100%';
                progressBar.style.height = '100%';
            });

            holdTimer = setTimeout(() => {
                // Action to perform after hold duration
                markNLevelComplete(button);
                endHold(event, button, progressBar, true); // Force reset
            }, HOLD_DURATION);
        }
    }

    function endHold(event, button, progressBar, completed = false) {
        clearTimeout(holdTimer);
        holdTimer = null;
        clearInterval(progressBarInterval); // Clear interval if it was used for granular updates

        button.classList.remove('holding');
        if (!completed) { // Only reset if not completed (otherwise it flashes)
            progressBar.style.transition = 'none'; // Instantly reset
            progressBar.style.width = '0%';
            progressBar.style.height = '0%';
            progressBar.classList.remove('active');
        }
    }

    function markNLevelComplete(button) {
        const nLevelContainer = button.closest('.n-level');
        const nLevelId = nLevelContainer.id;
        const nLevelKey = nLevelId.replace('n-level-', '').replace(/-/g, ' ');

        if (!allGrammarData[nLevelKey]) return;

        allGrammarData[nLevelKey].forEach(lesson => {
            lesson.grammar_points.forEach((gp, gpIdx) => {
                const gpId = generateGrammarPointId(nLevelKey, lesson.lesson_num, gpIdx);
                const currentState = getGrammarPointState(gpId);
                if (!currentState.completed) { // Only update if not already complete
                    currentState.completed = true;
                    // When mass completing, unbookmark if it was bookmarked.
                    // This is a design choice for mass completion: completion is the final state.
                    currentState.bookmarked = false;
                    updateGrammarPointState(gpId, currentState);

                    // Update the individual grammar point item's classes
                    const gpItemElement = document.querySelector(`[data-gp-id="${gpId}"]`);
                    if (gpItemElement) {
                        gpItemElement.classList.add('completed');
                        gpItemElement.classList.remove('bookmarked');
                        renderActionButtons(gpItemElement, gpId); // Re-render buttons for correct icon
                    }
                }
            });
        });

        // Trigger flash animation on the N-level container
        nLevelContainer.classList.remove('flash-animation'); // Reset animation
        void nLevelContainer.offsetWidth; // Trigger reflow
        nLevelContainer.classList.add('flash-animation');
        nLevelContainer.addEventListener('animationend', () => {
            nLevelContainer.classList.remove('flash-animation');
        }, { once: true });

        updateParentHeaderStates(nLevelContainer); // Update header states for the N-level and statistics
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
        requestAnimationFrame(() => {
            void element.offsetWidth;
            element.style.height = '0';
        });
        const onTransitionEnd = () => {
            element.removeEventListener('transitionend', onTransitionEnd);
            element.style.height = '';
            header.classList.remove('expanded');
            header.classList.remove('pulsing');
        };
        element.addEventListener('transitionend', onTransitionEnd);
    }

    function expandSection(element, header) {
        element.style.height = 'auto';
        const height = element.scrollHeight;
        element.style.height = '0';
        requestAnimationFrame(() => {
            void element.offsetWidth;
            element.style.height = height + 'px';
        });
        const onTransitionEnd = () => {
            element.removeEventListener('transitionend', onTransitionEnd);
            element.style.height = 'auto';
            header.classList.add('expanded');
        };
        element.addEventListener('transitionend', onTransitionEnd);
    }

    function addToggleListeners() {
        document.querySelectorAll('.n-level-header').forEach(header => {
            header.addEventListener('click', (e) => {
                // Prevent click on the "Mark All Complete" button from triggering toggle
                if (e.target.classList.contains('mark-nlevel-complete-btn')) {
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
                const lessonContent = header.nextElementSibling;
                if (e.target.tagName === 'BUTTON' || e.target.closest('.action-buttons')) {
                    e.stopPropagation();
                    return;
                }
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