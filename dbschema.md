# MySQL Database Schema

- Database: `myapp_db`
- Tables: 59
- Contents: schema metadata only; no row data

## `agent_tasks`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `title` | `varchar(255)` | NO | `â€”` | â€” | â€” | â€” |
| `brief` | `text` | NO | `â€”` | â€” | â€” | â€” |
| `tone` | `varchar(64)` | YES | `NULL` | â€” | â€” | â€” |
| `audience` | `varchar(255)` | YES | `NULL` | â€” | â€” | â€” |
| `language` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `outline` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `word_count` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `status` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `result_text` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `updated_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `last_error` | `varchar(512)` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `ix_agent_tasks_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `agent_tasks_ibfk_1`: `user_id` â†’ `users.id`

## `ai_interactions`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `interaction_id` | `varchar(36)` | NO | `â€”` | UNI | â€” | â€” |
| `interaction_type` | `varchar(64)` | NO | `â€”` | MUL | â€” | â€” |
| `endpoint` | `varchar(255)` | NO | `â€”` | â€” | â€” | â€” |
| `request_data` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `response_status` | `varchar(32)` | NO | `â€”` | MUL | â€” | â€” |
| `user_agent` | `varchar(512)` | YES | `NULL` | â€” | â€” | â€” |
| `ip_address` | `varchar(45)` | YES | `NULL` | â€” | â€” | â€” |
| `session_id` | `varchar(128)` | YES | `NULL` | â€” | â€” | â€” |
| `response_time_ms` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `input_tokens` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `output_tokens` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `error_message` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `error_code` | `varchar(64)` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | MUL | â€” | â€” |

### Indexes

- `idx_ai_interactions_status` (non-unique): `response_status`
- `idx_ai_interactions_type_created` (non-unique): `interaction_type, created_at`
- `idx_ai_interactions_user_type` (non-unique): `user_id, interaction_type`
- `interaction_id` (unique): `interaction_id`
- `ix_ai_interactions_created_at` (non-unique): `created_at`
- `ix_ai_interactions_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `ai_interactions_ibfk_1`: `user_id` â†’ `users.id`

## `ai_memories`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `key` | `varchar(128)` | YES | `NULL` | MUL | â€” | â€” |
| `content` | `text` | NO | `â€”` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |

### Indexes

- `ix_ai_memories_key` (non-unique): `key`
- `ix_ai_memories_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `ai_memories_ibfk_1`: `user_id` â†’ `users.id`

## `api_keys`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `key` | `varchar(128)` | NO | `â€”` | UNI | â€” | â€” |
| `name` | `varchar(255)` | YES | `NULL` | â€” | â€” | â€” |
| `owner_user_id` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `is_active` | `tinyint(1)` | YES | `NULL` | â€” | â€” | â€” |
| `request_count` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `last_used_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `daily_token_limit` | `int(11)` | NO | `0` | â€” | â€” | â€” |
| `monthly_token_limit` | `int(11)` | NO | `0` | â€” | â€” | â€” |
| `tokens_used_today` | `int(11)` | NO | `0` | â€” | â€” | â€” |
| `tokens_used_month` | `int(11)` | NO | `0` | â€” | â€” | â€” |
| `usage_day` | `varchar(10)` | YES | `NULL` | â€” | â€” | â€” |
| `usage_month` | `varchar(7)` | YES | `NULL` | â€” | â€” | â€” |
| `request_limit` | `int(11)` | NO | `0` | â€” | â€” | â€” |
| `plan_code` | `varchar(32)` | NO | `'custom'` | â€” | â€” | â€” |
| `plan_started_at` | `timestamp` | YES | `NULL` | â€” | â€” | â€” |
| `plan_expires_at` | `timestamp` | YES | `NULL` | â€” | â€” | â€” |
| `rpm_limit` | `int(11)` | NO | `0` | â€” | â€” | â€” |
| `concurrency_limit` | `int(11)` | NO | `0` | â€” | â€” | â€” |
| `max_context_tokens` | `int(11)` | NO | `0` | â€” | â€” | â€” |
| `max_output_tokens` | `int(11)` | NO | `0` | â€” | â€” | â€” |
| `billing_mode` | `varchar(32)` | NO | `'daily_usage'` | â€” | â€” | â€” |

### Indexes

- `key` (unique): `key`
- `PRIMARY` (unique): `id`

## `app_settings`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `key` | `varchar(128)` | NO | `â€”` | PRI | â€” | â€” |
| `value` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `updated_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `PRIMARY` (unique): `key`

## `automation_rules`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `bigint(20) unsigned` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `rule_id` | `varchar(36)` | NO | `â€”` | UNI | â€” | â€” |
| `name` | `varchar(255)` | NO | `â€”` | â€” | â€” | â€” |
| `description` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `trigger_type` | `varchar(64)` | NO | `â€”` | MUL | â€” | â€” |
| `trigger_data` | `longtext` | NO | `â€”` | â€” | â€” | â€” |
| `action_type` | `varchar(64)` | NO | `â€”` | â€” | â€” | â€” |
| `action_data` | `longtext` | NO | `â€”` | â€” | â€” | â€” |
| `is_active` | `tinyint(1)` | NO | `1` | MUL | â€” | â€” |
| `execution_count` | `int(11)` | NO | `0` | â€” | â€” | â€” |
| `last_executed` | `timestamp` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `timestamp` | NO | `current_timestamp()` | â€” | â€” | â€” |
| `updated_at` | `timestamp` | NO | `current_timestamp()` | â€” | â€” | â€” |

### Indexes

- `idx_automation_rules_active` (non-unique): `is_active`
- `idx_automation_rules_trigger_type` (non-unique): `trigger_type`
- `idx_automation_rules_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`
- `rule_id` (unique): `rule_id`

### Foreign keys

- `automation_rules_ibfk_1`: `user_id` â†’ `users.id`

## `behavior_predictions`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `prediction_id` | `varchar(36)` | NO | `â€”` | UNI | â€” | â€” |
| `prediction_type` | `varchar(64)` | NO | `â€”` | MUL | â€” | â€” |
| `target_date` | `date` | NO | `â€”` | MUL | â€” | â€” |
| `prediction_value` | `float` | NO | `â€”` | â€” | â€” | â€” |
| `prediction_confidence` | `float` | NO | `â€”` | â€” | â€” | â€” |
| `reasoning` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `based_on_days` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `pattern_count` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `actual_value` | `float` | YES | `NULL` | â€” | â€” | â€” |
| `prediction_accuracy` | `float` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `updated_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `idx_behavior_predictions_type` (non-unique): `prediction_type`
- `idx_behavior_predictions_user_date` (non-unique): `user_id, target_date`
- `ix_behavior_predictions_target_date` (non-unique): `target_date`
- `ix_behavior_predictions_user_id` (non-unique): `user_id`
- `prediction_id` (unique): `prediction_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `behavior_predictions_ibfk_1`: `user_id` â†’ `users.id`

## `daily_programs`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `program_id` | `varchar(36)` | NO | `â€”` | UNI | â€” | â€” |
| `date` | `date` | NO | `â€”` | â€” | â€” | â€” |
| `focus_area` | `varchar(64)` | YES | `NULL` | â€” | â€” | â€” |
| `activities` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `expected_productivity` | `float` | YES | `NULL` | â€” | â€” | â€” |
| `expected_mood` | `float` | YES | `NULL` | â€” | â€” | â€” |
| `focus_theme` | `varchar(100)` | YES | `NULL` | â€” | â€” | â€” |
| `is_completed` | `tinyint(1)` | YES | `NULL` | â€” | â€” | â€” |
| `actual_productivity` | `float` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `generated_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `updated_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `mood_level` | `varchar(32)` | YES | `NULL` | â€” | â€” | â€” |
| `energy_level` | `varchar(32)` | YES | `NULL` | â€” | â€” | â€” |
| `priority_goals` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `estimated_completion_minutes` | `int(11)` | YES | `0` | â€” | â€” | â€” |
| `optimization_tips` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `status` | `varchar(32)` | YES | `'active'` | â€” | â€” | â€” |
| `completed_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `completed_blocks` | `int(11)` | YES | `0` | â€” | â€” | â€” |
| `total_blocks` | `int(11)` | YES | `0` | â€” | â€” | â€” |
| `effectiveness_score` | `float` | YES | `0` | â€” | â€” | â€” |

### Indexes

- `ix_daily_programs_user_id` (non-unique): `user_id`
- `ix_user_program_date` (non-unique): `user_id, date`
- `PRIMARY` (unique): `id`
- `program_id` (unique): `program_id`

### Foreign keys

- `daily_programs_ibfk_1`: `user_id` â†’ `users.id`

## `device_tokens`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `device_token` | `varchar(512)` | NO | `â€”` | UNI | â€” | â€” |
| `platform` | `varchar(32)` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `last_seen` | `datetime` | NO | `â€”` | â€” | â€” | â€” |

### Indexes

- `device_token` (unique): `device_token`
- `ix_device_tokens_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `device_tokens_ibfk_1`: `user_id` â†’ `users.id`

## `gateway_message_sessions`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `key` | `varchar(64)` | NO | `â€”` | PRI | â€” | â€” |
| `history` | `longtext` | NO | `â€”` | â€” | â€” | â€” |
| `lease` | `varchar(32)` | YES | `NULL` | â€” | â€” | â€” |
| `lease_until` | `float` | NO | `â€”` | â€” | â€” | â€” |
| `updated_at` | `float` | NO | `â€”` | MUL | â€” | â€” |

### Indexes

- `ix_gateway_message_sessions_updated_at` (non-unique): `updated_at`
- `PRIMARY` (unique): `key`

## `geofences`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `geofence_id` | `varchar(36)` | YES | `NULL` | UNI | â€” | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `task_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `name` | `varchar(255)` | NO | `â€”` | â€” | â€” | â€” |
| `latitude` | `float` | NO | `â€”` | â€” | â€” | â€” |
| `longitude` | `float` | NO | `â€”` | â€” | â€” | â€” |
| `radius_meters` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `entry_action` | `varchar(32)` | YES | `NULL` | â€” | â€” | â€” |
| `exit_action` | `varchar(32)` | YES | `NULL` | â€” | â€” | â€” |
| `is_active` | `tinyint(1)` | YES | `NULL` | MUL | â€” | â€” |
| `created_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `updated_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `idx_task_geofences` (non-unique): `task_id, is_active`
- `idx_user_geofences` (non-unique): `user_id, is_active`
- `ix_geofences_geofence_id` (unique): `geofence_id`
- `ix_geofences_is_active` (non-unique): `is_active`
- `ix_geofences_task_id` (non-unique): `task_id`
- `ix_geofences_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `geofences_ibfk_1`: `user_id` â†’ `users.id`
- `geofences_ibfk_2`: `task_id` â†’ `user_tasks.id`

## `goal_milestones`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `goal_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `milestone_id` | `varchar(36)` | NO | `â€”` | UNI | â€” | â€” |
| `title` | `varchar(255)` | NO | `â€”` | â€” | â€” | â€” |
| `description` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `target_date` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `order` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `status` | `varchar(32)` | YES | `NULL` | â€” | â€” | â€” |
| `completed_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `progress_contribution` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `updated_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `ix_goal_milestones_goal_id` (non-unique): `goal_id`
- `ix_goal_milestones_user_id` (non-unique): `user_id`
- `milestone_id` (unique): `milestone_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `goal_milestones_ibfk_1`: `goal_id` â†’ `user_goals.id`
- `goal_milestones_ibfk_2`: `user_id` â†’ `users.id`

## `goal_progress_logs`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `goal_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `old_progress` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `new_progress` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `reason` | `varchar(255)` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `ix_goal_progress_logs_goal_id` (non-unique): `goal_id`
- `ix_goal_progress_logs_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `goal_progress_logs_ibfk_1`: `goal_id` â†’ `user_goals.id`
- `goal_progress_logs_ibfk_2`: `user_id` â†’ `users.id`

## `habits`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `habit_id` | `varchar(36)` | NO | `â€”` | UNI | â€” | â€” |
| `name` | `varchar(255)` | NO | `â€”` | â€” | â€” | â€” |
| `category` | `varchar(64)` | NO | `â€”` | â€” | â€” | â€” |
| `frequency` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `target_count` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `unit` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `linked_goal_id` | `varchar(36)` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `archived_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `updated_at` | `datetime` | YES | `current_timestamp()` | â€” | on update current_timestamp() | â€” |

### Indexes

- `habit_id` (unique): `habit_id`
- `ix_habits_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `habits_ibfk_1`: `user_id` â†’ `users.id`

## `habit_logs`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `habit_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `logged_date` | `date` | NO | `â€”` | MUL | â€” | â€” |
| `count` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `notes` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |

### Indexes

- `ix_habit_logs_habit_id` (non-unique): `habit_id`
- `ix_habit_logs_logged_date` (non-unique): `logged_date`
- `ix_habit_logs_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `habit_logs_ibfk_1`: `habit_id` â†’ `habits.id`
- `habit_logs_ibfk_2`: `user_id` â†’ `users.id`

## `image_requests`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `varchar(36)` | NO | `â€”` | PRI | â€” | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `prompt` | `text` | NO | `â€”` | â€” | â€” | â€” |
| `output_path` | `varchar(512)` | YES | `NULL` | â€” | â€” | â€” |
| `image_path` | `varchar(512)` | YES | `NULL` | â€” | â€” | â€” |
| `result_path` | `varchar(512)` | YES | `NULL` | â€” | â€” | â€” |
| `status` | `varchar(32)` | NO | `â€”` | MUL | â€” | â€” |
| `error_message` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `request_type` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `updated_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `completed_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `idx_image_requests_status` (non-unique): `status`
- `idx_image_requests_user_id_created_at` (non-unique): `user_id, created_at`
- `ix_image_requests_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `image_requests_ibfk_1`: `user_id` â†’ `users.id`

## `image_usage`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `date` | `date` | NO | `â€”` | MUL | â€” | â€” |
| `count` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `updated_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |

### Indexes

- `ix_image_usage_date` (non-unique): `date`
- `ix_image_usage_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `image_usage_ibfk_1`: `user_id` â†’ `users.id`

## `location_checkins`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `geofence_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `latitude` | `float` | NO | `â€”` | â€” | â€” | â€” |
| `longitude` | `float` | NO | `â€”` | â€” | â€” | â€” |
| `action` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `reminder_sent` | `tinyint(1)` | YES | `NULL` | â€” | â€” | â€” |
| `reminder_sent_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | YES | `NULL` | MUL | â€” | â€” |

### Indexes

- `ix_location_checkins_created_at` (non-unique): `created_at`
- `ix_location_checkins_geofence_id` (non-unique): `geofence_id`
- `ix_location_checkins_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `location_checkins_ibfk_1`: `user_id` â†’ `users.id`
- `location_checkins_ibfk_2`: `geofence_id` â†’ `geofences.id`

## `media_wallet_accounts`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `user_id` | `int(11)` | NO | `â€”` | PRI | â€” | â€” |
| `balance_toman` | `bigint(20)` | NO | `â€”` | â€” | â€” | â€” |

### Indexes

- `PRIMARY` (unique): `user_id`

### Foreign keys

- `media_wallet_accounts_ibfk_1`: `user_id` â†’ `users.id`

## `media_wallet_entries`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `payment_id` | `varchar(64)` | YES | `NULL` | UNI | â€” | â€” |
| `entry_type` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `amount_toman` | `bigint(20)` | NO | `â€”` | â€” | â€” | â€” |
| `balance_after` | `bigint(20)` | NO | `â€”` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |

### Indexes

- `ix_media_wallet_entries_user_id` (non-unique): `user_id`
- `payment_id` (unique): `payment_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `media_wallet_entries_ibfk_1`: `user_id` â†’ `users.id`
- `media_wallet_entries_ibfk_2`: `payment_id` â†’ `media_wallet_payments.id`

## `media_wallet_payments`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `varchar(64)` | NO | `â€”` | PRI | â€” | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `amount_toman` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `authority` | `varchar(64)` | YES | `NULL` | UNI | â€” | â€” |
| `merchant_id` | `varchar(64)` | NO | `â€”` | â€” | â€” | â€” |
| `sandbox` | `tinyint(1)` | NO | `â€”` | â€” | â€” | â€” |
| `status` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `ref_id` | `varchar(64)` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `credited_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `authority` (unique): `authority`
- `ix_media_wallet_payments_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `media_wallet_payments_ibfk_1`: `user_id` â†’ `users.id`

## `media_wallet_spends`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `varchar(64)` | NO | `â€”` | PRI | â€” | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `provider` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `model` | `varchar(128)` | NO | `â€”` | â€” | â€” | â€” |
| `amount_toman` | `bigint(20)` | NO | `â€”` | â€” | â€” | â€” |
| `status` | `varchar(32)` | NO | `â€”` | MUL | â€” | â€” |
| `job_id` | `varchar(128)` | YES | `NULL` | â€” | â€” | â€” |
| `pricing` | `longtext` | NO | `â€”` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `updated_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |

### Indexes

- `ix_media_wallet_spends_status` (non-unique): `status`
- `ix_media_wallet_spends_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `media_wallet_spends_ibfk_1`: `user_id` â†’ `users.id`

## `message_usage_logs`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `request_id` | `varchar(64)` | NO | `â€”` | UNI | â€” | â€” |
| `user_id` | `int(11)` | YES | `NULL` | MUL | â€” | â€” |
| `api_key_id` | `int(11)` | YES | `NULL` | MUL | â€” | â€” |
| `model` | `varchar(128)` | YES | `NULL` | â€” | â€” | â€” |
| `provider` | `varchar(64)` | YES | `NULL` | â€” | â€” | â€” |
| `input_tokens` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `output_tokens` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `cache_read_input_tokens` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `cache_creation_input_tokens` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `customer_billable_tokens` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `reserved_tokens` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `provider_cost` | `float` | NO | `â€”` | â€” | â€” | â€” |
| `balance_before` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `balance_after` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `stream` | `tinyint(1)` | NO | `â€”` | â€” | â€” | â€” |
| `status` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | MUL | â€” | â€” |
| `usage_day` | `varchar(10)` | YES | `NULL` | â€” | â€” | â€” |
| `cost_toman` | `int(11)` | NO | `0` | â€” | â€” | â€” |
| `reserved_toman` | `int(11)` | NO | `0` | â€” | â€” | â€” |

### Indexes

- `idx_msg_usage_key_created` (non-unique): `api_key_id, created_at`
- `idx_msg_usage_user_created` (non-unique): `user_id, created_at`
- `ix_message_usage_logs_api_key_id` (non-unique): `api_key_id`
- `ix_message_usage_logs_created_at` (non-unique): `created_at`
- `ix_message_usage_logs_request_id` (unique): `request_id`
- `ix_message_usage_logs_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `message_usage_logs_ibfk_1`: `user_id` â†’ `users.id`
- `message_usage_logs_ibfk_2`: `api_key_id` â†’ `api_keys.id`

## `mood_snapshots`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `snapshot_id` | `varchar(36)` | NO | `â€”` | UNI | â€” | â€” |
| `timestamp` | `datetime` | NO | `â€”` | MUL | â€” | â€” |
| `energy` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `mood` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `context` | `varchar(128)` | NO | `â€”` | â€” | â€” | â€” |
| `activity` | `varchar(128)` | YES | `NULL` | â€” | â€” | â€” |
| `notes` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |

### Indexes

- `ix_mood_snapshots_timestamp` (non-unique): `timestamp`
- `ix_mood_snapshots_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`
- `snapshot_id` (unique): `snapshot_id`

### Foreign keys

- `mood_snapshots_ibfk_1`: `user_id` â†’ `users.id`

## `notification_batches`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `batch_id` | `varchar(36)` | NO | `â€”` | UNI | â€” | â€” |
| `category` | `varchar(64)` | NO | `â€”` | â€” | â€” | â€” |
| `title` | `varchar(255)` | NO | `â€”` | â€” | â€” | â€” |
| `summary` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `notification_count` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `scheduled_send_time` | `datetime` | NO | `â€”` | MUL | â€” | â€” |
| `sent_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `delivery_status` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `priority` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `read_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `dismissed_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `updated_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |

### Indexes

- `batch_id` (unique): `batch_id`
- `idx_notification_batches_send_time` (non-unique): `scheduled_send_time`
- `idx_notification_batches_user_status` (non-unique): `user_id, delivery_status`
- `ix_notification_batches_scheduled_send_time` (non-unique): `scheduled_send_time`
- `ix_notification_batches_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `notification_batches_ibfk_1`: `user_id` â†’ `users.id`

## `notification_preferences`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | UNI | â€” | â€” |
| `enable_notification_batching` | `tinyint(1)` | NO | `â€”` | â€” | â€” | â€” |
| `batch_window_minutes` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `max_notifications_per_batch` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `quiet_hours_start` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `quiet_hours_end` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `quiet_hours_enabled` | `tinyint(1)` | NO | `â€”` | â€” | â€” | â€” |
| `enable_task_reminders` | `tinyint(1)` | NO | `â€”` | â€” | â€” | â€” |
| `enable_habit_reminders` | `tinyint(1)` | NO | `â€”` | â€” | â€” | â€” |
| `enable_goal_updates` | `tinyint(1)` | NO | `â€”` | â€” | â€” | â€” |
| `enable_engagement_notifications` | `tinyint(1)` | NO | `â€”` | â€” | â€” | â€” |
| `enable_marketing_notifications` | `tinyint(1)` | NO | `â€”` | â€” | â€” | â€” |
| `enable_daily_digest` | `tinyint(1)` | NO | `â€”` | â€” | â€” | â€” |
| `daily_digest_time` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `enable_weekly_digest` | `tinyint(1)` | NO | `â€”` | â€” | â€” | â€” |
| `weekly_digest_day` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `weekly_digest_time` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `max_notifications_per_day` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `notification_fatigue_score` | `float` | NO | `â€”` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `updated_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |

### Indexes

- `ix_notification_preferences_user_id` (unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `notification_preferences_ibfk_1`: `user_id` â†’ `users.id`

## `notification_timings`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `timing_id` | `varchar(36)` | NO | `â€”` | UNI | â€” | â€” |
| `notification_type` | `varchar(64)` | NO | `â€”` | â€” | â€” | â€” |
| `hour_of_day` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `day_of_week` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `send_count` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `click_count` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `dismiss_count` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `engagement_rate` | `float` | NO | `â€”` | â€” | â€” | â€” |
| `avg_response_time_seconds` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `is_optimal_time` | `tinyint(1)` | NO | `â€”` | â€” | â€” | â€” |
| `optimization_score` | `float` | NO | `â€”` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `updated_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `idx_notification_timings_hour` (non-unique): `hour_of_day`
- `idx_notification_timings_user_type` (non-unique): `user_id, notification_type`
- `ix_notification_timings_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`
- `timing_id` (unique): `timing_id`

### Foreign keys

- `notification_timings_ibfk_1`: `user_id` â†’ `users.id`

## `otp_requests`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `phone` | `varchar(32)` | NO | `â€”` | MUL | â€” | â€” |
| `code_hash` | `varchar(128)` | NO | `â€”` | â€” | â€” | â€” |
| `sent_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `expires_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `attempts` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `verified` | `tinyint(1)` | NO | `â€”` | â€” | â€” | â€” |

### Indexes

- `ix_otp_requests_phone` (non-unique): `phone`
- `PRIMARY` (unique): `id`

## `payment_orders`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `order_id` | `varchar(64)` | NO | `â€”` | UNI | â€” | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `order_type` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `plan_code` | `varchar(64)` | YES | `NULL` | â€” | â€” | â€” |
| `package_id` | `varchar(64)` | YES | `NULL` | â€” | â€” | â€” |
| `tokens` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `amount_toman` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `currency` | `varchar(10)` | NO | `â€”` | â€” | â€” | â€” |
| `status` | `varchar(32)` | NO | `â€”` | MUL | â€” | â€” |
| `payment_token` | `varchar(128)` | YES | `NULL` | MUL | â€” | â€” |
| `payment_url` | `varchar(512)` | YES | `NULL` | â€” | â€” | â€” |
| `bank_ref_id` | `varchar(128)` | YES | `NULL` | â€” | â€” | â€” |
| `card_pan` | `varchar(64)` | YES | `NULL` | â€” | â€” | â€” |
| `callback_url` | `varchar(512)` | YES | `NULL` | â€” | â€” | â€” |
| `description` | `varchar(255)` | YES | `NULL` | â€” | â€” | â€” |
| `meta` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | MUL | â€” | â€” |
| `updated_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `paid_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `idx_payment_orders_created` (non-unique): `created_at`
- `idx_payment_orders_user_status` (non-unique): `user_id, status`
- `ix_payment_orders_created_at` (non-unique): `created_at`
- `ix_payment_orders_order_id` (unique): `order_id`
- `ix_payment_orders_payment_token` (non-unique): `payment_token`
- `ix_payment_orders_status` (non-unique): `status`
- `ix_payment_orders_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `payment_orders_ibfk_1`: `user_id` â†’ `users.id`

## `payment_sms_outbox`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `order_id` | `varchar(128)` | NO | `â€”` | PRI | â€” | â€” |
| `phone` | `varchar(64)` | NO | `â€”` | â€” | â€” | â€” |
| `attributes` | `longtext` | NO | `â€”` | â€” | â€” | â€” |
| `status` | `varchar(16)` | NO | `â€”` | â€” | â€” | â€” |
| `attempts` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `next_at` | `float` | NO | `â€”` | MUL | â€” | â€” |
| `lease` | `varchar(32)` | YES | `NULL` | â€” | â€” | â€” |
| `lease_until` | `float` | NO | `â€”` | â€” | â€” | â€” |
| `last_error` | `varchar(64)` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `ix_payment_sms_outbox_next_at` (non-unique): `next_at`
- `PRIMARY` (unique): `order_id`

## `pending_notifications`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `notification_id` | `varchar(128)` | NO | `â€”` | UNI | â€” | â€” |
| `title` | `varchar(255)` | NO | `â€”` | â€” | â€” | â€” |
| `body` | `text` | NO | `â€”` | â€” | â€” | â€” |
| `notification_type` | `varchar(64)` | NO | `â€”` | â€” | â€” | â€” |
| `category` | `varchar(64)` | NO | `â€”` | â€” | â€” | â€” |
| `priority` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `scheduled_time` | `datetime` | NO | `â€”` | MUL | â€” | â€” |
| `batch_id` | `varchar(36)` | YES | `NULL` | MUL | â€” | â€” |
| `payload` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `source` | `varchar(64)` | YES | `NULL` | â€” | â€” | â€” |
| `source_id` | `varchar(36)` | YES | `NULL` | â€” | â€” | â€” |
| `status` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `sent_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `user_dismissed` | `tinyint(1)` | NO | `â€”` | â€” | â€” | â€” |
| `dismissed_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `updated_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `idx_pending_notif_batch` (non-unique): `batch_id`
- `idx_pending_notif_scheduled` (non-unique): `scheduled_time`
- `idx_pending_notif_user_status` (non-unique): `user_id, status`
- `ix_pending_notifications_scheduled_time` (non-unique): `scheduled_time`
- `ix_pending_notifications_user_id` (non-unique): `user_id`
- `notification_id` (unique): `notification_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `pending_notifications_ibfk_1`: `user_id` â†’ `users.id`
- `pending_notifications_ibfk_2`: `batch_id` â†’ `notification_batches.batch_id`

## `pending_notifications_backup`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `0` | â€” | â€” | â€” |
| `user_id` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `notification_id` | `varchar(36)` | NO | `â€”` | â€” | â€” | â€” |
| `title` | `varchar(255)` | NO | `â€”` | â€” | â€” | â€” |
| `body` | `text` | NO | `â€”` | â€” | â€” | â€” |
| `notification_type` | `varchar(64)` | NO | `â€”` | â€” | â€” | â€” |
| `category` | `varchar(64)` | NO | `â€”` | â€” | â€” | â€” |
| `priority` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `scheduled_time` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `batch_id` | `varchar(36)` | YES | `NULL` | â€” | â€” | â€” |
| `payload` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `source` | `varchar(64)` | YES | `NULL` | â€” | â€” | â€” |
| `source_id` | `varchar(36)` | YES | `NULL` | â€” | â€” | â€” |
| `status` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `sent_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `user_dismissed` | `tinyint(1)` | NO | `â€”` | â€” | â€” | â€” |
| `dismissed_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `updated_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

## `personalized_suggestions`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `bigint(20) unsigned` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `suggestion_id` | `varchar(36)` | NO | `â€”` | UNI | â€” | â€” |
| `suggestion_type` | `varchar(64)` | NO | `â€”` | MUL | â€” | â€” |
| `title` | `varchar(255)` | NO | `â€”` | â€” | â€” | â€” |
| `description` | `text` | NO | `â€”` | â€” | â€” | â€” |
| `action_data` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `confidence_score` | `float` | NO | `â€”` | â€” | â€” | â€” |
| `based_on_patterns` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `status` | `varchar(32)` | NO | `'pending'` | MUL | â€” | â€” |
| `user_feedback` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `applied_at` | `timestamp` | YES | `NULL` | â€” | â€” | â€” |
| `expires_at` | `timestamp` | NO | `â€”` | MUL | â€” | â€” |
| `created_at` | `timestamp` | NO | `current_timestamp()` | â€” | â€” | â€” |

### Indexes

- `idx_suggestions_expires` (non-unique): `expires_at`
- `idx_suggestions_status` (non-unique): `status`
- `idx_suggestions_type` (non-unique): `suggestion_type`
- `idx_suggestions_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`
- `suggestion_id` (unique): `suggestion_id`

### Foreign keys

- `personalized_suggestions_ibfk_1`: `user_id` â†’ `users.id`

## `purchases`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `purchase_token` | `varchar(512)` | NO | `â€”` | UNI | â€” | â€” |
| `sku` | `varchar(64)` | NO | `â€”` | â€” | â€” | â€” |
| `order_id` | `varchar(128)` | YES | `NULL` | â€” | â€” | â€” |
| `purchase_time` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `expiry_time` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `auto_renewing` | `tinyint(1)` | YES | `NULL` | â€” | â€” | â€” |
| `verification_status` | `varchar(32)` | YES | `NULL` | MUL | â€” | â€” |
| `myket_response` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `updated_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |

### Indexes

- `idx_purchases_status` (non-unique): `verification_status`
- `idx_purchases_user_expiry` (non-unique): `user_id, expiry_time`
- `ix_purchases_purchase_token` (unique): `purchase_token`
- `ix_purchases_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `purchases_ibfk_1`: `user_id` â†’ `users.id`

## `scheduling_analyses`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `analysis_id` | `varchar(36)` | NO | `â€”` | UNI | â€” | â€” |
| `recommendations` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `overall_productivity_score` | `float` | YES | `NULL` | â€” | â€” | â€” |
| `schedule_health_status` | `varchar(50)` | YES | `NULL` | â€” | â€” | â€” |
| `improvements` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `updated_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `analysis_id` (unique): `analysis_id`
- `ix_scheduling_analyses_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `scheduling_analyses_ibfk_1`: `user_id` â†’ `users.id`

## `subscription_events`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `event_type` | `varchar(64)` | NO | `â€”` | MUL | â€” | â€” |
| `sku` | `varchar(64)` | YES | `NULL` | â€” | â€” | â€” |
| `event_metadata` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | MUL | â€” | â€” |

### Indexes

- `idx_subscription_events_type_created` (non-unique): `event_type, created_at`
- `idx_subscription_events_user_type` (non-unique): `user_id, event_type`
- `ix_subscription_events_created_at` (non-unique): `created_at`
- `ix_subscription_events_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `subscription_events_ibfk_1`: `user_id` â†’ `users.id`

## `subscription_expiry_sms`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `reminder_key` | `varchar(64)` | NO | `â€”` | PRI | â€” | â€” |
| `sent_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |

### Indexes

- `PRIMARY` (unique): `reminder_key`

## `task_recurrences`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `task_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `pattern` | `varchar(64)` | NO | `â€”` | â€” | â€” | â€” |
| `frequency` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `days_of_week` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `end_date` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `ix_task_recurrences_task_id` (non-unique): `task_id`
- `ix_task_recurrences_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `task_recurrences_ibfk_1`: `task_id` â†’ `user_tasks.id`
- `task_recurrences_ibfk_2`: `user_id` â†’ `users.id`

## `task_reminders`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `task_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `scheduled_at` | `datetime` | NO | `â€”` | MUL | â€” | â€” |
| `sent_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `channel` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `status` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `message` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `ix_task_reminders_scheduled_at` (non-unique): `scheduled_at`
- `ix_task_reminders_task_id` (non-unique): `task_id`
- `ix_task_reminders_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `task_reminders_ibfk_1`: `task_id` â†’ `user_tasks.id`
- `task_reminders_ibfk_2`: `user_id` â†’ `users.id`

## `telegram_subscribers`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `chat_id` | `varchar(64)` | NO | `â€”` | UNI | â€” | â€” |
| `username` | `varchar(64)` | YES | `NULL` | â€” | â€” | â€” |
| `first_name` | `varchar(128)` | YES | `NULL` | â€” | â€” | â€” |
| `last_name` | `varchar(128)` | YES | `NULL` | â€” | â€” | â€” |
| `app_user_id` | `int(11)` | YES | `NULL` | MUL | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `last_seen` | `datetime` | NO | `â€”` | â€” | â€” | â€” |

### Indexes

- `ix_telegram_subscribers_app_user_id` (non-unique): `app_user_id`
- `ix_telegram_subscribers_chat_id` (unique): `chat_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `telegram_subscribers_ibfk_1`: `app_user_id` â†’ `users.id`

## `telegram_trials`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `telegram_user_id` | `varchar(64)` | NO | `â€”` | UNI | â€” | â€” |
| `telegram_username` | `varchar(64)` | YES | `NULL` | â€” | â€” | â€” |
| `api_key_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |

### Indexes

- `ix_telegram_trials_api_key_id` (non-unique): `api_key_id`
- `ix_telegram_trials_telegram_user_id` (unique): `telegram_user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `telegram_trials_ibfk_1`: `api_key_id` â†’ `api_keys.id`

## `time_blocks`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `program_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `block_id` | `varchar(36)` | NO | `â€”` | UNI | â€” | â€” |
| `title` | `varchar(255)` | NO | `â€”` | â€” | â€” | â€” |
| `category` | `varchar(64)` | NO | `â€”` | â€” | â€” | â€” |
| `description` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `start_time` | `datetime` | NO | `â€”` | MUL | â€” | â€” |
| `duration_minutes` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `priority` | `varchar(32)` | YES | `'medium'` | â€” | â€” | â€” |
| `status` | `varchar(32)` | YES | `'pending'` | MUL | â€” | â€” |
| `linked_id` | `varchar(36)` | YES | `NULL` | â€” | â€” | â€” |
| `linked_type` | `varchar(32)` | YES | `NULL` | â€” | â€” | â€” |
| `actual_duration_minutes` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `feedback` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `completed_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `current_timestamp()` | â€” | â€” | â€” |

### Indexes

- `block_id` (unique): `block_id`
- `idx_time_blocks_program` (non-unique): `program_id`
- `idx_time_blocks_start_time` (non-unique): `start_time`
- `idx_time_blocks_status` (non-unique): `status`
- `PRIMARY` (unique): `id`

### Foreign keys

- `time_blocks_ibfk_1`: `program_id` â†’ `daily_programs.id`

## `trial_ip_bindings`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `client_ip` | `varchar(64)` | NO | `â€”` | UNI | â€” | â€” |
| `api_key_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `first_seen` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `last_seen` | `datetime` | NO | `â€”` | â€” | â€” | â€” |

### Indexes

- `ix_trial_ip_bindings_api_key_id` (non-unique): `api_key_id`
- `ix_trial_ip_bindings_client_ip` (unique): `client_ip`
- `PRIMARY` (unique): `id`

### Foreign keys

- `trial_ip_bindings_ibfk_1`: `api_key_id` â†’ `api_keys.id`

## `users`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `phone` | `varchar(32)` | YES | `NULL` | UNI | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `last_login` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `subscription_tier` | `varchar(20)` | YES | `'free'` | â€” | â€” | â€” |
| `subscription_sku` | `varchar(100)` | YES | `NULL` | â€” | â€” | â€” |
| `subscription_expiry` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `subscription_auto_renew` | `tinyint(1)` | YES | `1` | â€” | â€” | â€” |
| `subscription_purchase_token` | `varchar(500)` | YES | `NULL` | â€” | â€” | â€” |
| `subscription_updated_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `google_id` | `varchar(255)` | YES | `NULL` | UNI | â€” | â€” |
| `google_email` | `varchar(255)` | YES | `NULL` | UNI | â€” | â€” |
| `google_name` | `varchar(255)` | YES | `NULL` | â€” | â€” | â€” |
| `google_picture` | `varchar(512)` | YES | `NULL` | â€” | â€” | â€” |
| `password_hash` | `varchar(255)` | YES | `NULL` | â€” | â€” | â€” |
| `token_balance` | `int(11)` | NO | `0` | â€” | â€” | â€” |
| `is_disabled` | `tinyint(1)` | NO | `0` | â€” | â€” | â€” |
| `wallet_balance_toman` | `bigint(20)` | NO | `0` | â€” | â€” | â€” |

### Indexes

- `google_email` (unique): `google_email`
- `google_id` (unique): `google_id`
- `idx_google_email` (non-unique): `google_email`
- `idx_google_id` (non-unique): `google_id`
- `ix_users_id` (non-unique): `id`
- `ix_users_phone` (unique): `phone`
- `phone` (unique): `phone`
- `PRIMARY` (unique): `id`

## `user_behavior_patterns`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `bigint(20) unsigned` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `pattern_id` | `varchar(36)` | NO | `â€”` | UNI | â€” | â€” |
| `pattern_type` | `varchar(64)` | NO | `â€”` | MUL | â€” | â€” |
| `pattern_data` | `longtext` | NO | `â€”` | â€” | â€” | â€” |
| `confidence_score` | `float` | NO | `0` | MUL | â€” | â€” |
| `occurrence_count` | `int(11)` | NO | `1` | â€” | â€” | â€” |
| `last_seen` | `timestamp` | NO | `current_timestamp()` | â€” | â€” | â€” |
| `first_seen` | `timestamp` | NO | `current_timestamp()` | â€” | â€” | â€” |
| `created_at` | `timestamp` | NO | `current_timestamp()` | â€” | â€” | â€” |
| `updated_at` | `timestamp` | NO | `current_timestamp()` | â€” | â€” | â€” |

### Indexes

- `idx_behavior_patterns_confidence` (non-unique): `confidence_score`
- `idx_behavior_patterns_type` (non-unique): `pattern_type`
- `idx_behavior_patterns_user_id` (non-unique): `user_id`
- `pattern_id` (unique): `pattern_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `user_behavior_patterns_ibfk_1`: `user_id` â†’ `users.id`

## `user_goals`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `goal_id` | `varchar(36)` | NO | `â€”` | UNI | â€” | â€” |
| `title` | `varchar(255)` | NO | `â€”` | â€” | â€” | â€” |
| `category` | `varchar(64)` | NO | `â€”` | â€” | â€” | â€” |
| `description` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `deadline` | `datetime` | NO | `â€”` | MUL | â€” | â€” |
| `priority` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `milestones` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `progress_percentage` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `completed_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `status` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `updated_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `linked_task_ids` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `linked_habit_ids` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `auto_progress_enabled` | `tinyint(1)` | YES | `1` | â€” | â€” | â€” |
| `last_auto_update` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `motivation_message` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `last_ai_message` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `ix_user_goals_deadline` (non-unique): `deadline`
- `ix_user_goals_goal_id` (unique): `goal_id`
- `ix_user_goals_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `user_goals_ibfk_1`: `user_id` â†’ `users.id`

## `user_profiles`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | UNI | â€” | â€” |
| `name` | `varchar(255)` | NO | `â€”` | â€” | â€” | â€” |
| `role` | `varchar(128)` | NO | `â€”` | â€” | â€” | â€” |
| `timezone` | `varchar(64)` | NO | `â€”` | â€” | â€” | â€” |
| `interests` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `wake_up_time` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `sleep_time` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `focus_hours` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `avg_energy` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `avg_mood` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `last_mood_update` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `active_goal_ids` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `preferred_break_duration` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `enable_motivation` | `tinyint(1)` | NO | `â€”` | â€” | â€” | â€” |
| `communication_style` | `varchar(64)` | NO | `â€”` | â€” | â€” | â€” |
| `track_habits` | `tinyint(1)` | NO | `â€”` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `updated_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |

### Indexes

- `ix_user_profiles_user_id` (unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `user_profiles_ibfk_1`: `user_id` â†’ `users.id`

## `user_tasks`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `task_id` | `varchar(36)` | NO | `â€”` | UNI | â€” | â€” |
| `title` | `varchar(255)` | NO | `â€”` | â€” | â€” | â€” |
| `description` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `category` | `varchar(64)` | NO | `â€”` | â€” | â€” | â€” |
| `due_date` | `datetime` | YES | `NULL` | MUL | â€” | â€” |
| `scheduled_time` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `completed_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `priority` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `status` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `estimated_duration_minutes` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `linked_goal_id` | `varchar(36)` | YES | `NULL` | â€” | â€” | â€” |
| `subtasks` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `location` | `varchar(255)` | YES | `NULL` | â€” | â€” | â€” |
| `reminder_before_minutes` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `reminder_sent` | `tinyint(1)` | YES | `NULL` | â€” | â€” | â€” |
| `notes` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `tags` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `updated_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `ix_user_tasks_due_date` (non-unique): `due_date`
- `ix_user_tasks_task_id` (unique): `task_id`
- `ix_user_tasks_user_id` (non-unique): `user_id`
- `ix_user_task_due` (non-unique): `user_id, due_date`
- `ix_user_task_status` (non-unique): `user_id, status`
- `PRIMARY` (unique): `id`

### Foreign keys

- `user_tasks_ibfk_1`: `user_id` â†’ `users.id`

## `video_usage`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `date` | `date` | NO | `â€”` | MUL | â€” | â€” |
| `seconds` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `updated_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |

### Indexes

- `ix_video_usage_date` (non-unique): `date`
- `ix_video_usage_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `video_usage_ibfk_1`: `user_id` â†’ `users.id`

## `wallet_transactions`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `order_id` | `varchar(64)` | YES | `NULL` | MUL | â€” | â€” |
| `transaction_type` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `amount_tokens` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `balance_before` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `balance_after` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `description` | `varchar(255)` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | MUL | â€” | â€” |
| `amount_toman` | `int(11)` | NO | `0` | â€” | â€” | â€” |

### Indexes

- `idx_wallet_tx_user_created` (non-unique): `user_id, created_at`
- `ix_wallet_transactions_created_at` (non-unique): `created_at`
- `ix_wallet_transactions_order_id` (non-unique): `order_id`
- `ix_wallet_transactions_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `wallet_transactions_ibfk_1`: `user_id` â†’ `users.id`

## `workspace_assets`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `varchar(36)` | NO | `â€”` | PRI | â€” | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `task_id` | `varchar(36)` | YES | `NULL` | MUL | â€” | â€” |
| `filename` | `varchar(255)` | NO | `â€”` | â€” | â€” | â€” |
| `media_type` | `varchar(128)` | NO | `â€”` | â€” | â€” | â€” |
| `data` | `longblob` | NO | `â€”` | â€” | â€” | â€” |
| `size` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `extracted` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `ix_workspace_assets_task_id` (non-unique): `task_id`
- `ix_workspace_assets_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

## `workspace_documents`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `varchar(36)` | NO | `â€”` | PRI | â€” | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `task_id` | `varchar(36)` | YES | `NULL` | MUL | â€” | â€” |
| `title` | `varchar(255)` | NO | `â€”` | â€” | â€” | â€” |
| `content` | `text` | NO | `â€”` | â€” | â€” | â€” |
| `summary` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `outline` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `sources` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `word_count` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `reading_time_minutes` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `version` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `updated_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |

### Indexes

- `ix_workspace_documents_task_id` (non-unique): `task_id`
- `ix_workspace_documents_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `workspace_documents_ibfk_1`: `user_id` â†’ `users.id`

## `workspace_document_versions`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `document_id` | `varchar(36)` | NO | `â€”` | MUL | â€” | â€” |
| `version` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `title` | `varchar(255)` | YES | `NULL` | â€” | â€” | â€” |
| `content` | `text` | NO | `â€”` | â€” | â€” | â€” |
| `change_description` | `varchar(255)` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |

### Indexes

- `ix_workspace_document_versions_document_id` (non-unique): `document_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `workspace_document_versions_ibfk_1`: `document_id` â†’ `workspace_documents.id`

## `workspace_projects`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `varchar(36)` | NO | `â€”` | PRI | â€” | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `title` | `varchar(255)` | NO | `â€”` | â€” | â€” | â€” |
| `goal_id` | `varchar(36)` | YES | `NULL` | â€” | â€” | â€” |
| `memory` | `longtext` | NO | `â€”` | â€” | â€” | â€” |
| `items` | `longtext` | NO | `â€”` | â€” | â€” | â€” |
| `created_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `updated_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `ix_workspace_projects_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

## `workspace_runs`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `task_id` | `varchar(36)` | NO | `â€”` | PRI | â€” | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `request` | `longtext` | NO | `â€”` | â€” | â€” | â€” |
| `checkpoint` | `longtext` | NO | `â€”` | â€” | â€” | â€” |
| `control` | `varchar(20)` | NO | `â€”` | MUL | â€” | â€” |
| `revision` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `lease` | `varchar(36)` | YES | `NULL` | â€” | â€” | â€” |
| `lease_until` | `datetime` | YES | `NULL` | â€” | â€” | â€” |
| `updated_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `ix_workspace_runs_control` (non-unique): `control`
- `ix_workspace_runs_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `task_id`

## `workspace_run_versions`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `varchar(36)` | NO | `â€”` | PRI | â€” | â€” |
| `task_id` | `varchar(36)` | NO | `â€”` | MUL | â€” | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `content` | `longtext` | NO | `â€”` | â€” | â€” | â€” |
| `revision` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `created_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `ix_workspace_run_versions_task_id` (non-unique): `task_id`
- `ix_workspace_run_versions_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

## `workspace_schedules`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `varchar(36)` | NO | `â€”` | PRI | â€” | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `request` | `longtext` | NO | `â€”` | â€” | â€” | â€” |
| `interval_minutes` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `next_run_at` | `datetime` | NO | `â€”` | MUL | â€” | â€” |
| `enabled` | `tinyint(1)` | NO | `â€”` | â€” | â€” | â€” |
| `last_task_id` | `varchar(36)` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `ix_workspace_schedules_next_run_at` (non-unique): `next_run_at`
- `ix_workspace_schedules_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

## `workspace_tasks`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `varchar(36)` | NO | `â€”` | PRI | â€” | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `title` | `varchar(255)` | NO | `â€”` | â€” | â€” | â€” |
| `prompt` | `text` | NO | `â€”` | â€” | â€” | â€” |
| `task_type` | `varchar(50)` | NO | `â€”` | â€” | â€” | â€” |
| `depth` | `varchar(32)` | NO | `â€”` | â€” | â€” | â€” |
| `audience` | `varchar(64)` | NO | `â€”` | â€” | â€” | â€” |
| `language` | `varchar(16)` | NO | `â€”` | â€” | â€” | â€” |
| `status` | `varchar(32)` | NO | `â€”` | MUL | â€” | â€” |
| `progress` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `current_step` | `varchar(255)` | YES | `NULL` | â€” | â€” | â€” |
| `step_logs` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `result_doc_id` | `varchar(36)` | YES | `NULL` | â€” | â€” | â€” |
| `error` | `text` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `updated_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `completed_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `ix_workspace_tasks_status` (non-unique): `status`
- `ix_workspace_tasks_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `workspace_tasks_ibfk_1`: `user_id` â†’ `users.id`

## `zarinpal_payments`

- Type: BASE TABLE
- Engine: InnoDB

| Column | Type | Nullable | Default | Key | Extra | Comment |
|---|---|---:|---|---|---|---|
| `id` | `int(11)` | NO | `â€”` | PRI | auto_increment | â€” |
| `user_id` | `int(11)` | NO | `â€”` | MUL | â€” | â€” |
| `sku` | `varchar(64)` | YES | `NULL` | â€” | â€” | â€” |
| `amount` | `int(11)` | NO | `â€”` | â€” | â€” | â€” |
| `authority` | `varchar(64)` | YES | `NULL` | UNI | â€” | â€” |
| `status` | `varchar(32)` | YES | `NULL` | MUL | â€” | â€” |
| `description` | `varchar(255)` | YES | `NULL` | â€” | â€” | â€” |
| `callback_url` | `varchar(512)` | YES | `NULL` | â€” | â€” | â€” |
| `ref_id` | `varchar(64)` | YES | `NULL` | â€” | â€” | â€” |
| `card_pan` | `varchar(64)` | YES | `NULL` | â€” | â€” | â€” |
| `fee` | `int(11)` | YES | `NULL` | â€” | â€” | â€” |
| `meta` | `longtext` | YES | `NULL` | â€” | â€” | â€” |
| `created_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `updated_at` | `datetime` | NO | `â€”` | â€” | â€” | â€” |
| `verified_at` | `datetime` | YES | `NULL` | â€” | â€” | â€” |

### Indexes

- `idx_zarinpal_payments_status` (non-unique): `status`
- `idx_zarinpal_payments_user_created` (non-unique): `user_id, created_at`
- `ix_zarinpal_payments_authority` (unique): `authority`
- `ix_zarinpal_payments_user_id` (non-unique): `user_id`
- `PRIMARY` (unique): `id`

### Foreign keys

- `zarinpal_payments_ibfk_1`: `user_id` â†’ `users.id`