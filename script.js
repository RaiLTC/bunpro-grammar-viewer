document.addEventListener('DOMContentLoaded', () => {
    const grammarContentDiv = document.getElementById('grammar-content');

    // Key for storing user data in localStorage
    const LOCAL_STORAGE_KEY = 'bunproGrammarProgress';
    let userProgress = {}; // In-memory store for user progress

    // SVG strings for the icons - using fill="currentColor" to allow CSS styling
    const SVG_ICONS = {
        bookmark: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path fill="currentColor" d="M0 48V487.7C0 501.9 14.25 512 28.38 512C37.59 512 46.12 507.2 51.52 499.9L192 355.6L332.5 499.9C337.9 507.2 346.4 512 355.6 512C369.8 512 384 501.9 384 487.7V48C384 21.49 362.5 0 336 0H48C21.49 0 0 21.49 0 48Z"/></svg>',
        check: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M256 512C114.6 512 0 397.4 0 256C0 114.6 114.6 0 256 0C397.4 0 512 114.6 512 256C512 397.4 397.4 512 256 512L256 512zM369 209L241 337C235 343 225 343 219 337L143 261C137 255 137 245 143 239C149 233 159 233 165 239L219 293L347 165C353 159 363 159 369 165C375 171 375 181 369 187L369 209z"/></svg>',
        warning: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="currentColor" d="M272 416c-13.25 0-24 10.75-24 24C248 453.3 258.8 464 272 464H304c13.25 0 24-10.75 24-24C328 426.8 317.3 416 304 416H272zM288 352C274.8 352 264 341.3 264 328V160c0-13.25 10.75-24 24-24C301.3 136 312 146.8 312 160V328C312 341.3 301.3 352 288 352zM288 0C129 0 0 129 0 288C0 447 129 576 288 576C447 576 576 447 576 288C576 129 447 0 288 0zM288 528C156.9 528 48 419.1 48 288C48 156.9 156.9 48 288 48C419.1 48 528 156.9 528 288C528 419.1 419.1 528 288 528zM319.1 128H256c-17.67 0-32 14.33-32 32V384c0 17.67 14.33 32 32 32H319.1c17.67 0 32-14.33 32-32V160C351.1 142.3 337.7 128 319.1 128z"/></svg>'
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

                        // NEW: Wrap both grammar-point-item and action-buttons in a grammar-point-wrapper
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
        // Now target the .action-buttons container directly, as it holds the gpId
        document.querySelectorAll('.grammar-point-wrapper').forEach(wrapper => {
            const grammarPointItem = wrapper.querySelector('.grammar-point-item');
            const gpId = grammarPointItem.dataset.gpId; // Get ID from the grammar point item
            renderActionButtons(grammarPointItem, gpId); // Pass the item itself for class toggling
        });
    }

    function renderActionButtons(grammarPointItemElement, gpId) {
        // Find the action buttons container within the same wrapper as the grammarPointItemElement
        const actionButtonsContainer = grammarPointItemElement.closest('.grammar-point-wrapper').querySelector('.action-buttons');
        const currentState = getGrammarPointState(gpId);
        actionButtonsContainer.innerHTML = ''; // Clear existing buttons

        const bookmarkBtn = document.createElement('button');
        bookmarkBtn.innerHTML = SVG_ICONS.bookmark; // Embed SVG directly
        bookmarkBtn.title = currentState.bookmarked ? 'Unbookmark this grammar point' : 'Bookmark this grammar point';
        bookmarkBtn.classList.toggle('active-bookmark', currentState.bookmarked); // Add a class for active state
        bookmarkBtn.onclick = (e) => {
            e.stopPropagation();
            toggleBookmark(gpId, grammarPointItemElement);
        };
        actionButtonsContainer.appendChild(bookmarkBtn);

        const completeBtn = document.createElement('button');
        completeBtn.innerHTML = SVG_ICONS.check; // Embed SVG directly
        completeBtn.title = currentState.completed ? 'Mark as incomplete' : 'Mark as complete';
        completeBtn.classList.toggle('active-complete', currentState.completed); // Add a class for active state
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

            resetButton.innerHTML = SVG_ICONS.warning; // Embed SVG directly
            const buttonText = document.createTextNode('Reset All Saved Progress');
            resetButton.appendChild(buttonText);

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
            header.addEventListener('click', () => {
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

    // Initial load of data when the DOM is ready
    loadGrammarData();
});