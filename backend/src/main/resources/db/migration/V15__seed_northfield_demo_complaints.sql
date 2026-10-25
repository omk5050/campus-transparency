-- V15__seed_northfield_demo_complaints.sql
-- Seed controlled demo dataset for Northfield University (Organization ID 1)

DO $$
DECLARE
    v_org_id BIGINT := 1;
    v_admin_id BIGINT;
    v_student_id BIGINT;
    v_investigator_id BIGINT;
    v_issue_id BIGINT;
BEGIN
    -- Verify organization 1 exists
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = v_org_id) THEN
        RAISE NOTICE 'Organization 1 does not exist, skipping demo seed';
        RETURN;
    END IF;

    -- Resolve user IDs for assignment and reporter linking
    SELECT id INTO v_admin_id FROM users WHERE username = 'admin' LIMIT 1;
    SELECT id INTO v_student_id FROM users WHERE username = 'student' LIMIT 1;
    SELECT id INTO v_investigator_id FROM users WHERE username = 'investigator' LIMIT 1;

    -- Fallback investigator to admin if investigator user does not exist
    IF v_investigator_id IS NULL THEN
        v_investigator_id := v_admin_id;
    END IF;

    -- 1. Persistent WiFi dead zone on 3rd floor, Library East Wing
    IF NOT EXISTS (SELECT 1 FROM issues WHERE organization_id = v_org_id AND title = 'Persistent WiFi dead zone on 3rd floor, Library East Wing') THEN
        INSERT INTO issues (
            title, description, status, reporter_hash, reporter_alias, hidden, vote_count,
            tracking_code, category, department, assigned_to, reporter_id, organization_id,
            resolved_at, created_at, updated_at
        ) VALUES (
            'Persistent WiFi dead zone on 3rd floor, Library East Wing',
            'Students working on the 3rd floor of the Library East Wing experience consistent WiFi disconnects and packet drop. Signal strength drops below -85 dBm near study carrels 310-340. Additional access points and signal calibration are urgently needed to support research.',
            'IN_PROGRESS', 'anon_8f4c204891a1', 'Complainant #8F4C', FALSE, 14,
            'CMP-F8X2K9Q1', 'Infrastructure', 'IT / Infrastructure', v_investigator_id, v_student_id, v_org_id,
            NULL, CURRENT_TIMESTAMP - INTERVAL '26 hours', CURRENT_TIMESTAMP - INTERVAL '8 hours'
        ) RETURNING id INTO v_issue_id;

        INSERT INTO audit_logs (issue_id, action, actor, performed_by, details, created_at, updated_at)
        VALUES (v_issue_id, 'ISSUE_CREATED', 'system', 'system', 'Complaint registered via anonymous portal', CURRENT_TIMESTAMP - INTERVAL '26 hours', CURRENT_TIMESTAMP - INTERVAL '26 hours');
        INSERT INTO audit_logs (issue_id, action, actor, performed_by, details, created_at, updated_at)
        VALUES (v_issue_id, 'ISSUE_ASSIGNED', 'admin', 'admin', 'Assigned to IT investigation team', CURRENT_TIMESTAMP - INTERVAL '8 hours', CURRENT_TIMESTAMP - INTERVAL '8 hours');
    END IF;

    -- 2. Inadequate emergency lighting in Dormer Hall stairwell C
    IF NOT EXISTS (SELECT 1 FROM issues WHERE organization_id = v_org_id AND title = 'Inadequate emergency lighting in Dormer Hall stairwell C') THEN
        INSERT INTO issues (
            title, description, status, reporter_hash, reporter_alias, hidden, vote_count,
            tracking_code, category, department, assigned_to, reporter_id, organization_id,
            resolved_at, created_at, updated_at
        ) VALUES (
            'Inadequate emergency lighting in Dormer Hall stairwell C',
            'Two emergency backup lights in stairwell C between floors 2 and 4 fail battery backup illumination tests. In the event of a power outage, the egress pathway is completely dark, creating a serious life-safety hazard.',
            'RESOLVED', 'anon_3b1d204867b2', 'Complainant #3B1D', FALSE, 22,
            'CMP-M3P7R6N4', 'Safety', 'Campus Safety', v_investigator_id, v_student_id, v_org_id,
            CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP - INTERVAL '3 days'
        ) RETURNING id INTO v_issue_id;

        INSERT INTO audit_logs (issue_id, action, actor, performed_by, details, created_at, updated_at)
        VALUES (v_issue_id, 'ISSUE_CREATED', 'system', 'system', 'Complaint registered via anonymous portal', CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP - INTERVAL '12 days');
        INSERT INTO audit_logs (issue_id, action, actor, performed_by, details, created_at, updated_at)
        VALUES (v_issue_id, 'ISSUE_RESOLVED', 'investigator', 'investigator', 'Emergency ballasts and LED fixtures replaced and tested', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days');
    END IF;

    -- 3. Water leakage near Engineering Block laboratory
    IF NOT EXISTS (SELECT 1 FROM issues WHERE organization_id = v_org_id AND title = 'Water leakage near Engineering Block laboratory') THEN
        INSERT INTO issues (
            title, description, status, reporter_hash, reporter_alias, hidden, vote_count,
            tracking_code, category, department, assigned_to, reporter_id, organization_id,
            resolved_at, created_at, updated_at
        ) VALUES (
            'Water leakage near Engineering Block laboratory',
            'Water seepage observed from overhead pipe joints along the corridor adjacent to the Materials Testing Lab in Engineering Block B. Slippery floor surfaces present an immediate fall risk for students and lab technicians.',
            'REPORTED', 'anon_7e2a339102c3', 'Complainant #7E2A', FALSE, 8,
            'CMP-W7L2B9D4', 'Infrastructure', 'Facilities & Operations', NULL, v_student_id, v_org_id,
            NULL, CURRENT_TIMESTAMP - INTERVAL '18 hours', CURRENT_TIMESTAMP - INTERVAL '18 hours'
        ) RETURNING id INTO v_issue_id;

        INSERT INTO audit_logs (issue_id, action, actor, performed_by, details, created_at, updated_at)
        VALUES (v_issue_id, 'ISSUE_CREATED', 'system', 'system', 'Complaint registered via anonymous portal', CURRENT_TIMESTAMP - INTERVAL '18 hours', CURRENT_TIMESTAMP - INTERVAL '18 hours');
    END IF;

    -- 4. Broken air conditioning in Computer Lab 204
    IF NOT EXISTS (SELECT 1 FROM issues WHERE organization_id = v_org_id AND title = 'Broken air conditioning in Computer Lab 204') THEN
        INSERT INTO issues (
            title, description, status, reporter_hash, reporter_alias, hidden, vote_count,
            tracking_code, category, department, assigned_to, reporter_id, organization_id,
            resolved_at, created_at, updated_at
        ) VALUES (
            'Broken air conditioning in Computer Lab 204',
            'The central HVAC unit servicing Computer Lab 204 has ceased cooling. Ambient room temperature reached 31°C during afternoon programming sessions, causing workstation thermal throttling and severe discomfort.',
            'UNDER_REVIEW', 'anon_5c4b119044d4', 'Complainant #5C4B', FALSE, 19,
            'CMP-AC402LAB', 'Infrastructure', 'Facilities & Operations', v_admin_id, v_student_id, v_org_id,
            NULL, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '1 day'
        ) RETURNING id INTO v_issue_id;

        INSERT INTO audit_logs (issue_id, action, actor, performed_by, details, created_at, updated_at)
        VALUES (v_issue_id, 'ISSUE_CREATED', 'system', 'system', 'Complaint registered via anonymous portal', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days');
        INSERT INTO audit_logs (issue_id, action, actor, performed_by, details, created_at, updated_at)
        VALUES (v_issue_id, 'STATUS_CHANGED', 'admin', 'admin', 'Status updated to UNDER_REVIEW during initial triage', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day');
    END IF;

    -- 5. Delayed scholarship processing for eligible students
    IF NOT EXISTS (SELECT 1 FROM issues WHERE organization_id = v_org_id AND title = 'Delayed scholarship processing for eligible students') THEN
        INSERT INTO issues (
            title, description, status, reporter_hash, reporter_alias, hidden, vote_count,
            tracking_code, category, department, assigned_to, reporter_id, organization_id,
            resolved_at, created_at, updated_at
        ) VALUES (
            'Delayed scholarship processing for eligible students',
            'Disbursement of merit and need-based institutional scholarship stipends for the current semester is delayed by over three weeks. Multiple eligible students have received tuition hold notices despite approved verification files.',
            'IN_PROGRESS', 'anon_9d1f884215e5', 'Complainant #9D1F', FALSE, 31,
            'CMP-SCH89012', 'Student Life', 'Student Affairs', v_admin_id, v_student_id, v_org_id,
            NULL, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '12 hours'
        ) RETURNING id INTO v_issue_id;

        INSERT INTO audit_logs (issue_id, action, actor, performed_by, details, created_at, updated_at)
        VALUES (v_issue_id, 'ISSUE_CREATED', 'system', 'system', 'Complaint registered via anonymous portal', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days');
        INSERT INTO audit_logs (issue_id, action, actor, performed_by, details, created_at, updated_at)
        VALUES (v_issue_id, 'ISSUE_ASSIGNED', 'admin', 'admin', 'Assigned to Student Affairs financial liaison', CURRENT_TIMESTAMP - INTERVAL '12 hours', CURRENT_TIMESTAMP - INTERVAL '12 hours');
    END IF;

    -- 6. Unsafe pedestrian crossing near main campus gate
    IF NOT EXISTS (SELECT 1 FROM issues WHERE organization_id = v_org_id AND title = 'Unsafe pedestrian crossing near main campus gate') THEN
        INSERT INTO issues (
            title, description, status, reporter_hash, reporter_alias, hidden, vote_count,
            tracking_code, category, department, assigned_to, reporter_id, organization_id,
            resolved_at, created_at, updated_at
        ) VALUES (
            'Unsafe pedestrian crossing near main campus gate',
            'Vehicles entering University Boulevard from the north turn without yielding at the zebra crossing in front of the main campus archway. Faded paint markings and lack of a pedestrian beacon make crossing dangerous during morning rush hour.',
            'UNDER_REVIEW', 'anon_2a9e661073f6', 'Complainant #2A9E', FALSE, 27,
            'CMP-CR0551NG', 'Safety', 'Campus Safety', NULL, v_student_id, v_org_id,
            NULL, CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '2 days'
        ) RETURNING id INTO v_issue_id;

        INSERT INTO audit_logs (issue_id, action, actor, performed_by, details, created_at, updated_at)
        VALUES (v_issue_id, 'ISSUE_CREATED', 'system', 'system', 'Complaint registered via anonymous portal', CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '4 days');
    END IF;

    -- 7. Library study room booking system frequently unavailable
    IF NOT EXISTS (SELECT 1 FROM issues WHERE organization_id = v_org_id AND title = 'Library study room booking system frequently unavailable') THEN
        INSERT INTO issues (
            title, description, status, reporter_hash, reporter_alias, hidden, vote_count,
            tracking_code, category, department, assigned_to, reporter_id, organization_id,
            resolved_at, created_at, updated_at
        ) VALUES (
            'Library study room booking system frequently unavailable',
            'The portal for reserving collaborative study pods in the central library throws 504 gateway timeout errors between 7 PM and 10 PM. Group project teams cannot reliably secure reservations.',
            'RESOLVED', 'anon_6e3f441982a7', 'Complainant #6E3F', FALSE, 16,
            'CMP-LIB77102', 'Academic', 'Library Services', v_investigator_id, v_student_id, v_org_id,
            CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '5 days'
        ) RETURNING id INTO v_issue_id;

        INSERT INTO audit_logs (issue_id, action, actor, performed_by, details, created_at, updated_at)
        VALUES (v_issue_id, 'ISSUE_CREATED', 'system', 'system', 'Complaint registered via anonymous portal', CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '14 days');
        INSERT INTO audit_logs (issue_id, action, actor, performed_by, details, created_at, updated_at)
        VALUES (v_issue_id, 'ISSUE_RESOLVED', 'investigator', 'investigator', 'Reservation portal cache pool resized and session locks optimized', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days');
    END IF;

    -- 8. Insufficient seating in the student cafeteria
    IF NOT EXISTS (SELECT 1 FROM issues WHERE organization_id = v_org_id AND title = 'Insufficient seating in the student cafeteria') THEN
        INSERT INTO issues (
            title, description, status, reporter_hash, reporter_alias, hidden, vote_count,
            tracking_code, category, department, assigned_to, reporter_id, organization_id,
            resolved_at, created_at, updated_at
        ) VALUES (
            'Insufficient seating in the student cafeteria',
            'During the 11:30 AM to 1:30 PM lunch peak, Commons Dining Hall has zero available tables. Students are forced to eat sitting on perimeter stairwells and outdoor benches during inclement weather.',
            'REPORTED', 'anon_4d8c772091b8', 'Complainant #4D8C', FALSE, 25,
            'CMP-CAF33891', 'Student Life', 'Student Services', NULL, v_student_id, v_org_id,
            NULL, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'
        ) RETURNING id INTO v_issue_id;

        INSERT INTO audit_logs (issue_id, action, actor, performed_by, details, created_at, updated_at)
        VALUES (v_issue_id, 'ISSUE_CREATED', 'system', 'system', 'Complaint registered via anonymous portal', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day');
    END IF;

    -- 9. Laboratory equipment maintenance delays
    IF NOT EXISTS (SELECT 1 FROM issues WHERE organization_id = v_org_id AND title = 'Laboratory equipment maintenance delays') THEN
        INSERT INTO issues (
            title, description, status, reporter_hash, reporter_alias, hidden, vote_count,
            tracking_code, category, department, assigned_to, reporter_id, organization_id,
            resolved_at, created_at, updated_at
        ) VALUES (
            'Laboratory equipment maintenance delays',
            'Spectrophotometers and analytical balances in Physical Chemistry Lab 302 have been tagged as overdue for calibration since September. Students in experimental chemistry cannot complete required coursework without reliable readings.',
            'IN_PROGRESS', 'anon_1f5a993410c9', 'Complainant #1F5A', FALSE, 18,
            'CMP-LAB44921', 'Academic', 'Academic Affairs', v_investigator_id, v_student_id, v_org_id,
            NULL, CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP - INTERVAL '1 day'
        ) RETURNING id INTO v_issue_id;

        INSERT INTO audit_logs (issue_id, action, actor, performed_by, details, created_at, updated_at)
        VALUES (v_issue_id, 'ISSUE_CREATED', 'system', 'system', 'Complaint registered via anonymous portal', CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP - INTERVAL '6 days');
        INSERT INTO audit_logs (issue_id, action, actor, performed_by, details, created_at, updated_at)
        VALUES (v_issue_id, 'ISSUE_ASSIGNED', 'investigator', 'investigator', 'Technician service requisition submitted to equipment vendor', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day');
    END IF;

    -- 10. Broken accessibility ramp near administration building
    IF NOT EXISTS (SELECT 1 FROM issues WHERE organization_id = v_org_id AND title = 'Broken accessibility ramp near administration building') THEN
        INSERT INTO issues (
            title, description, status, reporter_hash, reporter_alias, hidden, vote_count,
            tracking_code, category, department, assigned_to, reporter_id, organization_id,
            resolved_at, created_at, updated_at
        ) VALUES (
            'Broken accessibility ramp near administration building',
            'The concrete paving on the ADA accessibility ramp leading to the east wing of the Central Administration Building has fractured, creating a 3-inch vertical lip. Wheelchair users cannot safely enter without assistance.',
            'REPORTED', 'anon_3c7b221085d0', 'Complainant #3C7B', FALSE, 21,
            'CMP-RAMP8812', 'Accessibility', 'Accessibility / Facilities', NULL, v_student_id, v_org_id,
            NULL, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'
        ) RETURNING id INTO v_issue_id;

        INSERT INTO audit_logs (issue_id, action, actor, performed_by, details, created_at, updated_at)
        VALUES (v_issue_id, 'ISSUE_CREATED', 'system', 'system', 'Complaint registered via anonymous portal', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days');
    END IF;

    -- 11. Examination timetable conflict between two departments
    IF NOT EXISTS (SELECT 1 FROM issues WHERE organization_id = v_org_id AND title = 'Examination timetable conflict between two departments') THEN
        INSERT INTO issues (
            title, description, status, reporter_hash, reporter_alias, hidden, vote_count,
            tracking_code, category, department, assigned_to, reporter_id, organization_id,
            resolved_at, created_at, updated_at
        ) VALUES (
            'Examination timetable conflict between two departments',
            'Final examinations for Advanced Linear Algebra (MATH 301) and Operating Systems (CS 350) were scheduled for the exact same timeslot on Thursday morning. Over forty dual-degree students were double-booked.',
            'RESOLVED', 'anon_8e2d447190e1', 'Complainant #8E2D', FALSE, 34,
            'CMP-EXAM9021', 'Academic', 'Academic Affairs', v_admin_id, v_student_id, v_org_id,
            CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '4 days'
        ) RETURNING id INTO v_issue_id;

        INSERT INTO audit_logs (issue_id, action, actor, performed_by, details, created_at, updated_at)
        VALUES (v_issue_id, 'ISSUE_CREATED', 'system', 'system', 'Complaint registered via anonymous portal', CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '10 days');
        INSERT INTO audit_logs (issue_id, action, actor, performed_by, details, created_at, updated_at)
        VALUES (v_issue_id, 'ISSUE_RESOLVED', 'admin', 'admin', 'Exam schedule adjusted with registrar; alternate testing slot published', CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '4 days');
    END IF;

    -- 12. Long queue and delays at student administration counter
    IF NOT EXISTS (SELECT 1 FROM issues WHERE organization_id = v_org_id AND title = 'Long queue and delays at student administration counter') THEN
        INSERT INTO issues (
            title, description, status, reporter_hash, reporter_alias, hidden, vote_count,
            tracking_code, category, department, assigned_to, reporter_id, organization_id,
            resolved_at, created_at, updated_at
        ) VALUES (
            'Long queue and delays at student administration counter',
            'Wait times at the student records and transcript counter frequently exceed ninety minutes during add/drop week. Only two of the six service desks were staffed during peak operational hours.',
            'UNDER_REVIEW', 'anon_5a1f663044f2', 'Complainant #5A1F', FALSE, 15,
            'CMP-ADM55219', 'Student Life', 'Student Affairs', NULL, v_student_id, v_org_id,
            NULL, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '1 day'
        ) RETURNING id INTO v_issue_id;

        INSERT INTO audit_logs (issue_id, action, actor, performed_by, details, created_at, updated_at)
        VALUES (v_issue_id, 'ISSUE_CREATED', 'system', 'system', 'Complaint registered via anonymous portal', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days');
    END IF;

END $$;
