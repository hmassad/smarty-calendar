import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const DAY_MIN_WIDTH_PX = 60;
const STEP_MINUTES = 5;

const DragAction = {
  CREATE: 'CERATE',
  CHANGE_START: 'CHANGE_START',
  CHANGE_END: 'CHANGE_END',
  MOVE: 'MOVE',
}

const Calendar = ({ currentDate, timeZone, minHour = 0, maxHour = 24, pixelsPerHour = 48, events, onCreate, onChange, onDelete, className, style }) => {

  const containerRef = useRef();
  const calendarContentRef = useRef();
  const [dayWidth, setDayWidth] = useState(0);

  const dragContextRef = useRef(null);
  const [dragEvent, setDragEvent] = useState(null);
  const [dragOriginalEvent, setOriginalDragEvent] = useState(null);

  const handleResize = useCallback(e => {
    // calculate width of each day column
    let newDayWidth = (containerRef.current.clientWidth - 40 - 22) / 7;
    if (newDayWidth < DAY_MIN_WIDTH_PX) newDayWidth = DAY_MIN_WIDTH_PX;
    setDayWidth(newDayWidth);
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [handleResize]);

  const [nowTop, setNowTop] = useState();

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
    unselectText();
    // TODO cancel drag on secondary button click

    const calendarContentRect = calendarContentRef.current.getBoundingClientRect();
    let top = e.clientY - calendarContentRect.top + calendarContentRef.current.scrollTop;
    if (top < 0) top = 0;
    const maxTop = hoursToPixels(maxHour - minHour, pixelsPerHour);
    if (top > maxTop) top = maxTop;
    // TODO adjust top to STEP_SIZE min intervals
    const step = minutesToPixels(STEP_MINUTES, pixelsPerHour);
    top = step * Math.floor(top / step);

    switch (dragContextRef.current.action) {
      case DragAction.CREATE:
        setDragEvent(prev => {
          const eventDay = moment(prev.start).tz(timeZone).startOf('days');
          // only eval Y, do not filter point outside day
          // if event is higher than dragStartRef, then start = event and end = dragStart
          // if event is lower than dragStart, then start = dragStart and end = event
          if (top <= dragContextRef.current.top) {
            return {
              ...prev,
              start: calcDateFromPixels(eventDay.toDate(), timeZone, top, pixelsPerHour),
              end: calcDateFromPixels(eventDay.toDate(), timeZone, dragContextRef.current.top, pixelsPerHour)
            };
          } else {
            return {
              ...prev,
              start: calcDateFromPixels(eventDay.toDate(), timeZone, dragContextRef.current.top, pixelsPerHour),
              end: calcDateFromPixels(eventDay.toDate(), timeZone, top, pixelsPerHour)
            };
          }
        });
        break;
      case DragAction.MOVE:
        setDragEvent(prev => {
          const eventDay = moment(prev.start).tz(timeZone).startOf('days');
          const durationMinutes = moment(prev.end).diff(moment(prev.start), 'minutes');
          const minStart = eventDay.clone().add(minHour, 'hours');
          const maxStart = eventDay.clone().add(maxHour, 'hours').subtract(durationMinutes, 'minutes');
          let newStart = calcDateFromPixels(eventDay.toDate(), timeZone, top - dragContextRef.current.offsetY, pixelsPerHour);
          if (moment(newStart).isBefore(minStart)) {
            newStart = minStart.toDate();
          } else if (moment(newStart).isAfter(maxStart)) {
            newStart = maxStart.toDate();
          }
          let newEnd = moment(newStart).add(durationMinutes, 'minutes').toDate();
          return {
            ...prev,
            start: newStart,
            end: newEnd,
          };
        });
        break;
        case DragAction.CHANGE_START:
          setDragEvent(prev => {
            const eventDay = moment(prev.start).tz(timeZone).startOf('days');
            const minStart = eventDay.clone().add(minHour, 'hours');
            const maxStart = moment(prev.end).subtract(STEP_MINUTES, 'minutes');
            let newStart = calcDateFromPixels(eventDay.toDate(), timeZone, top - dragContextRef.current.offsetY, pixelsPerHour);
            if (moment(newStart).isBefore(minStart)) {
              newStart = minStart.toDate();
            } else if (moment(newStart).isAfter(maxStart)) {
              newStart = maxStart.toDate();
            }
            return {
              ...prev,
              start: newStart
            };
          });
          break;
        case DragAction.CHANGE_END:
          setDragEvent(prev => {
            const eventDay = moment(prev.start).tz(timeZone).startOf('days');
            const minEnd = moment(prev.start).add(STEP_MINUTES, 'minutes');
            const maxEnd = eventDay.clone().add(maxHour, 'hours');
            let newEnd = calcDateFromPixels(eventDay.toDate(), timeZone, top - dragContextRef.current.offsetY, pixelsPerHour);
            if (moment(newEnd).isBefore(minEnd)) {
              newEnd = minEnd.toDate();
            } else if (moment(newEnd).isAfter(maxEnd)) {
              newEnd = maxEnd.toDate();
            }
            return {
              ...prev,
              end: newEnd
            };
          });
          break;
        default:
          break;
    }
  }, [maxHour, minHour, pixelsPerHour, timeZone]);

  const handleMouseDown = useCallback(e => {
    if (e.button !== 0) return;
    if (e.target.onclick) return; // allow clicking on inner elements

    unselectText();

    const calendarContentRect = calendarContentRef.current.getBoundingClientRect();
    const left = e.clientX - calendarContentRect.left - 40;
    let top = e.clientY - calendarContentRect.top + calendarContentRef.current.scrollTop;
    if (left < 0 ||
      left > dayWidth * 7 ||
      top < 0 ||
      top > (maxHour - minHour) * pixelsPerHour) {
      return;
    }

    const day = moment(currentDate).tz(timeZone).startOf('week').add(Math.floor(left / dayWidth), 'days').toDate();

    // if the click is in the bound of an element:
    //    click on top, action: CHANGE_START
    //    click on bottom, action: CHANGE_END
    //    click on middle, action: MOVE
    // if the click is in the bound of an element: CREATE
    // on render, do not render the changing event in the list, but in a special element
    const dateUnderCursor = calcDateFromPixels(day, timeZone, top, pixelsPerHour);
    const eventUnderCursor = events.find(event => !event.allDay && event.start.getTime() <= dateUnderCursor.getTime() && event.end.getTime() >= dateUnderCursor.getTime());
    if (eventUnderCursor) {
      const eventTop = calcTop(eventUnderCursor.start, timeZone, minHour, pixelsPerHour);
      const eventBottom = moment(eventUnderCursor.end).tz(timeZone).isSame(moment(eventUnderCursor.start).tz(timeZone), 'days') ?
        calcTop(eventUnderCursor.end, timeZone, minHour, pixelsPerHour) :
        hoursToPixels(maxHour - minHour, pixelsPerHour);
      let action;
      if (eventBottom - eventTop < 20) {
        if (eventTop < 7) {
          action = DragAction.CHANGE_END;
        } else if ((maxHour - minHour) * pixelsPerHour - eventBottom < 5) {
          action = DragAction.CHANGE_START;
        } else {
          action = DragAction.CHANGE_END;
        }
      } else {
        if (top - eventTop < 5) {
          action = DragAction.CHANGE_START;
        } else if (eventBottom - top <= 5) {
          action = DragAction.CHANGE_END;
        } else {
          action = DragAction.MOVE;
        }
      }
      const offsetY = action === DragAction.CHANGE_END ? top - eventBottom : top - eventTop;

      dragContextRef.current = ({
        action,
        top,
        offsetY
      });
      setDragEvent({
        ...eventUnderCursor
      });
      setOriginalDragEvent(eventUnderCursor);
    } else {
      // adjust top to STEP_MINUTES intervals
      // TODO correct top to make it 5 min not 4, transform into time domain here before calculations
      const step = minutesToPixels(STEP_MINUTES, pixelsPerHour);
      const newTop = step * Math.floor(top / step);
      const newDateUnderCursor = calcDateFromPixels(day, timeZone, newTop, pixelsPerHour);

      dragContextRef.current = ({
        action: DragAction.CREATE,
        top
      });
      setDragEvent({
        start: newDateUnderCursor,
        end: moment(newDateUnderCursor).add(30, 'minutes').toDate(),
        summary: 'new event'
      });
    }

    window.addEventListener('mousemove', handleMouseMove);
  }, [dayWidth, events, maxHour, minHour, pixelsPerHour, currentDate, timeZone, handleMouseMove]);

  const handleMouseUp = useCallback(e => {
    if (e.button !== 0) return;
    window.removeEventListener('mousemove', handleMouseMove);

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
  }, [handleMouseMove, dragOriginalEvent, dragEvent, onCreate, onChange]);

  useEffect(() => {
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseUp]);

  const handleDeleteEventClick = useCallback(event => {
    onDelete && onDelete(event);
  }, [onDelete]);

  const renderedDayEventContainer = useMemo(() => {
    return weekDates(currentDate, timeZone).map(date => {
      const isToday_ = isToday(date, timeZone);
      return (
        <div className='calendar__content__day__event__container'>
          { generateArray(minHour, maxHour).map(hour => (
            <div key={hour} className={`calendar__content__day__slot ${isToday_ ? 'today' : ''}`}
              style={{top: hoursToPixels(hour - minHour, pixelsPerHour), height: hoursToPixels(1, pixelsPerHour)}}/>
          ))}
        </div>
      );
    })
  }, [currentDate, maxHour, minHour, pixelsPerHour, timeZone]);

  const renderedEvents = useMemo(() => {
    return weekDates(currentDate, timeZone).map(date => {
      const startOfDay = moment(date).tz(timeZone).startOf('days');
      return events
        .filter(event => event) // HACK hot reloader throws an error
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
              height: calcHeight(event.start, event.end, timeZone, maxHour, pixelsPerHour)}}
              title={event.summary}
            >
              <div className='calendar__content__day__event__container'>
                <div className='calendar__content__day__event__container__top' />
                <div className='calendar__content__day__event__container__main'>
                  {event.summary}
                </div>
                <div className='calendar__content__day__event__container__bottom' />
              </div>
              <div className='calendar__content__day__event__delete' onClick={() => handleDeleteEventClick(event)}>
                ❌
              </div>
            </div>
        ));
    });
  }, [currentDate, dragOriginalEvent, events, handleDeleteEventClick, maxHour, minHour, pixelsPerHour, timeZone]);

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

        {weekDates(currentDate, timeZone).map((date, index) => {
          const isToday_ = isToday(date, timeZone);

          return (
            <div key={date} className='calendar__content__day'
              style={{width: dayWidth, minWidth: dayWidth, maxWidth: dayWidth, height: hoursToPixels(maxHour - minHour, pixelsPerHour)}}>

              { renderedDayEventContainer[index] }

              <div className='calendar__content__day__event__container'>
                { renderedEvents[index] }
                { dragEvent && moment(dragEvent.start).tz(timeZone).isSame(moment(date).tz(timeZone), 'days') ? (
                  <div className='calendar__content__day__drag-create-event' style={{
                    top: calcTop(dragEvent.start, timeZone, minHour, pixelsPerHour),
                    height: calcHeight(dragEvent.start, dragEvent.end, timeZone, maxHour, pixelsPerHour)
                  }}>
                    {moment(dragEvent.start).tz(timeZone).format('h:mma')} - {moment(dragEvent.end).tz(timeZone).format('h:mma')}<br/>
                    {dragEvent.summary}
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
