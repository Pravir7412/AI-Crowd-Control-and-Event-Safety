import openpyxl
import io
import PyPDF2
import re
from src.models.event_data import EventData, Gate
from src.utils.aws_helper import S3Helper
from datetime import datetime

def parse_excel_file(file_content: bytes):
    try:
        workbook = openpyxl.load_workbook(io.BytesIO(file_content))
        sheet = workbook.active

        # Assuming a simple structure for now: 
        # A1: Event Name, B1: Event Name Value
        # A2: Location, B2: Location Value
        # A3: Attendance, B3: Attendance Value
        # A4: Start Datetime, B4: Start Datetime Value
        # A5: End Datetime, B5: End Datetime Value
        
        event_name = sheet['B1'].value
        location_name = sheet['B2'].value
        expected_attendance = int(sheet['B3'].value) if sheet['B3'].value else 0
        event_start_datetime_str = str(sheet['B4'].value)
        event_end_datetime_str = str(sheet['B5'].value)

        event_start_datetime = datetime.fromisoformat(event_start_datetime_str) if event_start_datetime_str else None
        event_end_datetime = datetime.fromisoformat(event_end_datetime_str) if event_end_datetime_str else None

        gates = []
        # Assuming gates start from row 7, columns A, B, C, D for id, name, capacity, gps
        for row in range(7, sheet.max_row + 1):
            gate_id = sheet[f'A{row}'].value
            gate_name = sheet[f'B{row}'].value
            capacity_per_hour = int(sheet[f'C{row}'].value) if sheet[f'C{row}'].value else 0
            gps = sheet[f'D{row}'].value

            if gate_id and gate_name and capacity_per_hour is not None:
                gates.append(Gate(gate_id, gate_name, capacity_per_hour, gps))

        event_data = EventData(
            event_name=event_name,
            location_name=location_name,
            expected_attendance=expected_attendance,
            event_start_datetime=event_start_datetime,
            event_end_datetime=event_end_datetime,
            gates=gates
        )
        return event_data

    except Exception as e:
        print(f"Error parsing Excel file: {e}")
        return None

def parse_pdf_file(file_content: bytes):
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""

        event_name = re.search(r"Event Name:\s*(.*)", text, re.IGNORECASE)
        location_name = re.search(r"Location:\s*(.*)", text, re.IGNORECASE)
        expected_attendance = re.search(r"Attendance:\s*(\d+)", text, re.IGNORECASE)
        event_start_datetime_str = re.search(r"Start Datetime:\s*(.*)", text, re.IGNORECASE)
        event_end_datetime_str = re.search(r"End Datetime:\s*(.*)", text, re.IGNORECASE)

        event_name = event_name.group(1).strip() if event_name else None
        location_name = location_name.group(1).strip() if location_name else None
        expected_attendance = int(expected_attendance.group(1)) if expected_attendance else 0
        event_start_datetime = datetime.fromisoformat(event_start_datetime_str.group(1).strip()) if event_start_datetime_str else None
        event_end_datetime = datetime.fromisoformat(event_end_datetime_str.group(1).strip()) if event_end_datetime_str else None

        gates = []
        # Assuming gates are listed like: Gate A: capacity 2000, GPS: ...
        gate_lines = re.findall(r"Gate (\w+): capacity (\d+), GPS: (.*)", text, re.IGNORECASE)
        if not gate_lines:
            # Try another pattern if the above fails: Gate ID: A, Name: Gate A, Capacity: 2000, GPS: ...
            gate_lines = re.findall(r"Gate ID:\s*(\w+), Name:\s*(.+?), Capacity:\s*(\d+), GPS:\s*(.*)", text, re.IGNORECASE)

        for match in gate_lines:
            if len(match) == 3: # Old pattern: Gate X: capacity Y, GPS: Z
                gate_id, capacity, gps = match
                gate_name = f"Gate {gate_id}"
                gates.append(Gate(gate_id, gate_name, int(capacity), gps.strip()))
            elif len(match) == 4: # New pattern: Gate ID: A, Name: Gate A, Capacity: 2000, GPS: ...
                gate_id, gate_name, capacity, gps = match
                gates.append(Gate(gate_id, gate_name.strip(), int(capacity), gps.strip()))

        event_data = EventData(
            event_name=event_name,
            location_name=location_name,
            expected_attendance=expected_attendance,
            event_start_datetime=event_start_datetime,
            event_end_datetime=event_end_datetime,
            gates=gates
        )
        return event_data

    except Exception as e:
        print(f"Error parsing PDF file: {e}")
        return None

def parse_file_data(s3_key: str, file_type: str):
    s3_helper = S3Helper()
    file_content = s3_helper.download_file(s3_key)

    if not file_content:
        return {"status": "error", "message": "Failed to download file from S3."}

    if file_type == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':  # .xlsx
        parsed_data = parse_excel_file(file_content)
        if parsed_data:
            return {"status": "success", "data": parsed_data}
        else:
            return {"status": "error", "message": "Failed to parse Excel file."}
    elif file_type == 'application/pdf':  # .pdf
        parsed_data = parse_pdf_file(file_content)
        if parsed_data:
            return {"status": "success", "data": parsed_data}
        else:
            return {"status": "error", "message": "Failed to parse PDF file."}
    else:
        return {"status": "error", "message": f"Unsupported file type: {file_type}"}
