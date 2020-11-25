import React, { useCallback, useEffect, useRef, useState } from 'react';
import moment from 'moment-timezone';
import './Calendar.css'

const weekDates = (date, timeZone) => {
  const _weekDates = [];
  const current = moment(date).tz(timeZone).startOf('weeks');
  for (let i = 0; i < 7; i++) {
    _weekDates.push(current.toDate());
    current.add(1, 'days');
  }
  return _weekDates;
}

const timesOfDay = () => {
  return [...Array(24)].map((v, i) => i);
}

const isToday = (date, timeZone) => moment().tz(timeZone).isSame(moment(date).tz(timeZone), 'days');

const stopEventPropagation = e => {
  if (e.stopPropagation) e.stopPropagation();
  if (e.preventDefault) e.preventDefault();
  e.cancelBubble = true;
  e.returnValue = false;
  return false;
}

const minDayWidth = 60;

const minutesToPixels = (minutes, pixelsPerHour) => {
  return pixelsPerHour / 60 * minutes;
}

const hoursToPixels = (hours, pixelsPerHour) => {
  return minutesToPixels(hours * 60, pixelsPerHour);
}

const calcTop = (date, timeZone, pixelsPerHour) => {
  const m = moment(date).tz(timeZone);
  const startOfDay = m.clone().startOf('days');
  const minutes = m.diff(startOfDay, 'minutes');
  return pixelsPerHour / 60 * minutes;
};

const calcHeight = (start, end, timeZone, pixelsPerHour) => {
  const startM = moment(start).tz(timeZone);
  const endM = moment(end).tz(timeZone);
  const minutes = endM.diff(startM, 'minutes');
  return pixelsPerHour / 60 * minutes;
}

const Calendar = ({ currentDate, timeZone, events, onCreate, className, style }) => {

  const containerRef = useRef();
  const [dayWidth, setDayWidth] = useState(0);

  const handleResize = useCallback(e => {
    console.debug('calculate width of each element');

    let newDayWidth = (containerRef.current.clientWidth - 40 - 22) / 7;
    if (newDayWidth < minDayWidth) newDayWidth = minDayWidth;
    setDayWidth(newDayWidth);
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [handleResize]);

  const [pixelsPerHour, setPixelsPerHour] = useState(32);
  const [nowTop, setNowTop] = useState(calcTop(new Date(), timeZone, pixelsPerHour));

  useEffect(() => {
    const intervalHandle = setInterval(() => {
      setNowTop(new Date(), timeZone, pixelsPerHour);
    }, 30 * 1000);
    return () => {
      clearInterval(intervalHandle);
    };
  }, [timeZone, pixelsPerHour]);

  return (
    <div className={`calendar__container ${className || ""}`} style={style} ref={containerRef}>


      <div className='calendar__header'>
        <div className='calendar__header__left-spacer'>
        </div>
        {weekDates(currentDate, timeZone).map(date => (
          <div key={date} style={{width: dayWidth, minWidth: dayWidth, maxWidth: dayWidth}}>{moment(date).tz(timeZone).format()}</div>
        ))}
        <div className='calendar__header__right-spacer'>
        </div>
      </div>

      <div className='calendar__content'>
        <div className='calendar__content__hours__container' style={{height: 24 * pixelsPerHour}}>
        { [...timesOfDay(), 24].map((tod) => (
          <div key={tod} className='calendar__content__hour' style={{height: pixelsPerHour}}>
            {`${moment(currentDate).tz(timeZone).startOf('weeks').add(tod, 'hours').format('ha')}`}
          </div>
        ))}
        </div>

        {weekDates(currentDate, timeZone).map(date => {
          const startOfDay = moment(date).tz(timeZone).startOf('days');
          const isToday_ = isToday(date, timeZone);

          return (
            <div key={date} className='calendar__content__day'
              style={{width: dayWidth, minWidth: dayWidth, maxWidth: dayWidth, height: 24 * pixelsPerHour}}>

              <div className='calendar__content__day__event__container'>
                { timesOfDay().map((tod) => (
                  <div key={tod} className={`calendar__content__day__slot ${isToday_ ? 'today' : ''}`}
                    style={{top: hoursToPixels(tod, pixelsPerHour), height: pixelsPerHour}}/>
                ))}
              </div>

              <div className='calendar__content__day__event__container'>
                { events
                    .filter(event => !event.allDay)
                    .filter(event => startOfDay.isSame(moment(event.start).tz(timeZone), 'days'))
                    .map((event, index) => (
                        <div key={index} className='calendar__content__day__event' style={{
                          top: calcTop(event.start, timeZone, pixelsPerHour),
                          height: calcHeight(event.start, event.end, timeZone, pixelsPerHour)}}>
                          {event.summary}
                        </div>
                    ))
                }
              </div>

              { isToday_ ? (<>
                <div className='calendar__content__day__today__cap' style={{top: nowTop}}></div>
                <div className='calendar__content__day__today__line' style={{top: nowTop}}></div>
              </>) : null}
            </div>
          );
        })}
      </div>
    </div>
  )
};

export default Calendar;
