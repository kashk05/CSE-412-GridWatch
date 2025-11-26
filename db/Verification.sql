-- Counts by status
SELECT current_status, COUNT(*) FROM report GROUP BY 1 ORDER BY 2 DESC;

-- SLA breach rate
SELECT AVG((breached::int)) AS breach_ratio FROM sla_clock;

-- Subscription & upvote integrity (no duplicates)
SELECT COUNT(*) FROM (
  SELECT report_id, user_id FROM subscription GROUP BY 1,2 HAVING COUNT(*)>1
) d;  -- expect 0

SELECT COUNT(*) FROM (
  SELECT report_id, user_id FROM upvote GROUP BY 1,2 HAVING COUNT(*)>1
) d;  -- expect 0

-- One active assignment per report
SELECT report_id, COUNT(*) 
FROM assignment WHERE is_active GROUP BY 1 HAVING COUNT(*)>1;  -- expect none

-- Notification spread
SELECT status, COUNT(*) FROM notification GROUP BY 1;

-- Work orders present for ~60% of new reports
SELECT ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM report), 1) AS wo_pct FROM work_order;
