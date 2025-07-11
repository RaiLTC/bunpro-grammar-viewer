import requests
from bs4 import BeautifulSoup
import pandas as pd
import re
import urllib.parse
from pandas import ExcelWriter
import xlsxwriter  # pip install xlsxwriter


def scrape_bunpro_grammar_to_excel_collapsible():
    """
    Scrapes Bunpro's grammar points page, extracts grammar points,
    organizes them hierarchically by N-level and inferred lesson,
    and saves them to an Excel file with formatted sections and collapsible groups.
    """
    base_url = "https://bunpro.jp"
    grammar_list_url = f"{base_url}/grammar_points"

    grammar_point_base_url = "https://bunpro.jp/grammar_points/"

    print(f"--- Starting Bunpro Grammar Scraper (Collapsible Output) ---")
    print(f"Fetching data from: {grammar_list_url}\n")

    try:
        response = requests.get(grammar_list_url)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching the page: {e}")
        return

    soup = BeautifulSoup(response.content, 'html.parser')

    # This will store data organized by N-level and then by inferred lesson
    # Example: {'N5': [[gp1, gp2], [gp3, gp4]], 'N4': [[gp_a, gp_b]]}
    organized_grammar_data = {}

    search_results_ul = soup.find('ul', class_='search-container_results')
    if not search_results_ul:
        print("Error: Could not find the main 'search-container_results' UL. The website structure might have changed.")
        return

    n_level_sections = search_results_ul.find_all('li', class_='search-container_level')
    if not n_level_sections:
        print(
            "Error: Could not find any 'search-container_level' LI elements. The website structure might have changed.")
        return

    for level_section in n_level_sections:
        level_heading = level_section.find(['h2', 'h3', 'strong'])

        if not level_heading:
            level_text_elements = level_section.find_all(lambda tag:
                                                         (tag.name == 'div' or tag.name == 'span') and
                                                         re.search(r'(N\d|No JLPT Level)', tag.get_text(),
                                                                   re.IGNORECASE)
                                                         )
            if level_text_elements:
                level_heading = level_text_elements[0]

        current_n_level = "Unknown N-Level"
        if level_heading:
            current_n_level = level_heading.get_text(strip=True)
            match = re.search(r'(N\d|No JLPT Level)', current_n_level, re.IGNORECASE)
            if match:
                current_n_level = match.group(1).upper()
            else:
                current_n_level = current_n_level.replace("Grammar", "").strip()
                if "no jlpt level" in current_n_level.lower():
                    current_n_level = "Non-JLPT"

        print(f"Processing {current_n_level}...")

        organized_grammar_data[current_n_level] = []

        lesson_containers = level_section.find_all('ul', class_='js_search-container_tiles')

        if not lesson_containers:
            print(f"  Warning: No 'js_search-container_tiles' ULs found for {current_n_level}. Skipping this level.")
            continue

        for lesson_ul in lesson_containers:
            current_lesson_grammar_points = []
            grammar_tiles = lesson_ul.find_all('li', id=re.compile(r'grammar-point-id-\d+'))

            if not grammar_tiles:
                continue

            for tile in grammar_tiles:
                grammar_point_text = tile.get('data-grammar-point')

                if grammar_point_text:
                    encoded_grammar_point = urllib.parse.quote(grammar_point_text)
                    full_grammar_url = f"{grammar_point_base_url}{encoded_grammar_point}"

                    current_lesson_grammar_points.append({
                        'Grammar Point': grammar_point_text,
                        'Bunpro Link': full_grammar_url
                    })

            if current_lesson_grammar_points:  # Add lesson only if it has grammar points
                organized_grammar_data[current_n_level].append(current_lesson_grammar_points)

    # --- Excel Writing with Hierarchical and Collapsible Formatting ---
    output_file = 'bunpro_grammar_points_collapsible.xlsx'
    total_grammar_points_count = 0

    try:
        writer = pd.ExcelWriter(output_file, engine='xlsxwriter')
        workbook = writer.book
        worksheet = workbook.add_worksheet('Grammar Points')

        # Define formats
        # N-Level Section Headers (Green -> Red gradient)
        n_level_formats = {
            'N5': workbook.add_format(
                {'bg_color': '#D9EAD3', 'bold': True, 'font_size': 16, 'align': 'center', 'valign': 'vcenter',
                 'border': 1}),  # Very light green
            'N4': workbook.add_format(
                {'bg_color': '#C9E2B6', 'bold': True, 'font_size': 16, 'align': 'center', 'valign': 'vcenter',
                 'border': 1}),  # Slightly darker green
            'N3': workbook.add_format(
                {'bg_color': '#FFF2CC', 'bold': True, 'font_size': 16, 'align': 'center', 'valign': 'vcenter',
                 'border': 1}),  # Light yellow
            'N2': workbook.add_format(
                {'bg_color': '#FFD8B2', 'bold': True, 'font_size': 16, 'align': 'center', 'valign': 'vcenter',
                 'border': 1}),  # Light orange
            'N1': workbook.add_format(
                {'bg_color': '#EA9999', 'bold': True, 'font_size': 16, 'align': 'center', 'valign': 'vcenter',
                 'border': 1}),  # Light red
            'Non-JLPT': workbook.add_format(
                {'bg_color': '#D9D9D9', 'bold': True, 'font_size': 16, 'align': 'center', 'valign': 'vcenter',
                 'border': 1}),  # Light grey
            'Unknown N-Level': workbook.add_format(
                {'bg_color': '#FF0000', 'bold': True, 'font_size': 16, 'align': 'center', 'valign': 'vcenter',
                 'font_color': 'white', 'border': 1})  # Bright red
        }

        # Lesson Headers
        lesson_header_format = workbook.add_format(
            {'bold': True, 'font_size': 12, 'bg_color': '#F2F2F2', 'bottom': 1})  # Light grey, bold

        # Grammar Point Table Headers
        gp_table_header_format = workbook.add_format(
            {'bold': True, 'font_size': 11, 'bg_color': '#EFEFEF'})  # Lighter grey, bold

        # Grammar Point Data Rows
        gp_data_format = workbook.add_format({'font_size': 10})
        gp_link_format = workbook.add_format({'font_size': 10, 'font_color': 'blue', 'underline': 1})

        # Set initial column widths
        worksheet.set_column('A:A', 5)  # Numbering column
        worksheet.set_column('B:B', 35)  # Grammar Point
        worksheet.set_column('C:C', 60)  # Bunpro Link

        current_excel_row = 0

        # Define the order of N-levels for output
        n_level_order = ['N5', 'N4', 'N3', 'N2', 'N1', 'Non-JLPT', 'Unknown N-Level']

        # Loop through each N-Level
        for n_level_key in n_level_order:
            lessons_for_n_level = organized_grammar_data.get(n_level_key)

            if lessons_for_n_level:
                # Write N-Level Header
                # This row acts as the summary for the lessons under it.
                # Its level is 0. All rows below it until the next N-level header will have level >= 1.
                worksheet.merge_range(current_excel_row, 0, current_excel_row, 2, f"{n_level_key} Grammar",
                                      n_level_formats.get(n_level_key, n_level_formats['Unknown N-Level']))
                # The 'collapsed': False means the N-level itself is expanded by default
                worksheet.set_row(current_excel_row, 25, None, {'level': 0, 'collapsed': False})
                current_excel_row += 1

                # Add a blank row for spacing, which is part of the N-level group (level 1)
                worksheet.write_row(current_excel_row, 0, ['', '', ''])
                # This row is initially visible if the N-level is expanded.
                worksheet.set_row(current_excel_row, None, None, {'level': 1, 'hidden': False})
                current_excel_row += 1

                # Loop through each Lesson within the N-Level
                for lesson_idx, lesson_grammar_points in enumerate(lessons_for_n_level):
                    # Write Lesson Header
                    # This row acts as the summary for the grammar points under it.
                    # Its level is 1. Its children (grammar points and their headers) will have level 2.
                    worksheet.write(current_excel_row, 0, f"Lesson {lesson_idx + 1}", lesson_header_format)
                    worksheet.write_row(current_excel_row, 1, ['', ''])  # Blank cells for merging effect
                    # The 'collapsed': True means the lesson contents are hidden by default
                    worksheet.set_row(current_excel_row, None, None, {'level': 1, 'collapsed': True})
                    current_excel_row += 1

                    # Write Grammar Point Table Headers (These are 'level 2' in the outline)
                    worksheet.write_row(current_excel_row, 0, ['#', 'Grammar Point', 'Bunpro Link'],
                                        gp_table_header_format)
                    # This row is hidden if its parent lesson is collapsed
                    worksheet.set_row(current_excel_row, None, None, {'level': 2, 'hidden': True})
                    current_excel_row += 1

                    # Write Grammar Points for this Lesson (These are 'level 2' in the outline)
                    for gp_idx, gp_data in enumerate(lesson_grammar_points):
                        worksheet.write(current_excel_row, 0, f"{gp_idx + 1}.", gp_data_format)
                        worksheet.write(current_excel_row, 1, gp_data['Grammar Point'], gp_data_format)
                        worksheet.write_url(current_excel_row, 2, gp_data['Bunpro Link'], gp_link_format,
                                            gp_data['Bunpro Link'])
                        # This row is hidden if its parent lesson is collapsed
                        worksheet.set_row(current_excel_row, None, None, {'level': 2, 'hidden': True})
                        current_excel_row += 1
                        total_grammar_points_count += 1

                    # Add a blank row after each lesson for spacing (also level 2)
                    worksheet.write_row(current_excel_row, 0, ['', '', ''])
                    worksheet.set_row(current_excel_row, None, None, {'level': 2, 'hidden': True})
                    current_excel_row += 1

                # Add a blank row after each N-level section for better separation (level 0, always visible)
                # This helps visually separate the N-level sections.
                worksheet.write_row(current_excel_row, 0, ['', '', ''])
                worksheet.set_row(current_excel_row, None, None, {'level': 0, 'collapsed': False})
                current_excel_row += 1

        workbook.close()
        print(
            f"\nSuccessfully scraped {total_grammar_points_count} grammar points and saved to '{output_file}' with hierarchical and collapsible formatting.")
    except Exception as e:
        print(f"Error saving to Excel with collapsible formatting: {e}.")
        print("This usually means 'xlsxwriter' is not installed. Please run: pip install xlsxwriter")
        # Fallback to plain save if formatting fails
        try:
            flat_data = []
            for n_level_key in n_level_order:
                lessons = organized_grammar_data.get(n_level_key, [])
                for lesson in lessons:
                    for gp in lesson:
                        flat_data.append({
                            'N-Level': n_level_key,
                            'Grammar Point': gp['Grammar Point'],
                            'Bunpro Link': gp['Bunpro Link']
                        })
            if flat_data:
                pd.DataFrame(flat_data).to_excel('bunpro_grammar_points_flat_fallback.xlsx', index=False)
                print(
                    f"Saved without hierarchical formatting to 'bunpro_grammar_points_flat_fallback.xlsx' as a fallback.")
            else:
                print("No data collected for even a flat fallback save.")

        except Exception as e_fallback:
            print(f"Critical error: Could not save to Excel at all: {e_fallback}")
    else:
        print("\nNo grammar points were scraped. Please check the website structure or your internet connection.")

    print("\n--- Scraper Finished ---")


# To run this function, you'd typically call it from your main execution block:
if __name__ == "__main__":
    scrape_bunpro_grammar_to_excel_collapsible()
