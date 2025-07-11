document.addEventListener('DOMContentLoaded', () => {
    const grammarContentDiv = document.getElementById('grammar-content');
    const containerDiv = document.querySelector('.container');

    const LOCAL_STORAGE_KEY = 'bunproGrammarProgress';
    let userProgress = {};

    const ICON_PATHS = {
        bookmarkSolid: 'icons/bookmark-solid.svg',
        checkSolid: 'icons/circle-check-solid.svg',
        warningTriangle: 'icons/triangle-exclamation-solid.svg'
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
                    header.insertBefore(countSpan, header.querySelector('.mark-level-complete-btn'));
                }
                countSpan.textContent = `${stats.lessons} Lessons, ${stats.grammarPoints} Grammar Points`;

                const completeBtn = header.querySelector('.mark-level-complete-btn');
                if (completeBtn) {
                    completeBtn.classList.toggle('level-completed', stats.completedGrammarPoints === stats.grammarPoints && stats.grammarPoints > 0);
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
                    countSpan.textContent = `${grammarPointsInLesson} Grammar Points`;

                    const completedGPs = lessonData.grammar_points.filter((gp, gpIdx) => {
                        const gpId = generateGrammarPointId(nLevelKey, lesson.lesson_num, gpIdx);
                        return getGrammarPointState(gpId).completed;
                    }).length;

                    const completeBtn = lessonHeader.querySelector('.mark-level-complete-btn');
                    if (completeBtn) {
                        completeBtn.classList.toggle('level-completed', completedGPs === grammarPointsInLesson && grammarPointsInLesson > 0);
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
                            <button class="mark-level-complete-btn n-level-btn" data-level-type="n-level" data-n-level-key="${nLevelKey}" title="Press and hold to mark all grammar points in this N-level as complete">
                                <img src="${ICON_PATHS.checkSolid}" alt="Complete All">
                                <svg class="progress-circle" viewBox="0 0 38 38">
                                    <circle class="progress-circle-bg" cx="19" cy="19" r="16" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="3"></circle>
                                    <circle class="progress-circle-fg" cx="19" cy="19" r="16" fill="none" stroke="white" stroke-width="3" stroke-dasharray="100.53 100.53" stroke-dashoffset="100.53" transform="rotate(-90 19 19)"></circle>
                                </svg>
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

    // --- Mark Level Complete Button Logic (Unified) ---
    let holdTimers = new Map();

    function addMarkLevelCompleteListeners() {
        document.querySelectorAll('.mark-level-complete-btn').forEach(button => {
            // Get the SVG progress circle
            let progressBarSVG = button.querySelector('.progress-circle');
            let progressBarFG = progressBarSVG ? progressBarSVG.querySelector('.progress-circle-fg') : null;

            // Calculate circumference dynamically if needed (or use fixed value if radius is fixed)
            // For r=16, circumference = 2 * pi * 16 = 100.53
            // Set initial dasharray and dashoffset for the foreground circle to hide it
            if (progressBarFG) {
                const circumference = progressBarFG.r.baseVal.value * 2 * Math.PI;
                progressBarFG.style.strokeDasharray = `${circumference} ${circumference}`;
                progressBarFG.style.strokeDashoffset = circumference;
                progressBarFG.style.transition = 'none'; // Ensure no transition on initial setup
                progressBarFG.style.opacity = '0'; // Keep it hidden
            }

            // Clear any existing timers/states to prevent issues with re-rendering
            endHold({target: button}, button, progressBarFG, true);

            button.addEventListener('mousedown', (e) => startHold(e, button, progressBarFG));
            button.addEventListener('touchstart', (e) => startHold(e, button, progressBarFG), { passive: true });
            button.addEventListener('mouseup', (e) => endHold(e, button, progressBarFG));
            button.addEventListener('mouseleave', (e) => endHold(e, button, progressBarFG));
            button.addEventListener('touchend', (e) => endHold(e, button, progressBarFG));
            button.addEventListener('touchcancel', (e) => endHold(e, button, progressBarFG));
        });
    }

    function startHold(event, button, progressBarFG) {
        if (event.button === 0 || event.type === 'touchstart') {
            event.preventDefault();

            const holdDuration = button.dataset.levelType === 'n-level' ? 3000 : 1000;
            const circumference = progressBarFG.r.baseVal.value * 2 * Math.PI;

            const existingTimer = holdTimers.get(button);
            if (existingTimer) clearTimeout(existingTimer);

            button.classList.add('holding');
            progressBarFG.style.transition = 'none'; // Reset any ongoing transitions
            progressBarFG.style.strokeDashoffset = circumference; // Set to full circumference (hidden)
            progressBarFG.style.opacity = '0'; // Keep it hidden until animation starts

            // Force reflow to apply initial styles before transition
            void progressBarFG.offsetWidth;

            progressBarFG.style.transition = `stroke-dashoffset ${holdDuration}ms cubic-bezier(0.1, 0.7, 1.0, 0.1), opacity 0.1s ease-in`;
            progressBarFG.style.strokeDashoffset = '0'; // Animate to 0 (fully drawn)
            progressBarFG.style.opacity = '1';

            const timer = setTimeout(() => {
                const levelType = button.dataset.levelType;
                const nLevelKey = button.dataset.nLevelKey;
                if (levelType === 'n-level') {
                    markNLevelComplete(nLevelKey, button.closest('.n-level'));
                } else if (levelType === 'lesson') {
                    const lessonNum = parseInt(button.dataset.lessonNum);
                    markLessonComplete(nLevelKey, lessonNum, button.closest('.lesson'));
                }
                endHold(event, button, progressBarFG, true);
            }, holdDuration);

            holdTimers.set(button, timer);
        }
    }

    function endHold(event, button, progressBarFG, completed = false) {
        const timer = holdTimers.get(button);
        if (timer) {
            clearTimeout(timer);
            holdTimers.delete(button);
        }

        button.classList.remove('holding');
        if (progressBarFG) {
            progressBarFG.style.transition = 'opacity 0.2s ease-out'; // Fast fade out
            progressBarFG.style.opacity = '0';
            if (!completed) {
                 // Reset stroke-dashoffset only if not completed, so it appears ready for next hold
                const circumference = progressBarFG.r.baseVal.value * 2 * Math.PI;
                progressBarFG.style.strokeDashoffset = circumference;
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
                if (e.target.closest('.mark-level-complete-btn')) {
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
                if (e.target.closest('.mark-level-complete-btn')) {
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