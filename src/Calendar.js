import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import moment from 'moment-timezone';
import './Calendar.css';
import {checkCollision, isSameDay, isToday, minutesOfDay, nearestMinutes} from './dateUtils';
import {nearestNumber} from './numberUtils';

export const CalendarType = {
  SPECIFIC: 'SPECIFIC',
  GENERIC: 'GENERIC'
};

export const CalendarView = {
  WEEK: 'WEEK',
  WORK_WEEK: 'WORK_WEEK',
  SINGLE_DAY: 'SINGLE_DAY',
  THREE_DAYS: 'THREE_DAYS'
};

export const EditionMode = {
  NONE: 'NONE',
  EVENTS: 'EVENTS',
  SLOTS: 'SLOTS'
};

const DragAction = {
  CREATE: 'CREATE',
  CHANGE_START: 'CHANGE_START',
  CHANGE_END: 'CHANGE_END',
  MOVE: 'MOVE'
};

const GENERIC_DATE = '2020-01-01T00:00:00Z';

const Calendar = ({
                    calendarType = CalendarType.SPECIFIC,
                    calendarView = CalendarView.WEEK,
                    editionMode = EditionMode.NONE,
                    currentDate,
                    timeZone,

                    /* {[{start: Date, end: Date, summary: string, backgroundColor: string, borderColor: string, foregroundColor: string}]} */
                    events,
                    onCreateEvent,
                    onChangeEvent,
                    onDeleteEvent,
                    defaultEventDurationMinutes = 30,

                    /* {[{start: Date, end: Date}]} */
                    slots,
                    onCreateSlot,
                    onChangeSlot,
                    onDeleteSlot,
                    /* {[{dayOfWeek: number, startMinutes: number, endMinutes: number}]} */
                    weeklyRecurringSlots,
                    onCreateWeeklyRecurringSlot,
                    onChangeWeeklyRecurringSlot,
                    onDeleteWeeklyRecurringSlot,

                    minHour = 0,
                    maxHour = 24,
                    pixelsPerHour = 48,
                    step = 15,
                    minEventDurationMinutes = 15,
                    minEventHeight = 10,
                    scrollbarWidth = 22,
                    dayMinWidth = 60,
                    topHandleHeight = 10,
                    bottomHandleHeight = 10,
                    hoursContainerWidth = 40,
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

  const minutesToPixels = useCallback((minutes) => {
    return pixelsPerHour * minutes / 60;
  }, [pixelsPerHour]);

  const pixelsToMinutes = useCallback((pixels) => {
    return pixels / pixelsPerHour * 60;
  }, [pixelsPerHour]);

  const hoursToPixels = useCallback((hours) => {
    return minutesToPixels(hours * 60);
  }, [minutesToPixels]);

  const calcTop = useCallback((date) => {
    const m = moment(date).tz(timeZone);
    if (m.hours() < minHour) m.hours(minHour);
    const startOfDay = m.clone().startOf('days').add(minHour, 'hours');
    const minutes = m.diff(startOfDay, 'minutes');
    return minutesToPixels(minutes);
  }, [minHour, minutesToPixels, timeZone]);

  const calcHeight = useCallback((start, end) => {
    const startM = moment(start).tz(timeZone);
    let endM = moment(end).tz(timeZone);
    if (!endM.isSame(startM, 'days')) endM = startM.clone().startOf('days').add(1, 'days');
    if (endM.hours() > maxHour) endM.hours(maxHour - 1);
    const minutes = endM.diff(startM, 'minutes');
    return minutesToPixels(minutes);
  }, [maxHour, minutesToPixels, timeZone]);

  const handleResize = useCallback(() => {
    // calculate width of each day column
    // Math.floor(xxx - 1) to prevent round error that make the horizontal scrollbar visible
    setDayWidth(Math.max(
      Math.floor((containerRef.current.clientWidth - hoursContainerWidth - scrollbarWidth - 1) / columnDates.length),
      dayMinWidth
    ));
  }, [columnDates, dayMinWidth, hoursContainerWidth, scrollbarWidth]);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  useEffect(() => {
    const calcNowTop = () => {
      const now = moment().tz(timeZone);
      if (now.hours() < minHour || now.hours() > maxHour) {
        return null;
      } else {
        return calcTop(now.toDate());
      }
    };

    const nowTop = calcNowTop();
    setNowTop(nowTop);
    if (nowTop) {
      calendarContentRef.current.scrollTop = nowTop;
    }

    const intervalHandle = setInterval(() => {
      setNowTop(calcNowTop());
    }, 1000);
    return () => {
      clearInterval(intervalHandle);
    };
  }, [timeZone, minHour, maxHour, calcTop]);

  /**
   * returns true if there's a collision
   * @type {function(*=, *=): (boolean)}
   */
  const checkCollisionLocal = useCallback((newStart, newEnd) => {
    if (!isSameDay(newStart, newEnd, timeZone) && moment(newEnd).tz(timeZone).diff(moment(newEnd).tz(timeZone).startOf('days'), 'minutes') > 0) {
      return true;
    }

    // eslint-disable-next-line default-case
    switch (editionMode) {
      case EditionMode.EVENTS:
        return events && events.filter(event => event !== dragOriginalEvent).some(event => checkCollision(event.start, event.end, newStart, newEnd));
      case EditionMode.SLOTS:
        // eslint-disable-next-line default-case
        switch(calendarType) {
          case CalendarType.SPECIFIC:
            return slots && slots
              .filter(slot => slot !== dragOriginalEvent)
              .some(slot => checkCollision(slot.start, slot.end, newStart, newEnd));
          case CalendarType.GENERIC:
            return weeklyRecurringSlots && weeklyRecurringSlots
              .filter(slot => slot !== dragOriginalEvent)
              .some(slot => {
                const startOfDay = moment(GENERIC_DATE).tz(timeZone).startOf('weeks').add(slot.dayOfWeek, 'days');
                return checkCollision(
                  startOfDay.clone().add(slot.startMinutes, 'minutes').toDate(),
                  startOfDay.clone().add(slot.endMinutes, 'minutes').toDate(),
                  newStart, newEnd);
              });
        }
    }
    return false;
  }, [calendarType, dragOriginalEvent, editionMode, events, slots, timeZone, weeklyRecurringSlots]);

  const handleMouseMove = useCallback(e => {
    if (!dragContextRef.current) return;
    if (!isDragging) return;
    if (e.button !== 0) {
      setDragging(false);
      setDragEvent(null);
      setOriginalDragEvent(null);
      dragContextRef.current = null;
      return;
    }

    const calendarContentRect = calendarContentRef.current.getBoundingClientRect();
    let top = e.clientY - calendarContentRect.top + calendarContentRef.current.scrollTop;
    if (top < 0) top = 0;
    const maxTop = hoursToPixels(maxHour - minHour);
    if (top > maxTop) top = maxTop;
    const left = e.clientX - calendarContentRect.left - hoursContainerWidth;
    if (left < 0 || left > dayWidth * columnDates.length) {
      return;
    }

    const minutesUnderCursor = nearestNumber(minHour * 60 + pixelsToMinutes(top), step);
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
          if (checkCollisionLocal(newStart, newEnd)) {
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
          if (minutesUnderCursor >= maxHour * 60) { // prevent moving to the next day when at the bottom
            eventDay.subtract(1, 'days');
          }
          const durationMinutes = moment(prev.end).diff(moment(prev.start), 'minutes');
          const minStart = eventDay.clone().add(minHour, 'hours');
          const maxStart = eventDay.clone().add(maxHour, 'hours').subtract(durationMinutes, 'minutes');
          let newStart = moment(dateUnderCursor).subtract(dragContextRef.current.offset, 'minutes');
          if (moment(newStart).isBefore(minStart)) {
            newStart = minStart;
          } else if (moment(newStart).isAfter(maxStart)) {
            newStart = maxStart;
          }
          const newEnd = moment(newStart).add(durationMinutes, 'minutes');
          if (checkCollisionLocal(newStart.toDate(), newEnd.toDate())) {
            return prev;
          }
          return {
            ...prev,
            start: newStart.toDate(),
            end: newEnd.toDate()
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
          if (checkCollisionLocal(newStart.toDate(), prev.end)) {
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
          if (checkCollisionLocal(prev.start, newEnd.toDate())) {
            return prev;
          }
          return {
            ...prev,
            end: newEnd.toDate()
          };
        });
        break;
    }
  }, [checkCollisionLocal, columnDates, dayWidth, hoursContainerWidth, hoursToPixels, isDragging, maxHour, minEventDurationMinutes,
    minHour, pixelsToMinutes, step, timeZone]);

  const handleMouseDown = useCallback(e => {
    if ([EditionMode.EVENTS, EditionMode.SLOTS].indexOf(editionMode) < 0) return;
    if (e.button !== 0) {
      setDragging(false);
      setDragEvent(null);
      setOriginalDragEvent(null);
      dragContextRef.current = null;
      return;
    }
    if (e.target.onclick) return; // allow clicking on upper elements
    if (!calendarContentRef.current.contains(e.target)) return; // only fire if clicking on calendar

    const calendarContentRect = calendarContentRef.current.getBoundingClientRect();
    const left = e.clientX - calendarContentRect.left - hoursContainerWidth;
    // discard clicks outside calendarContentRef
    if (e.clientX < calendarContentRect.left ||
      e.clientX > calendarContentRect.right ||
      e.clientY < calendarContentRect.top ||
      e.clientY > calendarContentRect.bottom) {
      return;
    }
    const top = e.clientY - calendarContentRect.top + calendarContentRef.current.scrollTop;
    // discard if outside of calendarContentRect
    if (left < 0 || left > dayWidth * columnDates.length || top < 0 || top > hoursToPixels(maxHour - minHour)) {
      return;
    }

    const minutesUnderCursor = minHour * 60 + pixelsToMinutes(top);
    if (minutesUnderCursor >= maxHour * 60) { // only allow creating events on the same column
      return;
    }
    const dateUnderCursor = columnDates[0].clone().add(Math.floor(left / dayWidth), 'days').add(minutesUnderCursor, 'minutes').toDate();
    const adjustedDateUnderCursor = nearestMinutes(dateUnderCursor, step);


    // eslint-disable-next-line default-case
    switch (editionMode) {
      case EditionMode.EVENTS:
        // if the click is in the bound of an element:
        //    click on top, action: CHANGE_START
        //    click on bottom, action: CHANGE_END
        //    click on middle, action: MOVE
        // if the click is in the border of an element: CREATE
        // on render, do not render the changing event in the list, but in a special element
        if (!events) return;
        const eventUnderCursor = events.find(event =>
          !event.allDay &&
          event.start.getTime() <= dateUnderCursor.getTime() &&
          event.end.getTime() >= dateUnderCursor.getTime());
        if (eventUnderCursor) {
          const eventTop = calcTop(eventUnderCursor.start);
          const eventBottom = moment(eventUnderCursor.end).tz(timeZone).isSame(moment(eventUnderCursor.start).tz(timeZone), 'days') ?
            calcTop(eventUnderCursor.end) :
            hoursToPixels(maxHour - minHour);
          let action;
          if (eventBottom - eventTop < minEventHeight) {
            if (hoursToPixels(maxHour - minHour) - eventBottom < minEventHeight) {
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
            offset: nearestNumber(pixelsToMinutes(action === DragAction.CHANGE_END ? top - eventBottom : top - eventTop), step)
          };
          setDragEvent({
            ...eventUnderCursor
          });
          setOriginalDragEvent(eventUnderCursor);
        } else {
          // do not create events at midnight for tomorrow
          if (minutesUnderCursor > 0 && minutesOfDay(adjustedDateUnderCursor, timeZone) === 0) {
            return;
          }
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
        break;
      case EditionMode.SLOTS:
        // eslint-disable-next-line default-case
        switch (calendarType) {
          case CalendarType.SPECIFIC:
            if (!slots) return;
            const slotUnderCursor = slots.find(slot =>
              slot.start.getTime() <= dateUnderCursor.getTime() &&
              slot.end.getTime() >= dateUnderCursor.getTime());
            if (slotUnderCursor) {
              const slotTop = calcTop(slotUnderCursor.start);
              const slotBottom = moment(slotUnderCursor.end).tz(timeZone).isSame(moment(slotUnderCursor.start).tz(timeZone), 'days') ?
                calcTop(slotUnderCursor.end) :
                hoursToPixels(maxHour - minHour);
              let action;
              if (slotBottom - slotTop < minEventHeight) {
                if (hoursToPixels(maxHour - minHour) - slotBottom < minEventHeight) {
                  action = DragAction.CHANGE_START;
                } else {
                  action = DragAction.CHANGE_END;
                }
              } else {
                if (top - slotTop < topHandleHeight) {
                  action = DragAction.CHANGE_START;
                } else if (slotBottom - top <= bottomHandleHeight) {
                  action = DragAction.CHANGE_END;
                } else {
                  action = DragAction.MOVE;
                }
              }

              // offset is used to make the dragging more natural
              dragContextRef.current = {
                action,
                date: adjustedDateUnderCursor,
                offset: nearestNumber(pixelsToMinutes(action === DragAction.CHANGE_END ? top - slotBottom : top - slotTop), step)
              };
              setDragEvent({
                ...slotUnderCursor
              });
              setOriginalDragEvent(slotUnderCursor);
            } else {
              const newStart = adjustedDateUnderCursor;
              const newEnd = moment(adjustedDateUnderCursor).add(minEventDurationMinutes, 'minutes').toDate();
              if (checkCollisionLocal(newStart, newEnd)) {
                return;
              }
              // do not create events at midnight for tomorrow
              if (minutesUnderCursor > 0 && minutesOfDay(adjustedDateUnderCursor, timeZone) === 0) {
                return;
              }
              dragContextRef.current = {
                action: DragAction.CREATE,
                date: adjustedDateUnderCursor
              };
              setDragEvent({
                start: newStart,
                end: newEnd
              });
            }
            setDragging(true);
            break;
          case CalendarType.GENERIC:
            if (!weeklyRecurringSlots) return;
            const recurringSlotUnderCursor = weeklyRecurringSlots.find(slot =>
              dateUnderCursor.getDay() === slot.dayOfWeek &&
              slot.startMinutes <= minutesUnderCursor &&
              slot.endMinutes >= minutesUnderCursor);
            if (recurringSlotUnderCursor) {
              const startOfDay = moment(GENERIC_DATE).tz(timeZone).startOf('weeks').add(recurringSlotUnderCursor.dayOfWeek, 'days');
              const start = startOfDay.clone().add(recurringSlotUnderCursor.startMinutes, 'minutes');
              const end = startOfDay.clone().add(recurringSlotUnderCursor.endMinutes, 'minutes');
              const slotTop = calcTop(start.toDate());
              const slotBottom = start.isSame(end, 'days') ?
                calcTop(end.toDate()) :
                hoursToPixels(maxHour - minHour);
              let action;
              if (slotBottom - slotTop < minEventHeight) {
                if (hoursToPixels(maxHour - minHour) - slotBottom < minEventHeight) {
                  action = DragAction.CHANGE_START;
                } else {
                  action = DragAction.CHANGE_END;
                }
              } else {
                if (top - slotTop < topHandleHeight) {
                  action = DragAction.CHANGE_START;
                } else if (slotBottom - top <= bottomHandleHeight) {
                  action = DragAction.CHANGE_END;
                } else {
                  action = DragAction.MOVE;
                }
              }

              // offset is used to make the dragging more natural
              dragContextRef.current = {
                action,
                date: adjustedDateUnderCursor,
                offset: nearestNumber(pixelsToMinutes(action === DragAction.CHANGE_END ? top - slotBottom : top - slotTop), step)
              };
              setDragEvent({
                ...recurringSlotUnderCursor,
                start: start.toDate(),
                end: end.toDate()
              });
              setOriginalDragEvent(recurringSlotUnderCursor);
            } else {
              // do not create events at midnight for tomorrow
              if (minutesUnderCursor > 0 && minutesOfDay(adjustedDateUnderCursor, timeZone) === 0) {
                return;
              }
              const newStart = adjustedDateUnderCursor;
              const newEnd = moment(adjustedDateUnderCursor).add(minEventDurationMinutes, 'minutes').toDate();
              if (checkCollisionLocal(newStart, newEnd)) {
                return;
              }
              dragContextRef.current = {
                action: DragAction.CREATE,
                date: adjustedDateUnderCursor
              };
              setDragEvent({
                start: newStart,
                end: newEnd
              });
            }
            setDragging(true);
            break;
        }
        break;
    }
  }, [editionMode, hoursContainerWidth, dayWidth, columnDates, hoursToPixels, maxHour, minHour, pixelsToMinutes, step, events,
    calendarType, calcTop, timeZone, minEventHeight, topHandleHeight, bottomHandleHeight, defaultEventDurationMinutes, slots,
    weeklyRecurringSlots, minEventDurationMinutes, checkCollisionLocal]);

  const handleMouseUp = useCallback(e => {
    if (e.button !== 0) return;
    if (!dragContextRef.current) return;

    if (calendarType === CalendarType.SPECIFIC) {
      if (editionMode === EditionMode.EVENTS) {
        // eslint-disable-next-line default-case
        switch (dragContextRef.current.action) {
          case DragAction.CREATE:
            onCreateEvent && onCreateEvent(dragEvent);
            break;
          case DragAction.CHANGE_START:
          case DragAction.CHANGE_END:
          case DragAction.MOVE:
            onChangeEvent && onChangeEvent(dragOriginalEvent, dragEvent);
            break;
        }
      } else if (editionMode === EditionMode.SLOTS) {
        // eslint-disable-next-line default-case
        switch (dragContextRef.current.action) {
          case DragAction.CREATE:
            onCreateSlot && onCreateSlot(dragEvent);
            break;
          case DragAction.CHANGE_START:
          case DragAction.CHANGE_END:
          case DragAction.MOVE:
            onChangeSlot && onChangeSlot(dragOriginalEvent, dragEvent);
            break;
        }
      }
    } else if (calendarType === CalendarType.GENERIC && editionMode === EditionMode.SLOTS) {
      // eslint-disable-next-line default-case
      switch (dragContextRef.current.action) {
        case DragAction.CREATE:
          onCreateWeeklyRecurringSlot && onCreateWeeklyRecurringSlot({
            dayOfWeek: moment(dragEvent.start).tz(timeZone).weekday(),
            startMinutes: moment(dragEvent.start).tz(timeZone).diff(moment(dragEvent.start).tz(timeZone).startOf('days'), 'minutes'),
            endMinutes: moment(dragEvent.end).tz(timeZone).diff(moment(dragEvent.start).tz(timeZone).startOf('days'), 'minutes')
          });
          break;
        case DragAction.CHANGE_START:
        case DragAction.CHANGE_END:
        case DragAction.MOVE:
          onChangeWeeklyRecurringSlot && onChangeWeeklyRecurringSlot(dragOriginalEvent, {
            ...dragOriginalEvent,
            dayOfWeek: moment(dragEvent.start).tz(timeZone).weekday(),
            startMinutes: moment(dragEvent.start).tz(timeZone).diff(moment(dragEvent.start).tz(timeZone).startOf('days'), 'minutes'),
            endMinutes: moment(dragEvent.end).tz(timeZone).diff(moment(dragEvent.start).tz(timeZone).startOf('days'), 'minutes')
          });
          break;
      }
    }

    setDragging(false);
    setDragEvent(null);
    setOriginalDragEvent(null);
    dragContextRef.current = null;
  }, [timeZone, calendarType, editionMode, dragEvent, dragOriginalEvent, onCreateEvent, onChangeEvent, onCreateSlot, onChangeSlot,
    onCreateWeeklyRecurringSlot, onChangeWeeklyRecurringSlot]);

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
    onDeleteEvent && onDeleteEvent(event);
  }, [onDeleteEvent]);

  const handleDeleteSlotClick = useCallback(slot => {
    onDeleteSlot && onDeleteSlot(slot);
  }, [onDeleteSlot]);

  const handleDeleteWeeklyRecurringSlotClick = useCallback(slot => {
    onDeleteWeeklyRecurringSlot && onDeleteWeeklyRecurringSlot(slot);
  }, [onDeleteWeeklyRecurringSlot]);

  const renderedDayEventContainer = useMemo(() => {
    return columnDates.map(date => {
      return (
        <>
          {Array.from({length: maxHour - minHour}).map((_, i) => minHour + i).map(hour => (
            <div key={hour}
                 className={`calendar__content__day__grid${calendarView !== CalendarView.SINGLE_DAY && isToday(date, timeZone) ? ' today' : ''}`}
                 style={{top: hoursToPixels(hour - minHour), height: hoursToPixels(1)}}/>
          ))}
        </>
      );
    });
  }, [calendarView, columnDates, hoursToPixels, maxHour, minHour, timeZone]);

  const renderedEvents = useMemo(() => {
    return columnDates.map(date => {
      if (!events) return null;
      if (calendarType !== CalendarType.SPECIFIC) return null;
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
            top: calcTop(event.start),
            height: calcHeight(event.start, event.end),
            pointerEvents: editionMode !== EditionMode.EVENTS ? 'none' : 'auto'
          }} title={event.summary}
          >
            {editionMode === EditionMode.EVENTS ? (<>
              <div style={{height: topHandleHeight, cursor: 'n-resize'}}/>
              <div style={{flex: 1, cursor: 'move'}}>
                {moment(event.start).tz(timeZone).format('h:mma')} - {moment(event.end).tz(timeZone).format('h:mma')}<br/>
                {event.summary}
              </div>
              <div style={{height: bottomHandleHeight, cursor: 's-resize'}}/>
              <div onClick={() => handleDeleteEventClick(event)}
                   style={{position: 'absolute', top: 0, right: 0, cursor: 'pointer'}}>
                ❌
              </div>
            </>) : (
              <div style={{flex: 1}}>
                {moment(event.start).tz(timeZone).format('h:mma')} - {moment(event.end).tz(timeZone).format('h:mma')}<br/>
                {event.summary}
              </div>
            )}
          </div>
        ));
    });
  }, [bottomHandleHeight, calcHeight, calcTop, calendarType, editionMode, columnDates, dragOriginalEvent, events, handleDeleteEventClick,
    maxHour, timeZone, topHandleHeight]);

  const renderedSlots = useMemo(() => {
    switch (calendarType) {
      case CalendarType.GENERIC:
        // use weekly recurring slots
        return columnDates.map(date => {
          if (!weeklyRecurringSlots) return null;
          // date is GENERIC_DATE
          const startOfDay = moment(date).tz(timeZone).startOf('days');
          return weeklyRecurringSlots
            .filter(slot => slot) // HACK hot-reloader throws an error
            .filter(slot => !dragOriginalEvent || slot !== dragOriginalEvent) // do not render slot being dragged
            .filter(slot => startOfDay.weekday() === slot.dayOfWeek)
            .filter(slot => startOfDay.clone().add(slot.startMinutes, 'minutes').hours() <= maxHour)
            .map((slot, index) => (
              <div key={index} className='calendar__content__day__slot' style={{
                top: calcTop(startOfDay.clone().add(slot.startMinutes, 'minutes')),
                height: calcHeight(startOfDay.clone().add(slot.startMinutes, 'minutes'), startOfDay.clone().add(slot.endMinutes, 'minutes')),
                pointerEvents: editionMode !== EditionMode.SLOTS ? 'none' : 'auto'
              }}>
                {editionMode === EditionMode.SLOTS ? (<>
                  <div style={{height: topHandleHeight, cursor: 'n-resize'}}/>
                  <div style={{flex: 1, cursor: 'move'}}>
                    {startOfDay.clone().add(slot.startMinutes, 'minutes').format('h:mma')}
                    &nbsp;-&nbsp;
                    {startOfDay.clone().add(slot.endMinutes, 'minutes').format('h:mma')}
                  </div>
                  <div style={{height: bottomHandleHeight, cursor: 's-resize'}}/>
                  <div onClick={() => handleDeleteWeeklyRecurringSlotClick(slot)}
                       style={{position: 'absolute', top: 0, right: 0, cursor: 'pointer'}}>
                    ❌
                  </div>
                </>) : (
                  <div style={{flex: 1}}>
                    {startOfDay.clone().add(slot.startMinutes, 'minutes').format('h:mma')}
                    &nbsp;-&nbsp;
                    {startOfDay.clone().add(slot.endMinutes, 'minutes').format('h:mma')}
                  </div>
                )}
              </div>
            ));
        });
      case CalendarType.SPECIFIC:
      default:
        // use weekly recurring slots
        return columnDates.map(date => {
          if (!slots) return null;
          const startOfDay = moment(date).tz(timeZone).startOf('days');
          return slots
            .filter(slot => slot) // HACK hot-reloader throws an error
            .filter(slot => !dragOriginalEvent || slot !== dragOriginalEvent) // do not render slot being dragged
            .filter(slot => startOfDay.isSame(moment(slot.start).tz(timeZone), 'days'))
            .filter(slot => moment(slot.start).tz(timeZone).hours() <= maxHour)
            .filter(slot =>
              !moment(slot.start).tz(timeZone).isSame(moment(slot.end).tz(timeZone), 'days') ||
              moment(slot.start).tz(timeZone).hours() <= maxHour)
            .map((slot, index) => (
              <div key={index} className='calendar__content__day__slot' style={{
                top: calcTop(slot.start),
                height: calcHeight(slot.start, slot.end),
                pointerEvents: editionMode !== EditionMode.SLOTS ? 'none' : 'auto'
              }}>
                {editionMode === EditionMode.SLOTS ? (<>
                  <div style={{height: topHandleHeight, cursor: 'n-resize'}}/>
                  <div style={{flex: 1, cursor: 'move'}}>
                    {moment(slot.start).tz(timeZone).format('h:mma')} - {moment(slot.end).tz(timeZone).format('h:mma')}
                  </div>
                  <div style={{height: bottomHandleHeight, cursor: 's-resize'}}/>
                  <div onClick={() => handleDeleteSlotClick(slot)}
                       style={{position: 'absolute', top: 0, right: 0, cursor: 'pointer'}}>
                    ❌
                  </div>
                </>) : (
                  <div style={{flex: 1}}>
                    {moment(slot.start).tz(timeZone).format('h:mma')} - {moment(slot.end).tz(timeZone).format('h:mma')}
                  </div>
                )}
              </div>
            ));
        });
    }
  }, [bottomHandleHeight, calcHeight, calcTop, calendarType, columnDates, dragOriginalEvent, editionMode, handleDeleteSlotClick,
    handleDeleteWeeklyRecurringSlotClick, maxHour, slots, timeZone, topHandleHeight, weeklyRecurringSlots]);

  return (
    <div className={`calendar__container ${className || ''}`} style={style} ref={containerRef}>

      <div className='calendar__header'>
        <div className='calendar__header__left-spacer'
             style={{width: hoursContainerWidth, minWidth: hoursContainerWidth}}/>
        {columnDates.map(date => (
          <div key={date} style={{width: dayWidth, minWidth: dayWidth, maxWidth: dayWidth}}>
            {calendarType === CalendarType.SPECIFIC ? (<>
              <span style={{textAlign: 'center'}}>{moment(date).tz(timeZone).format('ddd D')}</span>
              {events && events
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
            ) : null}
          </div>
        ))}
        <div style={{width: scrollbarWidth, minWidth: scrollbarWidth}}/>
      </div>

      <div className='calendar__content' ref={calendarContentRef}>
        <div className='calendar__content__hours__container' style={{
          height: hoursToPixels(maxHour - minHour),
          width: hoursContainerWidth,
          minWidth: hoursContainerWidth
        }}>
          {Array.from({length: maxHour - minHour + 1}).map((_, i) => minHour + i).map((/* number */ hour) => (
            // 6 is the height of calendar__content__hour last item
            <div key={hour} className='calendar__content__hour' style={{height: hour < 24 ? hoursToPixels(1) : 6}}>
              {`${moment(currentDate).tz(timeZone).startOf('weeks').add(hour, 'hours').format('ha')}`}
            </div>
          ))}
        </div>

        {columnDates.map((date, index) => (
          <div key={date} className='calendar__content__day'
               style={{
                 width: dayWidth,
                 minWidth: dayWidth,
                 maxWidth: dayWidth,
                 height: hoursToPixels(maxHour - minHour)
               }}>

            {renderedDayEventContainer[index]}

            {renderedSlots[index]}
            {renderedEvents[index]}

            {/* events */}
            {isDragging && editionMode === EditionMode.EVENTS &&
            dragEvent && isSameDay(dragEvent.start, date, timeZone) && (
              <div className='calendar__content__day__event__dragging' style={{
                top: calcTop(dragEvent.start),
                height: calcHeight(dragEvent.start, dragEvent.end)
              }}>
                {moment(dragEvent.start).tz(timeZone).format('h:mma')} - {moment(dragEvent.end).tz(timeZone).format('h:mma')}<br/>
                {dragEvent.summary}
              </div>
            )}

            {/* specific slots */}
            {isDragging && editionMode === EditionMode.SLOTS &&
            dragEvent && isSameDay(dragEvent.start, date, timeZone) && (
              <div className='calendar__content__day__slot__dragging' style={{
                top: calcTop(dragEvent.start),
                height: calcHeight(dragEvent.start, dragEvent.end)
              }}>
                {moment(dragEvent.start).tz(timeZone).format('h:mma')} - {moment(dragEvent.end).tz(timeZone).format('h:mma')}<br/>
              </div>
            )}

            {isToday(date, timeZone) && nowTop ? (<>
              <div className='calendar__content__day__current-time' style={{top: nowTop}}/>
            </>) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;
