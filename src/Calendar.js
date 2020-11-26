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
  return pixelsPerHour * minutes / 60;
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
};

const calcDateFromPixels = (startDate, timeZone, pixels, pixelsPerHour) => {
  const minutes = Math.floor(pixels / pixelsPerHour * 60);
  return moment(startDate).tz(timeZone).add(minutes, 'minutes').toDate();
};

const unselectText = () => {
  if (document.selection) {
    document.selection.empty()
  } else {
    window.getSelection().removeAllRanges()
  }
};

const Calendar = ({ currentDate, timeZone, minHour = 0, maxHour = 24, pixelsPerHour = 48, events, onCreate, className, style }) => {

  const containerRef = useRef();
  const calendarContentRef = useRef();
  const [dayWidth, setDayWidth] = useState(0);

  const dragStartRef = useRef(null);
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
        setNowTop(calcTop(now.toDate(), timeZone, minHour, pixelsPerHour));
      }
    }, 1000);
    return () => {
      clearInterval(intervalHandle);
    };
  }, [timeZone, minHour, pixelsPerHour]);

  const handleMouseMove = useCallback(e => {
    if (!dragStartRef.current) return;

    unselectText();

    // TODO calendarContentRect can be calculated on resize
    const calendarContentRect = calendarContentRef.current.getBoundingClientRect();
    let top = e.clientY - calendarContentRect.top;
    if (top < 0) top = 0;
    if (top > (maxHour - minHour) * pixelsPerHour) top = (maxHour - minHour) * pixelsPerHour;

    // TODO adjust top to 5 min intervals

    // only eval Y, do not filter point outside day
    // if event is higher than dragStartRef, then start = event and end = dragStart
    // if event is lower than dragStart, then start = dragStart and end = event
    if (top <= dragStartRef.current.top) {
      setDragCreateEvent(prev => ({
        ...prev,
        start: calcDateFromPixels(dragStartRef.current.day, timeZone, top, pixelsPerHour),
        end: calcDateFromPixels(dragStartRef.current.day, timeZone, dragStartRef.current.top, pixelsPerHour)
      }));
    } else {
      setDragCreateEvent(prev => ({
        ...prev,
        start: calcDateFromPixels(dragStartRef.current.day, timeZone, dragStartRef.current.top, pixelsPerHour),
        end: calcDateFromPixels(dragStartRef.current.day, timeZone, top, pixelsPerHour)
      }));
    }
  }, [maxHour, minHour, pixelsPerHour, timeZone]);

  const handleMouseDown = useCallback(e => {
    if (e.button !== 0) return;

    unselectText();

    // TODO calendarContentRect can be calculated on resize
    const calendarContentRect = calendarContentRef.current.getBoundingClientRect();
    const left = e.clientX - calendarContentRect.left - 40;
    const top = e.clientY - calendarContentRect.top;
    if (left < 0 ||
      left > dayWidth * 7 ||
      top < 0 ||
      top > (maxHour - minHour) * pixelsPerHour) {
      return;
    }

    const day = moment(currentDate).tz(timeZone).startOf('week').add(Math.floor(left / dayWidth), 'days').toDate();
    dragStartRef.current = ({
      left,
      top,
      day
    });
    const start = calcDateFromPixels(day, timeZone, top, pixelsPerHour);
    const end = moment(start).add(30, 'minutes').toDate();

    // TODO adjust top to 5 min intervals

    setDragCreateEvent({
      start,
      end,
      summary: 'new event'
    });

    window.addEventListener('mousemove', handleMouseMove);
  }, [dayWidth, maxHour, minHour, pixelsPerHour, currentDate, timeZone, handleMouseMove]);

  const handleMouseUp = useCallback((e) => {
    if (e.button !== 0) return;
    window.removeEventListener('mousemove', handleMouseMove);
    dragStartRef.current = null;
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

  // console.debug(new Date(), 'render')

  return (
    <div className={`calendar__container ${className || ""}`} style={style} ref={containerRef}>

      <div className='calendar__header'>
        <div className='calendar__header__left-spacer'/>
        {weekDates(currentDate, timeZone).map(date => (
          <div key={date} style={{width: dayWidth, minWidth: dayWidth, maxWidth: dayWidth}}>
            <span style={{textAlign: 'center'}}>{moment(date).tz(timeZone).format('ddd D')} </span>
            {events
                .filter(event => event) // HACK hot reloader throws an error
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
                    .filter(event => event) // HACK hot reloader throws an error
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
