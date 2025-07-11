document.addEventListener('DOMContentLoaded', () => {
    const grammarContentDiv = document.getElementById('grammar-content');

    // Key for storing user data in localStorage
    const LOCAL_STORAGE_KEY = 'bunproGrammarProgress';
    let userProgress = {}; // In-memory store for user progress

    // Paths to SVG files in your 'icons' folder
    const ICON_PATHS = {
        bookmark: 'icons/bookmark-solid.svg',
        check: 'icons/circle-check-solid.svg',
        trash: 'icons/trash-solid.svg',
        warning: 'icons/triangle-exclamation-solid.svg'
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
            updateAllParentHeaderStates(); // Initial update of headers based on loaded progress
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
        renderActionButtons(grammarPointItemElement, gpId); // Re-render buttons
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
        renderActionButtons(grammarPointItemElement, gpId); // Re-render buttons
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
        // If a specific element is provided, only update its relevant ancestors.
        // Otherwise, iterate through all grammar points to update all headers.

        let itemsToCheck = [];
        if (startElement) {
            itemsToCheck.push(startElement);
        } else {
            itemsToCheck = document.querySelectorAll('.grammar-point-item');
        }

        // Collect all unique lesson and N-level headers
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

        // Function to check if a container (lesson or n-level) has any bookmarked children
        const hasBookmarkedChildren = (containerElement) => {
            return containerElement.querySelectorAll('.grammar-point-item.bookmarked').length > 0;
        };

        // Update lesson headers
        lessonHeaders.forEach(header => {
            const lessonContent = header.nextElementSibling;
            if (hasBookmarkedChildren(lessonContent)) {
                header.classList.add('has-bookmarked-children');
            } else {
                header.classList.remove('has-bookmarked-children');
            }
        });

        // Update N-level headers
        nLevelHeaders.forEach(header => {
            const nLevelContent = header.nextElementSibling;
            // Check if any of its immediate children (lessons) have bookmarked children, or if it directly contains bookmarked items
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
                        // Generate unique ID for this grammar point
                        const gpId = generateGrammarPointId(nLevelKey, lesson.lesson_num, gpIdx);
                        const gpState = getGrammarPointState(gpId);
                        const itemClasses = ['grammar-point-item'];
                        if (gpState.bookmarked) itemClasses.push('bookmarked');
                        if (gpState.completed) itemClasses.push('completed');

                        html += `
                            <li class="${itemClasses.join(' ')}" data-gp-id="${gpId}">
                                <div class="grammar-point-content-area">
                                    <span class="grammar-point-number">${gpIdx + 1}.</span>
                                    <a href="${gp.link}" target="_blank" rel="noopener noreferrer">
                                        <img src="${ICON_PATHS.bookmark}" alt="Bookmark" class="bookmark-icon-display">
                                        ${gp.text}
                                    </a>
                                </div>
                                <div class="action-buttons"></div>
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
        addToggleListeners(); // Add listeners for accordions
        addGrammarPointActionListeners(); // Add listeners for new buttons
    }

    function addGrammarPointActionListeners() {
        document.querySelectorAll('.grammar-point-item').forEach(item => {
            const gpId = item.dataset.gpId;
            renderActionButtons(item, gpId); // Initial rendering of buttons
        });
    }

    function renderActionButtons(grammarPointItemElement, gpId) {
        const actionButtonsContainer = grammarPointItemElement.querySelector('.action-buttons');
        const currentState = getGrammarPointState(gpId);
        actionButtonsContainer.innerHTML = ''; // Clear existing buttons

        const bookmarkBtn = document.createElement('button');
        const bookmarkIcon = document.createElement('img');
        bookmarkIcon.src = ICON_PATHS.bookmark;
        bookmarkIcon.alt = "Bookmark";
        bookmarkBtn.appendChild(bookmarkIcon);
        bookmarkBtn.title = currentState.bookmarked ? 'Unbookmark this grammar point' : 'Bookmark this grammar point'; // Add tooltip
        bookmarkBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent accordion from toggling
            toggleBookmark(gpId, grammarPointItemElement);
        };
        actionButtonsContainer.appendChild(bookmarkBtn);

        const completeBtn = document.createElement('button');
        const checkIcon = document.createElement('img');
        checkIcon.src = ICON_PATHS.check;
        checkIcon.alt = "Complete";
        completeBtn.appendChild(checkIcon);
        completeBtn.title = currentState.completed ? 'Mark as incomplete' : 'Mark as complete'; // Add tooltip
        completeBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent accordion from toggling
            toggleComplete(gpId, grammarPointItemElement);
        };
        actionButtonsContainer.appendChild(completeBtn);
    }

    function addResetButton() {
        // Only add if it doesn't already exist to prevent duplicates on re-renders
        if (!document.getElementById('resetUserData')) {
            const resetButton = document.createElement('button');
            resetButton.id = 'resetUserData';

            const warningIcon = document.createElement('img');
            warningIcon.src = ICON_PATHS.warning;
            warningIcon.alt = "Warning";
            resetButton.appendChild(warningIcon);

            const buttonText = document.createTextNode('Reset All Saved Progress');
            resetButton.appendChild(buttonText);

            resetButton.addEventListener('click', resetAllUserData);
            document.querySelector('.container').appendChild(resetButton); // Append to main container
        }
    }


    // --- Accordion Toggle Functions (from previous version, re-included for completeness) ---
    function collapseSection(element, header) {
        element.style.height = element.scrollHeight + 'px';

        requestAnimationFrame(() => {
            void element.offsetWidth; // Force reflow
            element.style.height = '0';
        });

        const onTransitionEnd = () => {
            element.removeEventListener('transitionend', onTransitionEnd);
            element.style.height = ''; // Remove inline height after transition
            header.classList.remove('expanded'); // Rotate icon back
            header.classList.remove('pulsing'); // Ensure pulse class is removed on collapse
        };
        element.addEventListener('transitionend', onTransitionEnd);
    }

    function expandSection(element, header) {
        element.style.height = 'auto';
        const height = element.scrollHeight;

        element.style.height = '0';

        requestAnimationFrame(() => {
            void element.offsetWidth; // Force reflow
            element.style.height = height + 'px';
        });

        const onTransitionEnd = () => {
            element.removeEventListener('transitionend', onTransitionEnd);
            element.style.height = 'auto'; // Revert to auto so content can resize dynamically
            header.classList.add('expanded'); // Rotate icon
            // The pulsing class is applied immediately after expandSection is called
            // to start the animation and removed if collapsing.
            // No need to remove it here as it handles the infinite loop.
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
                    // Add pulsing class here to start infinite animation
                    header.classList.add('pulsing');
                }
            });
        });

        document.querySelectorAll('.lesson-header').forEach(header => {
            header.addEventListener('click', (e) => { // Added 'e' for event object
                const lessonContent = header.nextElementSibling;

                // Stop propagation if a child element (like a button) inside lesson header was clicked
                // This is a safeguard, though our buttons are inside grammar-point-item, not lesson-header directly
                if (e.target.tagName === 'BUTTON' || e.target.closest('.action-buttons')) { // Added closest for robustness
                    e.stopPropagation();
                    return;
                }

                if (header.classList.contains('expanded')) {
                    collapseSection(lessonContent, header);
                } else {
                    expandSection(lessonContent, header);
                    // Lesson headers no longer get pulsing class (CSS rule removed)
                    // header.classList.add('pulsing'); // Removed this line
                }
            });
        });
    }

    // Initial load of data when the DOM is ready
    loadGrammarData();
});