document.addEventListener('DOMContentLoaded', () => {
    const grammarContentDiv = document.getElementById('grammar-content');

    // Key for storing user data in localStorage
    const LOCAL_STORAGE_KEY = 'bunproGrammarProgress';
    let userProgress = {}; // In-memory store for user progress

    // Paths to your SVG icon files (assuming they are in an 'icons' folder)
    const ICON_PATHS = {
        bookmarkSolid: 'icons/bookmark-solid.svg',
        checkSolid: 'icons/circle-check-solid.svg',
        warningTriangle: 'icons/warning-triangle.svg'
    };

    async function loadGrammarData() {
        try {
            const response = await fetch('bunpro_grammar_data.json');
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`HTTP error! status: ${response.status}, text: ${errorText}`);
                throw new Error(`Failed to load grammar data: ${response.statusText}`);
            }
            const data = await response.json();
            loadUserProgress(); // Load progress before rendering
            renderGrammarData(data);
            addResetButton(); // Add the reset button after rendering
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
        // Create a unique ID for each grammar point
        return `${nLevelKey.replace(/ /g, '_')}_L${lessonNum}_GP${gpIdx}`;
    }

    function getGrammarPointState(gpId) {
        return userProgress[gpId] || { bookmarked: false, completed: false };
    }

    function updateGrammarPointState(gpId, state) {
        userProgress[gpId] = state;
        saveUserProgress();
    }

    function toggleBookmark(gpId, grammarPointItemElement) {
        const currentState = getGrammarPointState(gpId);
        currentState.bookmarked = !currentState.bookmarked;
        // Ensure that a grammar point cannot be both bookmarked and completed at the same time
        if (currentState.bookmarked) {
            currentState.completed = false; // Un-complete if bookmarking
        }
        updateGrammarPointState(gpId, currentState);

        grammarPointItemElement.classList.toggle('bookmarked', currentState.bookmarked);
        grammarPointItemElement.classList.remove('completed'); // Always remove completed class if bookmarking or unbookmarking
        renderActionButtons(grammarPointItemElement, gpId); // Re-render buttons (important for correct icon color application)
        updateParentHeaderStates(grammarPointItemElement); // Update parent headers
    }

    function toggleComplete(gpId, grammarPointItemElement) {
        const currentState = getGrammarPointState(gpId);
        currentState.completed = !currentState.completed;
        // Ensure that a grammar point cannot be both bookmarked and completed at the same time
        if (currentState.completed) {
            currentState.bookmarked = false; // Un-bookmark if completing
        }
        updateGrammarPointState(gpId, currentState);

        grammarPointItemElement.classList.toggle('completed', currentState.completed);
        grammarPointItemElement.classList.remove('bookmarked'); // Always remove bookmarked class if completing or uncompleting
        renderActionButtons(grammarPointItemElement, gpId); // Re-render buttons (important for correct icon color application)
        updateParentHeaderStates(grammarPointItemElement); // Update parent headers
    }

    function resetAllUserData() {
        if (confirm("Are you sure you want to reset ALL your saved progress (bookmarks and completed items)? This action cannot be undone.")) {
            userProgress = {}; // Clear in-memory state
            localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear localStorage
            alert("All user data has been reset.");
            // Re-render the entire content to reflect the reset state
            location.reload(); // Simplest way to re-render all elements
        }
    }

    // --- Header Highlighting Logic ---
    function updateParentHeaderStates(startElement = null) {
        let itemsToCheck = [];
        if (startElement) {
            itemsToCheck.push(startElement);
        } else {
            itemsToCheck = document.querySelectorAll('.grammar-point-item');
        }

        const lessonHeaders = new Set();
        const nLevelHeaders = new Set();

        itemsToCheck.forEach(item => {
            const lesson = item.closest('.lesson');
            if (lesson) {
                const lessonHeader = lesson.querySelector('.lesson-header');
                if (lessonHeader) lessonHeaders.add(lessonHeader);
            }
            const nLevel = item.closest('.n-level');
            if (nLevel) {
                const nLevelHeader = nLevel.querySelector('.n-level-header');
                if (nLevelHeader) nLevelHeaders.add(nLevelHeader);
            }
        });

        const hasBookmarkedChildren = (containerElement) => {
            return containerElement.querySelectorAll('.grammar-point-item.bookmarked').length > 0;
        };

        lessonHeaders.forEach(header => {
            const lessonContent = header.nextElementSibling;
            if (hasBookmarkedChildren(lessonContent)) {
                header.classList.add('has-bookmarked-children');
            } else {
                header.classList.remove('has-bookmarked-children');
            }
        });

        nLevelHeaders.forEach(header => {
            const nLevelContent = header.nextElementSibling;
            let foundBookmarked = false;
            nLevelContent.querySelectorAll('.lesson').forEach(lesson => {
                if (hasBookmarkedChildren(lesson.querySelector('.lesson-content'))) {
                    foundBookmarked = true;
                }
            });
            if (foundBookmarked) {
                header.classList.add('has-bookmarked-children');
            } else {
                header.classList.remove('has-bookmarked-children');
            }
        });
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
                            <span class="toggle-icon">&#9654;</span>
                        </div>
                        <div class="n-level-content">
                `;

                data[nLevelKey].forEach((lesson, lessonIdx) => {
                    html += `
                        <div class="lesson">
                            <div class="lesson-header">
                                <span>Lesson ${lesson.lesson_num}</span>
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

                        // Wrap both grammar-point-item and action-buttons in a grammar-point-wrapper
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
        // Set height explicitly before transitioning to 0
        element.style.height = element.scrollHeight + 'px';

        requestAnimationFrame(() => {
            // Force reflow
            void element.offsetWidth;
            element.style.height = '0';
        });

        const onTransitionEnd = () => {
            element.removeEventListener('transitionend', onTransitionEnd);
            element.style.height = ''; // Remove inline height after transition
            header.classList.remove('expanded');
            header.classList.remove('pulsing');
        };
        element.addEventListener('transitionend', onTransitionEnd);
    }

    function expandSection(element, header) {
        // Temporarily set height to auto to get the full scrollHeight
        element.style.height = 'auto';
        const height = element.scrollHeight;

        // Set height to 0 for the transition start point
        element.style.height = '0';

        requestAnimationFrame(() => {
            // Force reflow
            void element.offsetWidth;
            // Set to full height for animation
            element.style.height = height + 'px';
        });

        const onTransitionEnd = () => {
            element.removeEventListener('transitionend', onTransitionEnd);
            element.style.height = 'auto'; // Revert to auto after transition for responsive content
            header.classList.add('expanded');
        };
        element.addEventListener('transitionend', onTransitionEnd);
    }

    function addToggleListeners() {
        document.querySelectorAll('.n-level-header').forEach(header => {
            header.addEventListener('click', () => {
                const nLevelContent = header.nextElementSibling;

                if (header.classList.contains('expanded')) {
                    collapseSection(nLevelContent, header);
                } else {
                    expandSection(nLevelContent, header);
                    header.classList.add('pulsing'); // Add pulsing class when expanding
                }
            });
        });

        document.querySelectorAll('.lesson-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const lessonContent = header.nextElementSibling;

                // Prevent click on buttons inside header from triggering collapse/expand
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

    // Initial load of data when the DOM is ready
    loadGrammarData();
});
