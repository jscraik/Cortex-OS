use std::time::Duration;

pub trait DurationExt {
    fn from_days(days: u64) -> Duration;
    fn from_hours(hours: u64) -> Duration;
    fn from_minutes(minutes: u64) -> Duration;
}

impl DurationExt for Duration {
    fn from_days(days: u64) -> Duration {
        Duration::from_secs(days * 24 * 60 * 60)
    }
    
    fn from_hours(hours: u64) -> Duration {
        Duration::from_secs(hours * 60 * 60)
    }
    
    fn from_minutes(minutes: u64) -> Duration {
        Duration::from_secs(minutes * 60)
    }
}