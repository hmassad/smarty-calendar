import moment from 'moment-timezone';

export const nearestMinutes = (date, minutes) => {
    const m = moment(date);
    const roundedMinutes = Math.round(m.minute() / minutes) * minutes;
    return m.startOf('hours').minute(roundedMinutes).toDate();
}

export const nearestPastMinutes = (date, minutes) => {
    const m = moment(date);
    const roundedMinutes = Math.floor(m.minute() / minutes) * minutes;
    return m.startOf('hours').minute(roundedMinutes).toDate();
}

export const nearestFutureMinutes = (date, minutes) => {
    const m = moment(date);
    const roundedMinutes = Math.ceil(m.minute() / minutes) * minutes;
    return m.startOf('hours').minute(roundedMinutes).toDate();
}

export const checkCollision = (start1, end1, start2, end2) => {
    return start1 && end1 && start2 && end2 && (
        (start1.getTime() >= start2.getTime() && start1.getTime() < end2.getTime()) ||
        (end1.getTime() > start2.getTime() && start1.getTime() <= start2.getTime())
    );
}
