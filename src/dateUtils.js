import moment from 'moment-timezone';

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
