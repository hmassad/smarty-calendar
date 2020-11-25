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
    }
  }, [handleResize]);

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
        <div className='calendar__content__hours__container'>
        { [...timesOfDay(), 24].map((tod) => (
          <div key={tod} className='calendar__content__hour'>
            {`${moment(currentDate).tz(timeZone).startOf('weeks').add(tod, 'hours').format('ha')}`}
          </div>
        ))}
        </div>

        {weekDates(currentDate, timeZone).map(date => {
          const startOfDay = moment(date).tz(timeZone).startOf('days');

          return (
            <div key={date} className='calendar__content__day' style={{width: dayWidth, minWidth: dayWidth, maxWidth: dayWidth}}>

              <div className='calendar__content__day__event__container'>
                { timesOfDay().map((tod) => (
                  <div key={tod} className={`calendar__content__day__slot ${isToday(date, timeZone) ? 'today': ''}`}
                    style={{top: 48 * tod}}/>
                ))}
              </div>

              <div className='calendar__content__day__event__container'>
                { events
                    .filter(event => !event.allDay && startOfDay.isSame(moment(event.start).tz(timeZone), 'days'))
                    .map((event, index) => {
                      const timeOfDay = moment(event.start).tz(timeZone).diff(startOfDay, 'minutes');
                      const top = 48 / 60 * timeOfDay;
                      const duration = moment(event.end).diff(moment(event.start), 'minutes');
                      const height = 48 / 60 * duration;

                      return (
                        <div key={index} className='calendar__content__day__event' style={{top, height}}>
                          event
                        </div>
                      );
                    })
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )
};

export default Calendar;
