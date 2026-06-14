-- Run after postgresql-schema.sql.
-- Every SELECT should return zero rows except the final summary query.

set search_path = planning, public;

select table_schema, table_name, column_name, data_type
from information_schema.columns
where table_schema = 'planning'
  and lower(data_type) in ('json', 'jsonb', 'array');

select p.id as finalized_plan_without_twelve_months
from plans p
left join plan_months m on m.plan_id = p.id
where p.status = 'finalized'
group by p.id
having count(m.month_start) <> 12;

select staffing_group_id, planning_year, count(*) as budget_count
from plans
where plan_type = 'budget'
group by staffing_group_id, planning_year
having count(*) > 1;

select staffing_group_id, planning_year, count(*) as current_plan_count
from plans
where is_current
group by staffing_group_id, planning_year
having count(*) > 1;

select
  (
    select count(*)
    from information_schema.tables
    where table_schema = 'planning'
      and table_type = 'BASE TABLE'
  ) as table_count,
  (select count(*) from information_schema.views where table_schema = 'planning') as view_count,
  (select max(version) from schema_migrations) as schema_version;
