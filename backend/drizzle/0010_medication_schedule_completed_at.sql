ALTER TABLE medication_schedules
ADD COLUMN IF NOT EXISTS completed_at timestamp;

UPDATE medication_schedules AS schedule
SET completed_at = COALESCE((
  SELECT MAX(COALESCE(log.confirmed_at, log.scheduled_time, log.created_at))
  FROM medication_logs AS log
  WHERE log.schedule_id = schedule.id
), schedule.updated_at, schedule.created_at)
WHERE schedule.stock <= 0
  AND schedule.completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_med_sched_completed_at
ON medication_schedules (completed_at);
