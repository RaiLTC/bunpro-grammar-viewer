document.addEventListener('DOMContentLoaded', () => {
    const grammarContentDiv = document.getElementById('grammar-content');

    // Function to fetch and render data
    async function loadGrammarData() {
        try {
            const response = await fetch('bunpro_grammar_data.json');
            if (!response.ok) {
                // If the fetch fails (e.g., 404), log details and show user message
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

    // Function to render the HTML from the JSON data
    function renderGrammarData(data) {
        let html = '';
        const nLevelOrder = ['N5', 'N4', 'N3', 'N2', 'N1', 'Non-JLPT', 'Unknown N-Level'];

        nLevelOrder.forEach(nLevelKey => {
            if (data[nLevelKey] && data[nLevelKey].length > 0) {
                // N-Level Container
                const nLevelClass = `n-level n-level-${nLevelKey.replace(/ /g, '-')}`; // Replace all spaces
                html += `
                    <div class="${nLevelClass}" id="n-level-${nLevelKey.replace(/ /g, '-')}-container">
                        <div class="n-level-header">
                            <span>${nLevelKey} Grammar</span>
                            <span class="toggle-icon">&#9654;</span> </div>
                        <div class="n-level-content">
                `;

                data[nLevelKey].forEach((lesson, lessonIdx) => {
                    // Lesson Container
                    html += `
                        <div class="lesson">
                            <div class="lesson-header">
                                <span>Lesson ${lesson.lesson_num}</span>
                                <span class="toggle-icon">&#9654;</span> </div>
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

    // Function to add click listeners for toggling sections
    function addToggleListeners() {
        // N-Level toggles
        document.querySelectorAll('.n-level-header').forEach(header => {
            header.addEventListener('click', () => {
                const nLevelContainer = header.closest('.n-level'); // Get the whole N-level container
                const nLevelContent = header.nextElementSibling;

                // Toggle 'expanded' class on content
                const isExpanded = nLevelContent.classList.toggle('expanded');
                // Toggle 'expanded' class on header for icon rotation
                header.classList.toggle('expanded', isExpanded);

                // Handle pulse animation on the N-level header
                if (isExpanded) {
                    // Remove animation class first to allow re-triggering
                    header.classList.remove('pulsing');
                    // Force reflow to restart animation on re-adding the class
                    void header.offsetWidth;
                    header.classList.add('pulsing');
                } else {
                    // If collapsing, immediately remove pulsing class
                    header.classList.remove('pulsing');
                }
            });
        });

        // Lesson toggles
        document.querySelectorAll('.lesson-header').forEach(header => {
            header.addEventListener('click', () => {
                const lessonContent = header.nextElementSibling;

                // Toggle 'expanded' class on content
                const isExpanded = lessonContent.classList.toggle('expanded');
                // Toggle 'expanded' class on header for icon rotation
                header.classList.toggle('expanded', isExpanded);

                // Handle pulse animation on the lesson header (generic white pulse)
                if (isExpanded) {
                    header.classList.remove('pulsing');
                    void header.offsetWidth;
                    header.classList.add('pulsing');
                } else {
                    header.classList.remove('pulsing');
                }
            });
        });
    }

    // Initial load of data when the DOM is ready
    loadGrammarData();
});