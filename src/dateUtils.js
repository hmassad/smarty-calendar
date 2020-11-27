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
