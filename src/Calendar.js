import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import moment from 'moment-timezone';
import './_calendar.scss';
import {checkCollision, isSameDay, isToday} from './dateUtils';
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
  NONE: 'NONE',
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
                    defaultDurationMinutes = 30,
                    minEventDurationMinutes = 15,
                    minEventHeight = 10,
                    scrollbarWidth = 22,
                    dayMinWidth = 60,
                    topHandleHeight = 10,
                    bottomHandleHeight = 10,
                    hoursContainerWidth = 40,
                    className,
                    style,
                    DayHeaderTemplate,
                    AllDayEventTemplate,
                    EventTemplate,
                    defaultEventColor = '#05283A',
                    defaultEventBgColor = '#DBF1FE',
                    defaultEventBorderColor = '#4ABAF9',
                    slotColor = '#05283A',
                    slotBgColor = '#FF99CD',
                    slotBorderColor = '#D3066E'
                  }) => {

  const columnDates = useMemo(() => {
    if (calendarType === CalendarType.GENERIC) {
      switch (calendarView) {
        case CalendarView.SINGLE_DAY:
          return [moment(GENERIC_DATE).tz(timeZone).startOf('days')];
        case CalendarView.WORK_WEEK:
          return Array.from({ length: 5 })
              .map((_, i) => moment(GENERIC_DATE).tz(timeZone).startOf('weeks').add(i + 1, 'days'));
        case CalendarView.WEEK:
        default:
          return Array.from({ length: 7 })
              .map((_, i) => moment(GENERIC_DATE).tz(timeZone).startOf('weeks').add(i, 'days'));
      }
    } else {
      switch (calendarView) {
        case CalendarView.SINGLE_DAY:
          return [moment(currentDate).tz(timeZone).startOf('days')];
        case CalendarView.THREE_DAYS:
          return Array.from({ length: 3 })
              .map((_, i) => moment(currentDate).tz(timeZone).startOf('days').add(i, 'days'));
        case CalendarView.WORK_WEEK:
          return Array.from({ length: 5 })
              .map((_, i) => moment(currentDate).tz(timeZone).startOf('weeks').add(i + 1, 'days'));
        case CalendarView.WEEK:
        default:
          return Array.from({ length: 7 })
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

  /**
   *
   * @type {React.MutableRefObject<{action: string|DragAction, date: Date|undefined, offset: number|undefined}>}
   */
  const dragContextRef = useRef({ action: DragAction.NONE });

  const [dragIndicator, setDragIndicator] = useState(null);
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

  const findOverlapping = useCallback((start, end) => {
    switch (editionMode) {
      case EditionMode.EVENTS:
        return events && events.filter(event => event !== dragOriginalEvent).filter(event => checkCollision(event.start, event.end, start, end));
      case EditionMode.SLOTS:
        switch (calendarType) {
          case CalendarType.SPECIFIC:
            return slots && slots
                .filter(slot => slot !== dragOriginalEvent)
                .filter(slot => checkCollision(slot.start, slot.end, start, end));
          case CalendarType.GENERIC:
            return weeklyRecurringSlots && weeklyRecurringSlots
                .filter(slot => slot !== dragOriginalEvent)
                .filter(slot => {
                  const startOfDay = moment(GENERIC_DATE).tz(timeZone).startOf('weeks').add(slot.dayOfWeek, 'days');
                  return checkCollision(
                      startOfDay.clone().add(slot.startMinutes, 'minutes').toDate(),
                      startOfDay.clone().add(slot.endMinutes, 'minutes').toDate(),
                      start,
                      end);
                });
          default:
            return [];
        }
      default:
        return [];
    }
  }, [calendarType, dragOriginalEvent, editionMode, events, slots, timeZone, weeklyRecurringSlots]);

  /**
   * returns true if there's a collision
   * @type {function(*=, *=): (boolean)}
   */
  const doesOverlap = useCallback((start, end) => {
    return findOverlapping(start, end).length > 0;
  }, [findOverlapping]);

  const findEventAtDate = useCallback((date) => {
    return events.find(event =>
        !event.allDay &&
        event.start.getTime() <= date.getTime() &&
        event.end.getTime() >= date.getTime());
  }, [events]);

  const findSlotAtDate = useCallback((date) => {
    return slots.find(slot =>
        slot.start.getTime() <= date.getTime() &&
        slot.end.getTime() >= date.getTime()
    );
  }, [slots]);

  const findRecurringSlotAtDate = useCallback((date) => {
    const startOfDay = moment(date).tz(timeZone).startOf('days');
    return weeklyRecurringSlots.find(slot => {
      if (startOfDay.weekday() !== slot.dayOfWeek) return false;
      const slotStart = startOfDay.clone().add(slot.startMinutes, 'minutes').toDate();
      const slotEnd = startOfDay.clone().add(slot.endMinutes, 'minutes').toDate();
      return slotStart.getTime() <= date.getTime() && slotEnd.getTime() >= date.getTime();
    });
  }, [timeZone, weeklyRecurringSlots]);

  const someEventOrSlotAtDate = useCallback((date) => {
    return ((editionMode === EditionMode.SLOTS && (
        (calendarType === CalendarType.SPECIFIC && findSlotAtDate(date)) ||
        (calendarType === CalendarType.GENERIC && findRecurringSlotAtDate(date))
    )) || (
        editionMode === EditionMode.EVENTS && findEventAtDate(date)
    ));
  }, [calendarType, editionMode, findEventAtDate, findRecurringSlotAtDate, findSlotAtDate]);

  const handleMouseMove = useCallback(e => {
    if (e.button !== 0) return;
    if ([EditionMode.EVENTS, EditionMode.SLOTS].indexOf(editionMode) < 0) return;

    const calendarContentRect = calendarContentRef.current.getBoundingClientRect();
    let isOutsideCalendarContent = false;
    let top = e.clientY - calendarContentRect.top + calendarContentRef.current.scrollTop;
    if (top < 0) {
      top = 0;
      isOutsideCalendarContent = true;
    }
    const maxTop = hoursToPixels(maxHour - minHour);
    if (top > maxTop) {
      top = maxTop;
      isOutsideCalendarContent = true;
    }
    const left = e.clientX - calendarContentRect.left - hoursContainerWidth;
    if (left < 0 || left > dayWidth * columnDates.length) {
      isOutsideCalendarContent = true;
    }

    const columnDate = columnDates[0].clone().add(Math.floor(left / dayWidth), 'days').startOf('days');
    const dateUnderCursor = columnDate.clone().add(minHour * 60 + pixelsToMinutes(top), 'minutes');
    const adjustedMinutesUnderCursor = nearestNumber(minHour * 60 + pixelsToMinutes(top), step);
    const adjustedDateUnderCursor = columnDate.clone().add(adjustedMinutesUnderCursor, 'minutes');
    const refDate = moment(dragContextRef.current.date).tz(timeZone);

    switch (dragContextRef.current.action) {
      case DragAction.CREATE: {
        setDragEvent(prev => {
          // if point is higher than refDate (moving up), then start = point and end = refDate + offset
          // if point is lower than refDate (moving down), then start = refDate and end = point
          const point = moment(prev.start).tz(timeZone).startOf('days').add(adjustedMinutesUnderCursor, 'minutes');
          const [newStart, newEnd] = point.isBefore(refDate) ?
              [point.clone(), refDate.clone().add(dragContextRef.current.offset, 'minutes')] :
              [refDate.clone(), point.clone()];
          if (newEnd.diff(newStart, 'minutes') < minEventDurationMinutes) {
            return prev;
          }
          if (doesOverlap(newStart.toDate(), newEnd.toDate())) {
            return prev;
          }
          return {
            ...prev,
            start: newStart.toDate(),
            end: newEnd.toDate()
          };
        });
        break;
      }
      case DragAction.MOVE:
        if (isOutsideCalendarContent) return;
        setDragEvent(prev => {
          const durationMinutes = moment(prev.end).diff(moment(prev.start), 'minutes');
          const minStart = columnDate.clone().add(minHour, 'hours');
          const maxStart = columnDate.clone().add(maxHour, 'hours').subtract(durationMinutes, 'minutes');
          let newStart = moment(adjustedDateUnderCursor).subtract(dragContextRef.current.offset, 'minutes');
          if (moment(newStart).isBefore(minStart)) {
            newStart = minStart;
          } else if (moment(newStart).isAfter(maxStart)) {
            newStart = maxStart;
          }
          const newEnd = moment(newStart).add(durationMinutes, 'minutes');
          if (doesOverlap(newStart.toDate(), newEnd.toDate())) {
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
          let newStart = eventDay.clone().add(adjustedMinutesUnderCursor, 'minutes').subtract(dragContextRef.current.offset, 'minutes');
          if (moment(newStart).isBefore(minStart)) {
            newStart = minStart;
          } else if (moment(newStart).isAfter(maxStart)) {
            newStart = maxStart;
          }
          if (moment(prev.end).diff(newStart, 'minutes') < minEventDurationMinutes) {
            return prev;
          }
          if (doesOverlap(newStart.toDate(), prev.end)) {
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
          let newEnd = eventDay.clone().add(adjustedMinutesUnderCursor, 'minutes').subtract(dragContextRef.current.offset, 'minutes');
          if (newEnd.isBefore(minEnd)) {
            newEnd = minEnd;
          } else if (newEnd.isAfter(maxEnd)) {
            newEnd = maxEnd;
          }
          if (moment(newEnd).diff(prev.start, 'minutes') < minEventDurationMinutes) {
            return prev;
          }
          if (doesOverlap(prev.start, newEnd.toDate())) {
            return prev;
          }
          return {
            ...prev,
            end: newEnd.toDate()
          };
        });
        break;
      case DragAction.NONE: // show drag indicator
      default:
        if (isOutsideCalendarContent) {
          setDragIndicator(null);
          return;
        }
        // if there's an event or slot under the mouse, do not show drag indicator
        if (someEventOrSlotAtDate(dateUnderCursor.toDate())) {
          setDragIndicator(null);
          return;
        }
        if (calendarType === CalendarType.GENERIC && editionMode === EditionMode.EVENTS) return;

        const start = adjustedDateUnderCursor.clone();
        const end = adjustedDateUnderCursor.clone().add(defaultDurationMinutes, 'minutes');
        const overlapped = findOverlapping(start.toDate(), end.toDate());
        if (overlapped.length > 0) {
          // if we are colliding with a slot/event, try to move up check if it fits
          let min;
          if (calendarType === CalendarType.GENERIC) {
            min = columnDate.clone().add(Math.min(...overlapped.map(slot => slot.startMinutes)), 'minutes');
          } else {
            min = moment(Math.min(...overlapped.map(event => event.start.getTime()))).tz(timeZone);
          }
          min.subtract(defaultDurationMinutes, 'minutes');
          if (Math.abs(min.diff(adjustedDateUnderCursor, 'minutes')) <= defaultDurationMinutes) {
            // check again if it fits with the new start
            const newStart = min.clone();
            const newEnd = min.clone().add(defaultDurationMinutes, 'minutes');
            if (doesOverlap(newStart.toDate(), newEnd.toDate())) return;
            setDragIndicator({
              start: newStart.toDate(),
              end: newEnd.toDate()
            });
          }
          return;
        }
        // do not let indicator past midnight
        if (adjustedMinutesUnderCursor >= maxHour * 60 - defaultDurationMinutes) {
          const newStart = columnDate.clone().add(maxHour * 60 - defaultDurationMinutes, 'minutes');
          const newEnd = columnDate.clone().add(maxHour * 60, 'minutes');
          if (doesOverlap(newStart.toDate(), newEnd.toDate())) return;
          setDragIndicator({
            start: newStart.toDate(),
            end: newEnd.toDate()
          });
          return;
        }

        setDragIndicator({
          start: start.toDate(),
          end: end.toDate()
        });
        break;
    }
  }, [
    hoursToPixels, maxHour, minHour, hoursContainerWidth, dayWidth, columnDates, pixelsToMinutes, step, editionMode,
    defaultDurationMinutes, doesOverlap, timeZone, minEventDurationMinutes, calendarType, findOverlapping, someEventOrSlotAtDate
  ]);

  const handleMouseDown = useCallback(e => {
    if ([EditionMode.EVENTS, EditionMode.SLOTS].indexOf(editionMode) < 0) return;
    if (e.button !== 0) return;
    if (e.target.onclick) return; // allow clicking on top most elements
    if (!calendarContentRef.current.contains(e.target)) return; // only fire if clicking on calendar or descendant

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

    const columnDate = columnDates[0].clone().add(Math.floor(left / dayWidth), 'days').startOf('days');
    const minutesUnderCursor = Math.min(minHour * 60 + pixelsToMinutes(top), maxHour * 60);
    const adjustedMinutesUnderCursor = nearestNumber(minutesUnderCursor, step);
    const dateUnderCursor = columnDate.clone().add(minutesUnderCursor, 'minutes');
    const adjustedDateUnderCursor = columnDate.clone().add(adjustedMinutesUnderCursor, 'minutes');

    /**
     * if the click is in the bound of an element:
     *   click on top, action: CHANGE_START
     *   click on bottom, action: CHANGE_END
     *   click on middle, action: MOVE
     * if the click is in the border of an element: CREATE
     * @param eventOrSlotTop
     * @param eventOrSlotBottom
     * @return {string|DragAction}
     */
    const calculateAction = (eventOrSlotTop, eventOrSlotBottom) => {
      if (eventOrSlotBottom - eventOrSlotTop < minEventHeight) {
        if (hoursToPixels(maxHour - minHour) - eventOrSlotBottom < minEventHeight) {
          return DragAction.CHANGE_START;
        } else {
          return DragAction.CHANGE_END;
        }
      } else {
        if (top - eventOrSlotTop < topHandleHeight) {
          return DragAction.CHANGE_START;
        } else if (eventOrSlotBottom - top <= bottomHandleHeight) {
          return DragAction.CHANGE_END;
        } else {
          return DragAction.MOVE;
        }
      }
    };

    const startDraggingSpecificEventOrSlot = (eventOrSlotUnderCursor) => {
      const eventOrSlotTop = calcTop(eventOrSlotUnderCursor.start);
      const eventOrSlotBottom = moment(eventOrSlotUnderCursor.end).tz(timeZone).isSame(moment(eventOrSlotUnderCursor.start).tz(timeZone), 'days') ?
          calcTop(eventOrSlotUnderCursor.end) :
          hoursToPixels(maxHour - minHour);
      const action = calculateAction(eventOrSlotTop, eventOrSlotBottom);
      // offset is used to make the dragging more natural, if you start from the middle, use the middle as a reference to move the event
      dragContextRef.current = {
        action,
        date: adjustedDateUnderCursor.toDate(),
        offset: nearestNumber(pixelsToMinutes(action === DragAction.CHANGE_END ? top - eventOrSlotBottom : top - eventOrSlotTop), step)
      };
      setDragEvent({
        ...eventOrSlotUnderCursor
      });
      setOriginalDragEvent(eventOrSlotUnderCursor);
    };

    const startDraggingRecurringSlot = (recurringSlotUnderCursor) => {
      const start = columnDate.clone().add(recurringSlotUnderCursor.startMinutes, 'minutes');
      const end = columnDate.clone().add(recurringSlotUnderCursor.endMinutes, 'minutes');
      const slotTop = calcTop(start.toDate());
      const slotBottom = start.isSame(end, 'days') ?
          calcTop(end.toDate()) :
          hoursToPixels(maxHour - minHour);
      const action = calculateAction(slotTop, slotBottom);

      // offset is used to make the dragging more natural
      dragContextRef.current = {
        action,
        date: adjustedDateUnderCursor.toDate(),
        offset: nearestNumber(pixelsToMinutes(action === DragAction.CHANGE_END ? top - slotBottom : top - slotTop), step)
      };
      setDragEvent({
        ...recurringSlotUnderCursor,
        start: start.toDate(),
        end: end.toDate()
      });
      setOriginalDragEvent(recurringSlotUnderCursor);
    };

    const startDragCreatingEventOrSlot = () => {
      const start = adjustedDateUnderCursor.toDate();
      const end = adjustedDateUnderCursor.clone().add(defaultDurationMinutes, 'minutes').toDate();
      const overlapped = findOverlapping(start, end);
      if (overlapped.length > 0) {
        // if we are colliding with a slot/event, try to move up check if it fits
        let min;
        if (calendarType === CalendarType.GENERIC) {
          min = columnDate.clone()
              .add(Math.min(...overlapped.map(slot => slot.startMinutes)), 'minutes')
              .subtract(defaultDurationMinutes, 'minutes');
        } else {
          min = moment(Math.min(...overlapped.map(event => event.start.getTime()))).tz(timeZone)
              .subtract(defaultDurationMinutes, 'minutes');
        }
        if (Math.abs(min.diff(adjustedDateUnderCursor, 'minutes')) <= defaultDurationMinutes) {
          // check again if it fits with the new start
          const newStart = min.clone();
          const newEnd = min.clone().add(defaultDurationMinutes, 'minutes');
          if (doesOverlap(newStart.toDate(), newEnd.toDate())) return;
          dragContextRef.current = {
            action: DragAction.CREATE,
            date: newStart.toDate(),
            offset: newEnd.diff(newStart, 'minutes')
          };
          setDragEvent({
            start: newStart.toDate(),
            end: newEnd.toDate()
          });
        }
        return;
      }
      // do not let indicator past midnight
      if (adjustedMinutesUnderCursor >= maxHour * 60 - defaultDurationMinutes) {
        const newStart = columnDate.clone().add(maxHour * 60 - defaultDurationMinutes, 'minutes');
        const newEnd = columnDate.clone().add(maxHour * 60, 'minutes');
        if (doesOverlap(newStart.toDate(), newEnd.toDate())) return;
        dragContextRef.current = {
          action: DragAction.CREATE,
          date: newStart.toDate(),
          offset: newEnd.diff(newStart, 'minutes')
        };
        setDragEvent({
          start: newStart.toDate(),
          end: newEnd.toDate()
        });
        return;
      }

      dragContextRef.current = {
        action: DragAction.CREATE,
        date: adjustedDateUnderCursor.toDate(),
        offset: moment(end).diff(moment(start), 'minutes')
      };
      setDragEvent({
        start: start,
        end: end
      });
    };

    switch (editionMode) {
      case EditionMode.EVENTS:
        if (calendarType !== CalendarType.SPECIFIC) return;
        if (!events) return;
        const eventUnderCursor = findEventAtDate(dateUnderCursor.toDate());
        if (eventUnderCursor) {
          startDraggingSpecificEventOrSlot(eventUnderCursor);
          return;
        }
        startDragCreatingEventOrSlot();
        return;
      case EditionMode.SLOTS:
        switch (calendarType) {
          case CalendarType.SPECIFIC:
            if (!slots) return;
            const slotUnderCursor = findSlotAtDate(dateUnderCursor.toDate());
            if (slotUnderCursor) {
              startDraggingSpecificEventOrSlot(slotUnderCursor);
              return;
            }
            startDragCreatingEventOrSlot();
            return;
          case CalendarType.GENERIC:
            if (!weeklyRecurringSlots) return;
            const recurringSlotUnderCursor = findRecurringSlotAtDate(dateUnderCursor.toDate());
            if (recurringSlotUnderCursor) {
              startDraggingRecurringSlot(recurringSlotUnderCursor);
              return;
            }
            startDragCreatingEventOrSlot();
            return;
          default:
            return;
        }
      default:
        return;
    }
  }, [
    editionMode, hoursContainerWidth, dayWidth, columnDates, hoursToPixels, maxHour, minHour, pixelsToMinutes, step, events,
    calendarType, calcTop, timeZone, minEventHeight, topHandleHeight, bottomHandleHeight, defaultDurationMinutes, slots,
    weeklyRecurringSlots, doesOverlap, findEventAtDate, findSlotAtDate, findRecurringSlotAtDate, findOverlapping
  ]);

  const handleMouseUp = useCallback(e => {
    if (e.button !== 0) return;
    if ([EditionMode.EVENTS, EditionMode.SLOTS].indexOf(editionMode) < 0) return;
    if (dragContextRef.current.action === DragAction.NONE) return;

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

    setDragEvent(null);
    setOriginalDragEvent(null);
    dragContextRef.current = { action: DragAction.NONE };
  }, [
    timeZone, calendarType, editionMode, dragEvent, dragOriginalEvent, onCreateEvent, onChangeEvent, onCreateSlot, onChangeSlot,
    onCreateWeeklyRecurringSlot, onChangeWeeklyRecurringSlot
  ]);

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
            {Array.from({ length: maxHour - minHour }).map((_, i) => minHour + i).map(hour => (
                <div key={hour}
                     className={`grid ${calendarView !== CalendarView.SINGLE_DAY && isToday(date, timeZone) ? 'today' : ''}`}
                     style={{ top: hoursToPixels(hour - minHour), height: hoursToPixels(1) }}/>
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
          .map((event, index) => {
            const doesOverlap_ = slots && slots.some(slot => checkCollision(slot.start, slot.end, event.start, event.end));
            return (
              <div key={index} className='event' title={event.summary}
                   style={{
                     top: calcTop(event.start),
                     height: calcHeight(event.start, event.end),
                     color: event.color || defaultEventColor,
                     backgroundColor: event.bgColor || defaultEventBgColor,
                     borderLeft: `4px solid ${event.borderColor || defaultEventBorderColor}`,
                     opacity: editionMode === EditionMode.EVENTS ? 1 : .75,
                     right: doesOverlap_ ? 40 : 0,
                     zIndex: editionMode === EditionMode.EVENTS ? 400 : 1,
                     pointerEvents: editionMode !== EditionMode.EVENTS ? 'none' : 'auto'
                   }}
              >
                {editionMode === EditionMode.EVENTS ? (<>
                  <div style={{height: topHandleHeight, cursor: 'n-resize'}}/>
                  <div style={{flex: 1, cursor: 'move'}}>
                    {EventTemplate ? (
                      <EventTemplate event={event} date={date} timeZone={timeZone} />
                    ) : (
                      <>
                        {moment(event.start).tz(timeZone).format('h:mma')} - {moment(event.end).tz(timeZone).format('h:mma')}<br/>
                        {event.summary}
                      </>
                    )}
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
            )
          });
    });
  }, [
    bottomHandleHeight, calcHeight, calcTop, calendarType, editionMode, columnDates, dragOriginalEvent, events, handleDeleteEventClick,
    maxHour, timeZone, topHandleHeight, defaultEventColor, defaultEventBgColor, defaultEventBorderColor, slots, EventTemplate
  ]);

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
                  <div key={index} className='slot' style={{
                    top: calcTop(startOfDay.clone().add(slot.startMinutes, 'minutes')),
                    height: calcHeight(startOfDay.clone().add(slot.startMinutes, 'minutes'), startOfDay.clone().add(slot.endMinutes, 'minutes')),
                    color: slotColor,
                    backgroundColor: slotBgColor,
                    borderLeft: `4px solid ${slotBorderColor}`,
                    left: 0,
                    right: 0,
                    pointerEvents: editionMode !== EditionMode.SLOTS ? 'none' : 'auto'
                  }}>
                    {editionMode === EditionMode.SLOTS ? (<>
                      <div style={{ height: topHandleHeight, cursor: 'n-resize' }}/>
                      <div style={{ flex: 1, cursor: 'move' }}>
                        {startOfDay.clone().add(slot.startMinutes, 'minutes').format('h:mma')}
                        &nbsp;-&nbsp;
                        {startOfDay.clone().add(slot.endMinutes, 'minutes').format('h:mma')}
                      </div>
                      <div style={{ height: bottomHandleHeight, cursor: 's-resize' }}/>
                      <div onClick={() => handleDeleteWeeklyRecurringSlotClick(slot)}
                           style={{ position: 'absolute', top: 0, right: 0, cursor: 'pointer' }}>
                        ❌
                      </div>
                    </>) : (
                        <div style={{ flex: 1 }}>
                          {startOfDay.clone().add(slot.startMinutes, 'minutes').format('h:mma')}
                          &nbsp;-
                          &nbsp;{startOfDay.clone().add(slot.endMinutes, 'minutes').format('h:mma')}
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
              .map((slot, index) => {
                const doesOverlap_ = events && events.some(event => checkCollision(event.start, event.end, slot.start, slot.end));
                return (
                  <div key={index} className='slot' style={{
                    top: calcTop(slot.start),
                    height: calcHeight(slot.start, slot.end),
                    color: slotColor,
                    backgroundColor: slotBgColor,
                    borderRight: `4px solid ${slotBorderColor}`,
                    opacity: editionMode === EditionMode.SLOTS ? 1 : .75,
                    left: doesOverlap_ ? 40 : 0,
                    zIndex: editionMode === EditionMode.SLOTS ? 400 : 1,
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
                );
              });
        });
    }
  }, [
    bottomHandleHeight, calcHeight, calcTop, calendarType, columnDates, dragOriginalEvent, editionMode, handleDeleteSlotClick,
    handleDeleteWeeklyRecurringSlotClick, maxHour, slots, timeZone, topHandleHeight, weeklyRecurringSlots,
    slotColor, slotBgColor, slotBorderColor, events
  ]);

  const renderedDayHeaders = useMemo(() =>
    columnDates.map((date) => {
      const startOfDay = moment(date).tz(timeZone).startOf('days');
      const eventsOfTheDay = !events ? [] : events
          .filter(event => event) // HACK hot reloader throws an error
          .filter(event => startOfDay.isSame(moment(event.start).tz(timeZone), 'days'));
      const slotsOfTheDay = !slots ? [] : slots
        .filter(slot => slot) // HACK hot reloader throws an error
        .filter(slot => startOfDay.isSame(moment(slot.start).tz(timeZone), 'days'));

      return (
        <div key={date} style={{width: dayWidth, minWidth: dayWidth, maxWidth: dayWidth}}>
          {calendarType === CalendarType.SPECIFIC ? (<>
            {DayHeaderTemplate ? (
              <DayHeaderTemplate key={date} date={date} timeZone={timeZone} events={eventsOfTheDay} slots={slotsOfTheDay} calendarType={calendarType} />
            ) : (
              <div className='day'>
                {moment(date).tz(timeZone).format('dd D')}
                <div className='has-event' style={{visibility: eventsOfTheDay.some(event => !event.allDay) ? 'visible' : 'hidden'}}>&nbsp;</div>
              </div>
            )}

            {eventsOfTheDay
              .filter(event => event.allDay)
              .filter(event => moment(date).tz(timeZone).isSame(moment(event.start).tz(timeZone), 'days'))
              .map((event, index) => (
                <div key={index} className='event' title={event.summary}
                  style={{
                    color: event.color || defaultEventColor,
                    backgroundColor: event.bgColor || defaultEventBgColor,
                    borderLeft: `4px solid ${event.borderColor || defaultEventBorderColor}`
                }}>
                  {AllDayEventTemplate ? (
                    <AllDayEventTemplate event={event} date={date} timeZone={timeZone} />
                  ) : event.summary}
                </div>
              ))
            }
          </>) : calendarView !== CalendarView.SINGLE_DAY /* single day has no header */ ? (<>
            {DayHeaderTemplate ? (
              <DayHeaderTemplate key={date} date={date} timeZone={timeZone} events={eventsOfTheDay} slots={slotsOfTheDay} calendarType={calendarType} />
            ) : (
              <div className='day'>
                {moment(date).tz(timeZone).format('dd')}
              </div>
            )}
          </>) : null}
        </div>
      )
  }), [
    DayHeaderTemplate, AllDayEventTemplate, calendarType, calendarView, columnDates, dayWidth, defaultEventBgColor,
    defaultEventBorderColor, defaultEventColor, events, slots, timeZone
  ]);

  return (
      <div className={`calendar ${className || ''}`} style={style} ref={containerRef}>

        <div className='header'>
          <div style={{ width: hoursContainerWidth, minWidth: hoursContainerWidth }}/>
          {columnDates.map((date, index) => renderedDayHeaders[index])}
          <div style={{ width: scrollbarWidth, minWidth: scrollbarWidth }}/>
        </div>

        <div className='content' ref={calendarContentRef}>
          <div className='hours' style={{
            height: hoursToPixels(maxHour - minHour),
            width: hoursContainerWidth,
            minWidth: hoursContainerWidth
          }}>
            {Array.from({ length: maxHour - minHour + 1 }).map((_, i) => minHour + i).map((/* number */ hour) => (
                // 6 is the height of calendar__content__hour last item
                <div key={hour} className='hour' style={{ height: hour < 24 ? hoursToPixels(1) : 6 }}>
                  {`${moment(currentDate).tz(timeZone).startOf('weeks').add(hour, 'hours').format('ha')}`}
                </div>
            ))}
          </div>

          {columnDates.map((date, index) => (
            <div key={date} className='day'
               style={{
                 width: dayWidth,
                 minWidth: dayWidth,
                 maxWidth: dayWidth,
                 height: hoursToPixels(maxHour - minHour)
               }}>
              {renderedDayEventContainer[index]}
              {renderedSlots[index]}
              {renderedEvents[index]}

              {/* dragged event */}
              { dragContextRef.current.action !== DragAction.NONE &&
              editionMode === EditionMode.EVENTS &&
              dragEvent &&
              isSameDay(dragEvent.start, date, timeZone) && (
                  <div className='event dragging' style={{
                    top: calcTop(dragEvent.start),
                    height: calcHeight(dragEvent.start, dragEvent.end),
                    color: dragEvent.color || defaultEventColor,
                    backgroundColor: dragEvent.bgColor || defaultEventBgColor,
                    borderLeft: `4px solid ${dragEvent.borderColor || defaultEventBorderColor}`,
                  }}>
                    {moment(dragEvent.start).tz(timeZone).format('h:mma')} - {moment(dragEvent.end).tz(timeZone).format('h:mma')}<br/>
                    {dragEvent.summary}
                  </div>
              )}

              {/* dragged slot */}
              { dragContextRef.current.action !== DragAction.NONE &&
              editionMode === EditionMode.SLOTS &&
              dragEvent &&
              isSameDay(dragEvent.start, date, timeZone) && (
                  <div className='slot dragging' style={{
                    top: calcTop(dragEvent.start),
                    height: calcHeight(dragEvent.start, dragEvent.end),
                    color: slotColor,
                    backgroundColor: slotBgColor,
                    borderRight: `4px solid ${slotBorderColor}`,
                    pointerEvents: editionMode !== EditionMode.SLOTS ? 'none' : 'auto',
                  }}>
                    {moment(dragEvent.start).tz(timeZone).format('h:mma')} - {moment(dragEvent.end).tz(timeZone).format('h:mma')}<br/>
                  </div>
              )}

              {/* indicator */}
              { dragContextRef.current.action === DragAction.NONE &&
              dragIndicator &&
              isSameDay(dragIndicator.start, date, timeZone) && (
                  <div className='indicator dragging' style={{
                    top: calcTop(dragIndicator.start),
                    height: calcHeight(dragIndicator.start, dragIndicator.end),
                    color: editionMode === EditionMode.EVENTS ? defaultEventColor : slotColor,
                    backgroundColor: editionMode === EditionMode.EVENTS ? defaultEventBgColor : slotBgColor,
                    opacity: .5
                  }}>
                    {moment(dragIndicator.start).tz(timeZone).format('h:mma')} - {moment(dragIndicator.end).tz(timeZone).format('h:mma')}<br/>
                  </div>
              )}

              {isToday(date, timeZone) && nowTop ? (<>
                <div className='current-time' style={{ top: nowTop }}/>
              </>) : null}
            </div>
          ))}
        </div>
      </div>
  );
};

export default Calendar;
