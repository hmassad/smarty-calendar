import moment from 'moment-timezone';

/**
 *
 * @param date {Date}
 * @param minutes {number}
 * @returns {Date}
 */
export const nearestMinutes = (date, minutes) => {
    const m = moment(date);
    const roundedMinutes = Math.round(m.minute() / minutes) * minutes;
    return m.startOf('hours').minute(roundedMinutes).toDate();
}

/**
 *
 * @param date {Date}
 * @param minutes {number}
 * @returns {Date}
 */
export const nearestPastMinutes = (date, minutes) => {
    const m = moment(date);
    const roundedMinutes = Math.floor(m.minute() / minutes) * minutes;
    return m.startOf('hours').minute(roundedMinutes).toDate();
}

/**
 *
 * @param date {Date}
 * @param minutes {number}
 * @returns {Date}
 */
export const nearestFutureMinutes = (date, minutes) => {
    const m = moment(date);
    const roundedMinutes = Math.ceil(m.minute() / minutes) * minutes;
    return m.startOf('hours').minute(roundedMinutes).toDate();
}

/**
 *
 * @param start1 {Date}
 * @param end1 {Date}
 * @param start2 {Date}
 * @param end2 {Date}
 * @returns {boolean}
 */
export const checkCollision = (start1, end1, start2, end2) => {
    return !!start1 && !!end1 && !!start2 && !!end2 && (
        (start1.getTime() >= start2.getTime() && start1.getTime() < end2.getTime()) ||
        (end1.getTime() > start2.getTime() && start1.getTime() <= start2.getTime())
    );
}

export const isToday = (date, timeZone) => {
    return moment().tz(timeZone).isSame(moment(date).tz(timeZone), 'days');
}

export const isSameDay = (date1, date2, timeZone) => {
    return moment(date1).tz(timeZone).isSame(moment(date2).tz(timeZone), 'days');
}
