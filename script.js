document.addEventListener('DOMContentLoaded', () => {
    const grammarContentDiv = document.getElementById('grammar-content');
    const containerDiv = document.querySelector('.container');

    const LOCAL_STORAGE_KEY = 'bunproGrammarProgress';
    let userProgress = {};

    // Corrected and confirmed icon paths
    const ICON_PATHS = {
        bookmarkSolid: 'icons/bookmark-solid.svg',
        checkSolid: 'icons/circle-check-solid.svg', // Corrected to circle-check-solid.svg
        warningTriangle: 'icons/triangle-exclamation-solid.svg' // Corrected to triangle-exclamation-solid.svg
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
        // Pass the element that triggered the change for more targeted updates
        const changedElement = document.querySelector(`[data-gp-id="${gpId}"]`);
        if (changedElement) {
            updateParentHeaderStates(changedElement);
        } else {
            // Fallback for initial render or if element not found immediately
            updateParentHeaderStates();
        }
    }

    function toggleBookmark(gpId, grammarPointItemElement) {
        const currentState = getGrammarPointState(gpId);
        currentState.bookmarked = !currentState.bookmarked;
        updateGrammarPointState(gpId, currentState);

        // Visual update based on new state
        grammarPointItemElement.classList.toggle('bookmarked', currentState.bookmarked);
        grammarPointItemElement.classList.toggle('completed', currentState.completed); // Ensure completed class persists
        renderActionButtons(grammarPointItemElement, gpId); // Re-render buttons to update active state
    }

    function toggleComplete(gpId, grammarPointItemElement) {
        const currentState = getGrammarPointState(gpId);
        currentState.completed = !currentState.completed;
        updateGrammarPointState(gpId, currentState);

        // Visual update based on new state
        grammarPointItemElement.classList.toggle('completed', currentState.completed);
        grammarPointItemElement.classList.toggle('bookmarked', currentState.bookmarked); // Ensure bookmark class persists
        renderActionButtons(grammarPointItemElement, gpId); // Re-render buttons to update active state
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

        const nLevelStats = {};

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

                    if (lessonGPsCount > 0 && lessonCompletedGPs === lessonGPsCount) {
                        completedLessons++;
                    }
                });

                if (nLevelGPsCount > 0 && nLevelCompletedGPs === nLevelGPsCount) {
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
                    header.appendChild(countSpan);
                }
                // Display total lessons and total grammar points for the N-level
                countSpan.textContent = `${stats.lessons} Lessons, ${stats.grammarPoints} Grammar Points`;
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
                        lessonHeader.appendChild(countSpan);
                    }
                    countSpan.textContent = `${grammarPointsInLesson} Grammar Points`;
                }
            }
        });
    }

    // --- Header Highlighting Logic ---
    function updateParentHeaderStates(startElement = null) {
        let itemsToCheck = new Set(); // Use Set to avoid duplicates

        if (startElement) {
            // Find parent lesson
            let current = startElement;
            while (current) {
                if (current.classList.contains('lesson')) {
                    itemsToCheck.add(current);
                }
                if (current.classList.contains('n-level')) {
                    itemsToCheck.add(current);
                    break; // Stop at N-level
                }
                current = current.parentElement;
            }
        } else {
            // On initial load, check all lessons and N-levels
            document.querySelectorAll('.lesson, .n-level').forEach(el => itemsToCheck.add(el));
        }

        itemsToCheck.forEach(containerElement => {
            const isNLevel = containerElement.classList.contains('n-level');
            const header = containerElement.querySelector(isNLevel ? '.n-level-header' : '.lesson-header');
            const grammarPointItems = containerElement.querySelectorAll('.grammar-point-item');

            let allChildrenCompleted = true;
            let hasBookmarkedChildren = false;

            if (grammarPointItems.length === 0) {
                allChildrenCompleted = false; // No grammar points, so not "complete"
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
                            <button class="mark-level-complete-btn n-level-btn" data-level-type="n-level" data-n-level-key="${nLevelKey}" title="Press and hold to mark all grammar points in this N-level as complete">
                                <img src="${ICON_PATHS.checkSolid}" alt="Complete All">
                                <div class="progress-circle"></div>
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
                                <button class="mark-level-complete-btn lesson-btn" data-level-type="lesson" data-n-level-key="${nLevelKey}" data-lesson-num="${lesson.lesson_num}" title="Press and hold to mark all grammar points in this lesson as complete">
                                    <img src="${ICON_PATHS.checkSolid}" alt="Complete Lesson">
                                    <div class="progress-circle"></div>
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
        addMarkLevelCompleteListeners(); // Unified listener for both N-level and Lesson buttons
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

    // --- Mark Level Complete Button Logic (Unified) ---
    let holdTimers = new Map(); // Use a Map to store timers for multiple buttons

    function addMarkLevelCompleteListeners() {
        document.querySelectorAll('.mark-level-complete-btn').forEach(button => {
            let progressBar = button.querySelector('.progress-circle');
            if (!progressBar) { // Ensure progressBar exists, especially if dynamically added
                progressBar = document.createElement('div');
                progressBar.classList.add('progress-circle');
                button.appendChild(progressBar);
            }

            // Clear any existing timers/states to prevent issues with re-rendering
            endHold({target: button}, button, progressBar, true); // Force reset state

            button.addEventListener('mousedown', (e) => startHold(e, button, progressBar));
            button.addEventListener('touchstart', (e) => startHold(e, button, progressBar), { passive: true });
            button.addEventListener('mouseup', (e) => endHold(e, button, progressBar));
            button.addEventListener('mouseleave', (e) => endHold(e, button, progressBar));
            button.addEventListener('touchend', (e) => endHold(e, button, progressBar));
            button.addEventListener('touchcancel', (e) => endHold(e, button, progressBar));
        });
    }

    function startHold(event, button, progressBar) {
        if (event.button === 0 || event.type === 'touchstart') {
            event.preventDefault(); // Prevent text selection/dragging on mouse down

            // Get hold duration based on level type
            const holdDuration = button.dataset.levelType === 'n-level' ? 3000 : 1000;

            // Clear any existing timer for this button
            const existingTimer = holdTimers.get(button);
            if (existingTimer) clearTimeout(existingTimer);

            button.classList.add('holding');
            progressBar.style.transition = 'none'; // Reset transition instantly
            progressBar.style.transform = 'translate(-50%, -50%) scale(0)';
            progressBar.classList.remove('active');

            requestAnimationFrame(() => {
                progressBar.classList.add('active');
                progressBar.style.transition = `transform ${holdDuration}ms cubic-bezier(0.1, 0.7, 1.0, 0.1)`;
                progressBar.style.transform = 'translate(-50%, -50%) scale(1)';
            });

            const timer = setTimeout(() => {
                const levelType = button.dataset.levelType;
                const nLevelKey = button.dataset.nLevelKey;
                if (levelType === 'n-level') {
                    markNLevelComplete(nLevelKey, button.closest('.n-level'));
                } else if (levelType === 'lesson') {
                    const lessonNum = parseInt(button.dataset.lessonNum);
                    markLessonComplete(nLevelKey, lessonNum, button.closest('.lesson'));
                }
                endHold(event, button, progressBar, true); // Force reset after completion
            }, holdDuration);

            holdTimers.set(button, timer); // Store the timer for this specific button
        }
    }

    function endHold(event, button, progressBar, completed = false) {
        const timer = holdTimers.get(button);
        if (timer) {
            clearTimeout(timer);
            holdTimers.delete(button); // Remove the timer from the map
        }

        button.classList.remove('holding');
        if (!completed) { // Only reset if not completed, otherwise flash animation takes over
            progressBar.style.transition = 'none';
            progressBar.style.transform = 'translate(-50%, -50%) scale(0)';
            progressBar.classList.remove('active');
        }
    }

    function markNLevelComplete(nLevelKey, nLevelContainerElement) {
        if (!allGrammarData[nLevelKey]) return;

        allGrammarData[nLevelKey].forEach(lesson => {
            lesson.grammar_points.forEach((gp, gpIdx) => {
                const gpId = generateGrammarPointId(nLevelKey, lesson.lesson_num, gpIdx);
                const currentState = getGrammarPointState(gpId);
                // Ensure we only update if not already complete to avoid unnecessary saves
                if (!currentState.completed) {
                    currentState.completed = true;
                    currentState.bookmarked = false; // Mass completion removes bookmark
                    updateGrammarPointState(gpId, currentState);

                    // Update the individual grammar point item's classes
                    const gpItemElement = document.querySelector(`[data-gp-id="${gpId}"]`);
                    if (gpItemElement) {
                        gpItemElement.classList.add('completed');
                        gpItemElement.classList.remove('bookmarked');
                        renderActionButtons(gpItemElement, gpId);
                    }
                }
            });
        });

        // Trigger flash animation
        if (nLevelContainerElement) {
            nLevelContainerElement.classList.remove('flash-animation');
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
                currentState.bookmarked = false; // Mass completion removes bookmark
                updateGrammarPointState(gpId, currentState);

                const gpItemElement = document.querySelector(`[data-gp-id="${gpId}"]`);
                if (gpItemElement) {
                    gpItemElement.classList.add('completed');
                    gpItemElement.classList.remove('bookmarked');
                    renderActionButtons(gpItemElement, gpId);
                }
            }
        });

        // Trigger flash animation
        if (lessonContainerElement) {
            lessonContainerElement.classList.remove('flash-animation');
            void lessonContainerElement.offsetWidth;
            lessonContainerElement.classList.add('flash-animation');
            lessonContainerElement.addEventListener('animationend', () => {
                lessonContainerElement.classList.remove('flash-animation');
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
                if (e.target.closest('.mark-level-complete-btn')) { // Use closest for better targeting
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
                // Prevent click on the "Mark Lesson Complete" button from triggering toggle
                if (e.target.closest('.mark-level-complete-btn')) { // Use closest for better targeting
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