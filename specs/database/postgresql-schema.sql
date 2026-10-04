-- Planning Workspace relational schema
-- Target: PostgreSQL 15+
-- Persistent business data is fully relational. No JSON or JSONB columns are used.

begin;

create schema if not exists planning;
set search_path = planning, public;

create table if not exists schema_migrations (
  version integer primary key,
  name text not null check (btrim(name) <> ''),
  applied_at timestamptz not null default now()
);

insert into schema_migrations (version, name)
values (1, 'initial relational planning schema')
on conflict (version) do nothing;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Workspace, organization, calendars, and inherited settings
-- ---------------------------------------------------------------------------

create table planning_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table call_centers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references planning_workspaces(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  time_zone text not null check (btrim(time_zone) <> ''),
  operating_open_time time not null default time '09:00',
  operating_close_time time not null default time '17:00',
  default_paid_hours_per_day numeric(6, 3) not null default 8
    check (default_paid_hours_per_day > 0 and default_paid_hours_per_day <= 24),
  default_occupancy_ratio numeric(9, 8) not null default 0.90
    check (default_occupancy_ratio > 0 and default_occupancy_ratio <= 1),
  default_adherence_ratio numeric(9, 8) not null default 0.95
    check (default_adherence_ratio > 0 and default_adherence_ratio <= 1),
  default_service_level_ratio numeric(9, 8) not null default 0.80
    check (default_service_level_ratio > 0 and default_service_level_ratio <= 1),
  default_service_level_threshold_seconds numeric(12, 3) not null default 20
    check (default_service_level_threshold_seconds > 0),
  default_caller_patience_seconds numeric(12, 3) not null default 60
    check (default_caller_patience_seconds > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint call_centers_operating_window_check
    check (operating_close_time > operating_open_time),
  unique (id, workspace_id)
);

create index call_centers_workspace_idx on call_centers(workspace_id);

create table call_center_operating_weekdays (
  call_center_id uuid not null references call_centers(id) on delete cascade,
  iso_weekday smallint not null check (iso_weekday between 1 and 7),
  primary key (call_center_id, iso_weekday)
);

create table holiday_profiles (
  id uuid primary key default gen_random_uuid(),
  call_center_id uuid not null references call_centers(id) on delete cascade,
  calendar_year integer not null check (calendar_year between 1900 and 2200),
  name text not null check (btrim(name) <> ''),
  source_kind text not null default 'custom'
    check (source_kind in ('template', 'custom', 'copied', 'mixed')),
  source_profile_id uuid references holiday_profiles(id) on delete set null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, call_center_id),
  unique (call_center_id, calendar_year, name)
);

create unique index holiday_profiles_one_default_per_year_idx
  on holiday_profiles(call_center_id, calendar_year)
  where is_default;

create table holiday_closures (
  id uuid primary key default gen_random_uuid(),
  holiday_profile_id uuid not null references holiday_profiles(id) on delete cascade,
  closure_date date not null,
  name text not null check (btrim(name) <> ''),
  source_kind text not null default 'custom'
    check (source_kind in ('template', 'custom', 'copied')),
  source_rule_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (holiday_profile_id, closure_date)
);

create table staffing_groups (
  id uuid primary key default gen_random_uuid(),
  call_center_id uuid not null references call_centers(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  demand_unit text not null default 'contacts' check (btrim(demand_unit) <> ''),
  operating_settings_mode text not null default 'inherit'
    check (operating_settings_mode in ('inherit', 'override')),
  operating_open_time_override time,
  operating_close_time_override time,
  paid_hours_per_day_override numeric(6, 3)
    check (paid_hours_per_day_override is null or
      (paid_hours_per_day_override > 0 and paid_hours_per_day_override <= 24)),
  occupancy_ratio_override numeric(9, 8)
    check (occupancy_ratio_override is null or
      (occupancy_ratio_override > 0 and occupancy_ratio_override <= 1)),
  adherence_ratio_override numeric(9, 8)
    check (adherence_ratio_override is null or
      (adherence_ratio_override > 0 and adherence_ratio_override <= 1)),
  service_level_ratio_override numeric(9, 8)
    check (service_level_ratio_override is null or
      (service_level_ratio_override > 0 and service_level_ratio_override <= 1)),
  service_level_threshold_seconds_override numeric(12, 3)
    check (service_level_threshold_seconds_override is null or
      service_level_threshold_seconds_override > 0),
  caller_patience_seconds_override numeric(12, 3)
    check (caller_patience_seconds_override is null or
      caller_patience_seconds_override > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staffing_groups_operating_override_check check (
    (
      operating_settings_mode = 'inherit'
      and operating_open_time_override is null
      and operating_close_time_override is null
    )
    or
    (
      operating_settings_mode = 'override'
      and operating_open_time_override is not null
      and operating_close_time_override is not null
      and operating_close_time_override > operating_open_time_override
    )
  ),
  unique (id, call_center_id)
);

create index staffing_groups_call_center_idx on staffing_groups(call_center_id);

create table staffing_group_operating_weekdays (
  staffing_group_id uuid not null references staffing_groups(id) on delete cascade,
  iso_weekday smallint not null check (iso_weekday between 1 and 7),
  primary key (staffing_group_id, iso_weekday)
);

create table staffing_group_holiday_assignments (
  staffing_group_id uuid not null,
  call_center_id uuid not null,
  calendar_year integer not null check (calendar_year between 1900 and 2200),
  holiday_profile_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (staffing_group_id, calendar_year),
  foreign key (staffing_group_id, call_center_id)
    references staffing_groups(id, call_center_id) on delete cascade,
  foreign key (holiday_profile_id, call_center_id)
    references holiday_profiles(id, call_center_id) on delete restrict
);

create table intraday_profiles (
  id uuid primary key default gen_random_uuid(),
  staffing_group_id uuid not null unique references staffing_groups(id) on delete cascade,
  interval_length_minutes integer not null default 30
    check (interval_length_minutes > 0 and interval_length_minutes <= 1440),
  minimum_headcount_per_open_interval integer not null default 0
    check (minimum_headcount_per_open_interval >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'valid', 'invalid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table intraday_profile_intervals (
  intraday_profile_id uuid not null references intraday_profiles(id) on delete cascade,
  position integer not null check (position >= 0),
  start_time time not null,
  end_time time not null,
  demand_ratio numeric(12, 11) not null
    check (demand_ratio >= 0 and demand_ratio <= 1),
  primary key (intraday_profile_id, position),
  unique (intraday_profile_id, start_time),
  check (end_time > start_time)
);

-- ---------------------------------------------------------------------------
-- Imported forecast versions and normalized source rows
-- ---------------------------------------------------------------------------

create table forecast_versions (
  id uuid primary key default gen_random_uuid(),
  staffing_group_id uuid not null references staffing_groups(id) on delete cascade,
  display_name text not null check (btrim(display_name) <> ''),
  granularity text not null check (granularity in ('monthly', 'daily', 'interval')),
  status text not null default 'importing'
    check (status in ('importing', 'invalid', 'accepted', 'planning_ready', 'referenced', 'deleted')),
  original_file_name text not null check (btrim(original_file_name) <> ''),
  source_label text,
  source_description text,
  external_version_label text,
  source_checksum_sha256 text
    check (source_checksum_sha256 is null or source_checksum_sha256 ~ '^[0-9a-fA-F]{64}$'),
  imported_at timestamptz not null default now(),
  coverage_start date,
  coverage_end date,
  normalized_row_count integer not null default 0 check (normalized_row_count >= 0),
  replaces_forecast_version_id uuid references forecast_versions(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (coverage_start is null or coverage_end is null or coverage_start <= coverage_end),
  check ((status = 'deleted') = (deleted_at is not null)),
  unique (id, staffing_group_id)
);

create index forecast_versions_group_idx
  on forecast_versions(staffing_group_id, imported_at desc);
create index forecast_versions_coverage_idx
  on forecast_versions(staffing_group_id, coverage_start, coverage_end);

create table forecast_import_columns (
  forecast_version_id uuid not null references forecast_versions(id) on delete cascade,
  source_ordinal integer not null check (source_ordinal >= 0),
  source_header text not null,
  logical_field text
    check (logical_field is null or logical_field in (
      'month',
      'service_date',
      'interval_start',
      'contacts',
      'average_handle_time',
      'interval_length',
      'source_record_identifier',
      'source_queue',
      'lower_contact_bound',
      'upper_contact_bound',
      'source_notes',
      'external_version_label'
    )),
  source_unit text,
  is_mapped boolean not null default false,
  primary key (forecast_version_id, source_ordinal),
  unique (forecast_version_id, source_header),
  check (is_mapped = (logical_field is not null))
);

create table forecast_rows (
  id uuid primary key default gen_random_uuid(),
  forecast_version_id uuid not null references forecast_versions(id) on delete cascade,
  source_row_number integer not null check (source_row_number >= 2),
  month_start date,
  service_date date,
  interval_start_local timestamp without time zone,
  interval_length_minutes numeric(10, 4)
    check (interval_length_minutes is null or interval_length_minutes > 0),
  contacts numeric(20, 6) not null check (contacts >= 0),
  average_handle_time_seconds numeric(20, 6) not null
    check (average_handle_time_seconds > 0),
  lower_contact_bound numeric(20, 6)
    check (lower_contact_bound is null or lower_contact_bound >= 0),
  upper_contact_bound numeric(20, 6)
    check (upper_contact_bound is null or upper_contact_bound >= 0),
  source_record_identifier text,
  source_queue text,
  source_notes text,
  external_version_label text,
  created_at timestamptz not null default now(),
  check (num_nonnulls(month_start, service_date, interval_start_local) = 1),
  check (
    (interval_start_local is null and interval_length_minutes is null)
    or
    (interval_start_local is not null and interval_length_minutes is not null)
  ),
  check (month_start is null or extract(day from month_start) = 1),
  check (
    lower_contact_bound is null
    or upper_contact_bound is null
    or lower_contact_bound <= upper_contact_bound
  ),
  unique (forecast_version_id, source_row_number)
);

create unique index forecast_rows_month_key_idx
  on forecast_rows(forecast_version_id, month_start)
  where month_start is not null;
create unique index forecast_rows_day_key_idx
  on forecast_rows(forecast_version_id, service_date)
  where service_date is not null;
create unique index forecast_rows_interval_key_idx
  on forecast_rows(forecast_version_id, interval_start_local)
  where interval_start_local is not null;

create table forecast_row_attributes (
  forecast_row_id uuid not null references forecast_rows(id) on delete cascade,
  source_column_name text not null check (btrim(source_column_name) <> ''),
  source_value text,
  primary key (forecast_row_id, source_column_name)
);

create table forecast_import_issues (
  id bigint generated always as identity primary key,
  forecast_version_id uuid not null references forecast_versions(id) on delete cascade,
  severity text not null check (severity in ('information', 'warning', 'blocking', 'error')),
  issue_level text not null check (issue_level in ('file', 'schema', 'row', 'dataset')),
  source_row_number integer check (source_row_number is null or source_row_number >= 2),
  logical_field text,
  issue_code text not null check (btrim(issue_code) <> ''),
  message text not null check (btrim(message) <> ''),
  corrective_action text,
  created_at timestamptz not null default now()
);

create index forecast_import_issues_version_idx
  on forecast_import_issues(forecast_version_id, severity);

create table forecast_readiness_checks (
  id uuid primary key default gen_random_uuid(),
  forecast_version_id uuid not null references forecast_versions(id) on delete cascade,
  planning_year integer not null check (planning_year between 1900 and 2200),
  plan_type text not null check (plan_type in ('budget', 'update')),
  requirement_method text not null
    check (requirement_method in ('workload_ratio', 'intraday_erlang')),
  actuals_through_month smallint
    check (actuals_through_month is null or actuals_through_month between 1 and 12),
  status text not null check (status in ('ready', 'not_ready')),
  required_month_count smallint not null check (required_month_count between 0 and 12),
  matched_month_count smallint not null check (
    matched_month_count >= 0 and matched_month_count <= required_month_count
  ),
  evaluated_at timestamptz not null default now(),
  check (
    (plan_type = 'budget' and actuals_through_month is null)
    or
    (plan_type = 'update' and actuals_through_month is not null)
  )
);

create index forecast_readiness_checks_context_idx
  on forecast_readiness_checks(
    forecast_version_id,
    planning_year,
    plan_type,
    requirement_method,
    evaluated_at desc
  );

create table forecast_readiness_months (
  readiness_check_id uuid not null references forecast_readiness_checks(id) on delete cascade,
  month_start date not null check (extract(day from month_start) = 1),
  status text not null check (status in ('matched', 'missing', 'invalid', 'not_required')),
  detail text,
  primary key (readiness_check_id, month_start)
);

-- ---------------------------------------------------------------------------
-- Actuals imports and the deduplicated daily history
-- ---------------------------------------------------------------------------

create table actuals_imports (
  id uuid primary key default gen_random_uuid(),
  staffing_group_id uuid not null references staffing_groups(id) on delete cascade,
  original_file_name text not null check (btrim(original_file_name) <> ''),
  source_checksum_sha256 text
    check (source_checksum_sha256 is null or source_checksum_sha256 ~ '^[0-9a-fA-F]{64}$'),
  imported_at timestamptz not null default now(),
  accepted_row_count integer not null default 0 check (accepted_row_count >= 0),
  addition_count integer not null default 0 check (addition_count >= 0),
  replacement_count integer not null default 0 check (replacement_count >= 0),
  coverage_start date,
  coverage_end date,
  created_at timestamptz not null default now(),
  check (coverage_start is null or coverage_end is null or coverage_start <= coverage_end)
);

create index actuals_imports_group_idx
  on actuals_imports(staffing_group_id, imported_at desc);

create table actuals_import_columns (
  actuals_import_id uuid not null references actuals_imports(id) on delete cascade,
  source_ordinal integer not null check (source_ordinal >= 0),
  source_header text not null,
  logical_field text
    check (logical_field is null or logical_field in (
      'service_date',
      'contacts',
      'average_handle_time'
    )),
  source_unit text,
  is_mapped boolean not null default false,
  primary key (actuals_import_id, source_ordinal),
  unique (actuals_import_id, source_header),
  check (is_mapped = (logical_field is not null))
);

create table actuals_daily (
  id uuid not null default gen_random_uuid(),
  staffing_group_id uuid not null references staffing_groups(id) on delete cascade,
  service_date date not null,
  contacts numeric(20, 6) not null check (contacts >= 0),
  average_handle_time_seconds numeric(20, 6) not null
    check (average_handle_time_seconds >= 0),
  source_actuals_import_id uuid references actuals_imports(id) on delete set null,
  source_row_number integer check (source_row_number is null or source_row_number >= 2),
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (staffing_group_id, service_date),
  unique (id)
);

create index actuals_daily_service_date_idx
  on actuals_daily(service_date, staffing_group_id);

create table actuals_import_issues (
  id bigint generated always as identity primary key,
  actuals_import_id uuid not null references actuals_imports(id) on delete cascade,
  severity text not null check (severity in ('information', 'warning', 'blocking', 'error')),
  issue_level text not null check (issue_level in ('file', 'schema', 'row', 'dataset')),
  source_row_number integer check (source_row_number is null or source_row_number >= 2),
  logical_field text,
  issue_code text not null check (btrim(issue_code) <> ''),
  message text not null check (btrim(message) <> ''),
  corrective_action text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Annual plans, lineage, source snapshots, and calendar snapshots
-- ---------------------------------------------------------------------------

create table plans (
  id uuid primary key default gen_random_uuid(),
  staffing_group_id uuid not null,
  call_center_id uuid not null,
  name text not null check (btrim(name) <> ''),
  planning_year integer not null check (planning_year between 1900 and 2200),
  plan_type text not null check (plan_type in ('budget', 'update')),
  status text not null default 'draft' check (status in ('draft', 'finalized')),
  requirement_method text not null
    check (requirement_method in ('workload_ratio', 'intraday_erlang')),
  source_plan_id uuid,
  budget_plan_id uuid,
  actuals_through_month smallint
    check (actuals_through_month is null or actuals_through_month between 1 and 12),
  actualized_at timestamptz,
  is_current boolean not null default false,
  finalized_at timestamptz,
  last_autosaved_at timestamptz,
  last_manual_saved_at timestamptz,
  lock_version bigint not null default 1 check (lock_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (staffing_group_id, call_center_id)
    references staffing_groups(id, call_center_id) on delete cascade,
  unique (id, staffing_group_id),
  unique (id, staffing_group_id, planning_year),
  foreign key (source_plan_id, staffing_group_id, planning_year)
    references plans(id, staffing_group_id, planning_year) on delete restrict,
  foreign key (budget_plan_id, staffing_group_id, planning_year)
    references plans(id, staffing_group_id, planning_year) on delete restrict,
  check (
    (
      plan_type = 'budget'
      and source_plan_id is null
      and budget_plan_id is null
      and actuals_through_month is null
      and actualized_at is null
    )
    or
    (
      plan_type = 'update'
      and source_plan_id is not null
      and budget_plan_id is not null
      and actuals_through_month is not null
      and actualized_at is not null
    )
  ),
  check ((status = 'finalized') = (finalized_at is not null)),
  check (not is_current or status = 'finalized')
);

create unique index plans_one_budget_per_group_year_idx
  on plans(staffing_group_id, planning_year)
  where plan_type = 'budget';

create unique index plans_one_current_per_group_year_idx
  on plans(staffing_group_id, planning_year)
  where is_current;

create index plans_group_year_idx
  on plans(staffing_group_id, planning_year, updated_at desc);
create index plans_source_plan_idx on plans(source_plan_id);
create index plans_budget_plan_idx on plans(budget_plan_id);

create table plan_demand_sources (
  plan_id uuid primary key,
  staffing_group_id uuid not null,
  forecast_version_id uuid not null,
  source_forecast_identifier uuid not null,
  forecast_display_name text not null check (btrim(forecast_display_name) <> ''),
  original_file_name text not null check (btrim(original_file_name) <> ''),
  source_label text,
  source_description text,
  external_version_label text,
  forecast_granularity text not null
    check (forecast_granularity in ('monthly', 'daily', 'interval')),
  forecast_imported_at timestamptz not null,
  applied_coverage_start date not null,
  applied_coverage_end date not null,
  snapshot_created_at timestamptz not null default now(),
  check (applied_coverage_start <= applied_coverage_end),
  check (source_forecast_identifier = forecast_version_id),
  foreign key (plan_id, staffing_group_id)
    references plans(id, staffing_group_id) on delete cascade,
  foreign key (forecast_version_id, staffing_group_id)
    references forecast_versions(id, staffing_group_id)
    on delete no action
    deferrable initially deferred
);

create table plan_calendar_snapshots (
  plan_id uuid primary key references plans(id) on delete cascade,
  time_zone text not null check (btrim(time_zone) <> ''),
  operating_open_time time not null,
  operating_close_time time not null,
  captured_at timestamptz not null default now(),
  check (operating_close_time > operating_open_time)
);

create table plan_calendar_weekdays (
  plan_id uuid not null references plan_calendar_snapshots(plan_id) on delete cascade,
  iso_weekday smallint not null check (iso_weekday between 1 and 7),
  primary key (plan_id, iso_weekday)
);

create table plan_calendar_closures (
  plan_id uuid not null references plan_calendar_snapshots(plan_id) on delete cascade,
  closure_date date not null,
  name text not null check (btrim(name) <> ''),
  source_kind text not null check (source_kind in ('template', 'custom', 'copied')),
  primary key (plan_id, closure_date)
);

create table plan_setting_snapshots (
  plan_id uuid primary key references plans(id) on delete cascade,
  paid_hours_per_day_default numeric(6, 3) not null
    check (paid_hours_per_day_default > 0 and paid_hours_per_day_default <= 24),
  occupancy_ratio_default numeric(9, 8) not null
    check (occupancy_ratio_default > 0 and occupancy_ratio_default <= 1),
  adherence_ratio_default numeric(9, 8) not null
    check (adherence_ratio_default > 0 and adherence_ratio_default <= 1),
  service_level_ratio numeric(9, 8) not null
    check (service_level_ratio > 0 and service_level_ratio <= 1),
  service_level_threshold_seconds numeric(12, 3) not null
    check (service_level_threshold_seconds > 0),
  caller_patience_seconds numeric(12, 3) not null
    check (caller_patience_seconds > 0),
  use_monthly_capacity_overrides boolean not null default false,
  opening_roster_headcount numeric(14, 4)
    check (opening_roster_headcount is null or opening_roster_headcount >= 0),
  opening_frontline_headcount numeric(14, 4)
    check (opening_frontline_headcount is null or opening_frontline_headcount >= 0),
  next_year_opening_roster_headcount numeric(14, 4)
    check (next_year_opening_roster_headcount is null or next_year_opening_roster_headcount >= 0),
  next_year_opening_frontline_headcount numeric(14, 4)
    check (next_year_opening_frontline_headcount is null or next_year_opening_frontline_headcount >= 0),
  opening_position_source text not null default 'manual'
    check (opening_position_source in ('manual', 'prior_plan', 'explicit_handoff')),
  source_plan_id uuid references plans(id) on delete set null,
  captured_at timestamptz not null default now(),
  check (
    opening_roster_headcount is null
    or opening_frontline_headcount is null
    or opening_frontline_headcount <= opening_roster_headcount
  ),
  check (
    next_year_opening_roster_headcount is null
    or next_year_opening_frontline_headcount is null
    or next_year_opening_frontline_headcount <= next_year_opening_roster_headcount
  )
);

create table plan_intraday_profile_snapshots (
  plan_id uuid primary key references plans(id) on delete cascade,
  source_intraday_profile_id uuid references intraday_profiles(id) on delete set null,
  interval_length_minutes integer not null
    check (interval_length_minutes > 0 and interval_length_minutes <= 1440),
  minimum_headcount_per_open_interval integer not null default 0
    check (minimum_headcount_per_open_interval >= 0),
  captured_at timestamptz not null default now()
);

create table plan_intraday_profile_intervals (
  plan_id uuid not null references plan_intraday_profile_snapshots(plan_id) on delete cascade,
  position integer not null check (position >= 0),
  start_time time not null,
  end_time time not null,
  demand_ratio numeric(12, 11) not null
    check (demand_ratio >= 0 and demand_ratio <= 1),
  primary key (plan_id, position),
  unique (plan_id, start_time),
  check (end_time > start_time)
);

-- ---------------------------------------------------------------------------
-- Monthly plan records and preserved daily/interval demand
-- ---------------------------------------------------------------------------

create table plan_months (
  plan_id uuid not null references plans(id) on delete cascade,
  month_start date not null check (extract(day from month_start) = 1),
  demand_source_kind text not null check (demand_source_kind in ('forecast', 'actual')),
  source_coverage_status text not null default 'missing'
    check (source_coverage_status in ('complete', 'partial', 'missing', 'not_applicable')),
  source_row_count integer not null default 0 check (source_row_count >= 0),
  included_open_day_count integer check (included_open_day_count is null or included_open_day_count >= 0),
  loaded_actual_day_count integer check (loaded_actual_day_count is null or loaded_actual_day_count >= 0),
  contacts numeric(20, 6) check (contacts is null or contacts >= 0),
  average_handle_time_seconds numeric(20, 6)
    check (average_handle_time_seconds is null or average_handle_time_seconds >= 0),
  workload_hours numeric(22, 8) check (workload_hours is null or workload_hours >= 0),
  average_daily_contacts numeric(20, 6)
    check (average_daily_contacts is null or average_daily_contacts >= 0),
  peak_daily_contacts numeric(20, 6)
    check (peak_daily_contacts is null or peak_daily_contacts >= 0),
  peak_day_uplift_ratio numeric(12, 10)
    check (peak_day_uplift_ratio is null or peak_day_uplift_ratio >= 0),
  lower_contact_bound numeric(20, 6)
    check (lower_contact_bound is null or lower_contact_bound >= 0),
  upper_contact_bound numeric(20, 6)
    check (upper_contact_bound is null or upper_contact_bound >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (plan_id, month_start),
  check (
    lower_contact_bound is null
    or upper_contact_bound is null
    or lower_contact_bound <= upper_contact_bound
  )
);

create index plan_months_month_idx on plan_months(month_start, plan_id);

create table plan_daily_demand_snapshots (
  plan_id uuid not null,
  month_start date not null,
  service_date date not null,
  demand_source_kind text not null check (demand_source_kind in ('forecast', 'actual')),
  contacts numeric(20, 6) not null check (contacts >= 0),
  average_handle_time_seconds numeric(20, 6) not null
    check (average_handle_time_seconds >= 0),
  is_open_day boolean not null,
  source_forecast_row_id uuid references forecast_rows(id) on delete set null,
  source_actuals_row_id uuid,
  source_row_identifier uuid,
  primary key (plan_id, month_start, service_date),
  foreign key (plan_id, month_start)
    references plan_months(plan_id, month_start) on delete cascade,
  check (
    (demand_source_kind = 'forecast' and source_actuals_row_id is null)
    or
    (demand_source_kind = 'actual' and source_forecast_row_id is null)
  )
);

create table plan_interval_demand_snapshots (
  plan_id uuid not null,
  month_start date not null,
  service_date date not null,
  interval_start_local timestamp without time zone not null,
  interval_length_minutes numeric(10, 4) not null check (interval_length_minutes > 0),
  demand_source_kind text not null
    check (demand_source_kind in ('forecast', 'actual', 'distributed_daily')),
  contacts numeric(20, 6) not null check (contacts >= 0),
  average_handle_time_seconds numeric(20, 6) not null
    check (average_handle_time_seconds >= 0),
  source_forecast_row_id uuid references forecast_rows(id) on delete set null,
  source_actuals_row_id uuid,
  source_row_identifier uuid,
  primary key (plan_id, month_start, interval_start_local),
  foreign key (plan_id, month_start)
    references plan_months(plan_id, month_start) on delete cascade
);

create table plan_month_capacity (
  plan_id uuid not null,
  month_start date not null,
  paid_hours_per_open_day numeric(8, 4) not null
    check (paid_hours_per_open_day >= 0 and paid_hours_per_open_day <= 24),
  planned_time_off_hours numeric(14, 4) not null default 0
    check (planned_time_off_hours >= 0),
  unplanned_time_off_hours numeric(14, 4) not null default 0
    check (unplanned_time_off_hours >= 0),
  leave_hours numeric(14, 4) not null default 0 check (leave_hours >= 0),
  meeting_hours numeric(14, 4) not null default 0 check (meeting_hours >= 0),
  training_hours numeric(14, 4) not null default 0 check (training_hours >= 0),
  coaching_hours numeric(14, 4) not null default 0 check (coaching_hours >= 0),
  paid_break_hours_per_open_day numeric(8, 4) not null default 0
    check (paid_break_hours_per_open_day >= 0),
  other_away_hours_per_open_day numeric(8, 4) not null default 0
    check (other_away_hours_per_open_day >= 0),
  occupancy_ratio numeric(9, 8) not null
    check (occupancy_ratio > 0 and occupancy_ratio <= 1),
  adherence_ratio numeric(9, 8) not null
    check (adherence_ratio > 0 and adherence_ratio <= 1),
  occupancy_source text not null
    check (occupancy_source in ('inherited', 'annual_default', 'monthly_override')),
  adherence_source text not null
    check (adherence_source in ('inherited', 'annual_default', 'monthly_override')),
  paid_hours_per_month numeric(18, 6) check (paid_hours_per_month is null or paid_hours_per_month >= 0),
  absence_loss_hours numeric(18, 6) check (absence_loss_hours is null or absence_loss_hours >= 0),
  presence_ratio numeric(12, 10)
    check (presence_ratio is null or (presence_ratio >= 0 and presence_ratio <= 1)),
  present_hours numeric(18, 6) check (present_hours is null or present_hours >= 0),
  scheduled_loss_hours numeric(18, 6)
    check (scheduled_loss_hours is null or scheduled_loss_hours >= 0),
  daily_other_loss_hours numeric(18, 6)
    check (daily_other_loss_hours is null or daily_other_loss_hours >= 0),
  utilization_ratio numeric(12, 10)
    check (utilization_ratio is null or (utilization_ratio >= 0 and utilization_ratio <= 1)),
  scheduled_ratio numeric(12, 10)
    check (scheduled_ratio is null or (scheduled_ratio >= 0 and scheduled_ratio <= 1)),
  scheduled_hours numeric(18, 6) check (scheduled_hours is null or scheduled_hours >= 0),
  adherence_loss_ratio numeric(12, 10)
    check (adherence_loss_ratio is null or adherence_loss_ratio >= 0),
  occupancy_loss_ratio numeric(12, 10)
    check (occupancy_loss_ratio is null or occupancy_loss_ratio >= 0),
  total_random_loss_ratio numeric(12, 10)
    check (total_random_loss_ratio is null or total_random_loss_ratio >= 0),
  design_factor_ratio numeric(12, 10)
    check (design_factor_ratio is null or design_factor_ratio >= 0),
  workload_staffing_ratio numeric(18, 10)
    check (workload_staffing_ratio is null or workload_staffing_ratio > 0),
  reviewed_at timestamptz,
  primary key (plan_id, month_start),
  foreign key (plan_id, month_start)
    references plan_months(plan_id, month_start) on delete cascade
);

create table plan_month_requirements (
  plan_id uuid not null,
  month_start date not null,
  requirement_method text not null
    check (requirement_method in ('workload_ratio', 'intraday_erlang')),
  calculation_status text not null default 'not_calculated'
    check (calculation_status in ('not_calculated', 'running', 'complete', 'stale', 'failed')),
  required_staff_hours numeric(22, 8)
    check (required_staff_hours is null or required_staff_hours >= 0),
  required_headcount numeric(18, 8)
    check (required_headcount is null or required_headcount >= 0),
  rounded_required_headcount integer
    check (rounded_required_headcount is null or rounded_required_headcount >= 0),
  peak_day_required_headcount numeric(18, 8)
    check (peak_day_required_headcount is null or peak_day_required_headcount >= 0),
  erlang_staffed_hours numeric(22, 8)
    check (erlang_staffed_hours is null or erlang_staffed_hours >= 0),
  erlang_adjusted_staff_hours numeric(22, 8)
    check (erlang_adjusted_staff_hours is null or erlang_adjusted_staff_hours >= 0),
  weighted_occupancy_ratio numeric(12, 10)
    check (weighted_occupancy_ratio is null or
      (weighted_occupancy_ratio >= 0 and weighted_occupancy_ratio <= 1)),
  weighted_service_level_ratio numeric(12, 10)
    check (weighted_service_level_ratio is null or
      (weighted_service_level_ratio >= 0 and weighted_service_level_ratio <= 1)),
  peak_interval_required_headcount integer
    check (peak_interval_required_headcount is null or peak_interval_required_headcount >= 0),
  open_day_count integer check (open_day_count is null or open_day_count >= 0),
  input_signature text,
  calculation_engine_version text,
  calculated_at timestamptz,
  error_code text,
  error_message text,
  primary key (plan_id, month_start),
  foreign key (plan_id, month_start)
    references plan_months(plan_id, month_start) on delete cascade,
  check (
    (calculation_status = 'failed' and error_message is not null)
    or calculation_status <> 'failed'
  )
);

create table plan_month_staffing (
  plan_id uuid not null,
  month_start date not null,
  starting_roster_headcount numeric(14, 4)
    check (starting_roster_headcount is null or starting_roster_headcount >= 0),
  starting_frontline_headcount numeric(14, 4)
    check (starting_frontline_headcount is null or starting_frontline_headcount >= 0),
  hire_headcount numeric(14, 4) not null default 0 check (hire_headcount >= 0),
  planned_frontline_attrition_headcount numeric(14, 4) not null default 0
    check (planned_frontline_attrition_headcount >= 0),
  applied_frontline_attrition_headcount numeric(14, 4) not null default 0
    check (applied_frontline_attrition_headcount >= 0),
  graduating_headcount numeric(14, 4) not null default 0 check (graduating_headcount >= 0),
  training_fallout_headcount numeric(14, 4) not null default 0
    check (training_fallout_headcount >= 0),
  frontline_ready_headcount numeric(14, 4) not null default 0
    check (frontline_ready_headcount >= 0),
  starting_in_training_headcount numeric(14, 4) not null default 0
    check (starting_in_training_headcount >= 0),
  ending_in_training_headcount numeric(14, 4) not null default 0
    check (ending_in_training_headcount >= 0),
  ending_roster_headcount numeric(14, 4)
    check (ending_roster_headcount is null or ending_roster_headcount >= 0),
  ending_frontline_headcount numeric(14, 4)
    check (ending_frontline_headcount is null or ending_frontline_headcount >= 0),
  starting_gap_to_requirement numeric(18, 8),
  ending_gap_to_requirement numeric(18, 8),
  gap_basis text not null default 'starting_frontline'
    check (gap_basis in ('starting_frontline', 'ending_frontline')),
  primary key (plan_id, month_start),
  foreign key (plan_id, month_start)
    references plan_months(plan_id, month_start) on delete cascade,
  check (
    starting_roster_headcount is null
    or starting_frontline_headcount is null
    or starting_frontline_headcount <= starting_roster_headcount
  ),
  check (
    ending_roster_headcount is null
    or ending_frontline_headcount is null
    or ending_frontline_headcount <= ending_roster_headcount
  ),
  check (
    starting_frontline_headcount is null
    or applied_frontline_attrition_headcount <= starting_frontline_headcount
  )
);

-- ---------------------------------------------------------------------------
-- Training pipeline and cross-year class lineage
-- ---------------------------------------------------------------------------

create table plan_training_settings (
  plan_id uuid primary key references plans(id) on delete cascade,
  training_duration_workdays integer not null check (training_duration_workdays > 0),
  graduation_yield_ratio numeric(9, 8) not null
    check (graduation_yield_ratio > 0 and graduation_yield_ratio <= 1),
  available_trainer_count integer not null check (available_trainer_count >= 0),
  maximum_class_size integer not null check (maximum_class_size > 0),
  post_training_nesting_workdays integer not null
    check (post_training_nesting_workdays >= 0),
  prefer_first_business_day_of_week boolean not null default true,
  reviewed_at timestamptz
);

create table training_classes (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans(id) on delete cascade,
  hire_date date not null,
  hire_headcount numeric(14, 4) not null check (hire_headcount > 0),
  source_kind text not null check (source_kind in ('manual', 'recommended', 'inherited')),
  source_plan_id uuid references plans(id) on delete restrict,
  source_training_class_id uuid references training_classes(id) on delete restrict,
  graduation_date date not null,
  frontline_ready_date date not null,
  graduating_headcount numeric(14, 4) not null check (graduating_headcount >= 0),
  projected_frontline_ready_headcount numeric(14, 4) not null
    check (projected_frontline_ready_headcount >= 0),
  training_fallout_headcount numeric(14, 4) not null
    check (training_fallout_headcount >= 0),
  recommendation_batch_identifier uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (graduation_date >= hire_date),
  check (frontline_ready_date >= graduation_date),
  check (graduating_headcount <= hire_headcount),
  check (projected_frontline_ready_headcount <= graduating_headcount),
  check (
    (source_kind = 'inherited' and source_plan_id is not null and source_training_class_id is not null)
    or
    (source_kind <> 'inherited' and source_plan_id is null and source_training_class_id is null)
  )
);

create unique index training_classes_one_inheritance_per_plan_idx
  on training_classes(plan_id, source_training_class_id)
  where source_training_class_id is not null;

create index training_classes_plan_dates_idx
  on training_classes(plan_id, hire_date, frontline_ready_date);

-- ---------------------------------------------------------------------------
-- Erlang calculations and actual requirement calculations
-- ---------------------------------------------------------------------------

create table erlang_runs (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans(id) on delete cascade,
  calculation_basis text not null check (calculation_basis in ('planned', 'actual')),
  model text not null default 'erlang_c' check (model = 'erlang_c'),
  reference_version text not null check (btrim(reference_version) <> ''),
  status text not null check (status in ('running', 'complete', 'failed', 'superseded')),
  input_signature text not null check (btrim(input_signature) <> ''),
  is_current_complete boolean not null default false,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_code text,
  error_message text,
  check (
    (status = 'running' and completed_at is null)
    or
    (status <> 'running' and completed_at is not null)
  ),
  check (
    (status = 'failed' and error_message is not null)
    or status <> 'failed'
  ),
  check (not is_current_complete or status = 'complete')
);

create unique index erlang_runs_one_current_complete_idx
  on erlang_runs(plan_id, calculation_basis)
  where is_current_complete;

create index erlang_runs_plan_idx
  on erlang_runs(plan_id, calculation_basis, started_at desc);

create table erlang_interval_results (
  erlang_run_id uuid not null references erlang_runs(id) on delete cascade,
  month_start date not null check (extract(day from month_start) = 1),
  service_date date not null,
  interval_start_local timestamp without time zone not null,
  interval_length_minutes numeric(10, 4) not null check (interval_length_minutes > 0),
  contacts_offered numeric(20, 6) not null check (contacts_offered >= 0),
  average_handle_time_seconds numeric(20, 6) not null
    check (average_handle_time_seconds > 0),
  service_level_goal_ratio numeric(9, 8) not null
    check (service_level_goal_ratio > 0 and service_level_goal_ratio <= 1),
  service_level_threshold_seconds numeric(12, 3) not null
    check (service_level_threshold_seconds >= 0),
  max_occupancy_ratio numeric(9, 8) not null
    check (max_occupancy_ratio > 0 and max_occupancy_ratio <= 1),
  caller_patience_seconds numeric(12, 3) not null check (caller_patience_seconds > 0),
  workload_hours numeric(22, 8) not null check (workload_hours >= 0),
  required_staff_net integer not null check (required_staff_net >= 0),
  labor_hours_net numeric(22, 8) not null check (labor_hours_net >= 0),
  achieved_service_level_ratio numeric(12, 10) not null
    check (achieved_service_level_ratio >= 0 and achieved_service_level_ratio <= 1),
  achieved_occupancy_ratio numeric(12, 10) not null
    check (achieved_occupancy_ratio >= 0 and achieved_occupancy_ratio <= 1),
  average_speed_of_answer_seconds numeric(22, 8) not null
    check (average_speed_of_answer_seconds >= 0),
  percent_answered_immediately_ratio numeric(12, 10) not null
    check (
      percent_answered_immediately_ratio >= 0
      and percent_answered_immediately_ratio <= 1
    ),
  abandon_ratio numeric(12, 10) not null check (abandon_ratio >= 0 and abandon_ratio <= 1),
  primary key (erlang_run_id, interval_start_local)
);

create index erlang_interval_results_month_idx
  on erlang_interval_results(erlang_run_id, month_start, service_date);

create table actual_month_requirements (
  plan_id uuid not null,
  month_start date not null check (extract(day from month_start) = 1),
  erlang_run_id uuid references erlang_runs(id) on delete restrict,
  calculation_status text not null
    check (calculation_status in ('not_calculated', 'complete', 'stale', 'failed')),
  actual_contacts numeric(20, 6) check (actual_contacts is null or actual_contacts >= 0),
  actual_average_handle_time_seconds numeric(20, 6)
    check (actual_average_handle_time_seconds is null or actual_average_handle_time_seconds >= 0),
  actual_workload_hours numeric(22, 8)
    check (actual_workload_hours is null or actual_workload_hours >= 0),
  actual_required_staff_hours numeric(22, 8)
    check (actual_required_staff_hours is null or actual_required_staff_hours >= 0),
  actual_required_headcount numeric(18, 8)
    check (actual_required_headcount is null or actual_required_headcount >= 0),
  calculated_at timestamptz,
  error_message text,
  primary key (plan_id, month_start),
  foreign key (plan_id, month_start)
    references plan_months(plan_id, month_start) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Review, completeness, and failure state
-- ---------------------------------------------------------------------------

create table plan_section_reviews (
  plan_id uuid not null references plans(id) on delete cascade,
  section_key text not null check (section_key in (
    'forecast',
    'availability',
    'design_factor',
    'requirement',
    'staffing_supply',
    'training_pipeline',
    'cross_year_handoff'
  )),
  is_required boolean not null default true,
  status text not null default 'not_started'
    check (status in ('not_started', 'using_defaults', 'reviewed', 'blocking', 'error')),
  first_blocker text,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (plan_id, section_key),
  check ((status = 'reviewed') = (reviewed_at is not null))
);

create table plan_issues (
  id bigint generated always as identity primary key,
  plan_id uuid not null references plans(id) on delete cascade,
  month_start date,
  section_key text,
  severity text not null check (severity in ('information', 'warning', 'blocking', 'error')),
  issue_code text not null check (btrim(issue_code) <> ''),
  message text not null check (btrim(message) <> ''),
  is_resolved boolean not null default false,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (month_start is null or extract(day from month_start) = 1),
  check ((is_resolved and resolved_at is not null) or (not is_resolved and resolved_at is null))
);

create index plan_issues_open_idx
  on plan_issues(plan_id, severity)
  where not is_resolved;

-- ---------------------------------------------------------------------------
-- Cross-table validation and immutability
-- ---------------------------------------------------------------------------

create or replace function validate_holiday_closure_year()
returns trigger
language plpgsql
as $$
declare
  expected_year integer;
begin
  select calendar_year
    into expected_year
    from holiday_profiles
   where id = new.holiday_profile_id;

  if extract(year from new.closure_date)::integer <> expected_year then
    raise exception 'closure date % does not belong to holiday profile year %',
      new.closure_date, expected_year;
  end if;

  return new;
end;
$$;

create trigger holiday_closures_validate_year
before insert or update on holiday_closures
for each row execute function validate_holiday_closure_year();

create or replace function validate_forecast_row_granularity()
returns trigger
language plpgsql
as $$
declare
  expected_granularity text;
begin
  select granularity
    into expected_granularity
    from forecast_versions
   where id = new.forecast_version_id;

  if expected_granularity = 'monthly'
     and (new.month_start is null or new.service_date is not null or new.interval_start_local is not null) then
    raise exception 'monthly forecast rows require month_start only';
  elsif expected_granularity = 'daily'
     and (new.service_date is null or new.month_start is not null or new.interval_start_local is not null) then
    raise exception 'daily forecast rows require service_date only';
  elsif expected_granularity = 'interval'
     and (new.interval_start_local is null or new.interval_length_minutes is null
       or new.month_start is not null or new.service_date is not null) then
    raise exception 'interval forecast rows require interval_start_local and interval_length_minutes';
  end if;

  return new;
end;
$$;

create trigger forecast_rows_validate_granularity
before insert or update on forecast_rows
for each row execute function validate_forecast_row_granularity();

create or replace function protect_accepted_forecast_rows()
returns trigger
language plpgsql
as $$
declare
  affected_forecast_version_id uuid;
  forecast_status text;
begin
  affected_forecast_version_id := case when tg_op = 'DELETE'
    then old.forecast_version_id
    else new.forecast_version_id
  end;

  select status
    into forecast_status
    from forecast_versions
   where id = affected_forecast_version_id;

  if forecast_status in ('accepted', 'planning_ready', 'referenced', 'deleted') then
    raise exception 'accepted forecast % source rows are immutable',
      affected_forecast_version_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger forecast_rows_protect_accepted
before insert or update or delete on forecast_rows
for each row execute function protect_accepted_forecast_rows();

create or replace function validate_actuals_import_ownership()
returns trigger
language plpgsql
as $$
declare
  import_group_id uuid;
begin
  if new.source_actuals_import_id is not null then
    select staffing_group_id
      into import_group_id
      from actuals_imports
     where id = new.source_actuals_import_id;

    if import_group_id is distinct from new.staffing_group_id then
      raise exception 'actuals import and daily row must belong to the same staffing group';
    end if;
  end if;

  return new;
end;
$$;

create trigger actuals_daily_validate_import_ownership
before insert or update of staffing_group_id, source_actuals_import_id on actuals_daily
for each row execute function validate_actuals_import_ownership();

create or replace function validate_intraday_profile_total()
returns trigger
language plpgsql
as $$
declare
  affected_profile_id uuid;
  profile_status text;
  interval_count integer;
  ratio_total numeric;
begin
  affected_profile_id := case when tg_op = 'DELETE'
    then old.intraday_profile_id
    else new.intraday_profile_id
  end;

  select status
    into profile_status
    from intraday_profiles
   where id = affected_profile_id;

  if profile_status = 'valid' then
    select count(*), coalesce(sum(demand_ratio), 0)
      into interval_count, ratio_total
      from intraday_profile_intervals
     where intraday_profile_id = affected_profile_id;

    if interval_count = 0 or abs(ratio_total - 1.0) > 0.00000001 then
      raise exception 'valid intraday profile % must contain intervals totaling 1.0; found %',
        affected_profile_id, ratio_total;
    end if;
  end if;

  return null;
end;
$$;

create constraint trigger intraday_profile_intervals_validate_total
after insert or update or delete on intraday_profile_intervals
deferrable initially deferred
for each row execute function validate_intraday_profile_total();

create or replace function validate_intraday_profile_status()
returns trigger
language plpgsql
as $$
declare
  interval_count integer;
  ratio_total numeric;
begin
  if new.status = 'valid' then
    select count(*), coalesce(sum(demand_ratio), 0)
      into interval_count, ratio_total
      from intraday_profile_intervals
     where intraday_profile_id = new.id;

    if interval_count = 0 or abs(ratio_total - 1.0) > 0.00000001 then
      raise exception 'valid intraday profile % must contain intervals totaling 1.0; found %',
        new.id, ratio_total;
    end if;
  end if;

  return new;
end;
$$;

create trigger intraday_profiles_validate_status
before insert or update of status on intraday_profiles
for each row execute function validate_intraday_profile_status();

create or replace function validate_plan_lineage()
returns trigger
language plpgsql
as $$
declare
  source_status text;
  budget_type text;
  budget_status text;
begin
  if new.plan_type = 'update' then
    if new.source_plan_id = new.id or new.budget_plan_id = new.id then
      raise exception 'an update plan cannot reference itself';
    end if;

    select status
      into source_status
      from plans
     where id = new.source_plan_id;

    select plan_type, status
      into budget_type, budget_status
      from plans
     where id = new.budget_plan_id;

    if source_status is distinct from 'finalized' then
      raise exception 'update source plan must be finalized';
    end if;

    if budget_type is distinct from 'budget' or budget_status is distinct from 'finalized' then
      raise exception 'update budget baseline must be a finalized budget';
    end if;
  end if;

  return new;
end;
$$;

create trigger plans_validate_lineage
before insert or update of plan_type, source_plan_id, budget_plan_id on plans
for each row execute function validate_plan_lineage();

create or replace function validate_plan_demand_source()
returns trigger
language plpgsql
as $$
declare
  forecast_status text;
begin
  select status
    into forecast_status
    from forecast_versions
   where id = new.forecast_version_id;

  if forecast_status not in ('accepted', 'planning_ready', 'referenced') then
    raise exception 'plan demand source forecast % is not accepted and available',
      new.forecast_version_id;
  end if;

  return new;
end;
$$;

create trigger plan_demand_sources_validate_source
before insert or update of forecast_version_id on plan_demand_sources
for each row execute function validate_plan_demand_source();

create or replace function increment_plan_lock_version()
returns trigger
language plpgsql
as $$
begin
  new.lock_version := old.lock_version + 1;
  return new;
end;
$$;

create trigger plans_increment_lock_version
before update on plans
for each row execute function increment_plan_lock_version();

create or replace function validate_plan_month_year()
returns trigger
language plpgsql
as $$
declare
  expected_year integer;
begin
  select planning_year into expected_year from plans where id = new.plan_id;

  if extract(year from new.month_start)::integer <> expected_year then
    raise exception 'month % does not belong to plan year %', new.month_start, expected_year;
  end if;

  return new;
end;
$$;

create trigger plan_months_validate_year
before insert or update on plan_months
for each row execute function validate_plan_month_year();

create or replace function validate_inherited_training_class()
returns trigger
language plpgsql
as $$
declare
  source_class_plan_id uuid;
  target_group_id uuid;
  source_group_id uuid;
begin
  if new.source_kind = 'inherited' then
    select plan_id
      into source_class_plan_id
      from training_classes
     where id = new.source_training_class_id;

    if source_class_plan_id is distinct from new.source_plan_id then
      raise exception 'inherited training class must identify its actual source plan';
    end if;

    select staffing_group_id into target_group_id from plans where id = new.plan_id;
    select staffing_group_id into source_group_id from plans where id = new.source_plan_id;

    if target_group_id is distinct from source_group_id then
      raise exception 'inherited training classes must remain within one staffing group';
    end if;
  end if;

  return new;
end;
$$;

create trigger training_classes_validate_inheritance
before insert or update of plan_id, source_kind, source_plan_id, source_training_class_id
on training_classes
for each row execute function validate_inherited_training_class();

create or replace function validate_plan_finalization()
returns trigger
language plpgsql
as $$
declare
  month_count integer;
  capacity_count integer;
  requirement_count integer;
  staffing_count integer;
  incomplete_requirement_count integer;
  mismatched_method_count integer;
  invalid_demand_source_count integer;
  core_review_count integer;
  incomplete_reviews integer;
  open_blockers integer;
  source_count integer;
  calendar_count integer;
  setting_count integer;
begin
  if new.status = 'finalized' and old.status <> 'finalized' then
    select count(*) into month_count from plan_months where plan_id = new.id;
    select count(*) into capacity_count from plan_month_capacity where plan_id = new.id;
    select count(*) into requirement_count from plan_month_requirements where plan_id = new.id;
    select count(*) into staffing_count from plan_month_staffing where plan_id = new.id;

    if month_count <> 12
       or capacity_count <> 12
       or requirement_count <> 12
       or staffing_count <> 12 then
      raise exception
        'finalized plan % requires 12 month, capacity, requirement, and staffing rows',
        new.id;
    end if;

    select count(*)
      into incomplete_requirement_count
      from plan_month_requirements
     where plan_id = new.id
       and calculation_status <> 'complete';

    if incomplete_requirement_count > 0 then
      raise exception 'plan % has % incomplete monthly requirements',
        new.id, incomplete_requirement_count;
    end if;

    select count(*)
      into mismatched_method_count
      from plan_month_requirements
     where plan_id = new.id
       and requirement_method <> new.requirement_method;

    if mismatched_method_count > 0 then
      raise exception 'plan % contains monthly requirements for a different method', new.id;
    end if;

    select count(*)
      into invalid_demand_source_count
      from plan_months
     where plan_id = new.id
       and (
         (new.plan_type = 'budget' and demand_source_kind <> 'forecast')
         or
         (
           new.plan_type = 'update'
           and (
             (extract(month from month_start) <= new.actuals_through_month
               and demand_source_kind <> 'actual')
             or
             (extract(month from month_start) > new.actuals_through_month
               and demand_source_kind <> 'forecast')
           )
         )
       );

    if invalid_demand_source_count > 0 then
      raise exception 'plan % has % months with an invalid demand source',
        new.id, invalid_demand_source_count;
    end if;

    select count(*)
      into core_review_count
      from plan_section_reviews
     where plan_id = new.id
       and section_key in (
         'forecast',
         'availability',
         'design_factor',
         'requirement',
         'staffing_supply'
       )
       and status = 'reviewed';

    if core_review_count <> 5 then
      raise exception 'plan % requires all five core planning sections to be reviewed', new.id;
    end if;

    select count(*)
      into incomplete_reviews
      from plan_section_reviews
     where plan_id = new.id
       and is_required
       and status <> 'reviewed';

    if incomplete_reviews > 0 then
      raise exception 'plan % has % required sections not reviewed', new.id, incomplete_reviews;
    end if;

    select count(*)
      into open_blockers
      from plan_issues
     where plan_id = new.id
       and not is_resolved
       and severity in ('blocking', 'error');

    if open_blockers > 0 then
      raise exception 'plan % has % unresolved blocking issues', new.id, open_blockers;
    end if;

    select count(*) into calendar_count from plan_calendar_snapshots where plan_id = new.id;
    select count(*) into setting_count from plan_setting_snapshots where plan_id = new.id;

    if calendar_count <> 1 or setting_count <> 1 then
      raise exception 'plan % requires one calendar snapshot and one settings snapshot', new.id;
    end if;

    select count(*) into source_count from plan_demand_sources where plan_id = new.id;
    if new.plan_type = 'budget' and source_count <> 1 then
      raise exception 'finalized budget plan % requires one forecast demand source', new.id;
    end if;

    if new.plan_type = 'update'
       and new.actuals_through_month < 12
       and source_count <> 1 then
      raise exception 'update plan % requires a forecast source for future months', new.id;
    end if;
  end if;

  return new;
end;
$$;

create trigger plans_validate_finalization
before update of status on plans
for each row execute function validate_plan_finalization();

create or replace function protect_finalized_plan_metadata()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'finalized' and (
    new.id is distinct from old.id
    or new.staffing_group_id is distinct from old.staffing_group_id
    or new.call_center_id is distinct from old.call_center_id
    or new.name is distinct from old.name
    or new.planning_year is distinct from old.planning_year
    or new.plan_type is distinct from old.plan_type
    or new.status is distinct from old.status
    or new.requirement_method is distinct from old.requirement_method
    or new.source_plan_id is distinct from old.source_plan_id
    or new.budget_plan_id is distinct from old.budget_plan_id
    or new.actuals_through_month is distinct from old.actuals_through_month
    or new.actualized_at is distinct from old.actualized_at
    or new.finalized_at is distinct from old.finalized_at
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'finalized plan % metadata is immutable', old.id;
  end if;

  return new;
end;
$$;

create trigger plans_protect_finalized_metadata
before update on plans
for each row execute function protect_finalized_plan_metadata();

create or replace function protect_finalized_plan_child()
returns trigger
language plpgsql
as $$
declare
  affected_plan_id uuid;
  plan_status text;
begin
  affected_plan_id := case when tg_op = 'DELETE' then old.plan_id else new.plan_id end;
  select status into plan_status from plans where id = affected_plan_id;

  if plan_status = 'finalized' then
    raise exception 'finalized plan % snapshots and calculations are immutable', affected_plan_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger plan_demand_sources_protect_finalized
before insert or update or delete on plan_demand_sources
for each row execute function protect_finalized_plan_child();
create trigger plan_calendar_snapshots_protect_finalized
before insert or update or delete on plan_calendar_snapshots
for each row execute function protect_finalized_plan_child();
create trigger plan_calendar_weekdays_protect_finalized
before insert or update or delete on plan_calendar_weekdays
for each row execute function protect_finalized_plan_child();
create trigger plan_calendar_closures_protect_finalized
before insert or update or delete on plan_calendar_closures
for each row execute function protect_finalized_plan_child();
create trigger plan_setting_snapshots_protect_finalized
before insert or update or delete on plan_setting_snapshots
for each row execute function protect_finalized_plan_child();
create trigger plan_intraday_profiles_protect_finalized
before insert or update or delete on plan_intraday_profile_snapshots
for each row execute function protect_finalized_plan_child();
create trigger plan_intraday_intervals_protect_finalized
before insert or update or delete on plan_intraday_profile_intervals
for each row execute function protect_finalized_plan_child();
create trigger plan_months_protect_finalized
before insert or update or delete on plan_months
for each row execute function protect_finalized_plan_child();
create trigger plan_daily_demand_protect_finalized
before insert or update or delete on plan_daily_demand_snapshots
for each row execute function protect_finalized_plan_child();
create trigger plan_interval_demand_protect_finalized
before insert or update or delete on plan_interval_demand_snapshots
for each row execute function protect_finalized_plan_child();
create trigger plan_month_capacity_protect_finalized
before insert or update or delete on plan_month_capacity
for each row execute function protect_finalized_plan_child();
create trigger plan_month_requirements_protect_finalized
before insert or update or delete on plan_month_requirements
for each row execute function protect_finalized_plan_child();
create trigger plan_month_staffing_protect_finalized
before insert or update or delete on plan_month_staffing
for each row execute function protect_finalized_plan_child();
create trigger plan_training_settings_protect_finalized
before insert or update or delete on plan_training_settings
for each row execute function protect_finalized_plan_child();
create trigger training_classes_protect_finalized
before insert or update or delete on training_classes
for each row execute function protect_finalized_plan_child();
create trigger plan_section_reviews_protect_finalized
before insert or update or delete on plan_section_reviews
for each row execute function protect_finalized_plan_child();

-- ---------------------------------------------------------------------------
-- Timestamp maintenance
-- ---------------------------------------------------------------------------

create trigger planning_workspaces_set_updated_at
before update on planning_workspaces
for each row execute function set_updated_at();
create trigger call_centers_set_updated_at
before update on call_centers
for each row execute function set_updated_at();
create trigger holiday_profiles_set_updated_at
before update on holiday_profiles
for each row execute function set_updated_at();
create trigger holiday_closures_set_updated_at
before update on holiday_closures
for each row execute function set_updated_at();
create trigger staffing_groups_set_updated_at
before update on staffing_groups
for each row execute function set_updated_at();
create trigger intraday_profiles_set_updated_at
before update on intraday_profiles
for each row execute function set_updated_at();
create trigger forecast_versions_set_updated_at
before update on forecast_versions
for each row execute function set_updated_at();
create trigger actuals_daily_set_updated_at
before update on actuals_daily
for each row execute function set_updated_at();
create trigger plans_set_updated_at
before update on plans
for each row execute function set_updated_at();
create trigger plan_months_set_updated_at
before update on plan_months
for each row execute function set_updated_at();
create trigger plan_section_reviews_set_updated_at
before update on plan_section_reviews
for each row execute function set_updated_at();
create trigger training_classes_set_updated_at
before update on training_classes
for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Reporting views
-- ---------------------------------------------------------------------------

create view current_plans as
select *
from plans
where is_current;

create view budget_plans as
select *
from plans
where plan_type = 'budget';

create view actuals_monthly_rollup as
select
  staffing_group_id,
  date_trunc('month', service_date)::date as month_start,
  sum(contacts) as contacts,
  case
    when sum(contacts) > 0
      then sum(contacts * average_handle_time_seconds) / sum(contacts)
    else avg(average_handle_time_seconds)
  end as average_handle_time_seconds,
  sum(contacts * average_handle_time_seconds) / 3600.0 as workload_hours,
  count(*) as loaded_day_count
from actuals_daily
group by staffing_group_id, date_trunc('month', service_date)::date;

commit;
