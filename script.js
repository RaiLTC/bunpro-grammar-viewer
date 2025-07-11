document.addEventListener('DOMContentLoaded', () => {
    const grammarContentDiv = document.getElementById('grammar-content');

    async function loadGrammarData() {
        try {
            const response = await fetch('bunpro_grammar_data.json');
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`HTTP error! status: ${response.status}, text: ${errorText}`);
                throw new Error(`Failed to load grammar data: ${response.statusText}`);
            }
            const data = await response.json();
            renderGrammarData(data);
        } catch (error) {
            console.error("Could not load grammar data:", error);
            grammarContentDiv.innerHTML = '<p>Error loading grammar data. Please ensure "bunpro_grammar_data.json" is in the same directory and accessible. Details in console.</p>';
        }
    }

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
                        html += `
                            <li class="grammar-point-item">
                                <span class="grammar-point-number">${gpIdx + 1}.</span>
                                <a href="${gp.link}" target="_blank" rel="noopener noreferrer">${gp.text}</a>
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
    }

    // --- Helper function for height animation ---
    function collapseSection(element, header) {
        // Set element's height to its current computed height to lock it
        element.style.height = element.scrollHeight + 'px';

        requestAnimationFrame(() => {
            // Force reflow
            void element.offsetWidth;
            // Then set height to 0
            element.style.height = '0';
        });

        // Listen for the transition end event to clean up styles
        const onTransitionEnd = () => {
            element.removeEventListener('transitionend', onTransitionEnd);
            element.style.height = ''; // Remove inline height after transition
            header.classList.remove('expanded'); // Rotate icon back
            header.classList.remove('pulsing'); // Remove pulse class if still there
        };
        element.addEventListener('transitionend', onTransitionEnd);
    }

    function expandSection(element, header) {
        // Temporarily set height to 'auto' to get the full scrollHeight
        element.style.height = 'auto';
        const height = element.scrollHeight; // Get the computed height of the content

        // Set height back to 0 (or its current collapsed state)
        element.style.height = '0';

        requestAnimationFrame(() => {
            // Force reflow
            void element.offsetWidth;
            // Animate to its full height
            element.style.height = height + 'px';
        });

        // Listen for the transition end event to clean up styles
        const onTransitionEnd = () => {
            element.removeEventListener('transitionend', onTransitionEnd);
            element.style.height = 'auto'; // Revert to auto so content can resize dynamically
            header.classList.add('expanded'); // Rotate icon
            header.classList.remove('pulsing'); // Remove pulse class
        };
        element.addEventListener('transitionend', onTransitionEnd);
    }

    // Function to add click listeners for toggling sections
    function addToggleListeners() {
        // N-Level toggles
        document.querySelectorAll('.n-level-header').forEach(header => {
            header.addEventListener('click', () => {
                const nLevelContent = header.nextElementSibling;

                if (header.classList.contains('expanded')) { // Check header's expanded class for icon state
                    collapseSection(nLevelContent, header);
                } else {
                    expandSection(nLevelContent, header);
                    // Pulse animation on the N-level header
                    header.classList.remove('pulsing');
                    void header.offsetWidth; // Trigger reflow
                    header.classList.add('pulsing');
                }
            });
        });

        // Lesson toggles
        document.querySelectorAll('.lesson-header').forEach(header => {
            header.addEventListener('click', () => {
                const lessonContent = header.nextElementSibling;

                if (header.classList.contains('expanded')) { // Check header's expanded class for icon state
                    collapseSection(lessonContent, header);
                } else {
                    expandSection(lessonContent, header);
                    // Pulse animation on the lesson header
                    header.classList.remove('pulsing');
                    void header.offsetWidth; // Trigger reflow
                    header.classList.add('pulsing');
                }
            });
        });
    }

    // Initial load of data when the DOM is ready
    loadGrammarData();
});