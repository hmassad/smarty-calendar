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

const generateArray = (start, end) => {
  return [...Array(end - start)].map((_, i) => start + i);
}

const isToday = (date, timeZone) => moment().tz(timeZone).isSame(moment(date).tz(timeZone), 'days');

const minDayWidth = 60;

const minutesToPixels = (minutes, pixelsPerHour) => {
  return pixelsPerHour / 60 * minutes;
}

const hoursToPixels = (hours, pixelsPerHour) => {
  return minutesToPixels(hours * 60, pixelsPerHour);
}

const calcTop = (date, timeZone, minHour, pixelsPerHour) => {
  const m = moment(date).tz(timeZone);
  if (m.hours() < minHour) m.hours(minHour);
  const startOfDay = m.clone().startOf('days').add(minHour, 'hours');
  const minutes = m.diff(startOfDay, 'minutes');
  return minutesToPixels(minutes, pixelsPerHour);
};

const calcHeight = (start, end, timeZone, maxHour, pixelsPerHour) => {
  const startM = moment(start).tz(timeZone);
  let endM = moment(end).tz(timeZone);
  if (!endM.isSame(startM, 'days')) endM = startM.clone().endOf('days');
  if (endM.hours() > maxHour) endM.hours(maxHour - 1);
  const minutes = endM.diff(startM, 'minutes');
  return minutesToPixels(minutes, pixelsPerHour);
}

const Calendar = ({ currentDate, timeZone, minHour = 0, maxHour = 24, pixelsPerHour = 48, events, onCreate, className, style }) => {

  const containerRef = useRef();
  const calendarContentRef = useRef();
  const [dayWidth, setDayWidth] = useState(0);

  const [dragCreateEvent, setDragCreateEvent] = useState(null);

  const handleResize = useCallback(e => {
    // calculate width of each day column
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

  const [nowTop, setNowTop] = useState(() => {
    const now = moment().tz(timeZone);
    if (now.hours() < minHour || now.hours() > maxHour)
      return null;
    return calcTop(new Date(), timeZone, minHour, pixelsPerHour);
  });

  useEffect(() => {
    calendarContentRef.current.scrollTop = nowTop;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const intervalHandle = setInterval(() => {
      const now = moment().tz(timeZone);
      if (now.hours() < minHour) {
        setNowTop(null);
      } else {
        setNowTop(calcTop(new Date(), timeZone, minHour, pixelsPerHour));
      }
    }, 30 * 1000);
    return () => {
      clearInterval(intervalHandle);
    };
  }, [timeZone, minHour, pixelsPerHour]);

  const handleMouseMove = useCallback(e => {
    setDragCreateEvent(prev => {
      console.debug('handleMouseMove', prev);
      if (!prev) return prev;
      return {
        ...prev,
        end: moment(prev.start).tz(timeZone).add(245, 'minutes') // todo translate e.pageX, e.pageY
      };
    });
  }, [timeZone]);

  const handleMouseDown = useCallback((e) => {
    window.getSelection().empty();

    // TODO calendarContentRect can be calculated on resize
    const calendarContentRect = calendarContentRef.current.getBoundingClientRect();
    // ignore event if outside events
    if (
      e.pageX < calendarContentRect.left + window.scrollX ||
      e.pageX > calendarContentRect.right + window.scrollX ||
      e.pageY < calendarContentRect.top + window.scrollY ||
      e.pageY > calendarContentRect.bottom + window.scrollY
    ) {
        console.debug('outside calendarContentRef');
        return;
    }

    console.debug({calendarContentRect})
    setDragCreateEvent({
      start: moment().tz(timeZone).startOf('days').add(10, 'hours').toDate(), // todo translate e.pageX, e.pageY
      end: moment().tz(timeZone).startOf('days').add(10.5, 'hours').toDate(),
      summary: 'new event'
    });

    window.addEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove, timeZone]);

  const handleMouseUp = useCallback((e) => {
    console.debug('handleMouseUp', e);

    window.removeEventListener('mousemove', handleMouseMove);
    onCreate && onCreate(dragCreateEvent);
    setDragCreateEvent(null);
  }, [handleMouseMove, dragCreateEvent, onCreate]);

  useEffect(() => {
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseUp]);

  console.debug('render')

  return (
    <div className={`calendar__container ${className || ""}`} style={style} ref={containerRef}>

      <div className='calendar__header'>
        <div className='calendar__header__left-spacer'>
        </div>
        {weekDates(currentDate, timeZone).map(date => (
          <div key={date} style={{width: dayWidth, minWidth: dayWidth, maxWidth: dayWidth}}>
            <h4 style={{textAlign: 'center'}}>{moment(date).tz(timeZone).format('ddd D')}</h4>
            {events
                .filter(event => event.allDay)
                .filter(event => moment(date).tz(timeZone).isSame(moment(event.start).tz(timeZone), 'days'))
                .map((event, index) => (
                  <div key={index} className='calendar__header__event' title={event.summary}>
                    {event.summary}
                  </div>
                ))
            }
          </div>
        ))}
        <div className='calendar__header__right-spacer'>
        </div>
      </div>

      <div className='calendar__content' ref={calendarContentRef}>
        <div className='calendar__content__hours__container' style={{height: hoursToPixels(maxHour - minHour, pixelsPerHour)}}>
          { generateArray(minHour, maxHour + 1).map((hour) => (
            <div key={hour} className='calendar__content__hour' style={{height: hoursToPixels(1, pixelsPerHour)}}>
              {`${moment(currentDate).tz(timeZone).startOf('weeks').add(hour, 'hours').format('ha')}`}
            </div>
          ))}
        </div>

        {weekDates(currentDate, timeZone).map(date => {
          const startOfDay = moment(date).tz(timeZone).startOf('days');
          const isToday_ = isToday(date, timeZone);

          return (
            <div key={date} className='calendar__content__day'
              style={{width: dayWidth, minWidth: dayWidth, maxWidth: dayWidth, height: hoursToPixels(maxHour - minHour, pixelsPerHour)}}>

              <div className='calendar__content__day__event__container'>
                { generateArray(minHour, maxHour).map(hour => (
                  <div key={hour} className={`calendar__content__day__slot ${isToday_ ? 'today' : ''}`}
                    style={{top: hoursToPixels(hour - minHour, pixelsPerHour), height: hoursToPixels(1, pixelsPerHour)}}/>
                ))}
              </div>

              <div className='calendar__content__day__event__container'>
                { events
                    .filter(event => !event.allDay)
                    .filter(event => startOfDay.isSame(moment(event.start).tz(timeZone), 'days'))
                    .filter(event => moment(event.start).tz(timeZone).hours() <= maxHour)
                    .filter(event =>
                      !moment(event.start).tz(timeZone).isSame(moment(event.end).tz(timeZone), 'days') ||
                      moment(event.start).tz(timeZone).hours() <= maxHour)
                    .map((event, index) => (
                        <div key={index} className='calendar__content__day__event' style={{
                          top: calcTop(event.start, timeZone, minHour, pixelsPerHour),
                          height: calcHeight(event.start, event.end, timeZone, maxHour, pixelsPerHour)}}
                          title={event.summary}
                        >
                          {event.summary}
                        </div>
                    ))
                }
                { dragCreateEvent && moment(dragCreateEvent.start).tz(timeZone).isSame(moment(date).tz(timeZone), 'days') ? (
                  <div className='calendar__content__day__drag-create-event' style={{
                    top: calcTop(dragCreateEvent.start, timeZone, minHour, pixelsPerHour),
                    height: calcHeight(dragCreateEvent.start, dragCreateEvent.end, timeZone, maxHour, pixelsPerHour)
                  }}>
                    {moment(dragCreateEvent.start).tz(timeZone).format('h:mma')} - {moment(dragCreateEvent.end).tz(timeZone).format('h:mma')}<br/>
                    {dragCreateEvent.summary}
                  </div>
                ) : null }
              </div>

              { isToday_ && nowTop ? (<>
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
