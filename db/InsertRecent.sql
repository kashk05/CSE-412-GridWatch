-- Insert synthetic NYC reports (no CLOSED status)

DO $$
DECLARE
    i              integer;
    n_reports      integer := 20000;

    cat_ids        integer[];
    sev_ids        integer[];
    area_ids       integer[];
    user_ids       integer[];

    title_templates text[];
    desc_templates  text[];
    place_names     text[];
    status_vals     report_status[];

    t_title   text;
    t_desc    text;
    t_place   text;

    v_lat     numeric(9,6);
    v_lon     numeric(9,6);
    v_status  report_status;
    v_cat     integer;
    v_sev     integer;
    v_area    integer;
    v_user    integer;

BEGIN
    -- pull FK pools
    SELECT array_agg(category_id) INTO cat_ids FROM category;
    SELECT array_agg(severity_id) INTO sev_ids FROM severity;
    SELECT array_agg(area_id)     INTO area_ids FROM service_area;
    SELECT array_agg(user_id)     INTO user_ids FROM "user";

    IF cat_ids IS NULL OR sev_ids IS NULL OR area_ids IS NULL OR user_ids IS NULL THEN
        RAISE EXCEPTION 'Need at least one row in category, severity, service_area, and "user" before seeding.';
    END IF;

    -- templates
    title_templates := ARRAY[
        'Pothole causing lane closure near %s',
        'Flickering streetlight reported in %s',
        'Overflowing trash cans around %s',
        'Illegal dumping observed in %s',
        'Broken traffic signal near %s',
        'Sidewalk obstruction making %s unsafe',
        'Noise complaint reported in %s',
        'Blocked bike lane in %s',
        'Water leak observed around %s',
        'Damaged crosswalk markings at %s'
    ];

    desc_templates := ARRAY[
        'Recurring issue reported by multiple residents.',
        'Lights are flickering and creating unsafe nighttime conditions.',
        'Trash cans are overflowing and bags are piling up on the sidewalk.',
        'Debris has been left unattended and is blocking pedestrians.',
        'Signal timing appears off, creating confusion at the intersection.',
        'Water is pooling near the curb; possible pipe or hydrant leak.',
        'Noise continues late into the night, disturbing nearby residents.'
    ];

    place_names := ARRAY[
        'Harlem','Chelsea','SoHo','Tribeca','Upper East Side',
        'Upper West Side','Brooklyn Heights','Williamsburg',
        'Astoria','Long Island City','Financial District',
        'East Village','West Village','Midtown'
    ];

    -- ONLY non-closed lifecycle values (valid enum values)
    status_vals := ARRAY[
        'SUBMITTED'::report_status,
        'TRIAGED'::report_status,
        'IN_PROGRESS'::report_status,
        'ON_HOLD'::report_status,
        'RESOLVED'::report_status,
        'MERGED'::report_status
    ];

    FOR i IN 1..n_reports LOOP
        -- pick templates
        t_title := title_templates[1 + (i % array_length(title_templates,1))];
        t_desc  := desc_templates[1 + (i % array_length(desc_templates,1))];
        t_place := place_names[1 + (i % array_length(place_names,1))];

        -- NYC-ish coords
        v_lat := 40.55 + random() * (40.90 - 40.55);
        v_lon := -74.10 + random() * (-73.70 + 74.10);

        -- random FK ids
        v_cat  := cat_ids[1 + (i % array_length(cat_ids,1))];
        v_sev  := sev_ids[1 + (i % array_length(sev_ids,1))];
        v_area := area_ids[1 + (i % array_length(area_ids,1))];
        v_user := user_ids[1 + (i % array_length(user_ids,1))];

        -- non-closed status
        v_status := status_vals[1 + (i % array_length(status_vals,1))];

        INSERT INTO report (
            title,
            description,
            latitude,
            longitude,
            geohash,
            address,
            created_by,
            category_id,
            severity_id,
            area_id,
            current_status,
            created_at
        )
        VALUES (
            format(t_title, t_place),
            t_desc || ' Location: ' || t_place || ', NYC.',
            v_lat,
            v_lon,
            '9ny' || lpad(i::text, 6, '0'),  -- fake geohash
            (100 + (i % 900))::text || ' Example St, ' || t_place || ', NYC',
            v_user,
            v_cat,
            v_sev,
            v_area,
            v_status,
            now() - (random() * interval '90 days')
        );
    END LOOP;
END $$;
