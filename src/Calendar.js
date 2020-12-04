import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import moment from 'moment-timezone';
import './Calendar.css';
import {checkCollision, isToday, nearestMinutes} from './dateUtils';
import {nearestNumber} from './numberUtils';

const generateArray = (start, end) => {
  return [...Array(end - start)].map((_, i) => start + i);
}

const minutesToPixels = (minutes, pixelsPerHour) => {
  return pixelsPerHour * minutes / 60;
}

const pixelsToMinutes = (pixels, pixelsPerHour) => {
  return pixels / pixelsPerHour * 60;
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

const DragAction = {
  CREATE: 'CREATE',
  CHANGE_START: 'CHANGE_START',
  CHANGE_END: 'CHANGE_END',
  MOVE: 'MOVE',
};

export const CalendarType = {
  SPECIFIC: 'SPECIFIC',
  GENERIC: 'GENERIC'
}

export const CalendarView = {
  WEEK: 'WEEK',
  WORK_WEEK: 'WORK_WEEK',
  SINGLE_DAY: 'SINGLE_DAY',
  THREE_DAYS: 'THREE_DAYS'
}

const GENERIC_DATE = '2020-01-01T00:00:00Z';

const Calendar = ({
                    calendarType = CalendarType.SPECIFIC,
                    calendarView = CalendarView.WEEK,
                    currentDate,
                    timeZone,
                    minHour = 0,
                    maxHour = 24,
                    pixelsPerHour = 48,
                    events,
                    onCreate,
                    onChange,
                    onDelete,
                    step = 15,
                    minEventDurationMinutes = 30,
                    minEventHeight = 10,
                    scrollbarWidth = 22,
                    dayMinWidth = 60,
                    topHandleHeight = 10,
                    bottomHandleHeight = 10,
                    hoursContainerWidth = 40,
                    defaultEventDurationMinutes = 30,
                    className,
                    style
                  }) => {

  const columnDates = useMemo(() => {
    if (calendarType === CalendarType.GENERIC) {
      switch (calendarView) {
        case CalendarView.SINGLE_DAY:
          return [moment(GENERIC_DATE).tz(timeZone).startOf('days')];
        case CalendarView.WORK_WEEK:
          return Array.from({length: 5})
            .map((_, i) => moment(GENERIC_DATE).tz(timeZone).startOf('weeks').add(i + 1, 'days'));
        case CalendarView.WEEK:
        default:
          return Array.from({length: 7})
            .map((_, i) => moment(GENERIC_DATE).tz(timeZone).startOf('weeks').add(i, 'days'));
      }
    } else {
      switch (calendarView) {
        case CalendarView.SINGLE_DAY:
          return [moment(currentDate).tz(timeZone).startOf('days')];
        case CalendarView.THREE_DAYS:
          return Array.from({length: 3})
            .map((_, i) => moment(currentDate).tz(timeZone).startOf('days').add(i, 'days'));
        case CalendarView.WORK_WEEK:
          return Array.from({length: 5})
            .map((_, i) => moment(currentDate).tz(timeZone).startOf('weeks').add(i + 1, 'days'));
        case CalendarView.WEEK:
        default:
          return Array.from({length: 7})
            .map((_, i) => moment(currentDate).tz(timeZone).startOf('weeks').add(i, 'days'));
      }
    }
  }, [calendarType, calendarView, timeZone, currentDate]);

  /**
   *
   * @type {React.MutableRefObject<HTMLElement | undefined | null>}
   */
  const containerRef = useRef();
  /**
   *
   * @type {React.MutableRefObject<HTMLElement | undefined | null>}
   */
  const calendarContentRef = useRef();
  const [dayWidth, setDayWidth] = useState(0);

  const [nowTop, setNowTop] = useState();

  const [isDragging, setDragging] = useState(false);
  /**
   *
   * @type {React.MutableRefObject<{action: (string|DragAction), date: Date, offset: (number|undefined)} | undefined | null>}
   */
  const dragContextRef = useRef(null);
  const [dragEvent, setDragEvent] = useState(null);
  const [dragOriginalEvent, setOriginalDragEvent] = useState(null);

  const handleResize = useCallback(() => {
    // calculate width of each day column
    let newDayWidth = (containerRef.current.clientWidth - hoursContainerWidth - scrollbarWidth) / columnDates.length;
    if (newDayWidth < dayMinWidth) newDayWidth = dayMinWidth;
    setDayWidth(newDayWidth);
  }, [columnDates, dayMinWidth, hoursContainerWidth, scrollbarWidth]);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [handleResize]);

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
    if (!dragContextRef.current) return;
    if (!isDragging) return;
    // TODO cancel drag on secondary button click

    const calendarContentRect = calendarContentRef.current.getBoundingClientRect();
    let top = e.clientY - calendarContentRect.top + calendarContentRef.current.scrollTop;
    if (top < 0) top = 0;
    const maxTop = hoursToPixels(maxHour - minHour, pixelsPerHour);
    if (top > maxTop) top = maxTop;
    const left = e.clientX - calendarContentRect.left - hoursContainerWidth;
    if (left < 0 || left > dayWidth * columnDates.length) {
      return;
    }

    const minutesUnderCursor = nearestNumber(minHour * 60 + pixelsToMinutes(top, pixelsPerHour), step);
    const dateUnderCursor = columnDates[0].clone().add(Math.floor(left / dayWidth), 'days').add(minutesUnderCursor, 'minutes');

    // eslint-disable-next-line default-case
    switch (dragContextRef.current.action) {
      case DragAction.CREATE: {
        setDragEvent(prev => {
          // only eval Y, do not filter point outside day
          // if event is higher than dragStartRef, then start = event and end = dragStart
          // if event is lower than dragStart, then start = dragStart and end = event
          const newMoment = moment(prev.start).tz(timeZone).startOf('days').add(minutesUnderCursor, 'minutes').toDate();
          const [newStart, newEnd] = newMoment.getTime() < dragContextRef.current.date.getTime() ?
            [newMoment, dragContextRef.current.date] :
            [dragContextRef.current.date, newMoment];
          if (moment(newEnd).diff(newStart, 'minutes') < minEventDurationMinutes) {
            return prev;
          }
          if (events.some(event => checkCollision(event.start, event.end, newStart, newEnd))) {
            return prev;
          }
          return {
            ...prev,
            start: newStart,
            end: newEnd
          };
        });
        break;
      }
      case DragAction.MOVE:
        setDragEvent(prev => {
          const eventDay = moment(dateUnderCursor).tz(timeZone).startOf('days');
          const durationMinutes = moment(prev.end).diff(moment(prev.start), 'minutes');
          const minStart = eventDay.clone().add(minHour, 'hours');
          const maxStart = eventDay.clone().add(maxHour, 'hours').subtract(durationMinutes, 'minutes');
          let newStart = moment(dateUnderCursor).subtract(dragContextRef.current.offset, 'minutes');
          if (moment(newStart).isBefore(minStart)) {
            newStart = minStart;
          } else if (moment(newStart).isAfter(maxStart)) {
            newStart = maxStart;
          }
          let newEnd = moment(newStart).add(durationMinutes, 'minutes');
          if (events.filter(event => event !== dragOriginalEvent).some(event => checkCollision(event.start, event.end, newStart.toDate(), newEnd.toDate()))) {
            return prev;
          }
          return {
            ...prev,
            start: newStart.toDate(),
            end: newEnd.toDate(),
          };
        });
        break;
      case DragAction.CHANGE_START:
        setDragEvent(prev => {
          const eventDay = moment(prev.start).tz(timeZone).startOf('days');
          const minStart = eventDay.clone().add(minHour, 'hours');
          const maxStart = moment(prev.end).subtract(step, 'minutes');
          let newStart = eventDay.clone().add(minutesUnderCursor, 'minutes').subtract(dragContextRef.current.offset, 'minutes');
          if (moment(newStart).isBefore(minStart)) {
            newStart = minStart;
          } else if (moment(newStart).isAfter(maxStart)) {
            newStart = maxStart;
          }
          if (moment(prev.end).diff(newStart, 'minutes') < minEventDurationMinutes) {
            return prev;
          }
          if (events.filter(event => event !== dragOriginalEvent).some(event => checkCollision(event.start, event.end, newStart.toDate(), prev.end))) {
            return prev;
          }
          return {
            ...prev,
            start: newStart.toDate()
          };
        });
        break;
      case DragAction.CHANGE_END:
        setDragEvent(prev => {
          const eventDay = moment(prev.start).tz(timeZone).startOf('days');
          const minEnd = moment(prev.start).add(step, 'minutes');
          const maxEnd = eventDay.clone().add(maxHour, 'hours');
          let newEnd = eventDay.clone().add(minutesUnderCursor, 'minutes').subtract(dragContextRef.current.offset, 'minutes');
          if (newEnd.isBefore(minEnd)) {
            newEnd = minEnd;
          } else if (newEnd.isAfter(maxEnd)) {
            newEnd = maxEnd;
          }
          if (moment(newEnd).diff(prev.start, 'minutes') < minEventDurationMinutes) {
            return prev;
          }
          if (events.filter(event => event !== dragOriginalEvent).some(event => checkCollision(event.start, event.end, prev.start, newEnd.toDate()))) {
            return prev;
          }
          return {
            ...prev,
            end: newEnd.toDate()
          };
        });
        break;
    }
  }, [columnDates, dayWidth, dragOriginalEvent, events, hoursContainerWidth, isDragging, maxHour, minEventDurationMinutes, minHour, pixelsPerHour, step, timeZone]);

  const handleMouseDown = useCallback(e => {
    if (e.button !== 0) return;
    if (e.target.onclick) return; // allow clicking on inner elements

    const calendarContentRect = calendarContentRef.current.getBoundingClientRect();
    const left = e.clientX - calendarContentRect.left - hoursContainerWidth;
    let top = e.clientY - calendarContentRect.top + calendarContentRef.current.scrollTop;
    // discard if outside of calendarContentRect
    if (left < 0 || left > dayWidth * columnDates.length || top < 0 || top > (maxHour - minHour) * pixelsPerHour) {
      return;
    }

    const minutesUnderCursor = minHour * 60 + pixelsToMinutes(top, pixelsPerHour);
    const dateUnderCursor = columnDates[0].clone().add(Math.floor(left / dayWidth), 'days').add(minutesUnderCursor, 'minutes').toDate();
    const adjustedDateUnderCursor = nearestMinutes(dateUnderCursor, step);

    // if the click is in the bound of an element:
    //    click on top, action: CHANGE_START
    //    click on bottom, action: CHANGE_END
    //    click on middle, action: MOVE
    // if the click is in the border of an element: CREATE
    // on render, do not render the changing event in the list, but in a special element
    const eventUnderCursor = events.find(event =>
      !event.allDay &&
      event.start.getTime() <= dateUnderCursor.getTime() &&
      event.end.getTime() >= dateUnderCursor.getTime());
    if (eventUnderCursor) {
      const eventTop = calcTop(eventUnderCursor.start, timeZone, minHour, pixelsPerHour);
      const eventBottom = moment(eventUnderCursor.end).tz(timeZone).isSame(moment(eventUnderCursor.start).tz(timeZone), 'days') ?
        calcTop(eventUnderCursor.end, timeZone, minHour, pixelsPerHour) :
        hoursToPixels(maxHour - minHour, pixelsPerHour);
      let action;
      if (eventBottom - eventTop < minEventHeight) {
        if ((maxHour - minHour) * pixelsPerHour - eventBottom < minEventHeight) {
          action = DragAction.CHANGE_START;
        } else {
          action = DragAction.CHANGE_END;
        }
      } else {
        if (top - eventTop < topHandleHeight) {
          action = DragAction.CHANGE_START;
        } else if (eventBottom - top <= bottomHandleHeight) {
          action = DragAction.CHANGE_END;
        } else {
          action = DragAction.MOVE;
        }
      }

      // offset is used to make the dragging more natural, if you start from the middle, use the middle as a reference to move the event
      dragContextRef.current = {
        action,
        date: adjustedDateUnderCursor,
        offset: nearestNumber(pixelsToMinutes(action === DragAction.CHANGE_END ? top - eventBottom : top - eventTop, pixelsPerHour), step)
      };
      setDragEvent({
        ...eventUnderCursor
      });
      setOriginalDragEvent(eventUnderCursor);
    } else {
      dragContextRef.current = {
        action: DragAction.CREATE,
        date: adjustedDateUnderCursor
      };
      setDragEvent({
        start: adjustedDateUnderCursor,
        end: moment(adjustedDateUnderCursor).add(defaultEventDurationMinutes, 'minutes').toDate(),
        summary: 'new event'
      });
    }

    setDragging(true);
  }, [columnDates, hoursContainerWidth, dayWidth, maxHour, minHour, pixelsPerHour, timeZone, step, events, minEventHeight, topHandleHeight, bottomHandleHeight, defaultEventDurationMinutes]);

  const handleMouseUp = useCallback(e => {
    if (e.button !== 0) return;
    setDragging(false);

    if (!dragContextRef.current) return;

    switch (dragContextRef.current.action) {
      case DragAction.CREATE:
        onCreate && onCreate(dragEvent);
        break;
      case DragAction.CHANGE_START:
      case DragAction.CHANGE_END:
      case DragAction.MOVE:
        onChange && onChange(dragOriginalEvent, dragEvent);
        break;
      default:
        break;
    }

    setDragEvent(null);
    setOriginalDragEvent(null);
    dragContextRef.current = null;
  }, [dragOriginalEvent, dragEvent, onCreate, onChange]);

  useEffect(() => {
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseDown, handleMouseUp, handleMouseMove]);

  const handleDeleteEventClick = useCallback(event => {
    onDelete && onDelete(event);
  }, [onDelete]);

  const renderedDayEventContainer = useMemo(() => {
    return columnDates.map(date => {
      return (
        <div className='calendar__content__day__event__container'>
          {generateArray(minHour, maxHour).map(hour => (
            <div key={hour} className={`calendar__content__day__slot${calendarView !== CalendarView.SINGLE_DAY && isToday(date, timeZone) ? ' today' : ''}`}
                 style={{top: hoursToPixels(hour - minHour, pixelsPerHour), height: hoursToPixels(1, pixelsPerHour)}}/>
          ))}
        </div>
      );
    })
  }, [calendarView, columnDates, maxHour, minHour, pixelsPerHour, timeZone]);

  const renderedEvents = useMemo(() => {
    return columnDates.map(date => {
      const startOfDay = moment(date).tz(timeZone).startOf('days');
      return events
        .filter(event => event) // HACK hot-reloader throws an error
        .filter(event => !event.allDay)
        .filter(event => !dragOriginalEvent || event !== dragOriginalEvent) // do not render event being dragged
        .filter(event => startOfDay.isSame(moment(event.start).tz(timeZone), 'days'))
        .filter(event => moment(event.start).tz(timeZone).hours() <= maxHour)
        .filter(event =>
          !moment(event.start).tz(timeZone).isSame(moment(event.end).tz(timeZone), 'days') ||
          moment(event.start).tz(timeZone).hours() <= maxHour)
        .map((event, index) => (
          <div key={index} className='calendar__content__day__event' style={{
            top: calcTop(event.start, timeZone, minHour, pixelsPerHour),
            height: calcHeight(event.start, event.end, timeZone, maxHour, pixelsPerHour)
          }}
               title={event.summary}
          >
            <div className='calendar__content__day__event__top' style={{height: topHandleHeight}}/>
            <div className='calendar__content__day__event__main'>
              {event.summary}
            </div>
            <div className='calendar__content__day__event__bottom' style={{height: bottomHandleHeight}}/>
            <div className='calendar__content__day__event__delete' onClick={() => handleDeleteEventClick(event)}>
              ❌
            </div>
          </div>
        ));
    });
  }, [bottomHandleHeight, columnDates, dragOriginalEvent, events, handleDeleteEventClick, maxHour, minHour, pixelsPerHour, timeZone, topHandleHeight]);

  return (
    <div className={`calendar__container ${className || ""}`} style={style} ref={containerRef}>

      <div className='calendar__header'>
        <div className='calendar__header__left-spacer'
             style={{width: hoursContainerWidth, minWidth: hoursContainerWidth}}/>
        {columnDates.map(date => (
          <div key={date} style={{width: dayWidth, minWidth: dayWidth, maxWidth: dayWidth}}>
            {calendarType === CalendarType.SPECIFIC ? (<>
              <span style={{textAlign: 'center'}}>{moment(date).tz(timeZone).format('ddd D')}</span>
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
            </>) : calendarView !== CalendarView.SINGLE_DAY ? (
              <span style={{textAlign: 'center'}}>{moment(date).tz(timeZone).format('ddd')}</span>
            ) :  null}
          </div>
        ))}
        <div style={{width: scrollbarWidth, minWidth: scrollbarWidth}}/>
      </div>

      <div className='calendar__content' ref={calendarContentRef}>
        <div className='calendar__content__hours__container' style={{
          height: hoursToPixels(maxHour - minHour, pixelsPerHour),
          width: hoursContainerWidth,
          minWidth: hoursContainerWidth
        }}>
          {generateArray(minHour, maxHour + 1).map((hour) => (
            <div key={hour} className='calendar__content__hour' style={{height: hoursToPixels(1, pixelsPerHour)}}>
              {`${moment(currentDate).tz(timeZone).startOf('weeks').add(hour, 'hours').format('ha')}`}
            </div>
          ))}
        </div>

        {columnDates.map((date, index) => {
          const isToday_ = isToday(date, timeZone);

          return (
            <div key={date} className='calendar__content__day'
                 style={{
                   width: dayWidth,
                   minWidth: dayWidth,
                   maxWidth: dayWidth,
                   height: hoursToPixels(maxHour - minHour, pixelsPerHour)
                 }}>

              {renderedDayEventContainer[index]}

              <div className='calendar__content__day__event__container'>
                {renderedEvents[index]}
                {dragEvent && moment(dragEvent.start).tz(timeZone).isSame(moment(date).tz(timeZone), 'days') ? (
                  <div className='calendar__content__day__drag-create-event' style={{
                    top: calcTop(dragEvent.start, timeZone, minHour, pixelsPerHour),
                    height: calcHeight(dragEvent.start, dragEvent.end, timeZone, maxHour, pixelsPerHour)
                  }}>
                    {moment(dragEvent.start).tz(timeZone).format('h:mma')} - {moment(dragEvent.end).tz(timeZone).format('h:mma')}<br/>
                    {dragEvent.summary}
                  </div>
                ) : null}
              </div>

              {isToday_ && nowTop ? (<>
                <div className='calendar__content__day__current-time' style={{top: nowTop}}/>
              </>) : null}
            </div>
          );
        })}
      </div>
    </div>
  )
};

export default Calendar;
