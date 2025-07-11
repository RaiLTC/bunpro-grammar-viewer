document.addEventListener('DOMContentLoaded', () => {
    const grammarContentDiv = document.getElementById('grammar-content');

    // Function to fetch and render data
    async function loadGrammarData() {
        try {
            const response = await fetch('bunpro_grammar_data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            renderGrammarData(data);
        } catch (error) {
            console.error("Could not load grammar data:", error);
            grammarContentDiv.innerHTML = '<p>Error loading grammar data. Please check the console for details.</p>';
        }
    }

    // Function to render the HTML from the JSON data
    function renderGrammarData(data) {
        let html = '';
        const nLevelOrder = ['N5', 'N4', 'N3', 'N2', 'N1', 'Non-JLPT', 'Unknown N-Level'];

        nLevelOrder.forEach(nLevelKey => {
            if (data[nLevelKey] && data[nLevelKey].length > 0) {
                // N-Level Container
                const nLevelClass = `n-level n-level-${nLevelKey.replace(' ', '-')}`;
                html += `
                    <div class="${nLevelClass}" id="n-level-${nLevelKey}">
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
            // Load data when the page first loads
            loadGrammarData();
        });

        grammarContentDiv.innerHTML = html;
        addToggleListeners();
    }

    // Function to add click listeners for toggling sections
    function addToggleListeners() {
        // N-Level toggles
        document.querySelectorAll('.n-level-header').forEach(header => {
            header.addEventListener('click', () => {
                const nLevel = header.closest('.n-level');
                const nLevelContent = header.nextElementSibling;
                const isExpanded = nLevelContent.classList.toggle('expanded');
                header.classList.toggle('expanded', isExpanded); // Toggle expanded class on header too for icon rotation

                // Remove existing pulsing class to re-trigger if re-expanded
                nLevel.classList.remove('pulsing');
                // Trigger pulse animation only when expanding
                if (isExpanded) {
                     // Force reflow to restart animation
                    void nLevel.offsetWidth;
                    nLevel.classList.add('pulsing');
                }
            });
        });

        // Lesson toggles
        document.querySelectorAll('.lesson-header').forEach(header => {
            header.addEventListener('click', () => {
                const lessonContent = header.nextElementSibling;
                const isExpanded = lessonContent.classList.toggle('expanded');
                header.classList.toggle('expanded', isExpanded); // Toggle expanded class on header too for icon rotation

                // Remove existing pulsing class to re-trigger if re-expanded
                header.classList.remove('pulsing');
                // Trigger pulse animation only when expanding
                if (isExpanded) {
                    // Force reflow to restart animation
                    void header.offsetWidth;
                    header.classList.add('pulsing');
                }
            });
        });
    }

    loadGrammarData();
});